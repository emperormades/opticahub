import assert from 'node:assert/strict'
import { PaymentMethod, ProductType, ReworkCause, TransactionType } from '@prisma/client'
import { parseCreateOrderPayload } from '../lib/validation/orderPayload'
import {
    parseCashMutationPayload,
    parseCarneListQuery,
    parseCreateCarnePayload,
    parseCreateTransactionPayload,
    parseFinancialDateRangeQuery,
    parseFinancialSummaryQuery,
    parseListTransactionsQuery,
    parsePayInstallmentPayload,
} from '../lib/validation/financialPayload'
import { parseReworkPayload } from '../lib/validation/reworkPayload'

function expectSuccess<T extends { success: boolean }>(
    result: T,
    label: string,
): asserts result is T & { success: true } {
    assert.equal(result.success, true, `${label} deveria retornar sucesso`)
}

function expectFailure<T extends { success: boolean; error?: string }>(
    result: T,
    label: string,
): asserts result is T & { success: false } {
    assert.equal(result.success, false, `${label} deveria falhar`)
}

function runOrderValidationChecks() {
    const validOrder = parseCreateOrderPayload({
        customerId: 'cust_1',
        prescriptionId: 'rx_1',
        notes: 'Cliente pediu urgencia',
        labName: 'Lab Center',
        labDeadline: '2026-03-20T10:00:00.000Z',
        discount: '10',
        items: [
            {
                productId: 'prod_1',
                description: 'Lente multifocal',
                quantity: 2,
                unitPrice: '120.5',
                discount: 5,
                itemType: ProductType.LENTES,
            },
        ],
        transactions: [
            {
                method: PaymentMethod.PIX,
                amount: '226',
                installmentsCount: 1,
            },
        ],
    })

    expectSuccess(validOrder, 'parseCreateOrderPayload valido')
    assert.equal(validOrder.data.items.length, 1)
    assert.equal(validOrder.data.transactions?.length, 1)
    assert.equal(validOrder.data.items[0].itemType, ProductType.LENTES)

    const invalidOrder = parseCreateOrderPayload({
        customerId: 'cust_1',
        items: [
            {
                description: '',
                quantity: 1,
                unitPrice: 100,
            },
        ],
    })

    expectFailure(invalidOrder, 'parseCreateOrderPayload invalido')

    const invalidSplitOrder = parseCreateOrderPayload({
        customerId: 'cust_1',
        items: [
            {
                description: 'Armacao acetato',
                quantity: 1,
                unitPrice: 300,
                discount: 0,
                itemType: ProductType.ARMACOES,
            },
        ],
        transactions: [
            {
                method: PaymentMethod.PIX,
                amount: 200,
                installmentsCount: 1,
            },
        ],
    })

    expectFailure(invalidSplitOrder, 'parseCreateOrderPayload com split invalido')

    const validSplitOrder = parseCreateOrderPayload({
        customerId: 'cust_1',
        items: [
            {
                description: 'Lente premium',
                quantity: 1,
                unitPrice: 500,
                discount: 0,
                itemType: ProductType.LENTES,
            },
        ],
        transactions: [
            { method: PaymentMethod.PIX, amount: 200, installmentsCount: 1 },
            { method: PaymentMethod.CARTAO_CREDITO, amount: 300, installmentsCount: 3 },
        ],
    })

    expectSuccess(validSplitOrder, 'parseCreateOrderPayload com split valido')
    assert.equal(validSplitOrder.data.transactions?.length, 2)
}

