# 📜 UX_PATTERNS.md — Contrato de Padrões de Interface e Experiência
# Fonte da verdade para consistência visual em todas as telas do VisionCore OS.

---

## 1. Estrutura de Página (Dashboard Pages)

- Toda página dentro de `/dashboard/` DEVE:
  1. Ser `'use client'`
  2. Importar `useSession` de `next-auth/react`
  3. Redirecionar para `/login` se `status === 'unauthenticated'`
  4. Usar o CSS Module correspondente OU importar `dashboard.module.css` e `shared.module.css`
  5. Exibir um estado de "Carregando..." enquanto `status === 'loading'`

---

## 2. Feedback Visual (UI Messages)

- Toda ação destrutiva ou de sucesso deve exibir um banner de feedback com:
  - `type: 'success'` → borda esquerda `var(--status-success)`, cor verde
  - `type: 'error'` → borda esquerda `var(--status-error)`, cor vermelha
- O banner deve ter um botão "Fechar" para o operador dispensar a mensagem.
- Banners nunca devem desaparecer sozinhos. O operador precisa confirmar que viu.

---

## 3. Modais

- Todo modal segue a estrutura: `modalOverlay` > `modal` > `modalHeader` + `modalBody` + `modalFooter`
- O header contém título (`modalTitle`) e botão de fechar (`modalClose`, caractere `×`)
- O footer contém botão secundário (Cancelar) à esquerda e primário (Confirmar) à direita
- Modais de ação destrutiva (cancelamento, estorno) devem ter o painel de impacto em vermelho antes do formulário

---

## 4. Tabelas

- Tabelas usam `width: 100%`, `borderCollapse: collapse`, `fontSize: 13`
- Cabeçalhos em uppercase, `fontSize: 11`, `fontWeight: 700`, cor `var(--text-tertiary)`
- Linhas alternam hover com `var(--bg-elevated)`
- Valores monetários sempre com `formatCurrency()`, alinhados à direita
- Datas sempre com `new Date(x + 'T12:00:00').toLocaleDateString('pt-BR')`

---

## 5. Cards Informativos

- Cards de contexto operacional (explicações sobre o fluxo) devem usar:
  - `borderLeft: 4px solid var(--status-warning)`
  - `fontSize: 12` para título (uppercase, `fontWeight: 800`)
  - `fontSize: 12` para corpo, cor `var(--text-secondary)`
- Nunca misturar cards informativos com cards de dados numéricos no mesmo grid.

---

## 6. Botões

- `btnPrimary` → Ação principal (Confirmar, Salvar, Criar)
- `btnSecondary` → Ação secundária (Cancelar, Voltar, Filtrar)
- `btnDanger` → Ação destrutiva (Estorno, Excluir)
- Botões de ação destrutiva NUNCA ficam ao lado do botão primário sem separação visual.

---

## 7. Cores e Variáveis CSS Globais

Sempre usar variáveis CSS, nunca cores hardcoded (exceto banners de estorno em vermelho):
- `--bg-surface`, `--bg-elevated`
- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--status-success`, `--status-error`, `--status-warning`
- `--border-color`, `--border-subtle`
- `--radius-md`, `--radius-lg`
- `--shadow-sm`
- `--space-2` até `--space-8`
