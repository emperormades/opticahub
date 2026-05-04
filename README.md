# VisionCore OS

Repositorio principal do **VisionCore OS**, um SaaS vertical para oticas independentes, construido em `Next.js + Prisma + PostgreSQL` com foco em multi-tenancy, previsibilidade operacional e crescimento modular.

Este documento e o guia tecnico de entrada para quem esta trabalhando no codigo hoje.

## Documentos Principais

- [Plano Mestre de Execucao](docs/EXECUTION-MASTER-PLAN.md)
- [Master PRD & Roadmap](docs/VISIONCORE_MASTER_PRD.md)
- [Backlog Executivo de Produto](docs/FUNCIONALIDADES_PENDENTES.md)
- [Release Checklist do Piloto](docs/RELEASE-CHECKLIST.md)
- [Onboarding Tecnico da Loja Piloto](docs/PILOT-ONBOARDING.md)
- [Convencao de Rastreabilidade](docs/OPERATIONS-TRACEABILITY.md)
- [DESIGN.md](DESIGN.md)

## Onde Estamos Focados Agora

O projeto esta no fim da **Fundacao de Plataforma (Fase A)** e entrando na consolidacao do **Core Vendavel (Fase B)**.

O foco imediato nao e abrir novos modulos. O foco correto e consolidar o core comercial-financeiro em cima da base ja endurecida:

1. Fechar o fluxo `cliente -> OS -> pagamento -> caixa` sem divergencia operacional.
2. Manter a arquitetura em `validation + route fina + service`.
3. Melhorar os fluxos criticos de uso real no dashboard e nas rotas publicas.
4. Travar regressao com CI minima, `typecheck` e `build`.
5. Evitar novas frentes que contornem o core.

Se voce vai codificar hoje, priorize trabalho que se encaixe em `Core Revenue Operations`, `Workflow UX` ou `Operational Reliability`. Evite abrir novas frentes de features experimentais antes de o core ficar operacionalmente consistente.

## Stack e Setup

**Stack:** TypeScript, Next.js (App Router), Prisma, PostgreSQL e NextAuth.

**Setup local:**

1. Garanta Node.js 18+.
2. Preencha `/.env` a partir de `/.env.example`.
3. Instale dependencias com `npm install`.
4. Rode `npx prisma generate`.
5. Rode `npm run db:push`.
6. Se necessario, rode `npm run db:seed`.

**Comandos frequentes:**

- `npm run dev`
- `npm run db:studio`
- `npm run typecheck`
- `npm run build`

## Validacao Minima

Toda mudanca importante no core deve passar, no minimo, por:

1. `npm run typecheck`
2. `npm run build`

O repositorio agora tambem possui CI minima em [ci.yml](/c:/Users/mathe/OneDrive/Desktop/Antigravidade/rupta.optics/.github/workflows/ci.yml), executando esses dois passos em `push` e `pull_request`.

## Regras de Engenharia

Nenhum bloco de codigo ou PR deve violar estes pilares:

1. **Multi-tenancy absoluto:** nada de leitura ou mutacao critica sem `tenantId`.
2. **Timeline de OS obrigatoria:** mudanca de estado relevante exige evento correspondente.
3. **Financeiro rastreavel:** pagamento, comissao, parcela e caixa precisam nascer de fluxos explicitamente vinculados.
4. **Handlers finos:** regra de negocio critica deve ficar em `lib/services`, nao espalhada em rotas.
5. **Validacao de borda:** payloads e query params de rotas criticas devem ser validados antes de tocar no dominio.

## Regra de Priorizacao

Toda demanda nova deve passar por este funil:

1. Fortalece o core?
2. Reduz risco estrutural?
3. Melhora a operacao diaria da otica?
4. Reduz retrabalho relevante?
5. Aumenta clareza e velocidade de uso?
6. So depois: aumenta diferenciacao?

Se nao satisfaz os primeiros itens, deve ser adiada.
