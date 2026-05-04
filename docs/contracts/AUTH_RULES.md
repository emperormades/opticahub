# 📜 AUTH_RULES.md — Contrato de Domínio de Autenticação e Permissões
# Fonte da verdade para controle de acesso, roles e sessões do VisionCore OS.

---

## 1. Modelo de Autenticação

- O sistema usa **NextAuth.js** com adapter Prisma.
- A sessão inclui obrigatoriamente: `userId`, `tenantId`, `role`, `name`, `email`.
- Toda rota de API (`/api/*`) DEVE verificar sessão ativa antes de processar qualquer dado.
- Toda página de dashboard (`/dashboard/*`) DEVE verificar `useSession()` e redirecionar se `unauthenticated`.

---

## 2. Roles (Perfis de Acesso)

| Role | Pode Vender | Pode Cancelar OS | Pode ver DRE | Pode Ajustar Comissão | Pode Fechar Caixa |
|---|---|---|---|---|---|
| `SELLER` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `MANAGER` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `OPTOMETRIST` | ❌ | ❌ | ❌ | ❌ | ❌ |

- `SELLER`: Pode criar OS, orçar, consultar estoque e acompanhar suas próprias metas.
- `MANAGER`: Tem acesso ao financeiro, pode aprovar estornos e configurar parâmetros.
- `ADMIN`: Acesso total. Pode alterar configurações do tenant, gerenciar usuários.
- `OPTOMETRIST`: Acesso restrito à clínica, agendamentos e prescrições.

---

## 3. Isolamento Multi-tenant

- **Todo dado no sistema é filtrado por `tenantId`**. Isso é inegociável.
- Toda query Prisma em rotas de API DEVE incluir `where: { tenantId }`.
- Nunca expor dados de um tenant para outro. Isso é falha de segurança crítica.
- O `tenantId` vem da sessão (`session.user.tenantId`), nunca do body ou query params.

---

## 4. Regras para Ações Sensíveis

- **Cancelamento de OS**: Requer `role: MANAGER` ou `ADMIN`.
- **Alteração de preço de produto**: Gera log obrigatório com valor anterior e novo.
- **Desconto acima de 15%**: Requer PIN de gerente (futuro - Etapa 6).
- **Exclusão de qualquer registro**: Proibido (soft-delete). Todo registro tem `deletedAt` ou `status: CANCELLED`.
