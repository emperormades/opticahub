# Design System: Rupta Optics / VisionCore OS
**Project ID:** rupta.optics-v2
**Status:** Compilado via CSS Roots (Semântico)

## 1. Visual Theme & Atmosphere
O VisionCore OS possui uma atmosfera **Utilitária, Limpa e Profissional**, voltada para produtividade de alta densidade sem causar fadiga visual (SaaS B2B).
A interface mistura minimalismo espacial com toques sutis de **Glassmorphism** e **Elevação Premium** (sombras suaves e profundas) para criar uma hierarquia clara. As bordas recebem arredondamentos macios, buscando um design amigável, porém extremamente clínico/tecnológico. Linhas separadoras são quase transparentes (`border-subtle`), deixando a estruturação primária baseada em espaços em branco (whitespace) e cards flutuantes.

## 2. Color Palette & Roles

### Brand Colors
* **Vibrant Sunset Orange** (`#E35336`) - Usada como `brand-primary` para ações de altíssima prioridade, botões primários e states ativos.
* **Burnt Terracotta** (`#c94423`) - Usada como `brand-primary-hover` para feedbacks de interação em botões principais.
* **Soft Orange Glow** (`rgba(227, 83, 54, 0.12)`) - Usado para highlights suaves de fundo ligados a marca.

### Base & Text
* **Pure Clinical White** (`#FFFFFF`) - Usado como background de painéis elevados (`bg-elevated`).
* **Crisp Snowy Silver** (`#F0F2F5`) - `text-primary`. Contraste de letreiros focais. (Dependendo do modo, backgrounds de página usam este tom ou `#fafafa`).
* **Cool Muted Slate** (`#8B919E`) - `text-secondary`. Usado extensamente para subtítulos, metadados e textos de apoio que exigem desfoque visual.
* **Deep Charcoal Ink** (`#0D0F12`) - `text-inverse`. Usado para alta legibilidade em situações de inversão ou Dark-Mode focais.

### Status Semantic
* **Emerald Success** (`#22C55E`) - Indicadores positivos, lucro e validação. (Fundo diluído a 10%).
* **Amber Warning** (`#F59E0B`) - Alertas, itens em espera ou margens de perigo. (Fundo diluído a 10%).
* **Crimson Error** (`#EF4444`) - Ruptura de estoque, prejuízo ou exclusões. (Fundo diluído a 10%).
* **Azure Info** (`#3B82F6`) - Informativos neutros.

### UI Structural
* **Soft Whisper Border** (`rgba(255, 255, 255, 0.06)` a `0.10`) - Separadores quase invisíveis do wireframe.

## 3. Typography Rules
* **Font Family:** A fonte exclusiva do sistema é **Geist** (`var(--font-sans)`). Uma tipografia geométrica neo-grotesca, super limpa e técnica, herdando estilo da Vercel/NextJs.
* **Hierarchy:**
   * Títulos de página: `20px` a `24px` (`Geist`, peso `700 - ExtraBold`), letter-spacing negativo pesado (`-0.4px` a `-0.03em`) para compactação moderna.
   * Corpo textual base: `14px`, peso `400` a `500`.
   * Metadados, Labels, Subtítulos: `11px` a `13px` (`Geist`, peso `500` - `600`), frequentemente em `uppercase` com `letter-spacing: 0.06em` em casos de KPIs.
* Tipografia monoespaçada `Geist Mono` para números exatos (como notas fiscais, chaves de acesso etc.).

## 4. Component Stylings

* **Buttons (Botões Primários):**
  * Subtly rounded corners (`border-radius: 6px` a `10px`).
  * Fundo sólido na cor Vibrant Sunset Orange. Texto Crisp Snowy Silver (`#fff`).
  * Sombra forte: `0 1px 2px rgba(0, 0, 0, 0.4)` evoluindo no hover para um glow temático (`0 8px 32px rgba(227, 83, 54, 0.25)`).
* **Buttons (Secundários/Fantasmas):**
  * Fundo transparente ou Cinza super fraco (`bg-elevated`).
  * Bordas sutis (`1px solid border-default`)
  * Transições rápidas `150ms cubic-bezier`.
* **Cards/Containers:**
  * Generously rounded corners (`border-radius: 12px` a `16px`).
  * Background puramente branco ou super claro (`#fff` ou `#f8fafc`).
  * Sombra super macia e larga (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1)`) para separá-los do Canvas de Fundo (geralmente `#fafafa`).
* **Inputs/Forms:**
  * Pill-shaped ou Subtly rounded corners (`8px`).
  * Preenchimento interno gordo (`padding: 12px 14px`).
  * Bordas em Cool Muted Slate lavadas (`1px solid #cbd5e1`). Foco minimalista com texto em 14px~15px.
* **KPI Blocks (Indicadores Financeiros):**
  * Títulos alinhados ao topo com iconografia descritiva em Emoji.
  * O número do valor apresenta pesos absolutos (até `700/800`) e tamanhos que chamam a visão (`20px - 24px`), compactados (`letter-spacing: -0.5px`).

## 5. Layout Principles
* **Whitespace Strategy:** Muito pródiga. O espaçamento padrão `var(--space-6)` (24px) é usado agressivamente para separar sessões (gaps de página e paddings de containers filhos).
* **Grid:** Excesso do uso de Flexbox para alinhamentos em linha (toolbars e ações) e Grids densos `grid-template-columns` para listas de dashboards.
* O sistema respira com respiros uniformes e lineares; barras de scroll customizadas, ultrafinas e redondas.
* A SideBar consome um esqueleto fixo lateral (`240px`), garantindo 100% da viewport vertical dedicada ao Canvas Operacional. Menus em tabs de navegação primárias aderem a `position: sticky` no topo com fundos brancos.
