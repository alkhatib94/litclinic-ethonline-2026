# ETHOnline 2026 Disclosure

## Pre-existing Product

LitClinic existed before ETHOnline 2026. It has an established private production codebase, infrastructure, product features, and operational history.

The production LitClinic codebase remains private. The existing application is not included here and is not being claimed as work created for the hackathon.

## Scope of This Repository

This repository contains only the new LitClinic extension work prepared for and developed during ETHOnline 2026. At initialization, it contains repository structure, interface boundaries, security controls, and disclosure documentation. It does not yet contain an implemented hackathon feature.

All hackathon-specific functionality will be developed with transparent Git history in this repository. Existing application source will not be copied into it.

## Use of Pre-existing Infrastructure

The extension may consume pre-existing LitClinic infrastructure only through documented boundaries such as:

- Public or authenticated HTTPS APIs
- A separately defined SDK or package interface
- Webhooks or versioned event schemas
- Public blockchain reads
- Reviewed blockchain transactions

Using an existing interface or deployed service does not make that pre-existing infrastructure hackathon work.

## Final Submission

Before submission, the README will list exactly what was designed and implemented during the event, identify any pre-existing services or contracts it consumes, and name only integrations that were actually completed and demonstrated.
