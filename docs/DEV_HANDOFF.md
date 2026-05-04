# 🚀 Developer Handoff - VisionCore OS

Bem-vindo ao VisionCore OS. Este documento resume o estado atual do projeto, nossas regras inegociáveis de domínio e o que esperamos de você (Backend/Engenharia) vs. o que será feito internamente (Design/Frontend).

## 1. Onde Estamos (Estado Atual)

- O **Core Operacional e Financeiro (V1)** está funcional: fluxo de criação de OS, checkout de pagamentos, geração de carnês e caixa básico.
- Nossa stack é: `Next.js App Router`, `Prisma ORM` e `PostgreSQL`.
- O banco tem modelagem Multi-Tenant rigorosa.
- O frontend UI (Telas, React Components, Tailwind) é responsabilidade do **Matheus (Owner/Design Lead)**.

## 2. A Sua Missão (O que o Dev faz)

O seu foco será construir a **Sessão Q (Automações Nativas, IA e Infraestrutura)**:

1. **The Closer (Resgate de Orçamentos):** Rotinas CRON (ou Inngest/BullMQ) que varrem ordens de serviço em `DRAFT` por > 48h e geram alertas (CRM) ou webhooks.
2. **The Collector (Motor de Cobrança):** Rotinas que varrem transações vencidas (`isPending: true`, `dueDate < today`), calculam juros diários baseados no contrato do lojista e disparam notificações.
3. **The Caretaker (Renovação de Receitas):** Varredura de pacientes com prescrições > 11 meses para gerar tarefas de "Convite para Exame" no CRM da ótica.
4. **Infraestrutura de IA:** Setup de conectores MCP, RAGs internos ou endpoints de orquestração de agentes.

## 3. A Grande Fronteira (Boundaries)

Para que o projeto flua rápido e sem conflitos:

- **[DEV] Backend / Integrações:** Você cria as rotas de API (`/api/...`), os Server Actions pesados, os CronJobs e mantem o `schema.prisma`.
- **[DESIGN] Frontend / Componentes:** Nós consumimos as suas APIs. Nós construímos os componentes React, estilizamos com Tailwind e criamos as interações do usuário. _Não se preocupe com "deixar a tela bonita", preocupe-se em mandar os dados formatados e rápidos._ Se precisar criar uma tela para debugar algo, pode usar HTML puro ou componentes Shadcn básicos. Nós refatoramos por cima depois.

## 4. Regras Inegociáveis (Leia antes de codar)

- Leia a **Bíblia do Domínio:** `docs/contracts/OPTICAL_RULES.md`. Ela contém todas as regras físicas e clínicas das lentes (ex: cálculos de dioptria, DNP, regra de materiais). É proibido subir validações de lente sem respeitar este arquivo.
- **Isolamento de Tenant:** Toda, absolutamente toda query no Prisma precisa conter `tenantId: currentUser.tenantId`. Sem exceções.
- **Soft Delete:** Nunca usamos `.delete()`. Usamos `.update({ isActive: false, deletedAt: now })`.
- **Centralização de Log:** Toda alteração financeira ou de OS crítica passa por `logChange()`.

## 5. Como Começar

Nossos próximos passos práticos para você:

1. Suba o ambiente local (`docker-compose up -d` para o Postgres) e valide seu Prisma Studio.
2. Crie uma rota isolada ou script de CRON simples, apenas para provar o motor do "The Closer".
3. O frontend fará o display dos dados gerados por este CRON no painel do Dashboard.
