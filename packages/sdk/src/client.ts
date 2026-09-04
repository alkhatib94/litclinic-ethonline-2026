import {
  careAgentContextV1Schema,
  parseEthereumAddress,
  type CareAgentContext,
} from "@litclinic-ethonline/shared";

import {
  InvalidWalletAddressError,
  LitClinicAbortError,
  LitClinicClientError,
  LitClinicConfigurationError,
  LitClinicHttpError,
  LitClinicMalformedResponseError,
  LitClinicNetworkError,
  LitClinicPayloadTooLargeError,
  LitClinicTimeoutError,
  UnsupportedContextVersionError,
} from "./errors";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024;

export type LitClinicClientOptions = {
  baseUrl: string | URL;
  serviceToken: string;
  contextEndpoint: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  fetch?: typeof globalThis.fetch;
};

export type GetCareAgentContextInput = {
  walletAddress: string;
  signal?: AbortSignal;
};

export class LitClinicClient {
  readonly #baseUrl: URL;
  readonly #contextEndpoint: string;
  readonly #fetch: typeof globalThis.fetch;
  readonly #maxResponseBytes: number;
  readonly #timeoutMs: number;
  readonly #serviceToken: string;

  constructor(options: LitClinicClientOptions) {
    this.#baseUrl = parseBaseUrl(options.baseUrl);
    this.#contextEndpoint = parseContextEndpoint(options.contextEndpoint);
    this.#serviceToken = parseServiceToken(options.serviceToken);
    this.#timeoutMs = parsePositiveInteger(
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      "Request timeout",
    );
    this.#maxResponseBytes = parsePositiveInteger(
      options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
      "Maximum response size",
    );
    this.#fetch = options.fetch ?? globalThis.fetch;

    if (typeof this.#fetch !== "function") {
      throw new LitClinicConfigurationError("A Fetch API implementation is required.");
    }
  }

  async getCareAgentContext(
    input: GetCareAgentContextInput,
  ): Promise<CareAgentContext> {
    let walletAddress: ReturnType<typeof parseEthereumAddress>;
    try {
      walletAddress = parseEthereumAddress(input.walletAddress);
    } catch {
      throw new InvalidWalletAddressError();
    }

    if (input.signal?.aborted) {
      throw new LitClinicAbortError();
    }

    const endpoint = this.#contextEndpoint.replace(
      "{wallet}",
      encodeURIComponent(walletAddress),
    );
    const url = new URL(endpoint, this.#baseUrl);
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.#timeoutMs);
    const abortFromCaller = () => controller.abort();
    input.signal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      let response: Response;
      try {
        response = await this.#fetch(url, {
          method: "GET",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${this.#serviceToken}`,
          },
          redirect: "error",
          signal: controller.signal,
        });
      } catch {
        if (timedOut) throw new LitClinicTimeoutError();
        if (input.signal?.aborted) throw new LitClinicAbortError();
        throw new LitClinicNetworkError();
      }

      if (!response.ok) {
        throw new LitClinicHttpError(response.status);
      }

      const declaredLength = Number(response.headers.get("content-length"));
      if (
        Number.isFinite(declaredLength) &&
        declaredLength > this.#maxResponseBytes
      ) {
        throw new LitClinicPayloadTooLargeError();
      }

      const responseText = await response.text();
      if (new TextEncoder().encode(responseText).byteLength > this.#maxResponseBytes) {
        throw new LitClinicPayloadTooLargeError();
      }

      let payload: unknown;
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new LitClinicMalformedResponseError();
      }

      if (isRecord(payload) && "version" in payload && payload.version !== "1") {
        throw new UnsupportedContextVersionError();
      }

      const parsed = careAgentContextV1Schema.safeParse(payload);
      if (!parsed.success) {
        throw new LitClinicMalformedResponseError();
      }
      if (parsed.data.wallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new LitClinicMalformedResponseError();
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof LitClinicClientError) throw error;
      if (timedOut) throw new LitClinicTimeoutError();
      if (input.signal?.aborted) throw new LitClinicAbortError();
      throw new LitClinicNetworkError();
    } finally {
      clearTimeout(timeout);
      input.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}

function parseBaseUrl(value: string | URL): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new LitClinicConfigurationError("LitClinic API URL is invalid.");
  }

  const isLocalHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new LitClinicConfigurationError(
      "LitClinic API URL must use HTTPS, except for localhost development.",
    );
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new LitClinicConfigurationError("LitClinic API URL contains unsupported components.");
  }
  return url;
}

function parseContextEndpoint(value: string): string {
  const walletMarkers = value.match(/\{wallet\}/g)?.length ?? 0;
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("?") ||
    value.includes("#") ||
    walletMarkers !== 1
  ) {
    throw new LitClinicConfigurationError(
      "Context endpoint must be a relative path containing one {wallet} placeholder.",
    );
  }
  return value;
}

function parseServiceToken(value: string): string {
  if (typeof value !== "string") {
    throw new LitClinicConfigurationError("LitClinic service token is invalid.");
  }
  const token = value.trim();
  if (!token || /[\r\n]/u.test(token)) {
    throw new LitClinicConfigurationError("LitClinic service token is invalid.");
  }
  return token;
}

function parsePositiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new LitClinicConfigurationError(`${label} must be a positive integer.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
