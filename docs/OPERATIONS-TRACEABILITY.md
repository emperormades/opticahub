# Convencao Minima de Rastreabilidade Operacional

Guia rapido para leitura de incidentes e suporte durante o MVP de piloto.

## Principio

Toda acao sensivel do core precisa ser rastreavel por:

1. tenant
2. usuario
3. entidade afetada
4. tipo de acao
5. impacto financeiro ou operacional

## Acoes que exigem rastreabilidade clara

1. Abertura de caixa
2. Sangria
3. Fechamento de caixa
4. Criacao de transacao financeira
5. Baixa de parcela
6. Cancelamento de OS
7. Mudanca de status da OS
8. Revisao de receituario em triagem

## Onde procurar

1. `AuditLog`
   - fonte principal de mudancas de entidades
2. `Transaction`
   - fonte principal de entradas, saidas e sangrias
3. `CashRegister`
   - fonte principal de abertura/fechamento
4. `ServiceOrderEvent`
   - fonte principal de timeline de OS
5. `AgentTask`
   - fonte principal de triagens e filas operacionais

## Leitura basica por incidente

### Divergencia de caixa

1. localizar `CashRegister` do dia
2. revisar `Transaction` ligadas ao `cashRegisterId`
3. procurar sangrias (`SAIDA` em `DINHEIRO` com descricao `Sangria de caixa`)
4. revisar `AuditLog` do caixa para abertura, sangria e fechamento

### Problema em comissao

1. localizar a `Transaction` da venda
2. confirmar `isPending`
3. revisar parcelas ligadas
4. confirmar se a comissao so foi criada apos liquidacao

### Cancelamento de OS

1. revisar `ServiceOrderEvent`
2. revisar `AuditLog` da OS
3. revisar `Transaction` de estorno
4. revisar impacto em parcelas e estoque

## Regra de suporte

Se uma acao sensivel nao puder ser explicada por esses registros, ela deve ser tratada como falha de rastreabilidade e entrar no backlog de `Operational Reliability`.
