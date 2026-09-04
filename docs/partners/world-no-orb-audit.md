# World No-Orb Qualification Audit

Audit date: 2026-09-04  
Workspace: `D:\TOPME\litclinic-ethonline-2026`  
Packages inspected: `@worldcoin/agentkit@0.2.1`, `@worldcoin/agentkit-cli@0.2.0`

This document records official findings only. It does not claim Sandbox or Selfie success until observed.

## Sources

| Source | URL |
| --- | --- |
| ETHOnline World prizes | https://ethglobal.com/events/ethonline2026/prizes/world |
| Integrate AgentKit | https://docs.world.org/agents/agent-kit/integrate |
| AgentKit SDK Reference | https://docs.world.org/agents/agent-kit/sdk-reference |
| AgentKit CLI registration guide | https://github.com/worldcoin/agentkit/blob/main/cli/REGISTRATION.md |
| AgentKit CLI source (`cli/src/index.ts`) | https://github.com/worldcoin/agentkit/blob/main/cli/src/index.ts |
| Proof of Human credential | https://docs.world.org/world-id/credentials/1 |
| Selfie Check credential | https://docs.world.org/world-id/credentials/11 |
| Configure Credentials | https://docs.world.org/world-id/idkit/credentials |
| IDKit integrate | https://docs.world.org/world-id/idkit/integrate |
| What is Sandbox | https://docs.world.org/world-id/sandbox/what-is-sandbox |
| Sandbox access | https://docs.world.org/world-id/sandbox/sandbox-access |
| Testing Selfie Check in Sandbox | https://docs.world.org/world-id/sandbox/testing-selfie-check |

## Exact blocker

Observed CLI registration for agent `0x0Fa757cF486555C92Ec37B84024a937C3f5E2B30`:

1. CLI prints a World App verification URL (`HUMAN ACTION REQUIRED`).
2. World App requires Orb-backed Proof of Human to complete the flow in the developer's region.
3. Session times out with `VERIFICATION_FAILED` / `timed out waiting for World ID completion`.
4. Live AgentBook status remains `registered: false`.

Production AgentBook lookup itself works. Registration is the blocked step.

## What credential AgentKit registration requests

From published CLI source (`cli/src/index.ts`):

- Uses `@worldcoin/idkit-core` `createWorldBridgeStore()`.
- Fixed production app: `app_id = app_a7c3e2b6b83927251a0db5345bd7146a`.
- Fixed action: `agentbook-registration`.
- Signal is Solidity-encoded `(agentAddress, nonce)`.
- No `environment: sandbox` option.
- No credential preset selection (`proofOfHuman`, `passport`, `selfieCheckLegacy`, etc.).
- No CLI flag to choose Orb / Passport / Document / Selfie.

Official PoH docs define Proof of Human as Orb-backed. The CLI registration path is a production World ID verification for AgentBook registration, not a Selfie Check flow.

## Can Passport / Document replace Orb for AgentKit?

Official finding: **No documented replacement.**

- Credential docs list Passport and Identity Check as separate IDKit offerings.
- AgentKit CLI and Integrate AgentKit docs do not state that Passport or Document proofs can register an agent in AgentBook.
- The CLI hardcodes one bridge client (`app_id` + `agentbook-registration`) with no credential override.

## Can Selfie Check replace Orb for AgentKit registration?

Official finding: **No.**

- Selfie Check is a separate medium-assurance IDKit credential for liveness / abuse resistance.
- Selfie Check docs say anyone with World ID App can complete it without Orb.
- AgentKit Continuity and Selfie Check are separate ETHOnline prizes.
- No official document states that a Selfie Check proof can call `AgentBook.register(...)`.

## Does AgentKit CLI have Sandbox / staging mode?

Official finding: **No.**

- Installed CLI `--llms` / `--help` for `@worldcoin/agentkit-cli@0.2.0` expose only `register` and `status`.
- Options: `--auto`, `--manual`, optional `API_URL`.
- No `--sandbox`, `--staging`, or credential flags.
- CLI source uses production World Chain AgentBook `0xA23aB2712eA7BBa896930544C7d6636a96b944dA` and production World App bridge.

## Base Sepolia / custom AgentBook and Sandbox proofs

| Question | Official finding |
| --- | --- |
| Does REGISTRATION.md mention Base / Base Sepolia? | Yes. It lists Base and Base Sepolia deployments and a `--network` example. |
| Does installed CLI `0.2.0` expose `--network`? | No. Current `--llms` and published `cli/src/index.ts` on main do not define a network option. |
| Does SDK allow custom AgentBook address? | Yes. `createAgentBookVerifier({ contractAddress, rpcUrl, client })` for custom World Chain deployments. |
| Does that accept Sandbox proofs? | Not documented. SDK Reference says lookup resolves against World Chain AgentBook. Sandbox docs say Sandbox proofs are non-production and for IDKit validation only. |
| Is there an official Sandbox AgentBook? | Not found in current AgentKit or Sandbox docs. |

Conclusion: custom/test AgentBook overrides are for non-canonical World Chain deployments. They are not an official bridge from Sandbox Selfie proofs into production AgentBook registration.

## World ID Sandbox capabilities (official)

Sandbox can:

- Install gated Sandbox World ID apps (TestFlight / private Play track).
- Point IDKit at `environment: sandbox`.
- Run end-to-end relying-party journeys without production identities.
- Test Selfie Check Hot / Cold / Semi-cold flows once Selfie Check is enabled for the app.
- Support same-device and cross-device (QR) flows.

Sandbox cannot, based on current docs:

- Be selected from AgentKit CLI registration.
- Be claimed as production AgentBook human-backed registration.
- Issue production uniqueness proofs.

## Best official no-Orb path for this submission

Priority after audit:

1. Keep production AgentKit + AgentBook resolution as honest fail-closed evidence.
2. Use World ID Sandbox + Selfie Check as the official no-Orb remote test path required by ETHOnline.
3. Do not invent Sandbox-to-AgentBook registration.
4. Optionally pursue the separate Selfie Check prize with the same Sandbox surface, without deleting AgentKit.

## Local truthful state at audit time

| Item | State |
| --- | --- |
| Agent wallet | `0x0Fa757cF486555C92Ec37B84024a937C3f5E2B30` |
| Production AgentBook | connected; `registered: false` |
| Live AgentBook lookup | working |
| World AgentKit integration | working |
| Production human-backed registration | blocked by Orb availability |
| Sandbox Selfie Check | code path prepared; Developer Portal / Sandbox App access still required |
