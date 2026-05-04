# 📜 FINANCE_RULES.md — Contrato de Domínio Financeiro
# Este arquivo é a FONTE DA VERDADE para qualquer IA ou desenvolvedor que altere módulos financeiros.
# NUNCA codifique lógica financeira sem ler este arquivo antes.

---

## 1. Caixa Diário (Cash Register)

- Um tenant pode ter **no máximo 1 caixa aberto** por vez.
- Ao **Abrir** o caixa, deve-se registrar o saldo inicial (`openingBalance`).
- Ao **Fechar** o caixa, deve-se registrar o saldo final real contado (`closingBalance`) e a diferença calculada (`difference = closingBalance - expectedBalance`).
- **Sangria** é uma retirada intermediária de dinheiro físico do caixa **antes** do fechamento. Ela entra como uma transação de `type: SAIDA` e **reduz o saldo esperado** do fechamento (`posicaoFinalCash`).
- O caixa **NÃO** pode ser fechado se não houver caixa aberto.
- Cashier ID e Tenant ID são obrigatórios em toda operação de caixa.

---

## 2. Ordens de Serviço (OS) e Pagamentos

- O **total de uma OS** é sempre: `subtotal - discount`.
- O **total dos splits de pagamento** deve bater exatamente com o `total` da OS. Qualquer divergência é um erro `INVALID_PAYMENT_SPLIT`.
- Uma OS nunca pode ter total negativo (`total < 0`).
- Uma OS pode ter **múltiplas transações** (ex: metade no Cartão + metade no Crediário).
- Uma OS só é considerada `isPaid: true` quando todas as transações não-crediário estão liquidadas **e** todos os carnês de crediário estão quitados.

---

## 3. Estorno / Cancelamento de OS

- Cancelar uma OS implica **obrigatoriamente** nas 4 operações abaixo, em uma única transação atômica no banco:
  1. **Retornar ao estoque** a quantidade de todos os `OrderItem` que têm `product` vinculado.
  2. **Criar uma transação de Estorno** no Caixa ativo (type: `ESTORNO`, negativo).
  3. **Marcar `isPaid: false`** na OS cancelada.
  4. **Deletar ou bloquear** as comissões pendentes (`Commission`) vinculadas à OS.
- Se não houver caixa aberto no momento do cancelamento, o estorno financeiro é **registrado como pendente** e não lançado automaticamente.
- Parcelas de Crediário em aberto são **encerradas** (status: CANCELLED) no momento do cancelamento da OS.

---

## 4. Crediário Próprio (Carnê)

- Uma transação de `method: CREDIARIO` precisa ter parcelas (`Installment`) geradas para ser considerada ativa.
- Uma transação `CREDIARIO` **sem parcelas** geradas ainda está em estado `PENDENTE_CONFIGURACAO`.
- O pagamento de uma parcela individual marca apenas aquela parcela como `isPaid: true`.
- A OS só é marcada como `isPaid: true` quando **todas** as parcelas do crediário estiverem pagas.
- **Juros** são calculados fora do sistema por padrão (o valor de cada parcela é informado pelo operador).

---

## 5. Comissões

- Comissões são criadas **no momento da criação da OS** com status `PENDING`.
- Comissões só mudam para `PAID` quando o pagamento da OS (ou a parcela do crediário) for liquidado.
- Cancelar a OS remove ou bloqueia permanentemente as comissões `PENDING` associadas a ela.
- A base de cálculo da comissão é `OrderItem.total` (já com desconto aplicado), nunca o preço cheio.

---

## 6. Conciliação Bancária

- Uma transação de extrato bancário (OFX import) deve ser mapeada manualmente para uma ou mais OS/Transações do sistema.
- Transações conciliadas têm `isReconciled: true`.
- Transações não conciliadas aparecem na fila de prioridade da tela de Conciliação.
- **Não existe conciliação automática** nesta fase. Toda associação é feita pelo operador.
