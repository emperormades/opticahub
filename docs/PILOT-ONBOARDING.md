# Onboarding Tecnico - Loja Piloto

Este documento define o setup minimo para colocar uma otica piloto em operacao controlada.

## Objetivo

Subir uma loja piloto sem depender de memoria tacita, cobrindo apenas os modulos que ja estao maduros o suficiente para uso assistido.

## Escopo do piloto

Entram no piloto:

1. Cadastro de clientes
2. Ordens de servico
3. Checkout com pagamento unico ou split payment
4. Carne e recebimento de parcelas
5. Caixa diario (abertura, sangria, fechamento)
6. Filas manuais:
   - receitas a expirar
   - orcamentos abandonados
   - inadimplentes
7. XML de entrada de estoque
8. OFX de conciliacao
9. Agendamento publico, triagem clinica e acompanhamento publico da OS

Nao entram no piloto:

1. BI aprofundado
2. Gamificacao
3. Recursos premium B2C
4. Multiunidade avancado
5. Modulos ainda marcados como `LATER` ou `HOLD`

## Passo 1 - Criar o tenant

1. Criar tenant com `slug` publico unico.
2. Confirmar que o tenant esta ativo.
3. Revisar configuracoes basicas:
   - nome da loja
   - contatos
   - cidade/UF
   - textos publicos minimos

## Passo 2 - Criar usuarios iniciais

Criar, no minimo:

1. `ADMIN`
   - responsavel por configuracoes e validacoes gerais
2. `GERENTE`
   - responsavel por caixa, revisao e supervisao
3. `FINANCEIRO` (se houver)
   - responsavel por carne, conciliacao e cobranca
4. `VENDEDOR`
   - responsavel por PDV / ordens

## Passo 3 - Cadastrar base minima

Cadastrar antes do primeiro uso:

1. Categorias e subcategorias de produtos
2. Produtos principais
3. Estoque inicial (manual ou por XML)
4. Tabelas de valores minimas para venda real

## Passo 4 - Validar o core antes do primeiro dia

Rodar um fluxo completo de homologacao:

1. criar cliente
2. criar OS com item
3. concluir pagamento
4. testar split payment
5. gerar carne
6. dar baixa em uma parcela
7. abrir caixa
8. registrar sangria
9. fechar caixa
10. cancelar uma OS de teste

## Passo 5 - Habilitar rotas publicas

Confirmar:

1. `tenantSlug` publico funcionando
2. pagina de agendamento carregando
3. vitrine carregando
4. acompanhamento publico da OS respondendo

## Passo 6 - Treinamento minimo da loja

Treinar apenas o fluxo que entra no piloto:

1. abrir e fechar caixa
2. registrar sangria
3. criar OS
4. registrar pagamento
5. gerar e receber carne
6. usar busca universal
7. agir nas filas manuais
8. usar WhatsApp operacional

## Passo 7 - Regras de suporte do piloto

Durante o piloto:

1. qualquer divergencia em `orders`, `transactions`, `cash` ou `carne` vira prioridade maxima
2. nenhuma feature `LATER` ou `HOLD` deve ser ativada por improviso
3. se um fluxo estiver incompleto, o time deve ser instruido a nao usa-lo

## Criterio de loja pronta para piloto

A loja pode ser considerada pronta quando:

1. o admin consegue entrar e ver o dashboard
2. o vendedor cria uma OS sem suporte externo
3. o gerente abre, sangra e fecha o caixa
4. o financeiro gera e baixa carne
5. o fluxo publico basico responde
6. a equipe sabe quais modulos usar e quais evitar
