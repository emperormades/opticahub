# 🧩 COMPONENT_REGISTRY.md — Registro de Componentes Reutilizáveis

# Lista todos os componentes de UI já construídos para evitar recriar do zero.

# A IA deve consultar este arquivo ANTES de criar qualquer componente novo.

---

## Páginas de Dashboard (Full Pages)

| Componente             | Caminho                                                | CSS Module               | Descrição                          |
| ---------------------- | ------------------------------------------------------ | ------------------------ | ---------------------------------- |
| Dashboard Hub          | `app/dashboard/page.tsx`                               | `dashboard.module.css`   | Tabs com resumo por módulo         |
| Backoffice Hub         | `app/dashboard/backoffice/page.tsx`                    | `shared.module.css`      | Tabs com resumo por aba            |
| Backoffice EDI         | `app/dashboard/backoffice/edi/page.tsx`                | `shared.module.css`      | Intercâmbio eletrônico de dados    |
| Financeiro Hub         | `app/dashboard/financeiro-hub/page.tsx`                | `financeiro.module.css`  | Hub consolidado financeiro         |
| Financeiro             | `app/dashboard/financeiro/page.tsx`                    | `financeiro.module.css`  | Visão geral financeira             |
| Caixa Diário           | `app/dashboard/financeiro/caixa/page.tsx`              | `financeiro.module.css`  | Abrir/fechar/sangria/transações    |
| Conciliação            | `app/dashboard/financeiro/conciliacao/page.tsx`        | `financeiro.module.css`  | Fila OFX + mapeamento              |
| Carnê / Crediário      | `app/dashboard/financeiro/carne/page.tsx`              | `financeiro.module.css`  | Gestão de parcelas                 |
| Comissões              | `app/dashboard/financeiro/comissoes/page.tsx`          | `financeiro.module.css`  | Gestão de comissões                |
| Inadimplentes          | `app/dashboard/financeiro/inadimplentes/page.tsx`      | `financeiro.module.css`  | Clientes em atraso                 |
| Ordens de Serviço      | `app/dashboard/ordens/page.tsx`                        | `ordens.module.css`      | Lista de OS com filtros            |
| Detalhe da OS          | `app/dashboard/ordens/[id]/page.tsx`                   | `ordens.module.css`      | Timeline + itens + pagamentos      |
| Imprimir OS            | `app/dashboard/ordens/[id]/imprimir/page.tsx`          | —                        | Versão impressão da OS             |
| Imprimir Lab           | `app/dashboard/ordens/[id]/imprimir-lab/page.tsx`      | —                        | Versão impressão para laboratório  |
| Orçamentos Abandonados | `app/dashboard/ordens/orcamentos-abandonados/page.tsx` | `ordens.module.css`      | Resgate de rascunhos               |
| Clientes               | `app/dashboard/clientes/page.tsx`                      | `clientes.module.css`    | Cadastro e gestão de clientes      |
| Detalhe do Cliente     | `app/dashboard/clientes/[id]/page.tsx`                 | `clientes.module.css`    | Perfil + histórico do cliente      |
| Receitas Expirando     | `app/dashboard/clientes/receitas-expirando/page.tsx`   | `clientes.module.css`    | Radar de prescrições a vencer      |
| Clínica Hub            | `app/dashboard/clinica-hub/page.tsx`                   | —                        | Hub da clínica                     |
| Agenda Clínica         | `app/dashboard/clinica/agenda/page.tsx`                | —                        | Agendamento de consultas           |
| Estoque                | `app/dashboard/estoque/page.tsx`                       | —                        | Visão geral de estoque             |
| Suprimentos            | `app/dashboard/estoque/suprimentos/page.tsx`           | —                        | Radar de ruptura                   |
| Import XML (legado)    | `app/dashboard/estoque/import/page.tsx`                | —                        | Entrada via NF-e (legado)          |
| Importar XML           | `app/dashboard/estoque/importar/page.tsx`              | `importar.module.css`    | Entrada via NF-e                   |
| Diagnóstico            | `app/dashboard/diagnostico/page.tsx`                   | `diagnostico.module.css` | Health check do sistema            |
| Panorama Analytics     | `app/dashboard/panorama/page.tsx`                      | `analytics.module.css`   | KPIs e gráficos                    |
| Agentes IA             | `app/dashboard/agentes/page.tsx`                       | `agentes.module.css`     | Painel de agentes                  |
| Admin                  | `app/dashboard/admin/page.tsx`                         | —                        | Administração do sistema           |
| Configurações          | `app/dashboard/configuracoes/page.tsx`                 | —                        | Configurações do tenant            |
| Kanban Logística       | `app/dashboard/logistica/kanban/page.tsx`              | —                        | Kanban de produção                 |
| DRE                    | `app/dashboard/analytics/dre/page.tsx`                 | —                        | Demonstrativo de Resultado         |
| CRM Analytics          | `app/dashboard/analytics/crm/page.tsx`                 | —                        | Analytics de CRM                   |
| Auditoria Lab          | `app/dashboard/analytics/auditoria-lab/page.tsx`       | —                        | Auditoria de faturas laboratoriais |

## Páginas Públicas (Sem Auth)

| Componente      | Caminho                                    | Descrição                 |
| --------------- | ------------------------------------------ | ------------------------- |
| Vitrine Pública | `app/vitrine/[tenantSlug]/page.tsx`        | Catálogo + rastreio de OS |
| Agendamento     | `app/agendar/[tenantSlug]/page.tsx`        | Booking público           |
| BookingForm     | `app/agendar/[tenantSlug]/BookingForm.tsx` | Formulário de agendamento |

## CSS Modules Compartilhados

| Arquivo                  | Usado por                             | Classes principais                                                                      |
| ------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `dashboard.module.css`   | Dashboard Hub                         | `.container`, `.card`, `.tabs`                                                          |
| `shared.module.css`      | Backoffice, múltiplas telas           | `.btnPrimary`, `.btnSecondary`, `.btnDanger`, `.modal*`, `.table*`, `.field*`, `.card*` |
| `financeiro.module.css`  | Caixa, Conciliação, Carnê, Comissões  | Herda de shared + específicos financeiros                                               |
| `ordens.module.css`      | Lista e Detalhe de OS                 | `.statusBadge`, `.timeline*`                                                            |
| `clientes.module.css`    | Clientes, Detalhe, Receitas Expirando | Estilos específicos de CRM                                                              |
| `analytics.module.css`   | Panorama                              | `.chartCard`, `.kpiGrid`                                                                |
| `agentes.module.css`     | Agentes IA                            | Estilos do painel de agentes                                                            |
| `diagnostico.module.css` | Diagnóstico                           | Health check específicos                                                                |
| `importar.module.css`    | Importar XML                          | Estilos de importação                                                                   |

## Regra de Ouro

> **Nunca crie um componente novo se já existe um equivalente nesta lista.**  
> Sempre importe e reutilize. Se precisar estender, adicione props ao existente.
