# PRD Mestre: Rupta OS 2026

## 1. Product Summary

Rupta OS is being built as a vertical SaaS platform for independent optical stores in Brazil. The product combines commercial operations, service orders, stock, cash, financial workflows, clinical scheduling, and automations in a single platform.

The project already has broad functional ambition and a real codebase. The current priority is not adding width at any cost. The priority is to define a clear product hierarchy so the platform grows in a disciplined way.

Strategic defaults:

- Target market: independent optical stores
- 12-month north star: robust operations
- Scope posture: full-suite vision, delivered as core plus phased expansion
- Product principle: do not scale breadth before consolidating depth in the operational core

## 2. Current Stage

### 2.1 What exists today

- Functional base in `Next.js + Prisma + Postgres`
- Multi-domain schema already covering:
  - tenants and users
  - RBAC
  - customers and prescriptions
  - catalog and stock
  - service orders
  - finance
  - AI agents
  - analytics and DRE
  - lab audit
  - clinical scheduling
  - fiscal and purchasing

### 2.2 Product interpretation

- The project is no longer in problem discovery mode.
- The project is in platform definition mode.
- The main risk is not lack of vision.
- The main risk is uncontrolled expansion without sequencing.

### 2.3 Current product diagnosis

- The macro direction is strong.
- The operational core is not yet mature enough to support deep expansion across all pillars.
- The product must move from feature-first thinking to platform-first execution.

## 3. Vision

Build the operating system for independent optical stores in Brazil, unifying customer operations, service orders, stock, cash, finance, scheduling, and automations in a single platform with reliable daily usage and modular long-term growth.

## 4. Value Proposition

- Reduce operational fragmentation
- Centralize the optical customer journey
- Replace manual processes with traceable workflows
- Add intelligence without forcing the business to operate across disconnected tools

## 5. Product Thesis

Rupta OS should win first through operational solidity and process clarity.

AI, analytics, integrations, and automations are amplifiers. They are not substitutes for a strong transactional core.

## 6. Ideal Customer Profile

### 6.1 Primary ICP

Independent optical stores with 1 to 3 units that need to centralize:

- customer handling
- customer records
- service orders
- stock
- daily financial control

### 6.2 Not the initial focus

- Large multi-unit chains with complex governance needs
- Pure clinical operations without strong commercial workflows
- Optical e-commerce-first businesses as the primary product driver

### 6.3 Why this ICP

- Faster sales cycle
- Lower operational variance
- Faster validation of the core workflow
- Better retention signal for a product meant to be the system of record

## 7. 12-Month Objective

Deliver a robust, reliable, commercially demonstrable operating platform for independent optical stores, with a base that can grow by module without structural rewrites.

Expected outcome at the end of the cycle:

- technically coherent
- commercially demonstrable
- functionally solid in the core
- ready for phased expansion

Not the primary objective:

- a fully deep “complete suite” on every pillar
- maximizing raw feature count
- making AI the headline before the core is hardened

## 8. Non-Negotiable Principles

- Core before satellites
- Every new feature must belong to a product track
- No new module enters without an owner, adoption criteria, and intended impact
- Expansion must reuse the core, never bypass it
- Do not duplicate customer, payment, stock, or scheduling flows in parallel
- Multi-tenancy, authorization, audit, and sensitive data handling are platform infrastructure

## 9. Anti-Frankenstein Rule

A feature only enters the roadmap if it satisfies all four:

- It solves a recurring ICP problem
- It depends on stabilized structures or helps stabilize them
- It has a clear integration point with the core
- It has explicit success criteria or discard criteria

## 10. Product Structure

### 10.1 Mandatory Core

#### A. Commercial Operations

Includes:

- customers
- prescriptions
- catalog
- essential stock
- service orders
- point-of-sale workflow

Success conditions:

- service orders are created without inconsistency
- service order status changes are traceable
- customer, items, payments, and history are linked without ambiguity
- stock decreases reliably
- users can quickly find customers, orders, and products

#### B. Operational Finance

Includes:

- cash register
- transactions
- receivables
- commissions
- installment and carne flows
- basic financial summary

Success conditions:

- all money movement is traceable
- cash close is reproducible
- payments are linked to service orders correctly
- overdue receivables are visible
- commissions do not drift from tenant or order ownership

#### C. Tenant Administration

Includes:

- authentication
- permissions
- tenant settings
- audit
- tenant isolation

Success conditions:

- tenant isolation is consistent
- RBAC is enforced on critical routes
- audit trail is trustworthy at least for core actions
- tenant settings do not expose unsafe controls

### 10.2 Expansion Tracks

#### D. Clinic and Scheduling

Includes:

- public scheduling
- internal clinic scheduling
- follow-ups
- linkage with the customer journey

Dependency:

