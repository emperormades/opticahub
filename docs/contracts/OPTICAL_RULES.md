# 📜 OPTICAL_RULES.md — Contrato de Domínio Óptico
# Fonte da verdade para cálculos e regras clínicas e técnicas de ótica.
# Qualquer IA ou desenvolvedor que altere módulos de Receituário ou Estoque de Lentes DEVE ler este arquivo antes.

---

## 1. Receituário (Prescrição Médica)

- Uma prescrição possui os campos: `OD` (Olho Direito) e `OE` (Olho Esquerdo), cada um com:
  - `sphere` (Esférico): Obrigatório. Pode ser positivo ou negativo.
  - `cylinder` (Cilíndrico): Opcional. Pode ser 0 ou negativo.
  - `axis` (Eixo): Obrigatório se `cylinder != 0`. Valor entre 0 e 180 graus.
  - `addition` (Adição): Para lentes progressivas. Geralmente entre +0.75 e +3.50.
  - `dnpMono` (DNP Monocular): Distância naso-pupilar de cada olho em mm. Geralmente entre 25 e 40mm.
  - `height` (Altura de montagem): Distância em mm. Obrigatório para lentes progressivas e bifocais.

- A **Soma Dióptrica** é: `sphere + (cylinder / 2)`. Usada para estimar o grau equivalente da lente.

---

## 2. Compatibilidade de Materiais e Graus

- Lentes de **alto índice** (1.74, 1.67) são recomendadas para graus acima de ±4.00 dpt.
- Lentes de **índice padrão** (1.50, 1.56) são adequadas para graus até ±3.00 dpt.
- Lentes **antirreflexo** são recomendadas para qualquer grau acima de ±2.00 dpt.
- Lentes **fotossensíveis** (Transitions) são incompatíveis com armações de alumínio e aço sem tratamento UV.

---

## 3. Cálculo do Diâmetro Mínimo da Lente (Minimum Blank Size)

A fórmula para o diâmetro mínimo (MBS) é:
`MBS = DMA + 2 * (decentramento)`
onde `decentramento = |DNP_do_cliente - DMA/2|`

- `DMA` = Diâmetro maior da armação (campo: `frameDma`).
- Se `MBS > 75mm`, o laboratório pode recusar a OS ou cobrar add-on.

---

## 4. Regras de Montagem e Validação Laboratorial

- A **Altura Mínima de Montagem** para lentes progressivas é de `18mm` (campo `height`).
- A **Ponte (Bridge)** da armação deve ser registrada para cálculo do DNP.
- Se o laboratório for selecionado e não houver `labName` na OS ao mudar para `LAB_SENT`, a transição deve ser bloqueada.
- Campos obrigatórios para envio ao lab: `odSphere`, `oeSphere`, `dnpMono` (OD e OE), `height` (para progressivos), `frameDma`.

---

## 5. Garantia Técnica

- O prazo padrão de garantia de lentes é **90 dias** a partir da data de entrega.
- Retificações (retrabalho laboratorial) devem ser registradas como `reworkCount++` na OS.
- Após 2 retrabalhos, a OS deve ser escalada para o Responsável Técnico (RT).
- A causa do retrabalho (`reworkCause`) é obrigatória ao registrar um `rework`.
