# 📜 STOCK_RULES.md — Contrato de Domínio de Estoque
# Fonte da verdade para movimentações de estoque, auditoria e reposição.

---

## 1. Movimentação de Estoque

- **Entrada**: Todo produto importado via XML de NF-e ou cadastrado manualmente. Incrementa `stock`.
- **Saída**: Toda vez que um `OrderItem` é criado com um `productId` vinculado. Decrementa `stock`.
- **Estorno**: Cancelamento de OS. Retorna a quantidade ao `stock` de cada `OrderItem` com `product`.
- A movimentação de estoque **nunca deve ser feita fora do contexto de uma transação Prisma**.
- Todo movimento deve criar um registro de `StockMovement` (se existir no schema).

---

## 2. Regras de Negócio de Estoque

- Não é permitido vender produto com `stock <= 0` (exceto produtos do tipo `SERVICE` ou `LENS`).
- Lentes (`itemType: LENS`) são controladas por receita e não têm estoque físico padrão no sistema até integração com laboratório.
- Armações (`itemType: FRAME`) TÊM estoque físico obrigatório.
- O campo `minStock` define o ponto de ruptura. Produtos abaixo de `minStock` devem aparecer na fila de reposição.

---

## 3. Curva ABC

- **Curva A**: Produtos com maior giro e faturamento (top 20%). Prioridade máxima de reposição.
- **Curva B**: Produtos com giro médio (próximos 30%). Reposição regular planejada.
- **Curva C**: Produtos de baixo giro (50% restantes). Reposição só quando atingir `minStock`.
- O cálculo da Curva ABC é baseado na quantidade de `OrderItems` dos últimos 90 dias.

---

## 4. Importação de XML (NF-e)

- Ao importar um XML de entrada de estoque, os campos obrigatórios são: `xProd` (nome), `cEAN` (código de barras/EAN), `qCom` (quantidade), `vUnCom` (valor unitário de custo).
- Produtos com `cEAN` já cadastrado no sistema têm seu `stock` incrementado (entrada de estoque).
- Produtos com `cEAN` novo são criados automaticamente como rascunho para confirmação do operador.
- O custo médio (`averageCost`) é recalculado a cada entrada de estoque usando a fórmula: `(estoque_atual * custo_atual + quantidade_nova * custo_novo) / (estoque_atual + quantidade_nova)`.
