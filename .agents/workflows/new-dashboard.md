---
description: Cria uma nova página de dashboard seguindo o padrão exato do VisionCore OS (auth, layout, CSS, session).
---

## Como usar

Execute: `/new-dashboard [nome-do-modulo]`

Exemplo: `/new-dashboard receita-medica`

---

## Passos

1. Leia `docs/contracts/COMPONENT_REGISTRY.md` para verificar se já existe uma página equivalente. Se já existir, avise o usuário e sugira reutilizar ou estender a existente.

2. Pegue o argumento `[nome-do-modulo]` e normalize em `kebab-case` para usar como nome da pasta.

3. Crie o arquivo `app/dashboard/[nome-do-modulo]/page.tsx` com o seguinte boilerplate:
   - `'use client'` no topo
   - Importe `useSession` de `next-auth/react` e redirecione caso `status === 'unauthenticated'`
   - Importe os estilos globais de `@/app/dashboard/dashboard.module.css`
   - Adicione um `<header>` com `<h1>` descritivo do módulo
   - Retorne uma `<div>` com `className={s.container}` e um card de "Em construção" como placeholder

4. Se existir um arquivo `[nome-do-modulo].module.css`, use-o. Se não, crie um com uma classe `.container` básica.

5. Avise no terminal quais arquivos foram criados.
