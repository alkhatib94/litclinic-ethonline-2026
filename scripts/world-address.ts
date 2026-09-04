import { createWorldAgentSignerRuntime } from "../integrations/world-agentkit/src";

const secret = process.env.WORLD_AGENT_PRIVATE_KEY?.trim();
if (!secret) {
  console.error("CONFIGURATION_ERROR: WORLD_AGENT_PRIVATE_KEY is required.");
  process.exit(1);
}

try {
  const { agentAddress } = createWorldAgentSignerRuntime(secret);
  console.log(`WORLD AGENT ADDRESS: ${agentAddress}`);
} catch (error) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "WORLD_ADDRESS_ERROR";
  const message =
    error instanceof Error
      ? error.message
      : "Unable to derive the World agent address.";
  console.error(`${code}: ${message}`);
  process.exit(1);
}
