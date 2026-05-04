# Plano Mestre de Execucao

Este documento traduz o PRD em uma sequencia de engenharia executavel, para evitar crescimento desordenado e manter o `Rupta OS` alinhado ao objetivo de se tornar um SaaS vendavel, confiavel e escalavel para oticas independentes.

## Direcao Global

O projeto deve evoluir nesta ordem:

1. Fechar a base de plataforma.
2. Tornar o core comercial-financeiro confiavel.
3. Refinar os fluxos criticos de uso.
4. Completar o core com integracoes essenciais.
5. Formalizar qualidade, operacao e rastreabilidade.
6. So entao expandir com diferenciacao.

Isso significa que o foco atual nao e ampliar breadth. O foco certo e fortalecer o nucleo operacional:

- clientes
- ordens de servico
- itens
- pagamentos
- caixa
- estoque
- recebiveis
- auditoria
- tenancy
- permissoes

## Fase Atual

O projeto esta em `Fundacao de Plataforma (Fase A)` em estagio avancado.

Ja existe:

- base multi-tenant funcional
- Prisma + Postgres como fonte de verdade
- separacao inicial entre handlers e services
- rotas publicas e webhooks endurecidos
- tipagem de sessao e contexto de tenant
- endurecimento inicial do core financeiro e comercial

Ainda precisa para encerrar a Fase A:

- tipar jobs e automacoes restantes
- remover casts estruturais remanescentes
- alinhar servicos internos legados ao schema real
- normalizar leitura segura de `tenant.config`
- eliminar pontos que "funcionam" por suposicao frouxa

## Sequencia Mestra

### 1. Platform Hardening

Objetivo: remover erosao estrutural.

Entregas:

- jobs com contrato tipado
- servicos internos sem `as any` critico
- parser seguro para configuracoes de tenant
- rotas legadas restantes alinhadas ao padrao de contexto e validacao
- falha previsivel em cron, webhooks e jobs

### 2. Core Revenue Operations

Objetivo: tornar o sistema vendavel para operacao real de loja.

Entregas:

- fluxo completo `cliente -> OS -> pagamento -> caixa`
- consistencia de estoque em venda, ajuste e importacao
- parcelas e recebiveis previsiveis
- comissoes confiaveis
- fechamento de caixa reproduzivel
- filtros e listagens de uso diario

### 3. Workflow UX

Objetivo: transformar backend correto em operacao fluida.

Fluxos prioritarios:

- login e contexto de tenant
- busca e cadastro de cliente
- criacao de OS
- lancamento de pagamento
- fechamento de caixa
- agendamento publico
- acompanhamento e impressao da OS

### 4. Core Integrations

Objetivo: reduzir retrabalho manual que impede adocao real.

Ordem:

1. pagamentos e webhooks
2. WhatsApp operacional
3. OFX / conciliacao
4. XML / entrada de estoque
5. fiscal e laboratorio no que for core-enabling

### 5. Operational Reliability

Objetivo: profissionalizar deploy, manutencao e onboarding.

Entregas:

- CI minima
- testes de fluxo critico
- logs estruturados
- rastreabilidade de erro
- documentacao viva
- politica de ambientes e segredos

### 6. Differentiation

Objetivo: ampliar valor competitivo sem romper a base.

Entradas:

- analytics confiaveis
- DRE consolidado
- automacoes uteis
- agentes por tenant
- recursos premium

## Regra de Priorizacao

Toda entrega nova deve responder, nesta ordem:

1. Fortalece o core?
2. Reduz risco estrutural?
3. Melhora a operacao diaria da otica?
4. Reduz retrabalho relevante?
5. Aumenta clareza e velocidade de uso?
6. So depois: aumenta diferenciacao?

Se a resposta nao satisfaz os primeiros itens, a entrega deve ser adiada.

## Trilhas Oficiais

Toda demanda nova deve ser classificada em uma destas trilhas:

- `Platform Hardening`
- `Core Revenue Operations`
- `Workflow UX`
- `Core Integrations`
- `Operational Reliability`
- `Differentiation`

Cada entrega deve declarar:

- trilha
- fase
- problema que resolve
- dependencia
- risco se adiada
- criterio de aceite
- metrica de sucesso

## Definicao de Produto Vendavel

O sistema passa de "em construcao" para "vendavel" quando estes pontos coexistem:

- Fase A encerrada
- core comercial-financeiro robusto
- fluxos criticos usaveis no dia a dia
- integracoes essenciais cobrindo os maiores retrabalhos
- setup e deploy estaveis
- falhas criticas rastreaveis
- onboarding de uma otica possivel sem improviso estrutural

Antes disso, o sistema pode ser demonstravel. Depois disso, ele passa a ser vendavel com responsabilidade.
