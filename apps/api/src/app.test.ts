import type { GraphOnchainContext } from "@litclinic-ethonline/shared";
import { describe, expect, it } from "vitest";

import { createApiApp } from "./app";
import { MockLitClinicContextProvider } from "./providers/mock";

const WALLET = "0x0000000000000000000000000000000000000001";

describe("care agent context API", () => {
  const app = createApiApp({ provider: new MockLitClinicContextProvider() });

  it("reports health without exposing configuration", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      status: "healthy",
      mode: "mock",
      graph: "unconfigured",
    });
  });

  it("returns deterministic safe mock context", async () => {
    const firstResponse = await app.request(`/api/v1/context/${WALLET}`);
    const secondResponse = await app.request(`/api/v1/context/${WALLET}`);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    const first = await firstResponse.json();
    const second = await secondResponse.json();
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      ok: true,
      data: {
        version: "1",
        wallet: { address: WALLET },
        account: { exists: true, tier: "demo" },
        permissions: {
          canRequestAgentAction: true,
          canRequestPayment: false,
        },
        metadata: {
          source: "litclinic",
        },
      },
    });
    expect(JSON.stringify(first)).not.toMatch(
      /diagnosis|medication|prescription|medicalRecord|email|phone|fullName|databaseId/i,
    );
  });

  it("rejects an invalid wallet", async () => {
    const response = await app.request("/api/v1/context/not-an-address");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_WALLET_ADDRESS",
      message: "A valid Ethereum wallet address is required.",
    });
  });

  it("requires The Graph for agent planning", async () => {
    const response = await app.request(
      `/api/v1/agent-plan/${WALLET}?action=continue_workflow`,
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "GRAPH_PROVIDER_UNCONFIGURED",
    });
  });

  it("uses Graph evidence in the returned agent plan", async () => {
    const graphContext: GraphOnchainContext = {
      version: "1",
      wallet: { address: WALLET },
      network: { chainId: 1, name: "ethereum-mainnet" },
      activity: {
        protocol: "uniswap-v3",
        observedSwapCount: 0,
        sampleLimit: 20,
        hasObservedActivity: false,
      },
      indexing: {
        indexedBlockNumber: 23_456_789,
        latestProtocolActivityAt: new Date().toISOString(),
        hasIndexingErrors: false,
        queriedAt: new Date().toISOString(),
        freshnessSeconds: 0,
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
    const graphApp = createApiApp({
      provider: new MockLitClinicContextProvider(),
      onchainProvider: {
        getContext: async () => graphContext,
      },
    });

    const response = await graphApp.request(
      `/api/v1/agent-plan/${WALLET}?action=continue_workflow`,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: {
        plan: {
          decision: "require_approval",
          reasons: ["NO_OBSERVED_ONCHAIN_ACTIVITY"],
          evidence: {
            graphProvider: "the-graph",
            indexedBlockNumber: 23_456_789,
          },
        },
      },
    });
  });
});
