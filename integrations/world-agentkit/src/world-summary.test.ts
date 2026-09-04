import { describe, expect, it } from "vitest";

import {
  buildWorldAuthorizationSummary,
  createSandboxSelfieProviderFromEnv,
  parseWorldMode,
  SandboxSelfieCheckProvider,
} from "./index";
import type { AgentAuthorizationResult } from "@litclinic-ethonline/shared";

const AGENT = "0x0Fa757cF486555C92Ec37B84024a937C3f5E2B30" as const;
const NOW = "2026-09-04T15:00:00.000Z";

function productionAuth(
  registered: boolean,
  humanBacked: boolean,
): AgentAuthorizationResult {
  return {
    version: "1",
    authorized: registered && humanBacked,
    reason: registered
      ? humanBacked
        ? "verified-human-backed-agent"
        : "agent-not-human-backed"
      : "agent-not-registered",
    worldVerificationUsed: true,
    worldStatus: {
      version: "1",
      provider: "world-agentkit",
      agentAddress: AGENT,
      registered,
      humanBacked,
      checkedAt: NOW,
      live: true,
      worldEnvironment: "production",
      verificationSource: humanBacked ? "agentbook-production" : "unverified",
    },
  };
}

describe("World production and sandbox separation", () => {
  it("parses WORLD_MODE safely", () => {
    expect(parseWorldMode(undefined)).toBe("production");
    expect(parseWorldMode("sandbox")).toBe("sandbox");
    expect(() => parseWorldMode("staging")).toThrow();
  });

  it("never labels unconfigured Sandbox as verified", () => {
    const provider = new SandboxSelfieCheckProvider(null);
    const status = provider.getStatus({ verified: true });
    expect(status.configured).toBe(false);
    expect(status.verified).toBe(false);
    expect(status.verificationSource).toBe("unverified");
    expect(status.worldEnvironment).toBe("sandbox");
  });

  it("keeps production blocked when AgentBook is unregistered", () => {
    const summary = buildWorldAuthorizationSummary({
      worldEnvironment: "production",
      productionAuthorization: productionAuth(false, false),
      sandboxStatus: new SandboxSelfieCheckProvider({
        appId: "app_test",
        rpId: "rp_test",
        signingKeyConfigured: true,
        verifyUrl: "https://developer.world.org/api/v4/verify/rp_test",
        action: "litclinic-care-agent-sandbox",
      }).getStatus({ verified: true }),
      agentAddress: AGENT,
    });

    expect(summary.authorizationMode).toBe("blocked");
    expect(summary.finalExecutionPermission).toBe(false);
    expect(summary.productionAgentBook.verificationSource).toBe("unverified");
    expect(summary.productionAgentBook.blocker).toBe(
      "ORB-VERIFIED WORLD ID NOT AVAILABLE",
    );
    expect(summary.sandboxSelfie.verified).toBe(true);
    expect(summary.sandboxSelfie.verificationSource).toBe("world-sandbox");
  });

  it("allows sandbox demonstration only when Sandbox Selfie Check is verified", () => {
    const summary = buildWorldAuthorizationSummary({
      worldEnvironment: "sandbox",
      productionAuthorization: productionAuth(false, false),
      sandboxStatus: new SandboxSelfieCheckProvider({
        appId: "app_test",
        rpId: "rp_test",
        signingKeyConfigured: true,
        verifyUrl: "https://developer.world.org/api/v4/verify/rp_test",
        action: "litclinic-care-agent-sandbox",
      }).getStatus({ verified: true }),
      agentAddress: AGENT,
    });

    expect(summary.authorizationMode).toBe("sandbox-demonstration");
    expect(summary.finalExecutionPermission).toBe(true);
    expect(summary.productionAgentBook.registered).toBe(false);
    expect(summary.sandboxSelfie.verificationSource).toBe("world-sandbox");
  });

  it("does not treat partial sandbox env as configured", () => {
    expect(() =>
      createSandboxSelfieProviderFromEnv({
        WORLD_ID_APP_ID: "app_only",
      }),
    ).toThrow();
  });
});
