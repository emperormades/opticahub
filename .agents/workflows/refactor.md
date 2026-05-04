---
description: Refatora um modulo inteiro do sistema seguindo contratos de dominio e padroes de UX consistentes.
---

## Como usar
Execute: `/refactor [modulo]`

Exemplo: `/refactor financeiro`

---

## Passos

1. Leia `docs/contracts/SERVICE_MAP.md` para identificar TODOS os serviços que fazem parte do módulo.

2. Leia o contrato de domínio correspondente em `docs/contracts/` para garantir que as regras de negócio estejam claras.

3. Leia `docs/contracts/UX_PATTERNS.md` se houver componentes de front-end envolvidos.

4. Liste todos os arquivos do módulo (serviços, rotas API, e páginas de dashboard).

5. Para cada arquivo, verifique:
   - Tipos `any` remanescentes → Substituir por tipos explícitos
   - Lógica duplicada entre rotas e serviços → Centralizar no serviço
   - Imports não utilizados → Remover
   - Funções com mais de 80 linhas → Extrair sub-funções
   - Tratamento de erro inconsistente → Padronizar try/catch com log

6. Execute `tsc --noEmit` para validar que nenhum type error foi introduzido.

7. Reporte ao usuário quais arquivos foram alterados e o que mudou em cada um.
