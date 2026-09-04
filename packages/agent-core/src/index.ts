import {
  agentContextV1Schema,
  type Address,
  type AgentActionKind,
  type AgentActionPlan,
  type AgentContext,
  type AgentDecisionReason,
  type CareAgentContext,
  type GraphOnchainContext,
} from "@litclinic-ethonline/shared";

const DEFAULT_MAX_WALLET_ACTIVITY_AGE_SECONDS = 90 * 24 * 60 * 60;

export type CareContextSource = {
  getContext(input: {
    walletAddress: Address;
    signal?: AbortSignal;
  }): Promise<CareAgentContext>;
};

export type OnchainContextSource = {
  getContext(input: {
    walletAddress: string;
    signal?: AbortSignal;
  }): Promise<GraphOnchainContext>;
};

export type ComposeAgentContextOptions = {
  walletAddress: Address;
  careSource: CareContextSource;
  onchainSource: OnchainContextSource;
  signal?: AbortSignal;
  clock?: () => Date;
};

export class AgentContextValidationError extends Error {
  readonly code = "INVALID_AGENT_CONTEXT";

  constructor() {
    super("The agent context sources returned inconsistent data.");
    this.name = "AgentContextValidationError";
  }
}

export async function composeAgentContext({
  walletAddress,
  careSource,
  onchainSource,
  signal,
  clock = () => new Date(),
}: ComposeAgentContextOptions): Promise<AgentContext> {
  const [litclinic, onchain] = await Promise.all([
    careSource.getContext({ walletAddress, signal }),
    onchainSource.getContext({ walletAddress, signal }),
  ]);
  const composedAt = clock();
  if (!Number.isFinite(composedAt.getTime())) {
    throw new AgentContextValidationError();
  }

  const parsed = agentContextV1Schema.safeParse({
    version: "1",
    wallet: { address: walletAddress },
    litclinic,
    onchain,
    metadata: {
      composedAt: composedAt.toISOString(),
      sources: ["litclinic", "the-graph"],
    },
  });
  if (!parsed.success) throw new AgentContextValidationError();
  return parsed.data;
}

export type PlanAgentActionOptions = {
  action: AgentActionKind;
  now?: Date;
  maxWalletActivityAgeSeconds?: number;
};

export function planAgentAction(
  context: AgentContext,
  {
    action,
    now = new Date(),
    maxWalletActivityAgeSeconds = DEFAULT_MAX_WALLET_ACTIVITY_AGE_SECONDS,
  }: PlanAgentActionOptions,
): AgentActionPlan {
  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isSafeInteger(maxWalletActivityAgeSeconds) ||
    maxWalletActivityAgeSeconds <= 0
  ) {
    throw new AgentContextValidationError();
  }
  const parsedContext = agentContextV1Schema.safeParse(context);
  if (!parsedContext.success) throw new AgentContextValidationError();
  const validatedContext = parsedContext.data;

  const reasons: AgentDecisionReason[] = [];
  if (validatedContext.onchain.indexing.hasIndexingErrors) {
    reasons.push("GRAPH_INDEXING_ERROR");
  }
  if (!validatedContext.onchain.indexing.isFresh) {
    reasons.push("GRAPH_DATA_STALE");
  }
  if (!validatedContext.onchain.activity.hasObservedActivity) {
    reasons.push("NO_OBSERVED_ONCHAIN_ACTIVITY");
  } else if (
    !validatedContext.onchain.activity.lastActivityAt ||
    secondsBetween(validatedContext.onchain.activity.lastActivityAt, now) >
      maxWalletActivityAgeSeconds
  ) {
    reasons.push("ONCHAIN_ACTIVITY_STALE");
  }
  if (!validatedContext.litclinic.permissions.canRequestAgentAction) {
    reasons.push("AGENT_ACTION_NOT_ALLOWED");
  }
  if (action === "request_payment") {
    if (!validatedContext.litclinic.permissions.canRequestPayment) {
      reasons.push("PAYMENT_NOT_AVAILABLE");
    }
    reasons.push("PAYMENT_REQUIRES_APPROVAL");
  }

  const decision = reasons.length === 0 ? "continue" : "require_approval";
  if (decision === "continue") {
    reasons.push("LIVE_ONCHAIN_CONTEXT_CONFIRMED");
  }

  return {
    version: "1",
    action,
    decision,
    reasons,
    evidence: {
      graphProvider: validatedContext.onchain.provenance.provider,
      graphQueryId: validatedContext.onchain.provenance.queryId,
      indexedBlockNumber: validatedContext.onchain.indexing.indexedBlockNumber,
      graphQueriedAt: validatedContext.onchain.indexing.queriedAt,
      ...(validatedContext.onchain.activity.lastActivityAt
        ? { lastWalletActivityAt: validatedContext.onchain.activity.lastActivityAt }
        : {}),
    },
  };
}

function secondsBetween(earlierIso: string, later: Date): number {
  const earlier = new Date(earlierIso);
  if (!Number.isFinite(earlier.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 1_000));
}
