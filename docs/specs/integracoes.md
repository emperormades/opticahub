# Spec de Modulo: Integracoes

## Purpose

Define how external systems enter Rupta OS without creating architectural drift.

## Scope

- WhatsApp
- payment webhooks
- OFX import
- supplier XML import
- fiscal integrations
- laboratory integrations

## Priority Framework

Each integration must be classified as:

- `Core-enabling`
- `Efficiency-enabling`
- `Differentiation`
- `Experimental`

Priority order:

1. `Core-enabling`
2. `Efficiency-enabling`
3. `Differentiation`
4. `Experimental`

## Mandatory Pre-Implementation Checklist

Before implementation starts, define:

- problem solved
- affected module
- dependency on core flows
- technical owner
- acceptance criteria
- rollback or freeze criteria

## Platform Rules

- integrations must not bypass tenant rules
- webhook flows must validate authenticity
- external failures must be visible and traceable
- integration logic should be isolated from raw route handlers when possible

## Acceptance Criteria

- integrations reduce manual work without weakening platform guarantees
- failures are observable
- no integration introduces unsafe trust in external payloads
