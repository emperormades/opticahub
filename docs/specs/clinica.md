# Spec de Modulo: Clinica

## Purpose

Define the clinic and scheduling track as a phased expansion built on top of the commercial core.

## Scope

- public scheduling
- internal scheduling
- clinical follow-ups
- scheduling linkage to customer and service-order flows

## Release Rule

This module expands only after the customer and service-order core is stable and public routes are hardened.

## Core User Outcomes

- capture new appointment requests safely
- convert appointments into internal triage and follow-up
- connect clinical events to the existing customer journey

## Functional Requirements

- public scheduling must use public-safe identifiers
- anonymous clients must not submit internal tenant IDs
- inactive tenants must not receive new public scheduling requests
- follow-ups must remain linked to tenant-owned orders and customers

## Key Risks

- public endpoint abuse
- weak tenant resolution in anonymous flows
- clinic workflows drifting away from the commercial record

## Required Hardening

- resolve tenants from slug or other public-safe identifier server-side
- add rate limiting to public scheduling
- validate scheduling payloads before task creation
- keep scheduling outcomes inside the tenant's internal workflow

## Acceptance Criteria

- public scheduling is safe, rate-limited, and tenant-correct
- clinic follow-ups reinforce the customer journey instead of fragmenting it
