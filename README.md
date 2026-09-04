# LitClinic - ETHOnline 2026

## Overview

This repository is the standalone workspace for new LitClinic functionality developed during ETHOnline 2026. It starts as a minimal, security-conscious monorepo so the event architecture can evolve without exposing or coupling to the private production application.

Current status: Phase 1 implements the private LitClinic context boundary. Phase 2 adds a live The Graph provider and deterministic action planning that requires fresh onchain evidence.

## Existing LitClinic Product

LitClinic is an existing health-themed Web3 product running on LitVM LiteForge. Its production application and source code predate ETHOnline 2026 and remain private.

The existing product is not hackathon work and is not included in this repository. This repository may consume explicitly documented public or authenticated interfaces exposed by LitClinic, subject to separate review.

## ETHOnline 2026 Extension

The extension is intended to support independently deployable modules for:

- AI agent capabilities
- Partner integrations
- Smart contracts
- Onchain data access
- A web or API surface when required

The current extension provides sanitized wallet context for a future healthcare coordination agent. The Graph path queries live Uniswap V3 Ethereum activity and uses freshness and observed wallet activity to decide whether a workflow may continue or must require approval.

It does not expose medical records or clinical data, run medical inference, request payments, or execute transactions.

## Architecture

The repository is organized around explicit boundaries:

1. Applications consume shared packages and integration adapters.
2. The SDK owns communication with approved LitClinic interfaces.
3. The Graph integration supplies live, allowlisted onchain activity evidence.
4. The deterministic agent core combines both sources and fails closed when Graph evidence is missing, stale, or inactive.
5. Partner adapters remain independent from each other.
6. Secrets and private LitClinic implementation details stay outside this repository.

See [Architecture](docs/architecture.md), [Integration Boundary](docs/integration.md), and [Care Agent Context Layer](docs/context-layer.md).

## Repository Structure

```text
apps/
  web/          Optional public web application
  api/          Care Agent Context HTTP API
packages/
  agent-core/   Deterministic context composition and planning
  sdk/          Typed authenticated LitClinic client
  shared/       Validated public context contract
  config/       Validated extension configuration
contracts/      Hackathon-specific smart contracts
integrations/
  the-graph/    Live Uniswap V3 subgraph provider
docs/           Architecture, security, and disclosure
scripts/        Local validation utilities
```

The web application, AI inference, payment execution, and smart contracts remain intentionally unimplemented.

## Development

Prerequisites:

- Bun 1.3 or newer
- Node.js 20.19 or newer for compatible tooling

```bash
bun install
bun run typecheck
bun test
bun run secret:scan
```

Run the API in mock mode:

```bash
LITCLINIC_CONTEXT_MODE=mock bun run dev:api
```

On PowerShell:

```powershell
$env:LITCLINIC_CONTEXT_MODE="mock"
bun run dev:api
```

## Environment Variables

Copy `.env.example` to a local ignored environment file and provide only development or test credentials. Never commit secrets.

The Phase 1 configuration contract covers:

- Context mode
- Approved LitClinic API base URL
- Scoped service token
- Configurable context endpoint path
- The Graph Network API key
- Optional Graph gateway and subgraph overrides
- Local API port

No production values are included.

## Security

This repository denies environment files, private keys, certificates, credential directories, build output, and dependency trees through `.gitignore`. A local secret scanner and CI secret scan provide additional safeguards.

See [Security](docs/security.md).

## Hackathon Disclosure

LitClinic existed before ETHOnline 2026. Only work committed to this repository during the event will be presented as hackathon work.

See [ETHOnline Disclosure](docs/ethonline-disclosure.md).

## Partner Integrations

### The Graph

The first adapter queries the Uniswap V3 Ethereum Subgraph through The Graph Network gateway. It requests wallet-originated swap activity plus index metadata, converts the result to a strict public context, and supplies that evidence to the decision engine.

The decision engine requires approval when Graph data is stale, the index reports errors, no wallet activity is observed, or observed activity is too old. A normal workflow can continue only when both LitClinic permission and live Graph evidence pass.

The integration is implemented and covered by offline tests. ETHOnline qualification is not yet claimed because no live gateway query has been demonstrated in this repository session.

## Demo

Print deterministic sanitized mock context:

```bash
bun run demo:context 0x0000000000000000000000000000000000000001
```

The same command uses the remote provider when remote mode and its required environment variables are configured. It never prints the service token.

Run the load-bearing live Graph demonstration after placing a scoped Graph API key in an ignored local environment file:

```bash
bun run demo:agent-plan 0x0000000000000000000000000000000000000001 continue_workflow
```

The command succeeds only after a live Graph query and prints the resulting deterministic `continue` or `require_approval` plan. It never prints the Graph API key.

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE).
