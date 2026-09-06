# Uniswap Developer Feedback — ETHOnline 2026

## Project

LitClinic — Agentic Trust for Web3 Healthcare

Repository:
https://github.com/alkhatib94/litclinic-ethonline-2026

## How We Use Uniswap

LitClinic reads live Uniswap V3 Ethereum swap activity as an onchain context signal for its ETHOnline agentic trust layer. Wallet-level swap activity and recent protocol activity are queried through The Graph, then normalized into constrained structured evidence (observed swap count, latest wallet activity, latest transaction hash when available, protocol freshness, indexing state, and provenance).

That Uniswap-derived evidence is consumed by a deterministic agent policy. When evidence is stale, missing, inactive, errored, or otherwise insufficient, LitClinic fails closed and returns `require_approval` rather than blindly allowing an agent workflow.

This submission does **not** execute trades and does **not** use the Uniswap API. It is a read-oriented Uniswap V3 protocol-activity integration.

## What Worked Well

- Uniswap V3 activity is a useful composable source of onchain behavioral context beyond trading UIs.
- The protocol data model (wallet-attributed swaps, timestamps, transaction hashes, and index metadata) maps cleanly into agent risk and trust inputs.
- Live protocol freshness and indexing health give concrete signals for fail-closed authorization decisions.

## Friction / Challenges

- Developers building non-trading or read-oriented agent use cases would benefit from more canonical examples that treat Uniswap protocol activity as context rather than as a swap UX surface.
- Documentation could more clearly cover using indexed Uniswap protocol data as input to AI/agent authorization, reputation, or risk systems.
- Stronger guidance on recommended indexing and data-access paths for near-real-time agent workflows would reduce integration ambiguity for teams that need freshness guarantees without executing trades.

## Suggestions

1. Publish a short “Uniswap as onchain context” guide for agent and authorization use cases (no trading required).
2. Add reference GraphQL queries for wallet activity, protocol freshness, and indexing health suitable for fail-closed agent policies.
3. Document recommended freshness windows and indexing-error handling patterns for agent workflows.
4. Provide examples that connect indexed Uniswap V3 activity to authorization or risk decisions rather than only to quote/swap flows.
5. Clarify preferred data-access paths (indexed protocol data vs APIs) for historical and near-real-time read-only integrations.

## Relevant Code

- Query (Uniswap V3 wallet/protocol swap activity):
  https://github.com/alkhatib94/litclinic-ethonline-2026/blob/main/integrations/the-graph/src/query.ts
  Lines: https://github.com/alkhatib94/litclinic-ethonline-2026/blob/main/integrations/the-graph/src/query.ts#L1-L29

- Provider (normalization into structured Uniswap-derived evidence):
  https://github.com/alkhatib94/litclinic-ethonline-2026/blob/main/integrations/the-graph/src/provider.ts
  Normalization: https://github.com/alkhatib94/litclinic-ethonline-2026/blob/main/integrations/the-graph/src/provider.ts#L194-L259

- Deterministic policy consumer (fail-closed reasoning):
  https://github.com/alkhatib94/litclinic-ethonline-2026/blob/main/packages/agent-core/src/index.ts
  Policy: https://github.com/alkhatib94/litclinic-ethonline-2026/blob/main/packages/agent-core/src/index.ts#L95-L160

## Disclosure

This submission uses Uniswap V3 protocol activity as a read-oriented onchain context source. It does not claim Uniswap API usage or trade execution.
