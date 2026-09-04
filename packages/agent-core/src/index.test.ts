import type {
  AgentContext,
  CareAgentContext,
  GraphOnchainContext,
  HumanBackedAgentStatus,
} from "@litclinic-ethonline/shared";
import { describe, expect, it, vi } from "vitest";

import {
  AgentContextValidationError,
  authorizeAgentPlan,
  composeAgentContext,
  planAgentAction,
} from "./index";

const WALLET = "0x0000000000000000000000000000000000000001";
const NOW = new Date("2026-09-04T00:00:00.000Z");

function careContext(): CareAgentContext {
  return {
    version: "1",
    wallet: { address: WALLET },
    identity: {},
    account: { exists: true },
    permissions: {
      canRequestAgentAction: true,
      canRequestPayment: false,
    },
    onchain: {},
    metadata: {
      generatedAt: NOW.toISOString(),
      source: "litclinic",
    },
  };
}

function graphContext(
  overrides: Partial<GraphOnchainContext["activity"]> = {},
): GraphOnchainContext {
  return {
    version: "1",
    wallet: { address: WALLET },
    network: { chainId: 1, name: "ethereum-mainnet" },
    activity: {
      protocol: "uniswap-v3",
      observedSwapCount: 1,
      sampleLimit: 20,
      hasObservedActivity: true,
      lastActivityAt: "2026-09-03T23:50:00.000Z",
      ...overrides,
    },
    indexing: {
      indexedBlockNumber: 23_456_789,
      latestProtocolActivityAt: "2026-09-03T23:59:00.000Z",
      hasIndexingErrors: false,
      queriedAt: NOW.toISOString(),
      freshnessSeconds: 60,
      isFresh: true,
    },
    provenance: {
      provider: "the-graph",
      product: "subgraph",
      subgraphId: "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6",
      queryId: "uniswap-v3-wallet-swaps-v1",
      live: true,
    },
  };
}

function agentContext(onchain = graphContext()): AgentContext {
  return {
    version: "1",
    wallet: { address: WALLET },
    litclinic: careContext(),
    onchain,
    metadata: {
      composedAt: NOW.toISOString(),
      sources: ["litclinic", "the-graph"],
    },
  };
}

function worldStatus(
  registered: boolean,
  humanBacked: boolean,
): HumanBackedAgentStatus {
  return {
    version: "1",
    provider: "world-agentkit",
    agentAddress: WALLET,
    registered,
    humanBacked,
    checkedAt: NOW.toISOString(),
    live: true,
  };
}

