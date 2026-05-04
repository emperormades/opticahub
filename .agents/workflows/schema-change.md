---
description: Processo seguro para alterar o schema do Prisma sem quebrar o banco de dados em uso.
---

## Como usar

Execute: `/schema-change [descricao-da-mudanca]`

Exemplo: `/schema-change Adicionar campo creditLimit ao Customer`

---

## Passos

1. Leia `docs/contracts/SCHEMA_ANNOTATIONS.md` para entender o contexto do modelo que será alterado.

2. Leia `docs/contracts/DECISION_LOG.md` para verificar se existe alguma decisão que afete esta mudança.

3. Edite `prisma/schema.prisma` com a alteração necessária.

4. Valide a sintaxe do schema:
   // turbo

```
npx prisma format
```

5. Gere a migration (em ambiente de dev):

```
npx prisma migrate dev --name [nome-descritivo]
```

6. Regenere o client:
   // turbo

```
npx prisma generate
```

7. Atualize `docs/contracts/SCHEMA_ANNOTATIONS.md` com a nova coluna/tabela e sua explicação.

8. Se a mudança adiciona um novo modelo/tabela, atualize também `docs/contracts/SERVICE_MAP.md`.

9. Se a mudança introduz um novo conceito de domínio (novo modelo, novo status, novo tipo), atualize `docs/contracts/GLOSSARY.md` com o termo e seu significado técnico.

10. Avise no terminal quais arquivos foram alterados.
