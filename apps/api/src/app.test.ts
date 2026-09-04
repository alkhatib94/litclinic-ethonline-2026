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
});
