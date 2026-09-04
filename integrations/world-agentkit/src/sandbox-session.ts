import {
  IDKit,
  selfieCheckLegacy,
  signRequest,
} from "@worldcoin/idkit-core";

import { WorldAgentkitConfigurationError } from "./errors";
import {
  createSandboxSelfieProviderFromEnv,
  readSandboxSelfieConfig,
  type SandboxSelfieConfig,
} from "./sandbox-selfie";

export type SandboxSelfieSession = {
  action: string;
  appId: string;
  rpId: string;
  connectorURI: string;
  pollUntilVerified: () => Promise<{ verified: true }>;
};

export type CreateSandboxSelfieSessionInput = {
  env: Record<string, string | undefined>;
  signal?: string;
};

/**
 * Official IDKit Sandbox Selfie Check session.
 * Requires Developer Portal app/rp/signing key and Sandbox World ID App.
 * Never returns proof material or nullifiers to callers.
 */
export async function createSandboxSelfieSession(
  input: CreateSandboxSelfieSessionInput,
): Promise<SandboxSelfieSession> {
  const config = requireConfiguredSandbox(input.env);
  const signingKeyHex = input.env.WORLD_ID_RP_SIGNING_KEY!.trim();
  const { sig, nonce, createdAt, expiresAt } = signRequest({
    signingKeyHex,
    action: config.action,
  });

  const request = await IDKit.request({
    app_id: config.appId as `app_${string}`,
    action: config.action,
    rp_context: {
      rp_id: config.rpId as `rp_${string}`,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
      signature: sig,
    },
    allow_legacy_proofs: true,
    environment: "sandbox",
  }).preset(
    selfieCheckLegacy({
      signal: input.signal ?? "litclinic-care-agent-sandbox",
    }),
  );

  const connectorURI = request.connectorURI;
  if (!connectorURI) {
    throw new WorldAgentkitConfigurationError(
      "IDKit did not return a Sandbox connector URI.",
    );
  }

  return {
    action: config.action,
    appId: config.appId,
    rpId: config.rpId,
    connectorURI,
    pollUntilVerified: async () => {
      const result = await request.pollUntilCompletion();
      await verifySandboxSelfieProof({
        env: input.env,
        idkitResponse: result,
      });
      return { verified: true as const };
    },
  };
}

export async function verifySandboxSelfieProof(input: {
  env: Record<string, string | undefined>;
  idkitResponse: unknown;
}): Promise<{ verified: true }> {
  const config = requireConfiguredSandbox(input.env);
  const response = await fetch(config.verifyUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.idkitResponse),
  });
  if (!response.ok) {
    throw new WorldAgentkitConfigurationError(
      "Sandbox Selfie Check proof verification failed at the Developer Portal.",
    );
  }
  // Intentionally discard body so nullifiers/proofs never enter app logs.
  await response.text().catch(() => undefined);
  return { verified: true };
}

export function createConfiguredSandboxProvider(
  env: Record<string, string | undefined>,
) {
  return createSandboxSelfieProviderFromEnv(env);
}

function requireConfiguredSandbox(
  env: Record<string, string | undefined>,
): SandboxSelfieConfig {
  const config = readSandboxSelfieConfig(env);
  if (!config?.signingKeyConfigured) {
    throw new WorldAgentkitConfigurationError(
      "Sandbox Selfie Check is not configured. Set WORLD_ID_APP_ID, WORLD_ID_RP_ID, and WORLD_ID_RP_SIGNING_KEY.",
    );
  }
  return config;
}
