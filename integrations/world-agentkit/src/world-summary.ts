import type {
  AgentAuthorizationResult,
  HumanBackedAgentStatus,
  SandboxSelfieStatus,
  WorldAuthorizationSummary,
  WorldEnvironment,
} from "@litclinic-ethonline/shared";
import { worldAuthorizationSummarySchema } from "@litclinic-ethonline/shared";

export type BuildWorldAuthorizationSummaryInput = {
  worldEnvironment: WorldEnvironment;
  productionAuthorization: AgentAuthorizationResult;
  sandboxStatus?: SandboxSelfieStatus;
  agentAddress?: `0x${string}`;
};

/**
 * Compose an honest dual-layer World status for demos and APIs.
 * Production AgentBook and Sandbox Selfie Check are never mixed.
 */
export function buildWorldAuthorizationSummary(
  input: BuildWorldAuthorizationSummaryInput,
): WorldAuthorizationSummary {
  const production = summarizeProduction(input.productionAuthorization);
  const sandbox = summarizeSandbox(input.sandboxStatus);

  if (input.worldEnvironment === "production") {
    return worldAuthorizationSummarySchema.parse({
      version: "1",
      worldEnvironment: "production",
      productionAgentBook: {
        ...production,
        agentAddress: input.agentAddress ?? production.agentAddress,
      },
      sandboxSelfie: sandbox,
      authorizationMode: production.humanBacked
        ? "production-agentbook"
        : "blocked",
      finalExecutionPermission: production.humanBacked,
    });
  }

  const sandboxAllows = sandbox.configured && sandbox.verified;
  return worldAuthorizationSummarySchema.parse({
    version: "1",
    worldEnvironment: "sandbox",
    productionAgentBook: {
      ...production,
      agentAddress: input.agentAddress ?? production.agentAddress,
    },
    sandboxSelfie: sandbox,
    authorizationMode: sandboxAllows ? "sandbox-demonstration" : "blocked",
    finalExecutionPermission: sandboxAllows,
  });
}

function summarizeProduction(authorization: AgentAuthorizationResult): {
  connected: boolean;
  registered: boolean;
  humanBacked: boolean;
  agentAddress?: `0x${string}`;
  verificationSource: WorldAuthorizationSummary["productionAgentBook"]["verificationSource"];
  blocker?: string;
} {
  const status = authorization.worldStatus as HumanBackedAgentStatus | undefined;
  if (!authorization.worldVerificationUsed) {
    return {
      connected: false,
      registered: false,
      humanBacked: false,
      verificationSource: "unverified",
      blocker: "Production AgentBook lookup was not required for this decision.",
    };
  }
  if (!status) {
    return {
      connected: false,
      registered: false,
      humanBacked: false,
      verificationSource: "unverified",
      blocker: "Production AgentBook verification unavailable.",
    };
  }
  const registered = status.registered;
  const humanBacked = status.humanBacked && registered;
  return {
    connected: status.live,
    registered,
    humanBacked,
    agentAddress: status.agentAddress,
    verificationSource: humanBacked ? "agentbook-production" : "unverified",
    blocker: humanBacked
      ? undefined
      : registered
        ? "Agent registered but not human-backed."
        : "ORB-VERIFIED WORLD ID NOT AVAILABLE",
  };
}

function summarizeSandbox(status?: SandboxSelfieStatus): {
  configured: boolean;
  verified: boolean;
  humanBacked: boolean;
  verificationSource: WorldAuthorizationSummary["sandboxSelfie"]["verificationSource"];
} {
  if (!status) {
    return {
      configured: false,
      verified: false,
      humanBacked: false,
      verificationSource: "unverified",
    };
  }
  return {
    configured: status.configured,
    verified: status.verified,
    humanBacked: status.humanBacked,
    verificationSource: status.verificationSource,
  };
}

export function printWorldAuthorizationSummary(
  summary: WorldAuthorizationSummary,
): void {
  console.log("World Authorization");
  console.log("");
  console.log("Production AgentBook");
  console.log(
    `${summary.productionAgentBook.connected ? "✓" : "○"} Live connection`,
  );
  console.log(
    `${summary.productionAgentBook.registered ? "✓" : "○"} Agent registration`,
  );
  console.log(
    `${summary.productionAgentBook.humanBacked ? "✓" : "○"} Production Proof of Human`,
  );
  if (summary.productionAgentBook.blocker) {
    console.log(`  Reason: ${summary.productionAgentBook.blocker}`);
  }
  console.log("");
  console.log("ETHOnline Sandbox");
  console.log(
    `${summary.sandboxSelfie.configured ? "✓" : "○"} Sandbox credentials configured`,
  );
  console.log(
    `${summary.sandboxSelfie.verified ? "✓" : "○"} Verified test user (Selfie Check)`,
  );
  console.log("");
  console.log(`WORLD_MODE: ${summary.worldEnvironment}`);
  console.log(`Authorization mode: ${summary.authorizationMode}`);
  console.log(
    `FINAL EXECUTION PERMISSION: ${
      summary.finalExecutionPermission ? "ALLOWED" : "BLOCKED"
    }`,
  );
}
