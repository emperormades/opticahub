# Spec de Modulo: Comercial

## Purpose

Define the commercial operating core for Rupta OS.

This module is part of the mandatory product core and must be stable before deeper expansion in analytics, automations, or advanced integrations.

## Scope

- customer registration and lookup
- prescriptions
- product catalog
- essential stock linkage
- service order creation
- service order lifecycle updates
- point-of-sale store workflow

## Core User Outcomes

- register or find a customer quickly
- create a service order without ambiguity
- attach items, prescription, and seller correctly
- track the current stage of an order
- use the service order as the operational backbone for fulfillment and payment

## Functional Requirements

- customers must belong to exactly one tenant
- service orders must only link to tenant-owned customers, products, and prescriptions
- status transitions must be traceable
- order numbers must be unique and predictable enough for store operations
- stock movement tied to item sales must be reliable

## Key Risks

- unchecked foreign IDs creating cross-tenant links
- duplicated logic between UI flows and route handlers
- status changes without operational history

## Required Hardening

- validate ownership on every linked entity
- keep order creation transactional
- standardize service-order creation in a service module
- ensure audit coverage for critical commercial actions

## Acceptance Criteria

- a user can create, retrieve, and update service orders consistently
- customer, order, and item data remain linked without orphaning
- no commercial mutation may affect a different tenant
