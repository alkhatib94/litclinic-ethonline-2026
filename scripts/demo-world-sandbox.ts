import {
  createSandboxSelfieProviderFromEnv,
  createSandboxSelfieSession,
  parseWorldMode,
} from "../integrations/world-agentkit/src";

/**
 * Official Sandbox Selfie Check demo.
 * Does not register production AgentBook and never prints proof/nullifier material.
 */
try {
  const mode = parseWorldMode(process.env.WORLD_MODE ?? "sandbox");
  if (mode !== "sandbox") {
    console.error(
      "CONFIGURATION_ERROR: demo:world:sandbox requires WORLD_MODE=sandbox.",
    );
    process.exit(1);
  }

  const provider = createSandboxSelfieProviderFromEnv(process.env);
  if (!provider.configured) {
    console.log("STATUS: MANUAL_WORLD_SANDBOX_ACTION_REQUIRED");
    console.log("");
    console.log("Sandbox Selfie Check credentials are not configured yet.");
    console.log("Complete Developer Portal + Sandbox App setup first.");
    console.log("See docs/partners/world-no-orb-audit.md");
    process.exit(2);
  }

  console.log("Creating official Sandbox Selfie Check session...");
  const session = await createSandboxSelfieSession({
    env: process.env,
    signal: "litclinic-care-agent-sandbox",
  });

  console.log("STATUS: MANUAL_WORLD_SANDBOX_ACTION_REQUIRED");
  console.log(`APP_ID: ${session.appId}`);
  console.log(`RP_ID: ${session.rpId}`);
  console.log(`ACTION: ${session.action}`);
  console.log("");
  console.log("Open the Sandbox World ID App and complete Selfie Check:");
  console.log(session.connectorURI);
  console.log("");
  console.log("Waiting for Sandbox verification...");

  await session.pollUntilVerified();
  const status = provider.getStatus({ verified: true });
  console.log("SANDBOX SELFIE CHECK: VERIFIED");
  console.log(`verificationSource: ${status.verificationSource}`);
  console.log(`worldEnvironment: ${status.worldEnvironment}`);
  console.log("Note: this is NOT production AgentBook registration.");
} catch (error) {
  const message = normalizeErrorMessage(error);
  console.error(`WORLD_SANDBOX_DEMO_ERROR: ${message}`);
  if (/WORLD_ID_RP_ID|rp_id|RP ID/i.test(message)) {
    console.error("");
    console.error("STATUS: MANUAL_WORLD_SANDBOX_ACTION_REQUIRED");
    console.error(
      "Open Developer Portal -> your app -> RP / World ID settings and copy the real rp_id.",
    );
    console.error(
      "Do not create rp_id by changing app_ to rp_ on the app_id.",
    );
  }
  process.exit(1);
}

function normalizeErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Sandbox Selfie Check demo failed.";
}