describe("agent context and decision engine", () => {
  it("composes private and live Graph context for the same wallet", async () => {
    const context = await composeAgentContext({
      walletAddress: WALLET,
      careSource: {
        getContext: async () => careContext(),
      },
      onchainSource: {
        getContext: async () => graphContext(),
      },
      clock: () => NOW,
    });

    expect(context.metadata.sources).toEqual(["litclinic", "the-graph"]);
    expect(context.onchain.provenance.live).toBe(true);
  });

  it("continues only when live Graph evidence is fresh and active", () => {
    const plan = planAgentAction(agentContext(), {
      action: "continue_workflow",
      now: NOW,
    });

    expect(plan).toMatchObject({
      decision: "continue",
      reasons: ["LIVE_ONCHAIN_CONTEXT_CONFIRMED"],
      evidence: {
        graphProvider: "the-graph",
        indexedBlockNumber: 23_456_789,
      },
    });
  });

  it("changes the plan when The Graph reports no observed wallet activity", () => {
    const noActivity = graphContext({
      observedSwapCount: 0,
      hasObservedActivity: false,
      lastActivityAt: undefined,
    });

    const plan = planAgentAction(agentContext(noActivity), {
      action: "continue_workflow",
      now: NOW,
    });

    expect(plan.decision).toBe("require_approval");
    expect(plan.reasons).toContain("NO_OBSERVED_ONCHAIN_ACTIVITY");
  });

  it("requires approval for stale Graph evidence", () => {
    const onchain = graphContext();
    onchain.indexing.isFresh = false;

    const plan = planAgentAction(agentContext(onchain), {
      action: "continue_workflow",
      now: NOW,
    });

    expect(plan.decision).toBe("require_approval");
    expect(plan.reasons).toContain("GRAPH_DATA_STALE");
  });

  it("always requires explicit approval for a payment request", () => {
    const plan = planAgentAction(agentContext(), {
      action: "request_payment",
      now: NOW,
    });

    expect(plan.decision).toBe("require_approval");
    expect(plan.reasons).toEqual(
      expect.arrayContaining(["PAYMENT_NOT_AVAILABLE", "PAYMENT_REQUIRES_APPROVAL"]),
    );
  });

  it("rejects source contexts for different wallets", async () => {
    const mismatch = graphContext();
    mismatch.wallet.address = "0x0000000000000000000000000000000000000002";

    await expect(
      composeAgentContext({
        walletAddress: WALLET,
        careSource: {
          getContext: async () => careContext(),
        },
        onchainSource: {
          getContext: async () => mismatch,
        },
        clock: () => NOW,
      }),
    ).rejects.toBeInstanceOf(AgentContextValidationError);
  });

  it("authorizes an approval-required plan for a human-backed agent", async () => {
    const plan = planAgentAction(
      agentContext(
        graphContext({
          observedSwapCount: 0,
          hasObservedActivity: false,
          lastActivityAt: undefined,
        }),
      ),
      { action: "continue_workflow", now: NOW },
    );

    const authorization = await authorizeAgentPlan({
      plan,
      agentAddress: WALLET,
      worldSource: {
        resolveAgent: async () => worldStatus(true, true),
      },
    });

    expect(authorization).toMatchObject({
      authorized: true,
      reason: "verified-human-backed-agent",
      worldVerificationUsed: true,
    });
  });

  it("blocks an approval-required plan for an unverified agent", async () => {
    const plan = planAgentAction(
      agentContext(
        graphContext({
          observedSwapCount: 0,
          hasObservedActivity: false,
          lastActivityAt: undefined,
        }),
      ),
      { action: "continue_workflow", now: NOW },
    );

    const authorization = await authorizeAgentPlan({
      plan,
      agentAddress: WALLET,
      worldSource: {
        resolveAgent: async () => worldStatus(false, false),
      },
    });

    expect(authorization).toMatchObject({
      authorized: false,
      reason: "agent-not-registered",
      worldVerificationUsed: true,
    });
  });

  it("fails closed when World verification is unavailable", async () => {
    const plan = planAgentAction(
      agentContext(
        graphContext({
          observedSwapCount: 0,
          hasObservedActivity: false,
          lastActivityAt: undefined,
        }),
      ),
      { action: "continue_workflow", now: NOW },
    );

    const authorization = await authorizeAgentPlan({
      plan,
      agentAddress: WALLET,
      worldSource: {
        resolveAgent: async () => {
          throw new Error("World unavailable");
        },
      },
    });

    expect(authorization).toEqual({
      version: "1",
      authorized: false,
      reason: "verification-unavailable",
      worldVerificationUsed: true,
    });
  });

  it("skips World lookup when approval is not required", async () => {
    const resolveAgent = vi.fn(async () => worldStatus(true, true));
    const plan = planAgentAction(agentContext(), {
      action: "continue_workflow",
      now: NOW,
    });

    const authorization = await authorizeAgentPlan({
      plan,
      agentAddress: WALLET,
      worldSource: { resolveAgent },
    });

    expect(authorization).toEqual({
      version: "1",
      authorized: true,
      reason: "approval-not-required",
      worldVerificationUsed: false,
    });
    expect(resolveAgent).not.toHaveBeenCalled();
  });
});
