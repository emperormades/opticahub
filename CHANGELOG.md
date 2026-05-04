# 📝 CHANGELOG.md — Registro de Mudanças do VisionCore OS
# Atualizado pela IA ou pelo desenvolvedor após cada sessão de trabalho.
# Permite rastrear o que mudou, quando, e porquê.

---

## Formato
Cada entrada segue: **[DATA] [MÓDULO] — O que mudou**

---

## [2026-03-03] DX & Infraestrutura

### Adicionado
- `.wslconfig` — Limite de memória do WSL para 6GB RAM / 4 CPUs
- `.antigravityignore` — Cegueira seletiva da IA para acelerar buscas
- `.vscode/settings.json` — Exclusão de watchers para `.next/` e `node_modules/`
- Husky + lint-staged — Guarda-costas de pre-commit (bloqueia TypeScript com erros)
- React Compiler — Memoização automática sem `useMemo`/`useCallback`
- `cross-env` — Limite de RAM do Node a 4GB no `npm run dev`
- `tsx` substituiu `ts-node` nos scripts de banco (db:seed, test:core)

### Adicionado (Contratos de Domínio)
- `docs/contracts/FINANCE_RULES.md` — Caixa, Estorno, Crediário, Comissões
- `docs/contracts/OPTICAL_RULES.md` — Receituário, Graus, Diâmetros
- `docs/contracts/STOCK_RULES.md` — Movimentação, Curva ABC, XML
- `docs/contracts/CRM_RULES.md` — Clientes, Prescrições, Crédito
- `docs/contracts/AUTH_RULES.md` — Roles, Permissões, Multi-tenant
- `docs/contracts/UX_PATTERNS.md` — Padrões visuais de interface
- `docs/contracts/SERVICE_MAP.md` — Mapa GPS de todos os services
- `docs/contracts/GLOSSARY.md` — Tradução de jargão óptico para código
- `docs/contracts/ERROR_PATTERNS.md` — Catálogo de erros com soluções
- `docs/contracts/DECISION_LOG.md` — Registro de decisões arquiteturais
- `docs/contracts/COMPONENT_REGISTRY.md` — Catálogo de componentes existentes
- `docs/contracts/SCHEMA_ANNOTATIONS.md` — Anotações e relações do banco
- `docs/contracts/TEST_FIXTURES.md` — Dados canônicos para testes

### Adicionado (Workflows)
- `.agents/workflows/new-dashboard.md` — Macro para criar tela nova
- `.agents/workflows/new-api.md` — Macro para criar rota REST
- `.agents/workflows/debug.md` — Macro de investigação de erros
- `.agents/workflows/refactor.md` — Macro de refatoração em lote

### Otimizações no next.config.ts
- `experimental.optimizePackageImports` para lucide-react e recharts
- `experimental.reactCompiler: true`
- `serverExternalPackages: ['bcryptjs']`

### Otimização no lib/db.ts
- Prisma silenciado: só loga queries acima de 100ms (Slow Query Alert)

---

## [2026-03-02] Funcionalidades de Negócio

### Adicionado
- Tela de Caixa Diário (`dashboard/financeiro/caixa/page.tsx`) com Sangria
- Tela de Conciliação Bancária com fila priorizada
- Agendamento público (`agendar/[tenantSlug]`) com BookingForm
- Validação de pagamentos split na API de Orders
- Lógica de estorno atômico no cancelamento de OS (estoque + comissões + caixa)
- Seção "O Comando Central" no Backlog (Margens, Travas, Comissões, Logs)
