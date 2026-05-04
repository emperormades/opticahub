# VisionCore OS - Master PRD & Roadmap

## Resumo

O `VisionCore OS` e um SaaS vertical para oticas independentes. O objetivo do produto nao e acumular modulos rapidamente, e sim formar uma plataforma com:

- nucleo operacional confiavel
- UX clara para operacao de loja
- integracoes essenciais que reduzam retrabalho
- capacidade de crescer sem reescrita estrutural

O principio central do produto e: **nao escalar breadth antes de consolidar depth no core operacional**.

## Publico-Alvo

ICP inicial:

- oticas independentes
- 1 a 3 lojas
- operacao enxuta
- necessidade de unificar vendas, OS, estoque, financeiro e agenda

Nao e foco imediato:

- grandes redes com multiunidade complexo
- marketplace optico
- expansao de modulos premium antes do core estar robusto

## Estado Atual

O projeto esta alem de um MVP simples:

- ha base funcional em `Next.js + Prisma + Postgres`
- existe modelagem multi-tenant
- o backend ja iniciou a separacao entre handlers e services
- o core comercial-financeiro esta sendo endurecido

Na linha de maturidade:

1. Descoberta do problema: superada
2. Exploracao de solucao: superada
3. Fundacao de plataforma: em andamento avancado
4. Core vendavel: ainda nao concluido
5. Produto maduro: ainda nao

## Ordem Correta de Construcao

### Etapa 1: Encerrar a Fundacao de Plataforma

Objetivo:

- eliminar os ultimos pontos de erosao estrutural

Entregas:

- jobs e automacoes tipados
- servicos internos alinhados ao schema real
- leitura segura de `tenant.config`
- rotas legadas restantes sem casts estruturais
- contratos previsiveis em cron, webhooks e jobs

### Etapa 2: Consolidar o Core Operacional Vendavel

Objetivo:

- tornar o sistema utilizavel como sistema principal de uma otica em operacao controlada

Entregas:

- fluxo `cliente -> OS -> pagamento -> caixa`
- consistencia de estoque
- recebiveis e parcelas previsiveis
- comissoes confiaveis
- fechamento de caixa reproduzivel
- auditoria operacional minima forte

### Etapa 3: Refinar Fluxos Criticos de UX

Objetivo:

- transformar backend funcional em operacao rapida e clara

Fluxos prioritarios:

- login e contexto do tenant
- busca e cadastro de cliente
- criacao de OS
- lancamento de pagamento
- fechamento de caixa
- agendamento publico
- acompanhamento da OS

### Etapa 4: Completar o Core com Integracoes Essenciais

Ordem:

1. pagamentos e webhooks
2. WhatsApp operacional
3. OFX / conciliacao bancaria
4. XML / entrada de estoque
5. fiscal e laboratorio no que for core-enabling

### Etapa 5: Operacionalizar Qualidade e Confiabilidade

Entregas:

- CI minima
- testes de fluxo critico
- logs estruturados
- rastreabilidade de erro
- documentacao viva
- politica de ambientes e segredos

### Etapa 6: Diferenciar com Controle

Entradas:

- analytics confiaveis
- DRE consolidado
- automacoes uteis
- agentes por tenant
- recursos premium

Regra:

- nenhuma diferenciacao pode contornar o core

## Governanca de Execucao

Toda entrega deve ser classificada em uma das trilhas:

- `Platform Hardening`
- `Core Revenue Operations`
- `Workflow UX`
- `Core Integrations`
- `Operational Reliability`
- `Differentiation`

Cada entrega nova deve declarar:

- trilha
- fase
- problema que resolve
- dependencia
- risco se adiada
- criterio de aceite
- metrica de sucesso

Sem isso, a tarefa nao entra.

## Criterio Global de Priorizacao

Toda iniciativa nova deve responder:

1. Fortalece o core?
2. Reduz risco estrutural?
3. Melhora a operacao diaria da otica?
4. Reduz retrabalho relevante?
5. Aumenta clareza e velocidade de uso?
6. So depois: aumenta diferenciacao?

## Definicao de Produto Vendavel

O sistema passa de "em construcao" para "vendavel" quando coexistirem:

- Fase A encerrada
- core comercial-financeiro robusto
- fluxos criticos com UX operacional aceitavel
- integracoes essenciais cobrindo os maiores retrabalhos
- setup e deploy estaveis
- falhas criticas rastreaveis
- onboarding de uma otica possivel sem improviso estrutural

Antes disso, o sistema pode ser demonstravel. Depois disso, ele passa a ser vendavel com responsabilidade.
