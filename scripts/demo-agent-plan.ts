import { composeAgentContext, planAgentAction } from "../packages/agent-core/src";
import { createContextProviderFromEnv } from "../apps/api/src/providers/factory";
import { createTheGraphProviderFromEnv } from "../integrations/the-graph/src";
import {
  ethereumAddressSchema,
  type AgentActionKind,
} from "../packages/shared/src";

const walletResult = ethereumAddressSchema.safeParse(process.argv[2]);
const actionResult = parseAction(process.argv[3]);

if (!walletResult.success || !actionResult) {
  console.error(
    "Usage: bun run demo:agent-plan 0x<40 hexadecimal characters> [continue_workflow|request_payment]",
  );
  process.exit(1);
}

try {
  const careSource = createContextProviderFromEnv(process.env, {
    defaultMode: "mock",
  });
  const onchainSource = createTheGraphProviderFromEnv(process.env);
  const context = await composeAgentContext({
    userWallet: walletResult.data,
    careSource,
    onchainSource,
  });
  const plan = planAgentAction(context, { action: actionResult });

  console.log(
    JSON.stringify(
      {
        liveGraphQuerySucceeded: true,
        context,
        plan,
      },
      null,
      2,
    ),
  );
} catch (error) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "AGENT_PLAN_DEMO_ERROR";
  const message = error instanceof Error ? error.message : "Agent plan demo failed.";
  console.error(`${code}: ${message}`);
  process.exit(1);
}

function parseAction(value: string | undefined): AgentActionKind | null {
  if (value === undefined || value === "continue_workflow") {
    return "continue_workflow";
  }
  if (value === "request_payment") return value;
  return null;
}
