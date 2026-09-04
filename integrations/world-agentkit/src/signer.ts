import {
  createAgentkitClient,
  type AgentkitClient,
  type AgentkitSigner,
} from "@worldcoin/agentkit";
import { privateKeyToAccount } from "viem/accounts";

import { WorldAgentkitConfigurationError } from "./errors";

const WORLD_CHAIN_CAIP2 = "eip155:480";

export type WorldAgentSignerRuntime = {
  agentAddress: `0x${string}`;
  signer: AgentkitSigner;
  client: AgentkitClient;
};

export function createWorldAgentSignerRuntime(
  privateKeyValue: string,
): WorldAgentSignerRuntime {
  const signingMaterial = normalizePrivateKey(privateKeyValue);
  let account: ReturnType<typeof privateKeyToAccount>;
  try {
    account = privateKeyToAccount(signingMaterial);
  } catch {
    throw new WorldAgentkitConfigurationError(
      "WORLD_AGENT_PRIVATE_KEY is not a valid EVM private key.",
    );
  }

  const signer: AgentkitSigner = {
    address: account.address,
    chainId: WORLD_CHAIN_CAIP2,
    type: "eip191",
    signMessage: (message) => account.signMessage({ message }),
  };

  return {
    agentAddress: account.address,
    signer,
    client: createAgentkitClient({ signer }),
  };
}

function normalizePrivateKey(value: string): `0x${string}` {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!/^0x[0-9a-fA-F]{64}$/u.test(normalized)) {
    throw new WorldAgentkitConfigurationError(
      "WORLD_AGENT_PRIVATE_KEY is not a valid EVM private key.",
    );
  }
  return normalized as `0x${string}`;
}
