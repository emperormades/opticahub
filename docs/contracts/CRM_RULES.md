# 📜 CRM_RULES.md — Contrato de Domínio de Relacionamento com Cliente
# Fonte da verdade para cadastro de clientes, prescrições e retenção.

---

## 1. Cadastro de Clientes

- Campos obrigatórios: `name`, `phone`. CPF é opcional nesta fase.
- O campo `phone` deve ser normalizado: apenas números, sem espaços ou caracteres especiais.
- Um cliente pode ter múltiplas prescrições (`Prescription`) ao longo do tempo.
- A prescrição mais recente é sempre a "ativa" para orçamentos.
- Clientes são amarrados ao `tenantId`. Cada loja tem sua base isolada.

---

## 2. Prescrições

- Uma prescrição tem validade padrão de **365 dias** a partir da `issuedAt`.
- Prescrições vencidas devem aparecer no radar do painel de CRM como "Oportunidade de Retorno".
- O campo `doctor` (nome do médico prescritor) é opcional, mas desejável para analytics de conversão por médico.
- Uma OS sempre deve referenciar uma `prescriptionId`. OS sem prescrição vinculada é um rascunho incompleto.

---

## 3. Retenção e Follow-up

- Após entrega (`DELIVERED`), o sistema deve expor a OS no Painel de Follow-up para contato pós-venda.
- O follow-up padrão acontece em: **7 dias** (adaptação), **30 dias** (satisfação), **330 dias** (renovação de receita).
- Orçamentos não convertidos (`DRAFT` por mais de 48h sem progresso) entram na fila de "Resgate de Orçamento".
- Nenhuma ação de follow-up é automatizada nesta fase. Todas são assistidas via dashboard.

---

## 4. Crédito do Cliente

- Um cliente pode ter um `creditLimit` configurado pelo gerente.
- Clientes com parcelas vencidas (`Installment.dueDate < hoje && !isPaid`) são sinalizados como "Em Atraso".
- Clientes com mais de 3 parcelas em atraso têm o crediário bloqueado automaticamente para novas vendas.
- O desbloqueio é manual, feito pelo gerente.
