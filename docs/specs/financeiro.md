# Spec de Modulo: Financeiro

## Purpose

Define the financial operating layer that makes Rupta OS trustworthy for daily store usage.

This is mandatory core scope.

## Scope

- cash register
- financial transactions
- receivables
- commissions
- installments and carne
- daily and monthly financial summaries

## Core User Outcomes

- register money movement with confidence
- close the cash register reproducibly
- know what is pending, overdue, or already paid
- link payments correctly to service orders
- avoid commission drift and reconciliation confusion

## Functional Requirements

- every transaction must belong to one tenant
- transactions linked to service orders must validate order ownership
- marking an order as paid must only happen after ownership validation
- commissions must reference the correct seller and order within the same tenant
- installment flows must remain traceable to the original transaction

## Key Risks

- cross-tenant order linkage through free-form IDs
- hidden side effects in transaction routes
- cash logic diverging across multiple endpoints

## Required Hardening

- centralize transaction creation in a service
- validate linked order ownership before financial mutation
- standardize cash-open and cash-close flows
- protect write routes with `financial:write`

## Acceptance Criteria

- payments, cash, commissions, and installments remain consistent
- no financial mutation can modify another tenant's data
- daily operational finance is reproducible and auditable
