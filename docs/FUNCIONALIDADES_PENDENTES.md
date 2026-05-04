# Backlog Executivo de Produto: VisionCore OS

Este documento organiza as funcionalidades imaginadas para o produto na ordem correta de construcao.
Ele nao e uma lista solta de ideias: ele e o backlog estrategico que deve guiar o que entra agora, o que entra depois e o que deve permanecer apenas como visao ate o core estar maduro.

## Como usar este documento

Toda funcionalidade deve ser classificada em um destes estados:

- `NOW`: entra no proximo ciclo de implementacao
- `NEXT`: entra logo depois que o core vendavel estabilizar
- `LATER`: importante, mas depende de base mais madura
- `HOLD`: visao valida, mas nao deve entrar agora

Toda funcionalidade tambem deve declarar:

- `Trilha`
- `Motivo`
- `Dependencias`

As trilhas oficiais sao:

- `Core Revenue Operations`
- `Workflow UX`
- `Core Integrations`
- `Operational Reliability`
- `Differentiation`

## Estado atual do produto

O projeto esta:

- no fim da `Fundacao de Plataforma (Fase A)`
- entrando no `Core Vendavel (Fase B)`

Ja existe avancao real em:

- backend endurecido
- UX operacional mais clara
- CI minima
- testes minimos de validacao do core

Por isso, a regra agora e simples:

1. fechar o core vendavel
2. destravar a operacao diaria
3. consolidar integracoes essenciais
4. so depois subir diferenciacao

## Backlog `NOW` — Proximo ciclo

Estas entregas entram agora porque fecham o core vendavel sem puxar breadth prematura.

## 1. Operacao Financeira (Core Vendavel)

### 1.1 Gestao Visual de Caixa
- `Estado`: `NOW`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: caixa e fechamento diario sao a base da confianca operacional
- `Dependencias`: manter `cashRegisterService` como fonte unica de verdade

Escopo:

- consolidar abertura de caixa
- exibir troco inicial de forma clara
- formalizar sangria visual e reprodutivel
- manter fechamento alinhado ao mesmo calculo usado no backend

### 1.2 Painel de Contas a Receber (Crediario)
- `Estado`: `NOW`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: recebiveis previsiveis sao parte direta do core vendavel
- `Dependencias`: continuar usando `installmentService`

Escopo:

- listar parcelas em aberto, vencidas e pagas
- deixar a baixa de parcela agil no balcao
- destacar o que vence hoje e amanha
- manter recorte claro entre recebido e pendente

### 1.3 Motor de Comissoes Justo
- `Estado`: `NOW`
- `Trilha`: `Core Revenue Operations`
- `Motivo`: comissao precisa refletir recebimento real, nao venda teorica
- `Dependencias`: manter comissao vinculada ao fluxo financeiro real

Escopo:

- condicionar comissao ao pagamento efetivo
- separar visualmente valor liberado e valor congelado
- impedir liberacao de fatias ligadas a parcelas nao quitadas

### 1.4 Multiplos Meios em uma Venda (Split Payment)
- `Estado`: `NOW`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: o checkout da otica precisa suportar a realidade do balcao
- `Dependencias`: continuar acoplando no nucleo `orders -> transactions`

Escopo:

- permitir rateio de pagamento no checkout
- suportar PIX + cartao + crediario no mesmo fluxo
- manter consistencia entre total vendido e total pago
- nao criar fluxo paralelo fora de `transactions`

## 2. Fluxo de Vendas (Somente o que fecha o balcao)

### 2.1 Carrinho de Otica Descomplicado
- `Estado`: `NOW`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: o PDV precisa ser rapido e claro para virar sistema principal
- `Dependencias`: continuar usando `orders` como nucleo transacional

Escopo:

- consolidar checkout visual de armacao + lente + servicos
- reduzir friccao na revisao de itens e pagamentos
- deixar o fluxo iterativo e claro para a vendedora

### 2.2 Extrato e Estorno Inteligente
- `Estado`: `NOW`
- `Trilha`: `Core Revenue Operations`
- `Motivo`: devolucao e cancelamento sem recompor estoque gera perda real
- `Dependencias`: manter reversao sincronizada com estoque e financeiro

Escopo:

- formalizar cancelamento com retorno ao estoque
- registrar reversao financeira coerente
- deixar o fluxo claro para devolucao e desfazimento de venda

### 2.3 Busca Poderosa Universal
- `Estado`: `NOW`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: reduzir tempo de operacao e suporte manual
- `Dependencias`: reutilizar `orders`, `customers` e `financial`, sem indice paralelo agora

