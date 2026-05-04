---
description: Diagnostica e corrige um erro reportado pelo usuario ou encontrado no terminal. Segue o fluxo sistematico de debug.
---

## Como usar
Execute: `/debug [descricao-do-erro]`

Exemplo: `/debug O caixa nao esta abrindo, erro 500 na tela`

---

## Passos

1. Leia `docs/contracts/SERVICE_MAP.md` para localizar o serviço responsável pelo módulo descrito.

2. Leia o contrato de domínio correspondente em `docs/contracts/` (ex: `FINANCE_RULES.md` para erros financeiros).

3. Verifique o terminal em execução (`npm run dev`) para capturar o stack-trace ou erro exato.

4. Abra o arquivo do serviço identificado no Step 1 e localize a função suspeita.

5. Leia o schema Prisma (`prisma/schema.prisma`) para verificar se há divergência entre o código e o modelo de dados.

6. Aplique a correção mínima necessária (nunca reescreva funções inteiras se o fix é pontual).

7. Verifique se o servidor voltou a funcionar sem erros no terminal.

8. Se o erro persiste, amplie o escopo de busca para os arquivos de rota (`app/api/`) correspondentes.
