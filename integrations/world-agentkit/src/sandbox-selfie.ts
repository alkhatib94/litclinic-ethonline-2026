import {
  sandboxSelfieStatusSchema,
  type SandboxSelfieStatus,
} from "@litclinic-ethonline/shared";

import { WorldAgentkitConfigurationError } from "./errors";

export type SandboxSelfieProvider = {
  readonly mode: "sandbox";
  readonly configured: boolean;
  getStatus(input?: { verified?: boolean; now?: Date }): SandboxSelfieStatus;
};

export type SandboxSelfieConfig = {
  appId: string;
  rpId: string;
  signingKeyConfigured: boolean;
  verifyUrl: string;
  action: string;
};

const DEFAULT_ACTION = "litclinic-care-agent-sandbox";
const VERIFY_BASE = "https://developer.world.org/api/v4/verify";

export function parseWorldMode(
  value: string | undefined,
): "production" | "sandbox" {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "production") return "production";
  if (normalized === "sandbox") return "sandbox";
  throw new WorldAgentkitConfigurationError(
    "WORLD_MODE must be production or sandbox.",
  );
}

export function readSandboxSelfieConfig(
  env: Record<string, string | undefined>,
): SandboxSelfieConfig | null {
  const appId = env.WORLD_ID_APP_ID?.trim();
  const rpId = env.WORLD_ID_RP_ID?.trim();
  const signingKey = env.WORLD_ID_RP_SIGNING_KEY?.trim();
  if (!appId && !rpId && !signingKey) return null;
  if (!appId || !rpId) {
    throw new WorldAgentkitConfigurationError(
      "Sandbox Selfie Check requires WORLD_ID_APP_ID and WORLD_ID_RP_ID together.",
    );
  }
  if (!/^app_[a-zA-Z0-9]+$/u.test(appId)) {
    throw new WorldAgentkitConfigurationError(
      "WORLD_ID_APP_ID must look like an official Developer Portal app_id.",
    );
  }
  if (appId.slice(4).toLowerCase() === rpId.slice(3).toLowerCase()) {
    throw new WorldAgentkitConfigurationError(
      "WORLD_ID_RP_ID matches WORLD_ID_APP_ID after the prefix. Copy the real rp_id from Developer Portal RP settings.",
    );
  }
  if (!/^rp_[a-zA-Z0-9]{1,16}$/u.test(rpId)) {
    throw new WorldAgentkitConfigurationError(
      "WORLD_ID_RP_ID must be the Developer Portal rp_id (rp_ + up to 16 alphanumeric characters). Do not invent it by rewriting app_id.",
    );
  }
  return {
    appId,
    rpId,
    signingKeyConfigured: Boolean(signingKey),
    verifyUrl: `${VERIFY_BASE}/${rpId}`,
    action: env.WORLD_ID_ACTION?.trim() || DEFAULT_ACTION,
  };
}

export class SandboxSelfieCheckProvider implements SandboxSelfieProvider {
  readonly mode = "sandbox" as const;
  readonly configured: boolean;
  readonly #config: SandboxSelfieConfig | null;

  constructor(config: SandboxSelfieConfig | null) {
    this.#config = config;
    this.configured = Boolean(
      config?.appId && config.rpId && config.signingKeyConfigured,
    );
  }

  getStatus(input: { verified?: boolean; now?: Date } = {}): SandboxSelfieStatus {
    const checkedAt = (input.now ?? new Date()).toISOString();
    if (!this.configured) {
      return sandboxSelfieStatusSchema.parse({
        version: "1",
        provider: "world-selfie-check",
        worldEnvironment: "sandbox",
        configured: false,
        verified: false,
        humanBacked: false,
        verificationSource: "unverified",
        checkedAt,
        live: false,
      });
    }
    const verified = input.verified === true;
    return sandboxSelfieStatusSchema.parse({
      version: "1",
      provider: "world-selfie-check",
      worldEnvironment: "sandbox",
      configured: true,
      verified,
      humanBacked: verified,
      verificationSource: verified ? "world-sandbox" : "unverified",
      checkedAt,
      live: true,
    });
  }

  getPublicConfig(): Omit<SandboxSelfieConfig, "signingKeyConfigured"> & {
    signingKeyConfigured: boolean;
  } | null {
    if (!this.#config) return null;
    return {
      appId: this.#config.appId,
      rpId: this.#config.rpId,
      verifyUrl: this.#config.verifyUrl,
      action: this.#config.action,
      signingKeyConfigured: this.#config.signingKeyConfigured,
    };
  }
}

export function createSandboxSelfieProviderFromEnv(
  env: Record<string, string | undefined>,
): SandboxSelfieCheckProvider {
  return new SandboxSelfieCheckProvider(readSandboxSelfieConfig(env));
}