Escopo:

- buscar por nome
- buscar por CPF
- buscar por numero da OS
- expor resultados uteis em contexto de atendimento

## 3. CRM Especifico (Manual e operacional)

### 3.1 Dashboard de Receitas a Expirar
- `Estado`: `NOW`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: retenção com acao manual traz valor sem complexidade estrutural
- `Dependencias`: usar dados reais de clientes e receitas ja existentes

Escopo:

- listar clientes com receita perto de expirar
- permitir acao manual de contato
- mostrar contexto suficiente na propria tela

### 3.2 Resgate de Orcamentos Abandonados
- `Estado`: `NOW`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: recuperar drafts antigos e uma alavanca de receita direta
- `Dependencias`: usar OS `DRAFT` como base

Escopo:

- filtrar OS em orcamento com mais de 48h
- destacar cliente, valor e data
- permitir follow-up manual

### 3.3 Gestao de Inadimplentes do Crediario
- `Estado`: `NOW`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: cobranca manual precisa de valor atualizado e contexto claro
- `Dependencias`: usar `installmentService` como base do calculo

Escopo:

- listar parcelas vencidas
- recalcular valor atualizado com mora
- permitir cobranca com dados precisos em tempo real

## 4. Integracoes Core-Enabling

### 4.1 Leitor do Fisco (XML B2B) - estabilizacao
- `Estado`: `NOW`
- `Trilha`: `Core Integrations`, `Workflow UX`
- `Motivo`: a integracao ja existe e precisa virar rotina confiavel
- `Dependencias`: consolidar `stock/import-xml` e `stock/import-xml/confirm`

Escopo:

- melhorar conferencia antes da aplicacao
- deixar o fluxo de importacao mais claro e previsivel
- garantir entrada de estoque e conta a pagar consistentes

### 4.2 Conciliador das Maquininhas (OFX) - estabilizacao
- `Estado`: `NOW`
- `Trilha`: `Core Integrations`, `Workflow UX`
- `Motivo`: a base ja existe e precisa resolver retrabalho real
- `Dependencias`: consolidar OFX em cima dos servicos ja criados

Escopo:

- melhorar visual da conciliacao
- deixar erro, duplicidade e sucesso mais claros
- tornar o fluxo util no dia a dia do financeiro

### 4.3 WhatsApp Operacional (templates basicos)
- `Estado`: `NOW`
- `Trilha`: `Core Integrations`, `Workflow UX`
- `Motivo`: alto valor operacional sem exigir automacao complexa
- `Dependencias`: usar canal guiado, sem criar motor autonomo

Escopo:

- abrir templates operacionais basicos
- suportar avisos de status da OS
- suportar notificacoes simples de cobranca e retirada

## Backlog `NEXT` — Ciclo seguinte

Estas entregas entram assim que o nucleo acima estiver estavel.

## 5. Fluxo de Vendas (Camada seguinte)

### 5.1 Hub de Acompanhamento do Paciente (Timeline de OS)
- `Estado`: `NEXT`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: agrega valor real, mas depende do fluxo de OS mais estavel
- `Dependencias`: timeline da OS e estados ja consolidados

Escopo:

- publicar link simples para acompanhamento externo
- mostrar estados como "No laboratorio", "Na montagem" e "Pronto"

## 6. Clinica e Blindagem Pre-Laboratorio

### 6.1 Agendador de Consultas Publico (robusto)
- `Estado`: `NEXT`
- `Trilha`: `Workflow UX`, `Core Revenue Operations`
- `Motivo`: a base publica ja existe e precisa amadurecer
- `Dependencias`: manter resolucao por `tenantSlug`

### 6.2 Painel Clinico Isolado
- `Estado`: `NEXT`
- `Trilha`: `Workflow UX`, `Core Revenue Operations`
- `Motivo`: separar melhor o contexto clinico da operacao comercial
- `Dependencias`: base de clientes, receitas e agenda estavel

### 6.3 Digitalizacao e Upload de Receituario
- `Estado`: `NEXT`
- `Trilha`: `Workflow UX`
- `Motivo`: reduz erro e protege a otica em contestacao
- `Dependencias`: vincular o arquivo a OS e cliente

### 6.4 Transcricao Guiada Tatica
- `Estado`: `NEXT`
- `Trilha`: `Workflow UX`, `Core Revenue Operations`
- `Motivo`: blindar o envio ao laboratorio antes da producao
- `Dependencias`: fluxo tecnico da OS mais maduro

