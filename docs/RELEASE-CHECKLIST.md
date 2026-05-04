# Release Checklist - MVP de Piloto

Checklist minimo para liberar uma nova versao do VisionCore OS para piloto.

## Antes do deploy

1. Confirmar que o escopo do release nao abriu modulo novo fora de `Core Revenue Operations`, `Workflow UX` ou `Operational Reliability`.
2. Rodar localmente:
   - `npm run test:core`
   - `npm run typecheck`
   - `npm run build`
3. Validar manualmente os fluxos criticos:
   - criar OS com pagamento unico
   - criar OS com split payment
   - gerar carne
   - dar baixa em parcela
   - abrir caixa
   - registrar sangria
   - fechar caixa
   - cancelar OS com estorno
4. Confirmar variaveis obrigatorias no ambiente:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `CRON_SECRET`
   - `ENCRYPTION_KEY`
   - `PAYMENT_WEBHOOK_SECRET`
   - `LAB_WEBHOOK_SECRET`
   - `FISCAL_WEBHOOK_SECRET`
5. Confirmar que nenhuma rota critica perdeu:
   - `requireTenantContext()`
   - validacao de payload na borda
   - checagem de ownership por `tenantId`

## Deploy

1. Fazer deploy em horario de baixo impacto da loja piloto.
2. Registrar:
   - versao liberada
   - data/hora
   - autor do release
   - objetivo do release
3. Se houver mudanca em fluxo financeiro, avisar explicitamente a loja piloto antes da liberacao.

## Depois do deploy

1. Validar login e carga do dashboard.
2. Confirmar que rotas publicas estao respondendo:
   - agendamento publico
   - acompanhamento publico da OS
3. Confirmar que o core financeiro responde:
   - `GET /api/financial/cash`
   - `GET /api/financial/carne`
   - `GET /api/financial/summary`
4. Executar uma checagem manual rapida:
   - abrir caixa
   - registrar uma sangria pequena
   - fechar caixa de teste (se ambiente permitir)
5. Confirmar que XML e OFX continuam abrindo as telas sem erro fatal.

## Gate de rollback

Se qualquer um dos itens abaixo falhar, o release nao deve permanecer no piloto:

1. Nao e possivel criar OS.
2. Split payment quebra o checkout.
3. Caixa nao abre, nao registra sangria ou nao fecha.
4. Carne nao gera ou baixa de parcela falha.
5. Cancelamento de OS nao conclui.
6. Rotas publicas deixam de funcionar.

## Observacao

Para o MVP de piloto, a regra e simples: nenhum release vale a pena se comprometer `orders`, `transactions`, `cash`, `carne` ou o fluxo publico basico.
