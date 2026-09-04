import { describe, expect, it } from "vitest";

import {
  createWorldAgentSignerRuntime,
  LiveWorldAgentAuthorizationProvider,
  MockWorldAgentAuthorizationProvider,
  WorldAgentkitMalformedResultError,
  WorldAgentkitTimeoutError,
  WorldAgentkitUnavailableError,
} from "./index";

const AGENT_ADDRESS = "0x0000000000000000000000000000000000000001";
const ANONYMOUS_HUMAN_ID = `0x${"a".repeat(64)}`;
const NOW = new Date("2026-09-04T12:00:00.000Z");

describe("World AgentKit authorization providers", () => {
  it("normalizes a registered human-backed AgentBook result", async () => {
    const provider = new LiveWorldAgentAuthorizationProvider({
      agentBook: {
        lookupHuman: async () => ANONYMOUS_HUMAN_ID,
      },
      clock: () => NOW,
    });

    const status = await provider.resolveAgent({ agentAddress: AGENT_ADDRESS });

    expect(status).toEqual({
      version: "1",
      provider: "world-agentkit",
      agentAddress: AGENT_ADDRESS,
      registered: true,
      humanBacked: true,
      checkedAt: NOW.toISOString(),
      live: true,
    });
    expect(JSON.stringify(status)).not.toContain(ANONYMOUS_HUMAN_ID);
    expect(status).not.toHaveProperty("humanId");
  });

  it("normalizes an unregistered AgentBook result", async () => {
    const provider = new LiveWorldAgentAuthorizationProvider({
      agentBook: {
        lookupHuman: async () => null,
      },
      clock: () => NOW,
    });

    await expect(
      provider.resolveAgent({ agentAddress: AGENT_ADDRESS }),
    ).resolves.toMatchObject({
      registered: false,
      humanBacked: false,
      live: true,
    });
  });

  it("fails loudly without falling back to mock when AgentBook is unavailable", async () => {
    const provider = new LiveWorldAgentAuthorizationProvider({
      agentBook: {
        lookupHuman: async () => {
          throw new Error("RPC unavailable");
        },
      },
    });

    await expect(
      provider.resolveAgent({ agentAddress: AGENT_ADDRESS }),
    ).rejects.toBeInstanceOf(WorldAgentkitUnavailableError);
    expect(provider.mode).toBe("live");
  });

  it("rejects a malformed AgentBook result", async () => {
    const provider = new LiveWorldAgentAuthorizationProvider({
      agentBook: {
        lookupHuman: async () => "not-a-human-id",
      },
    });

    await expect(
      provider.resolveAgent({ agentAddress: AGENT_ADDRESS }),
    ).rejects.toBeInstanceOf(WorldAgentkitMalformedResultError);
  });

  it("times out an unresponsive AgentBook lookup", async () => {
    const provider = new LiveWorldAgentAuthorizationProvider({
      agentBook: {
        lookupHuman: () => new Promise<string | null>(() => undefined),
      },
      timeoutMs: 10,
    });

    await expect(
      provider.resolveAgent({ agentAddress: AGENT_ADDRESS }),
    ).rejects.toBeInstanceOf(WorldAgentkitTimeoutError);
  });

  it("never exposes the configured private key", () => {
    const signerSecret = `0x${"1".repeat(64)}`;
    const runtime = createWorldAgentSignerRuntime(signerSecret);

    expect(runtime.agentAddress).toMatch(/^0x[0-9a-fA-F]{40}$/u);
    expect(JSON.stringify(runtime)).not.toContain(signerSecret);
    expect(runtime.signer).not.toHaveProperty("privateKey");
    expect(runtime.client.fetch).toBeInstanceOf(Function);
    expect(runtime.client.createHeader).toBeInstanceOf(Function);
  });

  it("does not include invalid signing material in errors", () => {
    const invalidSecret = `0x${"z".repeat(64)}`;

    let caught: unknown;
    try {
      createWorldAgentSignerRuntime(invalidSecret);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(String(caught)).not.toContain(invalidSecret);
  });

  it("marks mock verification as non-live", async () => {
    const provider = new MockWorldAgentAuthorizationProvider({
      registered: true,
      humanBacked: true,
      checkedAt: NOW,
    });

    await expect(
      provider.resolveAgent({ agentAddress: AGENT_ADDRESS }),
    ).resolves.toMatchObject({
      registered: true,
      humanBacked: true,
      live: false,
    });
  });
});
