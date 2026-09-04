import { createContextProviderFromEnv } from "../apps/api/src/providers/factory";
import {
  ethereumAddressSchema,
  type CareAgentContext,
} from "../packages/shared/src/index";

const walletInput = process.argv[2];
const walletResult = ethereumAddressSchema.safeParse(walletInput);

if (!walletResult.success) {
  console.error("Usage: bun run demo:context 0x<40 hexadecimal characters>");
  process.exit(1);
}

try {
  const provider = createContextProviderFromEnv(process.env, {
    defaultMode: "mock",
  });
  const context = await provider.getContext({
    walletAddress: walletResult.data,
  });
  printSanitizedContext(context);
} catch (error) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "DEMO_CONTEXT_ERROR";
  const message = error instanceof Error ? error.message : "Context request failed.";
  console.error(`${code}: ${message}`);
  process.exit(1);
}

function printSanitizedContext(context: CareAgentContext): void {
  console.log(JSON.stringify(context, null, 2));
}
