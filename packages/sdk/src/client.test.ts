import { describe, expect, it, vi } from "vitest";

import {
  InvalidWalletAddressError,
  LitClinicClient,
  LitClinicMalformedResponseError,
  LitClinicTimeoutError,
  UnsupportedContextVersionError,
} from "./index";

const WALLET = "0x0000000000000000000000000000000000000001";
const SERVICE_TOKEN = "test-only-service-token";

function validContext(overrides: Record<string, unknown> = {}) {
  return {
    version: "1",
    wallet: { address: WALLET, chainId: 1 },
    identity: { displayName: "Demo account" },
    account: { exists: true, tier: "demo" },
    permissions: {
      canRequestAgentAction: true,
      canRequestPayment: false,
    },
    onchain: {
      activityCount: 7,
      lastActivityAt: "2026-09-03T12:00:00.000Z",
    },
    metadata: {
      generatedAt: "2026-09-04T00:00:00.000Z",
      source: "litclinic",
    },
    ...overrides,
  };
}

function createClient(fetchImplementation: typeof fetch, timeoutMs = 100) {
  return new LitClinicClient({
    baseUrl: "https://private.example",
    serviceToken: SERVICE_TOKEN,
    contextEndpoint: "/approved/context/{wallet}",
    timeoutMs,
    fetch: fetchImplementation,
  });
}

function responseFetch(status: number, body: unknown): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

describe("LitClinicClient", () => {
  it("accepts a valid wallet and returns an allowlisted context", async () => {
    const fetchImplementation = responseFetch(200, {
      ...validContext(),
      medicalRecords: [{ diagnosis: "must not pass through" }],
      internalRole: "owner",
    });
    const client = createClient(fetchImplementation);

    const context = await client.getCareAgentContext({ walletAddress: WALLET });

    expect(context.wallet.address).toBe(WALLET);
    expect(context).not.toHaveProperty("medicalRecords");
    expect(context).not.toHaveProperty("internalRole");
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("rejects an invalid wallet before making a request", async () => {
    const fetchImplementation = responseFetch(200, validContext());
    const client = createClient(fetchImplementation);

    await expect(
      client.getCareAgentContext({ walletAddress: "not-an-address" }),
    ).rejects.toBeInstanceOf(InvalidWalletAddressError);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it.each([401, 404])("returns a typed error for upstream HTTP %s", async (status) => {
    const client = createClient(responseFetch(status, { error: "upstream detail" }));

    const request = client.getCareAgentContext({ walletAddress: WALLET });

    await expect(request).rejects.toMatchObject({
      code: "HTTP_ERROR",
      status,
    });
  });

  it("rejects a malformed upstream response", async () => {
    const client = createClient(responseFetch(200, { version: "1", wallet: {} }));

    await expect(
      client.getCareAgentContext({ walletAddress: WALLET }),
    ).rejects.toBeInstanceOf(LitClinicMalformedResponseError);
  });

  it("rejects an unsupported context version", async () => {
    const client = createClient(responseFetch(200, validContext({ version: "2" })));

    await expect(
      client.getCareAgentContext({ walletAddress: WALLET }),
    ).rejects.toBeInstanceOf(UnsupportedContextVersionError);
  });

  it("times out an unresponsive upstream request", async () => {
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
    const client = createClient(fetchImplementation, 10);

    await expect(
      client.getCareAgentContext({ walletAddress: WALLET }),
    ).rejects.toBeInstanceOf(LitClinicTimeoutError);
  });

  it("never exposes the service token in network errors", async () => {
    const fetchImplementation = vi.fn(async () => {
      throw new Error(`transport failed with ${SERVICE_TOKEN}`);
    }) as unknown as typeof fetch;
    const client = createClient(fetchImplementation);

    let caught: unknown;
    try {
      await client.getCareAgentContext({ walletAddress: WALLET });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(String(caught)).not.toContain(SERVICE_TOKEN);
    expect(JSON.stringify(caught)).not.toContain(SERVICE_TOKEN);
  });
});
