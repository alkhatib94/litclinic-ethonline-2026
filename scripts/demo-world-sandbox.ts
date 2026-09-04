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
  const message =
    error instanceof Error ? error.message : "Sandbox Selfie Check demo failed.";
  console.error(`WORLD_SANDBOX_DEMO_ERROR: ${message}`);
  process.exit(1);
}
