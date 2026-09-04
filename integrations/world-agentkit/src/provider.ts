import {
  createAgentBookVerifier,
  type AgentBookVerifier,
} from "@worldcoin/agentkit";
import {
  humanBackedAgentStatusSchema,
  parseEthereumAddress,
  type HumanBackedAgentStatus,
} from "@litclinic-ethonline/shared";
import {
  createPublicClient,
  http,
  type PublicClient,
} from "viem";
import { worldchain } from "viem/chains";

import {
  WorldAgentkitAbortError,
  WorldAgentkitConfigurationError,
  WorldAgentkitError,
  WorldAgentkitInvalidAddressError,
  WorldAgentkitMalformedResultError,
  WorldAgentkitTimeoutError,
  WorldAgentkitUnavailableError,
} from "./errors";

const DEFAULT_TIMEOUT_MS = 8_000;

export type ResolveWorldAgentInput = {
  agentAddress: string;
  signal?: AbortSignal;
};

export interface WorldAgentAuthorizationProvider {
  readonly mode: "mock" | "live";
  resolveAgent(input: ResolveWorldAgentInput): Promise<HumanBackedAgentStatus>;
}

type AgentBookLookup = Pick<AgentBookVerifier, "lookupHuman">;

export type LiveWorldAgentAuthorizationProviderOptions = {
  rpcUrl?: string;
  timeoutMs?: number;
  clock?: () => Date;
  agentBook?: AgentBookLookup;
};

export class LiveWorldAgentAuthorizationProvider
  implements WorldAgentAuthorizationProvider
{
  readonly mode = "live";
  readonly #agentBook?: AgentBookLookup;
  readonly #clock: () => Date;
  readonly #rpcUrl?: string;
  readonly #timeoutMs: number;

  constructor(options: LiveWorldAgentAuthorizationProviderOptions = {}) {
    this.#rpcUrl = parseOptionalRpcUrl(options.rpcUrl);
    this.#timeoutMs = parseTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    this.#clock = options.clock ?? (() => new Date());
    this.#agentBook = options.agentBook;
  }

  async resolveAgent({
    agentAddress: inputAddress,
    signal,
  }: ResolveWorldAgentInput): Promise<HumanBackedAgentStatus> {
    let agentAddress: ReturnType<typeof parseEthereumAddress>;
    try {
      agentAddress = parseEthereumAddress(inputAddress);
    } catch {
      throw new WorldAgentkitInvalidAddressError();
    }
    if (signal?.aborted) throw new WorldAgentkitAbortError();

    const monitored = this.#agentBook
      ? { verifier: this.#agentBook, failed: () => false }
      : createMonitoredAgentBookVerifier(this.#rpcUrl);

    let anonymousHumanId: string | null;
    try {
      anonymousHumanId = await raceLookup(
        monitored.verifier.lookupHuman(agentAddress),
        this.#timeoutMs,
        signal,
      );
    } catch (error) {
      if (error instanceof WorldAgentkitError) throw error;
      throw new WorldAgentkitUnavailableError();
    }
    if (monitored.failed()) throw new WorldAgentkitUnavailableError();
    if (
      anonymousHumanId !== null &&
      !/^0x[0-9a-fA-F]+$/u.test(anonymousHumanId)
    ) {
      throw new WorldAgentkitMalformedResultError();
    }

    const checkedAt = this.#clock();
    if (!Number.isFinite(checkedAt.getTime())) {
      throw new WorldAgentkitConfigurationError(
        "World AgentKit provider clock is invalid.",
      );
    }

    const registered = anonymousHumanId !== null;
    const parsed = humanBackedAgentStatusSchema.safeParse({
      version: "1",
      provider: "world-agentkit",
      agentAddress,
      registered,
      humanBacked: registered,
      checkedAt: checkedAt.toISOString(),
      live: true,
      worldEnvironment: "production",
      verificationSource: registered
        ? "agentbook-production"
        : "unverified",
    });
    if (!parsed.success) throw new WorldAgentkitMalformedResultError();
    return parsed.data;
  }
}

export type MockWorldAgentAuthorizationProviderOptions = {
  registered: boolean;
  humanBacked: boolean;
  checkedAt?: Date;
};

export class MockWorldAgentAuthorizationProvider
  implements WorldAgentAuthorizationProvider
{
  readonly mode = "mock";
  readonly #checkedAt: Date;
  readonly #humanBacked: boolean;
  readonly #registered: boolean;

  constructor(options: MockWorldAgentAuthorizationProviderOptions) {
    if (options.humanBacked && !options.registered) {
      throw new WorldAgentkitConfigurationError(
        "A human-backed mock agent must also be registered.",
      );
    }
    this.#registered = options.registered;
    this.#humanBacked = options.humanBacked;
    this.#checkedAt =
      options.checkedAt ?? new Date("2026-09-04T00:00:00.000Z");
  }

  async resolveAgent({
    agentAddress: inputAddress,
  }: ResolveWorldAgentInput): Promise<HumanBackedAgentStatus> {
    let agentAddress: ReturnType<typeof parseEthereumAddress>;
    try {
      agentAddress = parseEthereumAddress(inputAddress);
    } catch {
      throw new WorldAgentkitInvalidAddressError();
    }

    return humanBackedAgentStatusSchema.parse({
      version: "1",
      provider: "world-agentkit",
      agentAddress,
      registered: this.#registered,
      humanBacked: this.#humanBacked,
      checkedAt: this.#checkedAt.toISOString(),
      live: false,
      worldEnvironment: "production",
      verificationSource: this.#humanBacked
        ? "agentbook-production"
        : "unverified",
    });
  }
}

function createMonitoredAgentBookVerifier(rpcUrl: string | undefined): {
  verifier: AgentBookLookup;
  failed: () => boolean;
} {
  const client = createPublicClient({
    chain: worldchain,
    transport: http(rpcUrl),
  });
  let readFailed = false;
  const monitoredClient = new Proxy(client, {
    get(target, property) {
      const value = Reflect.get(target, property, target) as unknown;
      if (property === "readContract" && typeof value === "function") {
        return async (...args: unknown[]) => {
          try {
            return await Reflect.apply(value, target, args);
          } catch {
            readFailed = true;
            throw new Error("AgentBook read failed.");
          }
        };
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as PublicClient;

  return {
    verifier: createAgentBookVerifier({ client: monitoredClient }),
    failed: () => readFailed,
  };
}

function raceLookup(
  lookup: Promise<string | null>,
  timeoutMs: number,
  signal: AbortSignal | undefined,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      callback();
    };
    const abort = () => finish(() => reject(new WorldAgentkitAbortError()));
    const timeout = setTimeout(
      () => finish(() => reject(new WorldAgentkitTimeoutError())),
      timeoutMs,
    );
    signal?.addEventListener("abort", abort, { once: true });
    lookup.then(
      (result) => finish(() => resolve(result)),
      () => finish(() => reject(new WorldAgentkitUnavailableError())),
    );
  });
}

function parseOptionalRpcUrl(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new WorldAgentkitConfigurationError("World Chain RPC URL is invalid.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new WorldAgentkitConfigurationError(
      "World Chain RPC URL must be HTTPS and must not contain credentials.",
    );
  }
  return url.toString();
}

function parseTimeout(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 60_000) {
    throw new WorldAgentkitConfigurationError(
      "World AgentKit timeout must be between 1 and 60000 milliseconds.",
    );
  }
  return value;
}
