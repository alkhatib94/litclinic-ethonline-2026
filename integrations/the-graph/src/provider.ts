import {
  graphOnchainContextV1Schema,
  parseEthereumAddress,
  type GraphOnchainContext,
} from "@litclinic-ethonline/shared";
import { z } from "zod";

import {
  TheGraphAbortError,
  TheGraphConfigurationError,
  TheGraphGraphqlError,
  TheGraphHttpError,
  TheGraphInvalidWalletError,
  TheGraphMalformedResponseError,
  TheGraphNetworkError,
  TheGraphPayloadTooLargeError,
  TheGraphProviderError,
  TheGraphTimeoutError,
} from "./errors";
import {
  UNISWAP_V3_WALLET_ACTIVITY_QUERY,
  UNISWAP_V3_WALLET_ACTIVITY_QUERY_ID,
} from "./query";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_RESPONSE_BYTES = 128 * 1024;
const DEFAULT_SAMPLE_LIMIT = 20;
const DEFAULT_MAX_FRESHNESS_SECONDS = 15 * 60;

const graphSwapSchema = z.object({
  hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/u),
  timestamp: z.string().regex(/^\d+$/u),
});

const graphDataSchema = z.object({
  _meta: z.object({
    block: z.object({
      number: z.number().int().nonnegative(),
    }),
    hasIndexingErrors: z.boolean(),
  }),
  walletSwaps: z.array(graphSwapSchema),
  latestSwaps: z.array(
    z.object({
      timestamp: z.string().regex(/^\d+$/u),
    }),
  ),
});

const graphEnvelopeSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(z.unknown()).optional(),
});

export type TheGraphLiveProviderOptions = {
  gatewayUrl: string | URL;
  subgraphId: string;
  apiKey: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  sampleLimit?: number;
  maxFreshnessSeconds?: number;
  fetch?: typeof globalThis.fetch;
  clock?: () => Date;
};

export type GetGraphOnchainContextInput = {
  walletAddress: string;
  signal?: AbortSignal;
};

export interface GraphOnchainContextProvider {
  getContext(input: GetGraphOnchainContextInput): Promise<GraphOnchainContext>;
}

export class TheGraphLiveProvider implements GraphOnchainContextProvider {
  readonly #apiKey: string;
  readonly #clock: () => Date;
  readonly #endpointUrl: URL;
  readonly #fetch: typeof globalThis.fetch;
  readonly #maxFreshnessSeconds: number;
  readonly #maxResponseBytes: number;
  readonly #sampleLimit: number;
  readonly #subgraphId: string;
  readonly #timeoutMs: number;

  constructor(options: TheGraphLiveProviderOptions) {
    this.#subgraphId = parseSubgraphId(options.subgraphId);
    this.#endpointUrl = buildEndpointUrl(options.gatewayUrl, this.#subgraphId);
    this.#apiKey = parseApiKey(options.apiKey);
    this.#timeoutMs = parsePositiveInteger(
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      "Request timeout",
    );
    this.#maxResponseBytes = parsePositiveInteger(
      options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
      "Maximum response size",
    );
    this.#sampleLimit = parseBoundedInteger(
      options.sampleLimit ?? DEFAULT_SAMPLE_LIMIT,
      "Sample limit",
      1,
      100,
    );
    this.#maxFreshnessSeconds = parseBoundedInteger(
      options.maxFreshnessSeconds ?? DEFAULT_MAX_FRESHNESS_SECONDS,
      "Maximum freshness",
      1,
      86_400,
    );
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#clock = options.clock ?? (() => new Date());

    if (typeof this.#fetch !== "function") {
      throw new TheGraphConfigurationError("A Fetch API implementation is required.");
    }
  }

  async getContext(
    input: GetGraphOnchainContextInput,
  ): Promise<GraphOnchainContext> {
    let walletAddress: ReturnType<typeof parseEthereumAddress>;
    try {
      walletAddress = parseEthereumAddress(input.walletAddress);
    } catch {
      throw new TheGraphInvalidWalletError();
    }

    if (input.signal?.aborted) throw new TheGraphAbortError();

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
        response = await this.#fetch(this.#endpointUrl, {
          method: "POST",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${this.#apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            query: UNISWAP_V3_WALLET_ACTIVITY_QUERY,
            variables: {
              wallet: walletAddress.toLowerCase(),
              sampleSize: this.#sampleLimit,
            },
          }),
          redirect: "error",
          signal: controller.signal,
        });
      } catch {
        if (timedOut) throw new TheGraphTimeoutError();
        if (input.signal?.aborted) throw new TheGraphAbortError();
        throw new TheGraphNetworkError();
      }

      if (!response.ok) throw new TheGraphHttpError(response.status);
      enforceDeclaredResponseSize(response, this.#maxResponseBytes);

      const responseText = await response.text();
      if (new TextEncoder().encode(responseText).byteLength > this.#maxResponseBytes) {
        throw new TheGraphPayloadTooLargeError();
      }

      const envelope = parseEnvelope(responseText);
      if (envelope.errors && envelope.errors.length > 0) {
        throw new TheGraphGraphqlError();
      }

      const parsedData = graphDataSchema.safeParse(envelope.data);
      if (!parsedData.success) throw new TheGraphMalformedResponseError();

      return this.#toPublicContext(walletAddress, parsedData.data);
    } catch (error) {
      if (error instanceof TheGraphProviderError) throw error;
      if (timedOut) throw new TheGraphTimeoutError();
      if (input.signal?.aborted) throw new TheGraphAbortError();
      throw new TheGraphNetworkError();
    } finally {
      clearTimeout(timeout);
      input.signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  #toPublicContext(
    walletAddress: ReturnType<typeof parseEthereumAddress>,
    data: z.infer<typeof graphDataSchema>,
  ): GraphOnchainContext {
    const queriedAt = this.#clock();
    if (!Number.isFinite(queriedAt.getTime())) {
      throw new TheGraphConfigurationError("The Graph provider clock is invalid.");
    }

    const latestWalletSwap = data.walletSwaps[0];
    const latestProtocolSwap = data.latestSwaps[0];
    const latestProtocolActivityAt = latestProtocolSwap
      ? graphTimestampToIso(latestProtocolSwap.timestamp)
      : undefined;
    const freshnessSeconds = latestProtocolActivityAt
      ? Math.max(
          0,
          Math.floor(
            (queriedAt.getTime() - new Date(latestProtocolActivityAt).getTime()) / 1_000,
          ),
        )
      : undefined;

    const context = {
      version: "1" as const,
      wallet: { address: walletAddress },
      network: {
        chainId: 1,
        name: "ethereum-mainnet",
      },
      activity: {
        protocol: "uniswap-v3" as const,
        observedSwapCount: data.walletSwaps.length,
        sampleLimit: this.#sampleLimit,
        hasObservedActivity: data.walletSwaps.length > 0,
        ...(latestWalletSwap
          ? {
              lastActivityAt: graphTimestampToIso(latestWalletSwap.timestamp),
              latestTransactionHash: latestWalletSwap.hash,
            }
          : {}),
      },
      indexing: {
        indexedBlockNumber: data._meta.block.number,
        ...(latestProtocolActivityAt ? { latestProtocolActivityAt } : {}),
        hasIndexingErrors: data._meta.hasIndexingErrors,
        queriedAt: queriedAt.toISOString(),
        ...(freshnessSeconds === undefined ? {} : { freshnessSeconds }),
        isFresh:
          freshnessSeconds !== undefined &&
          freshnessSeconds <= this.#maxFreshnessSeconds &&
          !data._meta.hasIndexingErrors,
      },
      provenance: {
        provider: "the-graph" as const,
        product: "subgraph" as const,
        subgraphId: this.#subgraphId,
        queryId: UNISWAP_V3_WALLET_ACTIVITY_QUERY_ID,
        live: true as const,
      },
    };

    const parsed = graphOnchainContextV1Schema.safeParse(context);
    if (!parsed.success) throw new TheGraphMalformedResponseError();
    return parsed.data;
  }
}

