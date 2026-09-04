import { describe, expect, it, vi } from "vitest";

import {
  TheGraphGraphqlError,
  TheGraphHttpError,
  TheGraphLiveProvider,
  TheGraphMalformedResponseError,
  TheGraphTimeoutError,
} from "./index";

const WALLET = "0x0000000000000000000000000000000000000001";
const TRANSACTION_HASH = `0x${"0".repeat(63)}1`;
const SUBGRAPH_ID = "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6";
const GRAPH_API_KEY = ["test", "only", "graph", "key"].join("-");
const NOW = new Date("2026-09-04T00:00:00.000Z");

function unixSeconds(iso: string): string {
  return Math.floor(new Date(iso).getTime() / 1_000).toString();
}

function graphPayload(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      _meta: {
        block: { number: 23_456_789 },
        hasIndexingErrors: false,
      },
      walletSwaps: [
        {
          timestamp: unixSeconds("2026-09-03T23:50:00.000Z"),
          transaction: { id: TRANSACTION_HASH },
        },
      ],
      latestSwaps: [
        {
          timestamp: unixSeconds("2026-09-03T23:59:00.000Z"),
        },
      ],
      privateIndexerDetail: "must not pass through",
      ...overrides,
    },
  };
}

function responseFetch(status: number, body: unknown): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

function createProvider(fetchImplementation: typeof fetch, timeoutMs = 100) {
  return new TheGraphLiveProvider({
    gatewayUrl: "https://gateway.thegraph.com/api/",
    subgraphId: SUBGRAPH_ID,
    apiKey: GRAPH_API_KEY,
    timeoutMs,
    fetch: fetchImplementation,
    clock: () => NOW,
  });
}

describe("TheGraphLiveProvider", () => {
  it("turns a live subgraph response into allowlisted activity evidence", async () => {
    const fetchImplementation = responseFetch(200, graphPayload());
    const provider = createProvider(fetchImplementation);

    const context = await provider.getContext({ walletAddress: WALLET });

    expect(context).toMatchObject({
      wallet: { address: WALLET },
      activity: {
        hasObservedActivity: true,
        observedSwapCount: 1,
        latestTransactionHash: TRANSACTION_HASH,
      },
      indexing: {
        indexedBlockNumber: 23_456_789,
        freshnessSeconds: 60,
        isFresh: true,
      },
      provenance: {
        provider: "the-graph",
        subgraphId: SUBGRAPH_ID,
        live: true,
      },
    });
    expect(context).not.toHaveProperty("privateIndexerDetail");

    const fetchMock = fetchImplementation as typeof fetch & {
      mock: {
        calls: Array<[RequestInfo | URL, RequestInit?]>;
      };
    };
    const [requestUrl, requestInit] = fetchMock.mock.calls[0]!;
    expect(String(requestUrl)).toBe(
      `https://gateway.thegraph.com/api/subgraphs/id/${SUBGRAPH_ID}`,
    );
    expect(new Headers(requestInit?.headers).get("authorization")).toBe(
      `Bearer ${GRAPH_API_KEY}`,
    );
    const body = JSON.parse(String(requestInit?.body)) as {
      variables: { wallet: string; sampleSize: number };
    };
    expect(body.variables).toEqual({
      wallet: WALLET,
      sampleSize: 20,
    });
  });

  it("returns typed HTTP errors without response body details", async () => {
    const provider = createProvider(
      responseFetch(401, { error: `credential ${GRAPH_API_KEY}` }),
    );

    let caught: unknown;
    try {
      await provider.getContext({ walletAddress: WALLET });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(TheGraphHttpError);
    expect(caught).toMatchObject({ status: 401 });
    expect(String(caught)).not.toContain(GRAPH_API_KEY);
  });

  it("rejects GraphQL errors", async () => {
    const provider = createProvider(
      responseFetch(200, { errors: [{ message: "resolver failed" }] }),
    );

    await expect(provider.getContext({ walletAddress: WALLET })).rejects.toBeInstanceOf(
      TheGraphGraphqlError,
    );
  });

  it("rejects malformed Graph data", async () => {
    const provider = createProvider(
      responseFetch(200, graphPayload({ walletSwaps: [{ timestamp: "invalid" }] })),
    );

    await expect(provider.getContext({ walletAddress: WALLET })).rejects.toBeInstanceOf(
      TheGraphMalformedResponseError,
    );
  });

  it("marks stale or indexing-error evidence as not fresh", async () => {
    const provider = createProvider(
      responseFetch(
        200,
        graphPayload({
          _meta: {
            block: { number: 23_456_789 },
            hasIndexingErrors: true,
          },
          latestSwaps: [
            { timestamp: unixSeconds("2026-09-03T20:00:00.000Z") },
          ],
        }),
      ),
    );

    const context = await provider.getContext({ walletAddress: WALLET });

    expect(context.indexing.isFresh).toBe(false);
    expect(context.indexing.hasIndexingErrors).toBe(true);
  });

  it("times out an unresponsive Graph provider", async () => {
    const fetchImplementation = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    ) as unknown as typeof fetch;
    const provider = createProvider(fetchImplementation, 10);

    await expect(provider.getContext({ walletAddress: WALLET })).rejects.toBeInstanceOf(
      TheGraphTimeoutError,
    );
  });
});
