# 📜 ERROR_PATTERNS.md — Catálogo de Erros Comuns e Soluções

# Quando a IA encontrar um erro, deve consultar este arquivo ANTES de iniciar debug exploratório.

---

## 1. Erros de Banco de Dados (Prisma)

### `PrismaClientKnownRequestError: P2002`

**Causa:** Violação de unique constraint. Tentou criar registro duplicado.
**Solução:** Verificar se já existe o registro antes de criar. Usar `upsert` quando apropriado.

### `PrismaClientKnownRequestError: P2003`

**Causa:** Foreign key constraint falhou. Referenciou um ID que não existe.
**Solução:** Verificar se o registro pai (ex: `customerId`, `orderId`) existe antes de criar o filho.

### `PrismaClientKnownRequestError: P2025`

**Causa:** Record not found. Tentou atualizar/deletar algo que não existe.
**Solução:** Verificar existência com `findUnique` antes de `update` ou `delete`.

### `PrismaClientInitializationError`

**Causa:** Banco de dados não está rodando (Docker parado).
**Solução:** Executar `npm run db:up` ou verificar se o Docker Desktop está ativo.

---

## 2. Erros de Autenticação

### `401 Unauthorized` em rotas de API

**Causa:** Sessão expirada ou não autenticado.
**Solução:** Verificar se `auth()` está importado de `@/auth` e se a sessão é verificada antes do processamento.

### `session.user.tenantId undefined`

**Causa:** O adapter do NextAuth não está retornando o `tenantId` na sessão.
**Solução:** Verificar callbacks do NextAuth em `auth.ts` → callback de `session` deve injetar `tenantId`.

---

## 3. Erros de Runtime (Next.js)

### `TypeError: Cannot read properties of undefined`

**Causa:** Dados do fetch ainda não carregaram OU resposta da API veio diferente do esperado.
**Solução:** Verificar se há loading state. Usar optional chaining (`?.`). Nunca assumir que dados existem.

### `Hydration mismatch`

**Causa:** Server render e client render geraram HTML diferente.
**Solução:** Mover lógica que depende de `window`, `Date`, ou `Math.random` para dentro de `useEffect`.

### `Module not found: Can't resolve '@/...'`

**Causa:** Caminho de import errado ou arquivo não existe.
**Solução:** Verificar `tsconfig.json` paths e existência do arquivo referenciado.

---

## 4. Erros de Negócio (Domínio)

### `INVALID_PAYMENT_SPLIT`

**Causa:** Soma dos splits de pagamento não bate com o total da OS.
**Solução:** Verificar cálculo de `paymentSplits.reduce()` vs `order.total`.

### `INVALID_TOTAL`

**Causa:** Total da OS é negativo (desconto maior que subtotal).
**Solução:** Validar que `discount <= subtotal` antes de criar a OS.

### Caixa não abre / "Já existe caixa aberto"

**Causa:** Tentou abrir caixa quando já existe um ativo para o tenant.
**Solução:** Verificar `prisma.cashRegister.findFirst({ where: { tenantId, closedAt: null } })`.

---

## 5. Classe de Erro Padrão (`AppError`)

Todo erro de domínio DEVE usar a classe `AppError` localizada em `lib/errors.ts`:

```typescript
// lib/errors.ts
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
```

### Códigos de Erro Padronizados

| Código                   | Status HTTP | Quando usar                                   |
| ------------------------ | ----------- | --------------------------------------------- |
| `UNAUTHORIZED`           | 401         | Sessão ausente ou expirada                    |
| `FORBIDDEN`              | 403         | Role insuficiente para a ação                 |
| `NOT_FOUND`              | 404         | Registro não encontrado                       |
| `INVALID_PAYMENT_SPLIT`  | 400         | Soma dos splits ≠ total da OS                 |
| `INVALID_TOTAL`          | 400         | Total da OS negativo                          |
| `CASH_REGISTER_CONFLICT` | 409         | Caixa já aberto / já fechado                  |
| `STOCK_INSUFFICIENT`     | 400         | Estoque ≤ 0 para produto físico               |
| `CREDIARIO_BLOCKED`      | 403         | Cliente com 3+ parcelas em atraso             |
| `PRESCRIPTION_EXPIRED`   | 400         | Receita com mais de 365 dias                  |
| `LAB_DATA_INCOMPLETE`    | 400         | Dados obrigatórios para envio ao lab ausentes |

### Uso em rotas de API

```typescript
import { AppError } from "@/lib/errors";

// No serviço:
throw new AppError(
  "Caixa já está aberto para este tenant",
  "CASH_REGISTER_CONFLICT",
  409,
);

// No catch da rota de API:
if (error instanceof AppError) {
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.statusCode },
  );
}
return NextResponse.json(
  { error: "Erro interno", code: "INTERNAL_ERROR" },
  { status: 500 },
);
```