## 7. Fluxo de Vendas Consultivo (primeira camada)

### 7.1 Dashboard Tatico do Balcao
- `Estado`: `NEXT`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: alto valor comercial, mas exige consulta integrada mais refinada
- `Dependencias`: base comercial, estoque e prazos confiaveis

### 7.2 Orcamentador Inteligente Guiado por Receita
- `Estado`: `NEXT`
- `Trilha`: `Core Revenue Operations`, `Workflow UX`
- `Motivo`: aumenta conversao, mas precisa de compatibilidade tecnica e UX melhor
- `Dependencias`: tabelas, regras e validacao optica mais maduras

## 8. Gestao Tatica do Dono (essencial)

### 8.1 Controle de Alcadas e Travas de Desconto
- `Estado`: `NEXT`
- `Trilha`: `Core Revenue Operations`, `Operational Reliability`
- `Motivo`: protege margem e formaliza aprovacao
- `Dependencias`: fluxo de desconto dentro do PDV

### 8.2 Logs Universais "Dedo-Duro"
- `Estado`: `NEXT`
- `Trilha`: `Operational Reliability`
- `Motivo`: fortalece rastreabilidade de acoes sensiveis
- `Dependencias`: consolidar logs e auditoria operacional

### 8.3 Painel de Parametros de Comissao Variavel
- `Estado`: `NEXT`
- `Trilha`: `Core Revenue Operations`, `Operational Reliability`
- `Motivo`: o dono precisa ajustar regra de incentivo por tipo
- `Dependencias`: comissao base ja coerente com recebimento

## Backlog `LATER` — Depois da estabilidade do core

Estas entregas sao validas, mas dependem de mais maturidade operacional.

## 9. BI Executivo Simplificado

### Ficam para depois
- `Estado`: `LATER`
- `Trilha`: `Differentiation`, `Operational Reliability`
- Itens:
  - DRE que diz a verdade
  - Analise de ticket medio simples
  - Calculadora de break-even
  - Conversao por oftalmologista

Motivo:

- analytics ja tem base, mas precisam rodar sobre dados mais estaveis
- BI nao deve compensar fluxo operacional fraco

## 10. Motor de Compras e Estoque Vivo

### Ficam para depois
- `Estado`: `LATER`
- `Trilha`: `Core Revenue Operations`, `Core Integrations`, `Differentiation`
- Itens:
  - Maquina de reposicao (Curva ABC)
  - Transferencia entre filiais
  - Logistica reversa (garantias do lab)

Motivo:

- exigem maturidade maior de estoque
- exigem logistica mais profunda
- nao devem aumentar complexidade multiunidade cedo demais

## 11. Blindagem Juridica e de Faturamento

### Ficam para depois
- `Estado`: `LATER`
- `Trilha`: `Operational Reliability`, `Differentiation`
- Itens:
  - Auditoria cega de lotes de laboratorio
  - Cofre juridico (termos digitais)
  - Auditoria de lentes de contato

Motivo:

- dependem de fluxo de laboratorio mais maduro
- dependem de consistencia documental e evidencia mais forte

## Backlog `HOLD` — Visao futura, nao entra agora

Estes itens sao bons, mas perigosos se entrarem antes do core estar realmente estavel.

## 12. Diferenciacao Comercial / Dopamina / Premium

### Ficam em espera
- `Estado`: `HOLD`
- `Trilha`: `Differentiation`
- Itens:
  - Link magico de orcamento B2C
  - Dashboard gamificado "Minha Trilha"
  - Pote de ouro congelado
  - Quests especiais
  - Ranking saudavel diario
  - Plano de miopia ativa
  - Comparador "Grossura da lente" vs armacao
  - Calculadora de margens dinamica

Motivo:

- puxam diferenciacao antes da hora
- podem transformar o produto em breadth prematura
- precisam de base comercial, tecnica e de margem muito mais madura

## Ordem oficial de execucao

## Ciclo 1 — Fechar o Core Vendavel

1. Gestao visual de caixa
2. Painel de contas a receber / crediario
3. Motor de comissoes justo
4. Split payment
5. Carrinho de otica descomplicado
6. Extrato e estorno inteligente
7. Busca poderosa universal

## Ciclo 2 — Fechar operacao comercial real

1. Timeline publica da OS
2. Dashboard de receitas a expirar
3. Resgate de orcamentos abandonados
4. Gestao de inadimplentes
5. XML B2B estabilizado
6. OFX estabilizado
7. WhatsApp operacional basico

## Ciclo 3 — Fechar clinica e regras de gestao

