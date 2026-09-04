import {
  authorizeAgentPlan,
  composeAgentContext,
  planAgentAction,
} from "../packages/agent-core/src";
import { createContextProviderFromEnv } from "../apps/api/src/providers/factory";
import { createTheGraphProviderFromEnv } from "../integrations/the-graph/src";
import { createWorldAgentRuntimeFromEnv } from "../integrations/world-agentkit/src";
import {
  ethereumAddressSchema,
  type AgentActionKind,
} from "../packages/shared/src";

const walletResult = ethereumAddressSchema.safeParse(process.argv[2]);
const action = parseAction(process.argv[3]);
if (!walletResult.success || !action) {
  console.error(
    "Usage: bun run demo:world 0x<40 hexadecimal characters> [continue_workflow|request_payment]",
  );
  process.exit(1);
}

try {
  const context = await composeAgentContext({
    walletAddress: walletResult.data,
    careSource: createContextProviderFromEnv(process.env, {
      defaultMode: "mock",
    }),
    onchainSource: createTheGraphProviderFromEnv(process.env),
  });
  const reasoning = planAgentAction(context, { action });
  const worldRuntime =
    reasoning.decision === "require_approval"
      ? createWorldAgentRuntimeFromEnv(process.env)
      : undefined;
  const worldAuthorization = await authorizeAgentPlan({
    plan: reasoning,
    agentAddress: worldRuntime?.agentAddress,
    worldSource: worldRuntime?.provider,
  });

  if (worldAuthorization.reason === "verification-unavailable") {
    throw new Error("Required World AgentKit verification could not be completed.");
  }

  console.log("LIVE THE GRAPH: YES");
  console.log(
    `LIVE WORLD AGENTKIT: ${
      worldAuthorization.worldVerificationUsed ? "YES" : "SKIPPED"
    }`,
  );
  console.log(
    `HUMAN-BACKED AGENT: ${
      worldAuthorization.worldStatus?.humanBacked ? "VERIFIED" : "NOT VERIFIED"
    }`,
  );
  console.log(
    JSON.stringify(
      {
        context,
        reasoning,
        worldAuthorization,
        finalExecutionPermission: worldAuthorization.authorized,
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
      : "WORLD_DEMO_ERROR";
  const message = error instanceof Error ? error.message : "World demo failed.";
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
