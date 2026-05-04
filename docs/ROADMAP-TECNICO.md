# Roadmap Tecnico: Endurecimento da Plataforma

## Objective

Turn the current codebase into a safe, scalable, and maintainable platform base for the Rupta OS product roadmap.

This roadmap translates the product PRD into engineering priorities. It exists to stop uncontrolled drift in multi-tenancy, authorization, sensitive data handling, and module boundaries.

## Phase A: Platform Foundation

This phase is mandatory before accelerating new differentiators.

### A1. Multi-Tenancy Hardening

- Create a shared tenant context helper for authenticated requests
- Stop spreading `(session.user as any)` across route handlers
- Validate entity ownership before every critical mutation
- Remove patterns where foreign IDs are accepted and mutated without tenant checks
- Audit all core routes that create links across:
  - service orders
  - transactions
  - commissions
  - installments
  - stock
  - follow-ups

Acceptance:

- no cross-tenant mutation path remains in the core
- all critical handlers derive tenant identity from authenticated context

### A2. Authentication and Session Contracts

- Add typed NextAuth session augmentation for:
  - `user.id`
  - `user.tenantId`
  - `user.tenantSlug`
  - `user.tenantName`
  - `user.roles`
- Replace unsafe `any` session access with typed accessors
- Standardize helpers such as:
  - `requireSession()`
  - `getTenantContext()`

Acceptance:

- auth context is explicit, typed, and reused

### A3. RBAC Enforcement

- Keep `lib/rbac.ts` as the source for permission resolution
- Add server-side guards for critical modules
- Protect at minimum:
  - financial writes
  - tenant settings
  - stock adjustments
  - discount approvals
  - admin and audit routes

Acceptance:

- protected routes fail with `403` when permission is missing

### A4. Sensitive Data Protection

- Make `ENCRYPTION_KEY` mandatory in production
- Remove insecure fallback secrets from crypto utilities
- Encrypt sensitive PII before persistence
- Add normalized hashes where searchability is required
- Redact or minimize PII in audit payloads and logs

Acceptance:

- no sensitive CPF or RG stored as plain text in operational flow

### A5. Edge Validation

- Validate request payloads for public and mutation routes
- Standardize `400` responses for invalid input
- Reject malformed dates, IDs, and unsupported enum values before domain logic runs

Acceptance:

- input contracts become predictable and defensive

### A6. Public Surface Hardening

- Public routes must accept only public-safe identifiers
- Internal IDs must not be trusted from anonymous clients
- Add rate limiting to public endpoints
- Standardize webhook signature validation in production

Acceptance:

- public scheduling and webhook routes stop being soft targets

### A7. Environment and Operations Policy

- Define required env vars by environment
- Fail fast when critical configuration is missing in production
- Replace placeholder operational defaults with explicit requirements
- Treat local Docker as local-only development support

Acceptance:

- runtime behavior is explicit and predictable

### A8. Handler vs Service Boundaries

- Keep route handlers thin
- Move critical transactional logic into service-layer modules
- Standardize service inputs to receive:
  - typed actor context
  - tenant context
  - validated input

Acceptance:

- business rules are testable outside raw HTTP handlers

## Phase B: Sellable Core Reliability

### B1. Commercial Flow Integrity

- Harden customer creation and update
- Harden service-order creation and status transitions
- Ensure stock changes remain consistent under transactional paths
- Improve core search and filters for daily operations

### B2. Financial Flow Integrity

- Guarantee transaction to order consistency
- Enforce tenant validation before marking orders paid
- Stabilize commissions and installments
- Make daily cash and close operations reproducible

### B3. Audit and Traceability

- Ensure core actions emit minimal but useful audit entries
- Correlate financial and service-order events where appropriate

## Phase C: Operational Expansion Reliability

### C1. Scheduling

- Move public scheduling to public-safe identifiers
- Add tenant-active checks and abuse protection
- Connect public scheduling to a stable internal triage flow

### C2. Integrations

- Prioritize integrations that remove manual work from the core
- Encapsulate external systems behind clear integration modules
- Add retry and failure visibility for webhook-driven flows

### C3. UX Support for Critical Flows

- Align screen structure with hardened backend flows
- Remove UI affordances that bypass required business rules

## Phase D: Differentiation on Top of Stability

### D1. Reliable Analytics

- Only expand analytical depth once underlying events are trustworthy

### D2. Agents

- Only automate flows that are already deterministic
- Make task creation, execution, and visibility tenant-safe and traceable

## Cross-Cutting Standards

### API Standards

- derive tenant from auth context
- validate input before business logic
- avoid implicit side effects hidden in handlers

### Persistence Standards

- no plain-text storage for sensitive PII
- no unchecked cross-entity linking
- no writes that assume ownership without validation

### Documentation Standards

- every major feature belongs to a module spec
- every integration is documented before implementation
- every new critical flow states acceptance criteria

## Definition of "Ready for Expansion"

The platform is ready to accelerate beyond the core only when:

- multi-tenancy is consistently enforced
- auth context is typed and centralized
- RBAC is enforced in critical routes
- sensitive PII is protected
- public routes and webhooks are hardened
- build and typecheck are clean
- module boundaries are clear enough to extend safely
