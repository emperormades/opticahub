# 📖 GLOSSARY.md — Glossário de Termos de Negócio do VisionCore OS
# Este arquivo traduz termos do dia-a-dia da ótica para o vocabulário técnico do sistema.
# Use este glossário para entender pedidos do usuário e mapear para o código correto.

---

## Termos Financeiros

| Termo da Ótica | Significado Técnico | Onde no código |
|---|---|---|
| **Sangria** | Retirada de dinheiro físico do caixa antes do fechamento | `cashRegisterService` → action: `withdrawal` |
| **Fechamento de Caixa** | Encerrar o caixa diário, informando saldo contado | `cashRegisterService` → action: `close` |
| **Crediário / Carnê** | Venda parcelada no "fiado" da loja (sem cartão) | `Transaction.method: CREDIARIO` + `Installment[]` |
| **Estorno** | Devolução de valor ao cliente por cancelamento | `Transaction.type: ESTORNO` |
| **Faturar** | Registrar o pagamento de uma OS | Criar `Transaction` vinculada à `Order` |
| **DRE** | Demonstrativo de Resultado do Exercício (lucro/prejuízo) | `dreAnalyticsService.ts` |
| **Conciliação** | Cruzar extrato bancário com vendas internas | `financialOfxImportService` |
| **Comissão** | Percentual do vendedor sobre a venda liquidada | `commissionService` |

## Termos Ópticos

| Termo da Ótica | Significado Técnico | Onde no código |
|---|---|---|
| **Receita / Receituário** | Prescrição médica com os graus do paciente | Model: `Prescription` |
| **Grau** | Dioptria esférica (`sphere`) da lente corretiva | `Prescription.odSphere`, `oeSphere` |
| **Cilindro** | Correção de astigmatismo | `Prescription.odCylinder`, `oeCylinder` |
| **Eixo** | Orientação do cilindro em graus (0-180) | `Prescription.odAxis`, `oeAxis` |
| **Adição** | Grau extra para lentes progressivas/bifocais | `Prescription.odAddition`, `oeAddition` |
| **DNP** | Distância naso-pupilar (centro da pupila ao nariz) | `Prescription.odDnpMono`, `oeDnpMono` |
| **DMA** | Diâmetro maior da armação | `Product.frameDma` |
| **Ponte** | Distância entre as lentes na armação | `Product.frameBridge` |
| **Progressiva** | Lente multifocal (perto + longe) | Requer `addition > 0` e `height >= 18mm` |
| **Antirreflexo / AR** | Tratamento na lente contra reflexos | Tratamento premium, afeta preço |
| **Transitions** | Lente fotossensível que escurece no sol | Tratamento premium, incompatível com alguns materiais |

## Termos Operacionais

| Termo da Ótica | Significado Técnico | Onde no código |
|---|---|---|
| **OS** | Ordem de Serviço (a venda completa) | Model: `Order` |
| **Lab / Laboratório** | Empresa que fabrica as lentes sob medida | `Order.labName`, `Order.labOrderCode` |
| **Retrabalho / Refação** | Lente voltou errada, precisa refazer | `Order.reworkCount`, `reworkCause` |
| **Conferência** | Verificação da lente pronta antes da entrega | Status: `QUALITY_CHECK` |
| **Armação** | Estrutura física dos óculos | `Product` com `itemType: FRAME` |
| **Curva A/B/C** | Classificação de produtos por giro de vendas | `STOCK_RULES.md` → Seção 3 |
| **Ruptura** | Produto abaixo do estoque mínimo | `Product.stock < Product.minStock` |
| **NF-e** | Nota Fiscal Eletrônica do fornecedor | `stockImportService`, `nfeParser` |
