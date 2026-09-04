# World AgentKit Authorization Layer

## Target Prize

ETHOnline 2026 - World AgentKit Continuity.

This phase extends the existing LitClinic Care Agent with human-backed agent authorization. World verification is used only for anti-bot controls, privileged Web3 workflow authorization, rate limits, access control, and future execution boundaries. It is never used as medical eligibility and never determines access to healthcare.

## Why World Is Load-Bearing

The deterministic reasoner can return `require_approval`. When it does, final execution permission depends on a live AgentBook resolution:

```text
LitClinic safe context + The Graph live context
                        |
                        v
               deterministic reasoning
                        |
              require_approval
                        |
                        v
        World AgentKit AgentBook resolution
                        |
             +----------+----------+
             |                     |
       human-backed          not verified
             |                     |
       authorized                blocked
```

Removing or failing World AgentKit makes the privileged path fail closed with `verification-unavailable`. When reasoning returns `continue`, World lookup is skipped and the result is `approval-not-required`.

## Official AgentKit APIs

The integration is pinned to `@worldcoin/agentkit` version `0.2.1`, verified against the official SDK reference on September 4, 2026.

- `createAgentBookVerifier({ rpcUrl?, client? })`
- `agentBook.lookupHuman(agentAddress)`
- `createAgentkitClient({ signer })`
- `AgentkitSigner`

`createAgentBookVerifier` resolves the canonical AgentBook deployment on World Chain (`eip155:480`). `lookupHuman` returns an anonymous human identifier or `null`.

The agent-side signer uses a viem `LocalAccount` and the official `createAgentkitClient` API. No x402 payment or Arc action is implemented in this phase.

## AgentBook Usage

The live provider validates an EVM agent address and performs a bounded AgentBook lookup. A non-null anonymous identifier is immediately normalized to:

- `registered: true`
- `humanBacked: true`

A null result becomes:

- `registered: false`
- `humanBacked: false`

The anonymous identifier is never returned, logged, stored, or included in an error.

The official verifier converts contract read failures to `null`. To avoid silently treating an RPC failure as an unregistered agent, the integration supplies a monitored viem client and promotes read failures to `verification-unavailable`.

## Privacy Model

Public responses contain only:

- Agent wallet address
- Registration boolean
- Human-backed boolean
- Check timestamp
- Live or mock marker
- Normalized authorization result

They exclude the anonymous human identifier, World proof payloads, nullifier hashes, private keys, medical data, personal identity, and raw AgentBook results.

## Authorization Logic

- `continue`: lookup skipped, execution allowed.
- `require_approval` plus registered human-backed agent: execution allowed.
- `require_approval` plus unregistered agent: execution blocked.
- `require_approval` plus agent not human-backed: execution blocked.
- `require_approval` plus timeout, RPC failure, or malformed result: execution blocked with a service error.

Human-backed status establishes the agent trust boundary. It does not represent medical consent or clinical eligibility.

## Live and Mock Distinction

`LiveWorldAgentAuthorizationProvider` uses the official AgentKit SDK and canonical AgentBook lookup. It returns `live: true` only after a successful live lookup.

`MockWorldAgentAuthorizationProvider` is deterministic, returns `live: false`, and is used only by tests and the explicit mock demo. There is no automatic fallback from live to mock.

## Setup

Optional local variables:

- `WORLD_AGENT_PRIVATE_KEY` - local EVM signer used to derive the configured agent address
- `WORLD_CHAIN_RPC_URL` - optional custom World Chain HTTPS RPC passed to AgentBook verification

Store values only in ignored `.env.local`. Never commit or print them.

The read-only status command does not require a private key:

```bash
bun run world:status 0x0000000000000000000000000000000000000001
```

The complete live flow requires the existing The Graph key and a local agent signer:

```bash
bun run demo:world <user-wallet> continue_workflow
```

## Agent Registration

Registration is intentionally manual. The official command is:

```bash
npx @worldcoin/agentkit-cli register <agent-address>
```

Check status without registration:

```bash
npx @worldcoin/agentkit-cli status <agent-address>
```

Registration opens a World verification flow and submits to AgentBook through the official hosted relay by default. Do not run registration until the agent address and intended environment have been reviewed.

## World ID Sandbox Requirement

The prize requires remote testing with the World ID Sandbox App. Official Sandbox documentation requires:

1. Requesting iOS TestFlight or Android private-track access in the World Developer Portal.
2. Installing the World ID Sandbox App.
3. Configuring IDKit with `environment: sandbox`.
4. Completing a same-device or cross-device proof flow.

The current AgentKit CLI registration source does not expose a Sandbox option. It uses a built-in AgentBook registration app and action for the canonical flow. A separate IDKit Sandbox surface must not be presented as AgentBook registration unless World confirms the supported bridge.

Sandbox execution is therefore blocked on manual Developer Portal access and confirmation of the supported AgentKit-to-Sandbox registration path. No Sandbox success is claimed.

## Demo Steps

1. Enter a user wallet.
2. Fetch live Uniswap V3 context through The Graph.
3. Produce deterministic Care Agent reasoning.
4. Continue directly when approval is not required.
5. When approval is required, derive the configured agent address locally.
6. Resolve that address through AgentBook.
7. Display only normalized human-backed status.
8. Allow final execution only for a successfully resolved human-backed agent.

No Arc action, payment, medical inference, or transaction is executed.

## Qualification Evidence

- Agent wallet: `[TODO - configure and review local agent signer]`
- AgentBook live lookup: `UNREGISTERED` for `0x0000000000000000000000000000000000000001` at `2026-09-04T11:57:21.784Z`
- Sandbox test timestamp: `[TODO - manual Sandbox App test required]`
- Successful human-backed verification: `[TODO - requires manual registration and World verification]`
- Screenshots: `[TODO - capture after Sandbox and registered-agent demo]`
- API response evidence: `[TODO - capture after configured-agent live demo]`
- Relevant Git commits: `a6b38f5`, `3997c5a`, `61d8539`, `5b8f8d3`

Current status: live AgentBook connectivity is verified, but the tested address is unregistered. Full prize qualification is not yet claimed.
