# World ETHOnline Qualification Status

Assessment date: 2026-09-04  
Track: ETHOnline 2026 World prizes  
Primary target: AgentKit Continuity  
Secondary / no-Orb path: Selfie Check (Sandbox)

Evidence is local and observed unless marked otherwise. No production human-backed registration is claimed.

## Requirement matrix

| Requirement | Status | Evidence | Blocker | Mitigation |
| --- | --- | --- | --- | --- |
| AgentKit meaningful usage | PASS | Live `@worldcoin/agentkit` AgentBook lookup, signer runtime, fail-closed authorization, demos `demo:world` / `world:address` / `world:status` | None | Keep production path honest and fail-closed |
| Working app | PASS | Care Agent + Graph + World authorization API/demo pipeline | None | Continue dual-layer demo UX |
| AgentBook resolution | PASS | Live status/lookup for agent `0x0Fa757cF486555C92Ec37B84024a937C3f5E2B30` returns connected unregistered state | None | Resolve remains load-bearing even when unregistered |
| AgentBook registration | BLOCKED | Official CLI register reaches World App verification, then times out; status remains `registered: false` | Orb-backed Proof of Human unavailable to developer | Document blocker; do not fabricate registration |
| Production human-backed proof | BLOCKED | Same as registration; PoH is Orb credential per official docs | No accessible Orb | Keep AgentKit fail-closed; use Sandbox Selfie for remote testing |
| World ID Sandbox App testing | PARTIAL | Official Sandbox/Selfie path implemented in code (`WORLD_MODE=sandbox`, `demo:world:sandbox`) | Developer Portal Sandbox App enrollment + Selfie Check feature flag not completed yet | Manual portal/device steps below |
| Feedback document | PASS | `FEEDBACK_WORLD.md` updated with Orb/no-Orb and Sandbox findings | Remaining Sandbox UX still TODO until portal access | Continue appending observed evidence only |
| Selfie Check (optional prize) | PARTIAL | Official IDKit `selfieCheckLegacy` + `environment: sandbox` session helper implemented | Needs portal app/rp/signing key and Sandbox App install | Do not claim Selfie success until verified live |
| Passport/Document as AgentKit substitute | NOT REQUIRED / unavailable | No official AgentKit docs allow Passport/Document to register AgentBook | N/A | Do not invent substitute registration |
| Custom/testnet AgentBook for Sandbox proofs | NOT REQUIRED / unavailable | SDK custom contract is for World Chain deployments; no official Sandbox AgentBook bridge found | N/A | Do not deploy fake AgentBook |

## Recommended prize strategy

1. Submit AgentKit Continuity with honest evidence: meaningful AgentKit usage + live AgentBook resolution + working app + feedback + Sandbox Selfie testing once portal access is complete.
2. Explicitly disclose production AgentBook registration is blocked by Orb availability.
3. Use Sandbox Selfie Check to satisfy the Continuity Sandbox testing requirement without fabricating AgentBook registration.
4. If Sandbox Selfie Check completes end-to-end, also consider the separate Selfie Check prize with the same surface, keeping medical/healthcare boundaries intact.

## Manual blockers remaining

1. World Developer Portal: create/configure app + RP + action; store `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID`, `WORLD_ID_RP_SIGNING_KEY` in local `.env.local` only.
2. Request Selfie Check (Beta) enablement (`developers@toolsforhumanity.com`) if not already enabled.
3. Enroll in World ID Sandbox App (Developer Portal -> World ID Sandbox -> iOS TestFlight or Android private track).
4. Run `WORLD_MODE=sandbox bun run demo:world:sandbox` and complete Selfie Check in the Sandbox app.
5. Capture sanitized screenshots / timestamps after success.