function runFinancialValidationChecks() {
    const validTransaction = parseCreateTransactionPayload({
        type: TransactionType.ENTRADA,
        method: PaymentMethod.PIX,
        amount: '155.7',
        description: 'Pagamento de OS',
        orderId: 'os_1',
        installments: 1,
        isPending: false,
        dueDate: '2026-03-10',
        commissionPct: 5,
    })

    expectSuccess(validTransaction, 'parseCreateTransactionPayload valido')
    assert.equal(validTransaction.data.type, TransactionType.ENTRADA)
    assert.equal(validTransaction.data.method, PaymentMethod.PIX)
    assert.equal(validTransaction.data.amount, 155.7)

    const invalidTransaction = parseCreateTransactionPayload({
        type: 'ENTRADA',
        method: 'PIX',
        amount: '-1',
        description: '',
    })

    expectFailure(invalidTransaction, 'parseCreateTransactionPayload invalido')

    const validCarne = parseCreateCarnePayload({
        transactionId: 'tx_1',
        installmentsCount: 3,
        firstDueDate: '2026-04-10',
    })
    expectSuccess(validCarne, 'parseCreateCarnePayload valido')

    const invalidCarne = parseCreateCarnePayload({
        transactionId: '',
        installmentsCount: 0,
        firstDueDate: 'invalida',
    })
    expectFailure(invalidCarne, 'parseCreateCarnePayload invalido')

    const validCashOpen = parseCashMutationPayload({
        action: 'open',
        openAmount: '100.50',
        notes: 'Abertura do dia',
    })
    expectSuccess(validCashOpen, 'parseCashMutationPayload open valido')
    assert.equal(validCashOpen.data.action, 'open')

    const validCashClose = parseCashMutationPayload({
        action: 'close',
        cashId: 'cash_1',
        closeAmount: 320.2,
    })
    expectSuccess(validCashClose, 'parseCashMutationPayload close valido')
    assert.equal(validCashClose.data.cashId, 'cash_1')

    const invalidCashClose = parseCashMutationPayload({
        action: 'close',
        closeAmount: 10,
    })
    expectFailure(invalidCashClose, 'parseCashMutationPayload close invalido')

    const validCashWithdrawal = parseCashMutationPayload({
        action: 'withdrawal',
        cashId: 'cash_1',
        withdrawAmount: '25.5',
        notes: 'Retirada para deposito',
    })
    expectSuccess(validCashWithdrawal, 'parseCashMutationPayload withdrawal valido')
    assert.equal(validCashWithdrawal.data.withdrawAmount, 25.5)

    const invalidCashWithdrawal = parseCashMutationPayload({
        action: 'withdrawal',
        withdrawAmount: 0,
        notes: '',
    })
    expectFailure(invalidCashWithdrawal, 'parseCashMutationPayload withdrawal invalido')

    const payInstallment = parsePayInstallmentPayload({ paid: true })
    expectSuccess(payInstallment, 'parsePayInstallmentPayload valido')

    const invalidPayInstallment = parsePayInstallmentPayload({ paid: false })
    expectFailure(invalidPayInstallment, 'parsePayInstallmentPayload invalido')

    const listTransactions = parseListTransactionsQuery(
        new URLSearchParams({
            type: TransactionType.SAIDA,
            isPending: 'false',
            page: '2',
            limit: '10',
            from: '2026-03-01',
            to: '2026-03-31',
            search: 'energia',
        }),
    )
    expectSuccess(listTransactions, 'parseListTransactionsQuery valido')
    assert.equal(listTransactions.data.page, 2)
    assert.equal(listTransactions.data.limit, 10)

    const invalidListTransactions = parseListTransactionsQuery(
        new URLSearchParams({
            type: 'INVALID',
        }),
    )
    expectFailure(invalidListTransactions, 'parseListTransactionsQuery invalido')

    const dateRange = parseFinancialDateRangeQuery(
        new URLSearchParams({
            startDate: '2026-03-01',
            endDate: '2026-03-31',
        }),
    )
    expectSuccess(dateRange, 'parseFinancialDateRangeQuery valido')

    const invalidDateRange = parseFinancialDateRangeQuery(
        new URLSearchParams({
            startDate: '2026-04-10',
            endDate: '2026-04-01',
        }),
    )
    expectFailure(invalidDateRange, 'parseFinancialDateRangeQuery invalido')

    const summaryQuery = parseFinancialSummaryQuery(
        new URLSearchParams({
            date: '2026-03-05',
        }),
    )
    expectSuccess(summaryQuery, 'parseFinancialSummaryQuery valido')

    const invalidSummaryQuery = parseFinancialSummaryQuery(
        new URLSearchParams({
            date: 'data-ruim',
        }),
    )
    expectFailure(invalidSummaryQuery, 'parseFinancialSummaryQuery invalido')

    const carneList = parseCarneListQuery(
        new URLSearchParams({
            transactionId: 'tx_1',
            status: 'overdue',
        }),
    )
    expectSuccess(carneList, 'parseCarneListQuery valido')

    const invalidCarneList = parseCarneListQuery(
        new URLSearchParams({
            status: 'unknown',
        }),
    )
    expectFailure(invalidCarneList, 'parseCarneListQuery invalido')
}

function runReworkValidationChecks() {
    const validRework = parseReworkPayload({
        reason: ReworkCause.LABORATORIO,
        notes: 'Lente arranhada no retorno',
        itemsToRectify: ['item_1', 'item_2'],
    })

    expectSuccess(validRework, 'parseReworkPayload valido')
    assert.equal(validRework.data.reason, ReworkCause.LABORATORIO)
    assert.equal(validRework.data.itemsToRectify?.length, 2)

    const invalidRework = parseReworkPayload({
        reason: 'INVALID',
        itemsToRectify: ['item_1', 10],
    })

    expectFailure(invalidRework, 'parseReworkPayload invalido')
}

function main() {
    runOrderValidationChecks()
    runFinancialValidationChecks()
    runReworkValidationChecks()

    console.log('Core validation smoke tests passed.')
}

main()
