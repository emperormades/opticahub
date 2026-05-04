# 📊 SCHEMA_ANNOTATIONS.md — Anotações do Schema Prisma
# Explica o PORQUÊ de cada tabela e campo importante do banco de dados.
# A IA deve ler este arquivo quando precisar entender relações entre modelos.

---

## Modelos Principais

### `Tenant` (A Loja)
- Cada ótica é um tenant isolado. Todos os dados são filtrados por `tenantId`.
- `config` (JSON): Armazena configurações específicas da loja (% comissão, limites).
- `slug`: Usado nas rotas públicas (`/vitrine/[slug]`, `/agendar/[slug]`).

### `User` (Operador)
- Pertence a um `Tenant`. O `role` define permissões (ver `AUTH_RULES.md`).
- Um `User` com `role: SELLER` é o vendedor cujas comissões são rastreadas.
- O campo `email` é usado para login via NextAuth.

### `Customer` (Cliente da Ótica)
- Sempre amarrado a um `tenantId`. Base isolada por loja.
- Pode ter múltiplas `Prescription` (prescrições ao longo do tempo).
- `creditLimit`: Limite para vendas parceladas no crediário.

### `Prescription` (Receita Médica)
- Vinculada a um `Customer`. A mais recente é a "ativa".
- Campos OD/OE: sphere, cylinder, axis, addition, dnpMono.
- `issuedAt`: Data de emissão. Validade = 365 dias.
- `doctor`: Nome do médico prescritor (opcional, usado em analytics).

### `Order` (Ordem de Serviço / Venda)
- A entidade central do sistema. Representa uma venda completa.
- `status`: Segue o fluxo `DRAFT → VALIDATING → LAB_SENT → IN_PRODUCTION → QUALITY_CHECK → DELIVERY_READY → DELIVERED`.
- `isPaid`: `true` apenas quando TODOS os pagamentos estão liquidados.
- `reworkCount` / `reworkCause`: Controle de retrabalho laboratorial.
- `labName` / `labOrderCode`: Referência manual ao laboratório.

### `OrderItem` (Item da Venda)
- Cada item pode ser: `FRAME`, `LENS`, `SERVICE`, `ACCESSORY`.
- `productId`: Se vinculado, o estoque é decrementado/incrementado.
- `total = (unitPrice * quantity) - discount`.

### `Transaction` (Pagamento)
- Vinculada a uma `Order`. Uma OS pode ter múltiplas transações (split).
- `method`: `PIX`, `CREDIT_CARD`, `DEBIT_CARD`, `CASH`, `CREDIARIO`, `TRANSFER`.
- Transações `CREDIARIO` têm `Installment[]` vinculadas.

### `Installment` (Parcela do Crediário)
- Vinculada a uma `Transaction` de tipo `CREDIARIO`.
- `number`: Número sequencial da parcela (1ª, 2ª, 3ª...).
- `dueDate`: Data de vencimento.
- `isPaid`: Marcada individualmente quando quitada.

### `Commission` (Comissão do Vendedor)
- Vinculada a uma `Order` e ao `User` (vendedor).
- Status: `PENDING` → `PAID`.
- Cancelar a OS deleta comissões `PENDING`.
- Base de cálculo: `OrderItem.total` (com desconto).

### `Product` (Produto / Armação)
- `stock`: Quantidade em estoque (só para `FRAME` e `ACCESSORY`).
- `minStock`: Ponto de ruptura para alerta de reposição.
- `costPrice` / `salePrice`: Custos e preço de venda.
- `frameDma`, `frameBridge`: Medidas da armação (para cálculos ópticos).

### `CashRegister` (Caixa Diário)
- Apenas 1 ativo por `tenantId` por vez.
- `openingBalance`: Saldo de abertura informado pelo operador.
- `closingBalance`: Saldo contado no fechamento.
- `closedAt`: `null` = caixa aberto. Preenchido = caixa fechado.

---

## Relações Críticas

```
Tenant
├── User (1:N)
├── Customer (1:N)
│   └── Prescription (1:N)
├── Product (1:N)
├── Order (1:N)
│   ├── OrderItem (1:N) → Product (N:1)
│   ├── Transaction (1:N)
│   │   └── Installment (1:N)
│   ├── Commission (1:N) → User (N:1)
│   └── OrderEvent (1:N)
└── CashRegister (1:N)
```