- only after the customer and service-order core is stable

#### E. Operational Integrations

Includes:

- WhatsApp
- OFX
- supplier XML
- payment webhooks
- fiscal
- laboratory integrations

Priority rule:

1. close core operational gaps
2. reduce manual work
3. add advanced value

#### F. Analytics and DRE

Includes:

- dashboards
- sales indicators
- DRE
- predictive CRM

Dependency:

- only after transactional data becomes reliable

#### G. Agents and Automations

Includes:

- collections
- quote recovery
- reminders
- assisted service

Rule:

- no automation before the underlying process is stable

## 11. Delivery Phases

### Phase A: Platform Foundation

Objective:

- prevent future erosion

Must deliver:

- hard multi-tenancy
- standardized auth and tenant context
- real RBAC
- PII protection
- payload validation
- public route and webhook protection
- environment and secret policy
- cleaner separation between handlers and services

### Phase B: Sellable Core

Objective:

- make the product commercially usable for the ICP

Must deliver:

- customer to order to payment to cash flow
- consistent stock behavior
- useful daily filters and queries
- trustworthy cash close and receivables
- essential audit coverage

### Phase C: Assisted Expansion

Objective:

- expand value without breaking the core

Must deliver:

- public and internal scheduling
- priority integrations
- refined OFX and XML workflows
- practical operational notifications
- UX improvements on critical flows

### Phase D: Differentiation

Objective:

- become harder to replace

Must deliver:

- reliable analytics
- consolidated DRE
- meaningful tenant agents
- configurable automations
- premium-plan differentiation

## 12. Design Direction

Design is not a late visual polish layer. At this stage, design means operational flow definition.

Design order:

1. map critical workflows
2. define information hierarchy
3. reduce ambiguity in actions
4. standardize components
5. refine visual identity

Critical flows to design first:

- login and tenant context
- customer creation and search
- service order creation
- payment registration
- cash close
- public scheduling
- order tracking

The interface must optimize for:

- clarity
- low ambiguity
- speed of use by counter staff
- visible process states
- obvious error and confirmation states

## 13. Integration Policy

Every integration must be labeled as one of:

- `Core-enabling`
- `Efficiency-enabling`
- `Differentiation`
- `Experimental`

Priority order:

1. `Core-enabling`
2. `Efficiency-enabling`
3. `Differentiation`
4. `Experimental`

Before development starts, each integration must define:

- problem solved
- affected module
- dependency on the core
- technical owner
- done criteria
- rollback or freeze criteria

## 14. Functional Requirements by Stage

### Stage 1: Mandatory Now

- tenant auth with strong typing
- permission model by module
- complete customer workflow
- consistent service orders
- safe financial transaction flow
- reliable basic cash register
- stock adjustments with history
- minimum audit trail
- tenant settings
- validation and security for public routes

### Stage 2: Mandatory Before Strong Commercial Expansion

- solid public scheduling
- initial WhatsApp integration
- lower-friction installment and collection flows
- minimum operational dashboards
- stabilized OFX and XML import flows

### Stage 3: Differentiators

- deeper DRE
- predictive CRM
- tenant agents
- configurable automations
- richer fiscal flows
- advanced logistics and purchasing

## 15. Non-Functional Requirements

### Architecture

- all critical operations must respect tenant context
- no sensitive mutation may depend on unchecked IDs
- critical business logic should move from route handlers into services

### Security

- sensitive PII must be encrypted
- required secrets must be enforced by environment
- webhooks must be signed
- public routes must be rate-limited
- critical routes must enforce authorization

### Operations

- builds must be reproducible
- logs must be structured enough for incident tracing
- local and production environments must be clearly separated
- missing critical configuration must fail fast

### Quality

- minimum CI
- critical flow tests
- living documentation
- stabilized API contracts for key modules

## 16. Success Metrics

### Product

- predictable time to create a complete service order
- higher completion rate on the sales flow without operational error
- real adoption of daily finance usage
- recurring usage by store staff

### Technical

- zero cross-tenant mutations
- zero sensitive PII stored in plain text
- zero critical routes without authorization
- green build and typecheck
- traceable webhook and job incidents

### Business

- smoother onboarding for a new store
- retention based on daily core usage
- perception of Rupta OS as the store's main operating system

## 17. Governance

This PRD is the master product document. It must be maintained together with:

- `docs/ROADMAP-TECNICO.md`
- `docs/specs/comercial.md`
- `docs/specs/financeiro.md`
- `docs/specs/clinica.md`
- `docs/specs/integracoes.md`
- `docs/specs/analytics.md`
- `docs/specs/agentes.md`

No new feature should go directly into implementation before answering:

- which track it belongs to
- which phase allows it
- which core dependency it touches
- which metric proves it is worth keeping
