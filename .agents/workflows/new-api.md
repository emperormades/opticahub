---
description: Cria uma nova rota de API REST no padrão do VisionCore OS (auth, prisma, validação, erros).
---

## Como usar

Execute: `/new-api [metodo] [recurso]`

Exemplos:

- `/new-api GET products`
- `/new-api POST orders`

---

## Passos

1. Normalize `[recurso]` em `kebab-case` para usar como nome do arquivo de rota.

2. Identifique o domínio do recurso e leia o contrato correspondente em `docs/contracts/` (ex: `FINANCE_RULES.md` para recursos financeiros, `CRM_RULES.md` para clientes, `STOCK_RULES.md` para estoque). Consulte também `docs/contracts/DECISION_LOG.md` para verificar se há decisões que afetem esta rota.

3. Crie o arquivo `app/api/[recurso]/route.ts` com o seguinte boilerplate:
   - Importe `NextRequest, NextResponse` de `next/server`
   - Importe `auth` de `@/auth` e `prisma` de `@/lib/db`
   - Adicione verificação de sessão (`if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`)
   - Adicione verificação de `tenantId` da sessão
   - Inclua try/catch padrão com `console.error` e retorno 500 genérico

4. Para o método especificado:
   - `GET`: Adicione `prisma.[recurso].findMany({ where: { tenantId } })`
   - `POST`: Adicione parsing de `request.json()` e `prisma.[recurso].create({ data: { tenantId, ...body } })`

5. Avise no terminal quais arquivos foram criados.
