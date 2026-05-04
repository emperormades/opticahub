# 🗺️ SERVICE_MAP.md — Mapa de Serviços do VisionCore OS

# Referência rápida para a IA e desenvolvedores entenderem ONDE cada lógica mora.

# Ao receber um pedido, use este mapa para ir direto ao arquivo correto.

---

## Financeiro

| Serviço              | Arquivo                                      | Responsabilidade                         |
| -------------------- | -------------------------------------------- | ---------------------------------------- |
| Caixa Diário         | `lib/services/cashRegisterService.ts`        | Abrir, fechar, sangria, posição final    |
| Transações           | `lib/services/transactionService.ts`         | Criar pagamentos, estornos, splits       |
| Comissões            | `lib/services/commissionService.ts`          | Motor de comissão na liquidação          |
| Comissões Financeiro | `lib/services/financialCommissionService.ts` | Cálculo vinculado ao pagamento real      |
| Parcelas / Carnê     | `lib/services/installmentService.ts`         | Geração e baixa de parcelas de crediário |
| Importação OFX       | `lib/services/financialOfxImportService.ts`  | Parse de extrato bancário                |
| Resumo Financeiro    | `lib/services/financialSummaryService.ts`    | Totais consolidados                      |
| Motor de Cobrança    | `lib/services/billingEngine.ts`              | Taxas, cálculos de faturamento           |
| DRE                  | `lib/services/dreAnalyticsService.ts`        | Demonstrativo de Resultado               |
| Split Payment        | `lib/services/splitPaymentService.ts`        | Múltiplos métodos de pagamento por OS    |

## Vendas e OS

| Serviço           | Arquivo                                 | Responsabilidade                             |
| ----------------- | --------------------------------------- | -------------------------------------------- |
| Ordens de Serviço | `lib/services/orderService.ts`          | Criar OS, transições de status, cancelamento |
| Retrabalho        | `lib/services/orderReworkService.ts`    | Controle de retificações laboratoriais       |
| Rascunhos         | `lib/services/abandonedDraftService.ts` | OS abandonadas e resgate                     |

## Estoque

| Serviço        | Arquivo                              | Responsabilidade            |
| -------------- | ------------------------------------ | --------------------------- |
| Importação XML | `lib/services/stockImportService.ts` | Entrada de estoque via NF-e |
| Parser XML     | `lib/xml/xmlImporter.ts`             | Parser baixo nível do XML   |
| Parser NFe     | `lib/xml/nfeParser.ts`               | Extração de campos da NF-e  |

## Clínica e Ótica

| Serviço              | Arquivo                                       | Responsabilidade                         |
| -------------------- | --------------------------------------------- | ---------------------------------------- |
| Motor Óptico         | `lib/services/opticalEngine.ts`               | Validação de graus, diâmetros, materiais |
| Auditor Lab          | `lib/services/labAuditor.ts`                  | Auditoria de faturas laboratoriais       |
| Prescrições Vencendo | `lib/services/expiringPrescriptionService.ts` | Radar de receitas a vencer               |

## Analytics e Dashboards

| Serviço              | Arquivo                                            | Responsabilidade                    |
| -------------------- | -------------------------------------------------- | ----------------------------------- |
| Overview Dashboard   | `lib/services/dashboardOverviewService.ts`         | KPIs do painel principal            |
| Analytics Overview   | `lib/services/analyticsOverviewService.ts`         | Métricas analíticas consolidadas    |
| Performance Vendas   | `lib/services/salesPerformanceAnalyticsService.ts` | Ranking e performance de vendedores |
| Analytics Vendedores | `lib/services/sellerAnalyticsService.ts`           | Detalhamento por vendedor           |
| CRM Preditivo        | `lib/services/crmPredictiveAnalyticsService.ts`    | Previsões de churn e retorno        |

## Autenticação e Erros

| Serviço          | Arquivo         | Responsabilidade                                  |
| ---------------- | --------------- | ------------------------------------------------- |
| Auth (NextAuth)  | `auth.ts`       | Configuração de sessão, callbacks, adapter Prisma |
| Erros de Domínio | `lib/errors.ts` | Classe `AppError` e códigos de erro padronizados  |

## Utilitários

| Serviço         | Arquivo                                  | Responsabilidade            |
| --------------- | ---------------------------------------- | --------------------------- |
| Busca Universal | `lib/services/universalSearchService.ts` | Busca cross-módulo          |
| Notificações    | `lib/services/notificationService.ts`    | Alertas internos do sistema |
