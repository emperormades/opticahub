# 📋 DECISION_LOG.md — Registro de Decisões Arquiteturais

# Toda decisão importante sobre o sistema é registrada aqui com a razão.

# Isso impede que a IA reverta ou questione decisões já tomadas pelo dono do produto.

---

## Formato

Cada decisão segue: **[DATA] DECISÃO → RAZÃO → IMPACTO**

---

## Decisões Ativas

### DEC-001 (2026-03-01): Sem CronJobs ocultos

- **Decisão:** Nenhuma automação roda em background sem ação do usuário.
- **Razão:** O dono quer controle total. Processos "invisíveis" geram desconfiança.
- **Impacto:** Toda ação que seria cron vira botão ou filtro em dashboard.

### DEC-002 (2026-03-01): Sem Hard Delete em nenhuma tabela

- **Decisão:** Todo registro usa soft-delete (`status: CANCELLED`, `deletedAt`).
- **Razão:** Rastreabilidade fiscal. Nenhum dado pode "sumir" do banco.
- **Impacto:** Todas as queries de listagem devem filtrar `deletedAt: null` ou `status != CANCELLED`.

### DEC-003 (2026-03-02): Cancelamento de OS = "Estorno / Devolução" na UI

- **Decisão:** O botão na tela da OS diz "Estorno / Devolução", não "Cancelar".
- **Razão:** O dono quer linguagem de ótica real, não linguagem de sistema.
- **Impacto:** Toda referência textual em botões e modais de cancelamento usa essa nomenclatura.

### DEC-004 (2026-03-02): Crediário com e sem juros automáticos

- **Decisão:** Os juros do crediário são calculados dentro do sistema pelo gerente e admin.
- **Razão:** Cada ótica tem uma tabela de juros própria, não padronizável nesta fase.
- **Impacto:** O campo de valor da parcela é informado manualmente ou de forma mais inteligente . O sistema calcula juros.

### DEC-006 (2026-03-02): Laboratórios sem integração API

- **Decisão:** A comunicação com labs é via campo texto (`labName`, `labOrderCode`).
- **Razão:** Labs brasileiros não têm API padronizada. Integração real é Etapa 6+.
- **Impacto:** Status de produção é atualizado manualmente pelo CPD.

### DEC-007 (2026-03-03): Fase piloto = funcionalidade assistida

- **Decisão:** Features como "Fila de Compra" e "Pedidos Automáticos" estão desligadas.
- **Razão:** O piloto prioriza estabilidade sobre automação.
- **Impacto:** Telas de reposição mostram indicadores, mas a ação de compra é externa.

---

## Como usar este arquivo

- **IA:** Antes de implementar qualquer feature, verifique se existe uma decisão aqui que a afete.
- **Humano:** Ao tomar uma decisão de produto importante, registre aqui para que a IA nunca a reverta.
- **Formato de adição:** `### DEC-XXX (YYYY-MM-DD): [Título curto]`