1. Agendador publico robusto
2. Painel clinico isolado
3. Upload de receituario
4. Transcricao guiada
5. Travas de desconto e alcadas
6. Logs universais
7. Comissao variavel por tipo

## Ciclo 4 — Comecar diferenciacao com base

1. Dashboard tatico do balcao
2. Orcamentador guiado por receita
3. DRE aprofundado
4. Ticket medio
5. Break-even
6. Conversao por medico

## Ciclo 5 — Expansao controlada

1. Curva ABC / reposicao
2. Transferencia entre filiais
3. Logistica reversa
4. Auditoria de lotes
5. Termos digitais
6. Auditoria de LC

## Ciclo 6 — Premium / categoria

1. Link magico B2C
2. Simulador de grossura
3. Gamificacao
4. Missoes / ranking
5. Plano de miopia ativa
6. Recursos premium adicionais

## Contratos obrigatorios de implementacao

Toda entrega nova deve respeitar estes contratos:

### Checkout / PDV
- o fluxo de OS continua passando por `orders`
- split payment acopla em `transactions`
- nao criar fluxo paralelo para venda

### Caixa
- abertura, sangria e fechamento continuam no `cashRegisterService`
- nenhuma nova tela de caixa duplica regra de calculo

### Crediario
- carnê, baixa e inadimplencia continuam em `installmentService`
- comissao condicionada le status de recebimento real

### Busca
- reutilizar `orders`, `customers` e `financial`
- nao criar indice paralelo antes de provar necessidade

### Clinica
- rotas publicas resolvem `tenantSlug`
- nenhuma interface publica aceita IDs internos

### Integracoes
- XML, OFX e WhatsApp entram como `Core Integrations`
- integracoes novas so entram se fecharem lacunas reais do core

## Criterios de aceite

## Aceite do Core Vendavel

1. O caixa abre, movimenta e fecha com consistencia.
2. O crediario mostra parcelas em aberto, vencidas e pagas de forma confiavel.
3. A comissao nao libera sobre parcela nao recebida.
4. O checkout permite split payment sem quebrar o financeiro.
5. O cancelamento ou devolucao recompõe estoque corretamente.
6. A busca encontra cliente, OS e documento sem ambiguidade.

## Aceite do CRM Manual

1. Existem listas claras para receitas vencendo, drafts antigos e inadimplentes.
2. O operador consegue agir manualmente a partir dessas listas.
3. Os dados necessarios estao visiveis na mesma tela.
4. Nao depende de automacao invisivel para gerar valor.

## Aceite das Integracoes Core

1. XML entra no estoque com conferencia confiavel.
2. OFX ajuda a conciliar, nao confunde.
3. WhatsApp operacional envia mensagens claras e previsiveis.
4. O operador entende o que foi importado, conciliado ou notificado.

## Aceite da Clinica e Governanca

1. O agendamento publico funciona sem expor estrutura interna.
2. O receituario pode ser anexado e consultado.
3. A transcricao tecnica reduz erro humano.
4. A trava de desconto protege margem e registra aprovacao.
5. Logs de acoes sensiveis ficam rastreaveis.

## Testes minimos que devem acompanhar o backlog imediato

1. Split payment valido e invalido no parser/servico.
2. Comissao bloqueada quando parcela nao foi liquidada.
3. Fechamento de caixa com sangria e diferenca de gaveta.
4. Geracao e baixa de parcelas do crediario.
5. Estorno que devolve item ao estoque.
6. Busca por nome, CPF e OS retornando resultados corretos.
7. XML e OFX com erro de payload retornando falha previsivel.
8. Agendamento publico sempre resolvendo tenant por slug.

## Cenarios de validacao manual

1. Venda com PIX + cartao no mesmo checkout.
2. Venda com crediario gerando parcelas e painel de cobranca.
3. Gerente fechando caixa apos um dia de movimentos mistos.
4. Vendedor tentando aplicar desconto acima da alcada.
5. Cliente consultando status da OS por link.
6. Operador conferindo XML antes de aplicar entrada.
7. Loja usando o painel de inadimplencia para cobranca manual.

## Regra final de governanca

Este arquivo deve ser mantido sempre em tres camadas:

1. `NOW`
2. `NEXT`
3. `LATER` / `HOLD`

E nenhuma funcionalidade nova deve entrar no codigo sem estar antes classificada aqui com:

- trilha
- estado
- motivo
- dependencias

Isso transforma o backlog em ferramenta de execucao e impede que o produto volte a crescer sem direcao.