function parseEnvelope(responseText: string): z.infer<typeof graphEnvelopeSchema> {
  let payload: unknown;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new TheGraphMalformedResponseError();
  }
  const parsed = graphEnvelopeSchema.safeParse(payload);
  if (!parsed.success) throw new TheGraphMalformedResponseError();
  return parsed.data;
}

function graphTimestampToIso(value: string): string {
  let seconds: number;
  try {
    const parsed = BigInt(value);
    if (parsed < 0n || parsed > BigInt(Math.floor(Number.MAX_SAFE_INTEGER / 1_000))) {
      throw new Error("Timestamp out of range.");
    }
    seconds = Number(parsed);
  } catch {
    throw new TheGraphMalformedResponseError();
  }
  const date = new Date(seconds * 1_000);
  if (!Number.isFinite(date.getTime())) throw new TheGraphMalformedResponseError();
  return date.toISOString();
}

function buildEndpointUrl(gatewayValue: string | URL, subgraphId: string): URL {
  let gatewayUrl: URL;
  try {
    gatewayUrl = new URL(gatewayValue);
  } catch {
    throw new TheGraphConfigurationError("The Graph gateway URL is invalid.");
  }
  if (
    gatewayUrl.protocol !== "https:" ||
    gatewayUrl.username ||
    gatewayUrl.password ||
    gatewayUrl.search ||
    gatewayUrl.hash
  ) {
    throw new TheGraphConfigurationError(
      "The Graph gateway URL must be an HTTPS URL without credentials.",
    );
  }

  const basePath = gatewayUrl.pathname.endsWith("/")
    ? gatewayUrl.pathname
    : `${gatewayUrl.pathname}/`;
  gatewayUrl.pathname = `${basePath}subgraphs/id/${subgraphId}`;
  return gatewayUrl;
}

function parseSubgraphId(value: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9]{20,128}$/u.test(id)) {
    throw new TheGraphConfigurationError("The Graph subgraph ID is invalid.");
  }
  return id;
}

function parseApiKey(value: string): string {
  const apiKey = typeof value === "string" ? value.trim() : "";
  if (!apiKey || /[\r\n]/u.test(apiKey)) {
    throw new TheGraphConfigurationError("The Graph API key is invalid.");
  }
  return apiKey;
}

function parsePositiveInteger(value: number, label: string): number {
  return parseBoundedInteger(value, label, 1, Number.MAX_SAFE_INTEGER);
}

function parseBoundedInteger(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new TheGraphConfigurationError(
      `${label} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
  return value;
}

function enforceDeclaredResponseSize(response: Response, maximumBytes: number): void {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new TheGraphPayloadTooLargeError();
  }
}
