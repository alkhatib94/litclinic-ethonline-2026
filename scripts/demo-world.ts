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
  type Address,
} from "../packages/shared/src";

const EXPECTED_AGENT_ADDRESS =
  "0x0Fa757cF486555C92Ec37B84024a937C3f5E2B30" as const;
const PROJECT_WALLET = "0xD1f52E023ADeEbe738b720BEfD35459009aAaAaa" as const;

const userWalletResult = ethereumAddressSchema.safeParse(process.argv[2]);
const action = parseAction(process.argv[3]);
if (!userWalletResult.success || !action) {
  console.error(
    "Usage: bun run demo:world <USER_WALLET> [continue_workflow|request_payment]",
  );
  process.exit(1);
}

const userWallet = userWalletResult.data;

try {
  const worldRuntime = createWorldAgentRuntimeFromEnv(process.env);
  const agentAddress = worldRuntime.agentAddress;

  if (agentAddress.toLowerCase() !== EXPECTED_AGENT_ADDRESS.toLowerCase()) {
    console.error("WORLD_AGENT_SIGNER_MISMATCH");
    process.exit(1);
  }
  if (agentAddress.toLowerCase() === userWallet.toLowerCase()) {
    console.error(
      "CONFIGURATION_ERROR: USER WALLET must not equal AGENT WALLET.",
    );
    process.exit(1);
  }
  if (agentAddress.toLowerCase() === PROJECT_WALLET.toLowerCase()) {
    console.error(
      "CONFIGURATION_ERROR: LitClinic project wallet must not be the agent signer.",
    );
    process.exit(1);
  }

  const context = await composeAgentContext({
    userWallet,
    careSource: createContextProviderFromEnv(process.env, {
      defaultMode: "mock",
    }),
    onchainSource: createTheGraphProviderFromEnv(process.env),
  });
  assertUserWalletContext(context.wallet.address, userWallet);
  assertUserWalletContext(context.onchain.wallet.address, userWallet);

  const reasoning = planAgentAction(context, { action });
  const worldAuthorization = await authorizeAgentPlan({
    plan: reasoning,
    userWallet,
    agentAddress,
    worldSource:
      reasoning.decision === "require_approval"
        ? worldRuntime.provider
        : undefined,
  });

  if (
    worldAuthorization.worldStatus &&
    worldAuthorization.worldStatus.agentAddress.toLowerCase() !==
      agentAddress.toLowerCase()
  ) {
    throw new Error("AgentBook result did not match the configured agent wallet.");
  }
  if (worldAuthorization.reason === "verification-unavailable") {
    throw new Error("Required World AgentKit verification could not be completed.");
  }

  printSummary({
    userWallet,
    agentAddress,
    graphFreshnessSeconds: context.onchain.indexing.freshnessSeconds,
    careDecision: reasoning.decision,
    worldUsed: worldAuthorization.worldVerificationUsed,
    registered: worldAuthorization.worldStatus?.registered ?? false,
    humanBacked: worldAuthorization.worldStatus?.humanBacked ?? false,
    finalAllowed: worldAuthorization.authorized,
  });

  console.log(
    JSON.stringify(
      {
        roles: {
          userWallet,
          agentAddress,
          projectWalletNotUsed: PROJECT_WALLET,
        },
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

function assertUserWalletContext(actual: Address, expected: Address): void {
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error("Graph/LitClinic context wallet did not match USER WALLET.");
  }
}

function printSummary(input: {
  userWallet: Address;
  agentAddress: Address;
  graphFreshnessSeconds?: number;
  careDecision: string;
  worldUsed: boolean;
  registered: boolean;
  humanBacked: boolean;
  finalAllowed: boolean;
}): void {
  console.log(`USER WALLET: ${input.userWallet}`);
  console.log(`AGENT WALLET: ${input.agentAddress}`);
  console.log("LIVE THE GRAPH: YES");
  console.log(
    `THE GRAPH FRESHNESS: ${
      input.graphFreshnessSeconds === undefined
        ? "unknown"
        : `${input.graphFreshnessSeconds}s`
    }`,
  );
  console.log(`CARE AGENT DECISION: ${input.careDecision}`);
  console.log(`LIVE WORLD AGENTKIT: ${input.worldUsed ? "YES" : "SKIPPED"}`);
  console.log(`AGENTBOOK REGISTERED: ${input.registered ? "YES" : "NO"}`);
  console.log(
    `HUMAN-BACKED AGENT: ${input.humanBacked ? "VERIFIED" : "NOT VERIFIED"}`,
  );
  console.log(
    `FINAL EXECUTION PERMISSION: ${input.finalAllowed ? "ALLOWED" : "BLOCKED"}`,
  );
}

function parseAction(value: string | undefined): AgentActionKind | null {
  if (value === undefined || value === "continue_workflow") {
    return "continue_workflow";
  }
  if (value === "request_payment") return value;
  return null;
}
