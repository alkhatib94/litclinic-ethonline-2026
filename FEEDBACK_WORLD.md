# World AgentKit Integration Feedback

Observed during LitClinic ETHOnline 2026 Phase 3 on September 4, 2026. TODO entries identify experiences that have not been tested and are not claims of failure.

## AgentKit Docs

Observed:

- The SDK reference clearly distinguishes agent-side `createAgentkitClient`, server hooks, and direct `createAgentBookVerifier` lookup.
- The canonical World Chain AgentBook location and `lookupHuman(address)` return shape are documented clearly.
- The production notes correctly warn that in-memory storage is unsuitable for persistent counters and nonce replay protection.
- The SDK reference does not state that the current `createAgentBookVerifier` implementation catches contract read errors and returns `null`. Source inspection was required to discover that an RPC failure can be indistinguishable from an unregistered agent without a monitored client.

## Integration Flow

Observed:

- Installing `@worldcoin/agentkit` version `0.2.1` with Bun was straightforward.
- `createAgentBookVerifier({ client })` accepted an injected viem public client and worked with the repository's strict TypeScript configuration.
- A live canonical AgentBook lookup completed successfully and returned unregistered for the test address.
- Agent registration is correctly separated from request-time lookup.

## Developer Portal Navigation

TODO:

- Request Sandbox App tester access.
- Record the exact team and sidebar path experienced by the tester.
- Record approval timing and any account mismatch behavior.

## Product Discovery

Observed:

- AgentKit documentation is under the Agents product area, while Sandbox documentation is under World ID.
- The AgentKit prize requires Sandbox testing, but the supported connection between AgentKit CLI registration and World ID Sandbox is not identified in either product area's primary integration guide.

## Search

Observed:

- The documentation index and direct SDK reference were more effective than broad site search for exact function signatures.
- Repository source was necessary to confirm current CLI constants, AgentBook error handling, and registration behavior.

TODO:

- Test Developer Portal search for AgentKit, AgentBook, Sandbox, and registration.

## Debugging Guidance

Observed:

- Generic `null` from `lookupHuman` is insufficient for distinguishing an unregistered address from an RPC or contract read failure.
- The official CLI status implementation performs a direct contract read and reports lookup errors, while the SDK verifier normalizes caught read failures to `null`. This behavior difference should be documented.
- The SDK offers a custom `client` option, which made a monitored fail-loudly wrapper possible.

## Sandbox App States

Documentation reviewed:

- Hot
- Cold
- Semi-cold
- Same-device
- Cross-device

TODO:

- Execute each applicable state with the Sandbox App.
- Record observed transitions, recovery behavior, and platform differences.

## Proof Flows

Observed:

- AgentKit CLI registration binds a World proof to the agent address and current AgentBook nonce.
- The current CLI source creates the proof request internally with a built-in app and action.

TODO:

- Complete a proof flow manually.
- Confirm whether the prize's Sandbox App can complete the AgentKit registration flow or requires a separate IDKit surface.
- Confirm proof return and registration transaction behavior without storing proof payloads.

## Test Users

TODO:

- Request and configure Sandbox App access.
- Create only the minimum Sandbox test account needed.
- Verify account reset behavior.
- Do not record personal identifiers in this repository.

## Errors

Observed:

- Live AgentBook connectivity succeeded for the test address, so no RPC error was observed.
- The unregistered state was returned normally and was not treated as an implementation failure.

TODO:

- Observe Sandbox cancellation, expiry, rejected proof, relay failure, and retry behavior.
- Confirm user-facing error codes for each state.

## Edge Cases

Implemented and tested offline:

- Registered human-backed agent
- Unregistered agent
- Provider unavailable
- Timeout
- Malformed AgentBook result
- Invalid agent address
- Approval not required
- Approval required with verified and unverified agents
- No live-to-mock fallback
- Sensitive identifier and private-key redaction

TODO:

- Re-registration with a new nonce.
- Smart contract agent signatures.
- Multiple agents backed by one anonymous human identifier.
- World Chain RPC degradation during authorization.

## Confusing Steps

Observed:

- The prize explicitly requires World ID Sandbox App testing.
- Sandbox documentation describes IDKit configured with `environment: sandbox`.
- The current AgentKit CLI registration interface documents no Sandbox flag and its source uses built-in registration configuration.
- It is unclear which supported path connects the required Sandbox test to canonical AgentBook registration without building a separate IDKit flow that could be mistaken for AgentKit registration.

## Missing Documentation

Requested:

- A dedicated AgentKit Continuity hackathon guide connecting Sandbox App testing, AgentKit CLI registration, AgentBook resolution, and expected evidence.
- Explicit documentation of `lookupHuman` error normalization.
- A machine-readable status API that distinguishes unregistered from unavailable.
- A documented Sandbox mode or supported Sandbox registration path for AgentKit CLI.

## Broken Behavior

No broken World behavior is claimed yet.

TODO:

- Update this section only after reproducing a defect against the current SDK or Sandbox App.

## Difficult-to-Test Behavior

Observed:

- Sandbox App distribution requires manual Developer Portal enrollment and platform-specific tester access.
- Human-backed registration requires interactive World verification and cannot be completed by an automated test.
- The absence of a documented AgentKit CLI Sandbox mode blocks an honest end-to-end Sandbox qualification claim.

TODO:

- Measure tester-access delay.
- Complete the first remote Sandbox round trip.
- Record screenshots and sanitized API evidence.
