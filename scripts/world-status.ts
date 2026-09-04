import { ethereumAddressSchema } from "../packages/shared/src";
import { createLiveWorldProviderFromEnv } from "../integrations/world-agentkit/src";

const addressResult = ethereumAddressSchema.safeParse(process.argv[2]);
if (!addressResult.success) {
  console.error("Usage: bun run world:status 0x<40 hexadecimal characters>");
  process.exit(1);
}

try {
  const provider = createLiveWorldProviderFromEnv(process.env);
  const status = await provider.resolveAgent({
    agentAddress: addressResult.data,
  });

  console.log("LIVE WORLD AGENTKIT: YES");
  console.log(
    `WORLD_AGENTBOOK_STATUS=${status.registered ? "REGISTERED" : "UNREGISTERED"}`,
  );
  console.log(JSON.stringify(status, null, 2));
} catch (error) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "WORLD_STATUS_ERROR";
  const message =
    error instanceof Error ? error.message : "World AgentKit status lookup failed.";
  console.error(`${code}: ${message}`);
  process.exit(1);
}
