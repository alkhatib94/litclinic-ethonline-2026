import type { AgentkitClient, AgentkitSigner } from "@worldcoin/agentkit";

import { WorldAgentkitConfigurationError } from "./errors";
import { LiveWorldAgentAuthorizationProvider } from "./provider";
import { createWorldAgentSignerRuntime } from "./signer";

type RuntimeEnvironment = Record<string, string | undefined>;

export type WorldAgentRuntime = {
  agentAddress: `0x${string}`;
  signer: AgentkitSigner;
  client: AgentkitClient;
  provider: LiveWorldAgentAuthorizationProvider;
};

export function createLiveWorldProviderFromEnv(env: RuntimeEnvironment) {
  return new LiveWorldAgentAuthorizationProvider({
    rpcUrl: env.WORLD_CHAIN_RPC_URL?.trim() || undefined,
  });
}

export function createWorldAgentRuntimeFromEnv(
  env: RuntimeEnvironment,
): WorldAgentRuntime {
  const secret = env.WORLD_AGENT_PRIVATE_KEY?.trim();
  if (!secret) {
    throw new WorldAgentkitConfigurationError(
      "WORLD_AGENT_PRIVATE_KEY is required for the configured agent signer.",
    );
  }

  const runtime = createWorldAgentSignerRuntime(secret);
  return {
    ...runtime,
    provider: createLiveWorldProviderFromEnv(env),
  };
}
