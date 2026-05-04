import crypto from 'crypto'
import xml2js from 'xml2js'
import { prisma } from '@/lib/db'

interface OFXTransaction {
  TRNTYPE: string[]
  DTPOSTED: string[]
  TRNAMT: string[]
  FITID: string[]
  MEMO?: string[]
}

function normalizeOfxToXml(text: string) {
  const ofxParts = text.split('<OFX>')
  if (ofxParts.length < 2) {
    throw new Error('Arquivo OFX invalido (tag <OFX> nao encontrada)')
  }

  let xmlStr = '<OFX>' + ofxParts[1]
  const tagsToClose = [
    'TRNTYPE',
    'DTPOSTED',
    'TRNAMT',
    'FITID',
    'MEMO',
    'CHECKNUM',
    'BANKID',
    'ACCTID',
    'ACCTTYPE',
    'DESC',
    'CODE',
    'STATUS',
    'DTSTART',
    'DTEND',
    'BALAMT',
    'DTASOF',
  ]

  tagsToClose.forEach((tag) => {
    const regex = new RegExp(`<${tag}>([^<]+)`, 'g')
    xmlStr = xmlStr.replace(regex, `<${tag}>$1</${tag}>`)
  })

  return xmlStr
}

function parseOfxDate(dStr: string) {
  if (!dStr || dStr.length < 8) return new Date()

  const y = parseInt(dStr.slice(0, 4), 10)
  const m = parseInt(dStr.slice(4, 6), 10) - 1
  const d = parseInt(dStr.slice(6, 8), 10)
  return new Date(y, m, d)
}

export class FinancialOfxImportService {
  static async importFile(tenantId: string, text: string) {
    const fileHash = crypto.createHash('sha256').update(text).digest('hex')

    const existing = await prisma.bankStatement.findUnique({
      where: { fileHash },
      select: { id: true },
    })

    if (existing) {
      throw new Error('Arquivo ja importado anteriormente.')
    }

    const xmlStr = normalizeOfxToXml(text)
    const parser = new xml2js.Parser({ explicitArray: true, ignoreAttrs: true })
    const result = await parser.parseStringPromise(xmlStr)

    const bankMsgs = result.OFX.BANKMSGSRSV1?.[0]?.STMTTRNRS?.[0]?.STMTRS?.[0]
    const creditMsgs = result.OFX.CREDITCARDMSGSRSV1?.[0]?.CCSTMTTRNRS?.[0]?.CCSTMTRS?.[0]
    const statementRs = bankMsgs || creditMsgs

    if (!statementRs) {
      throw new Error(
        'Estrutura de transacoes BANKMSGSRSV1 ou CREDITCARDMSGSRSV1 nao encontrada no OFX.'
      )
    }

    const accountId =
      statementRs.BANKACCTFROM?.[0]?.ACCTID?.[0] ||
      statementRs.CCACCTFROM?.[0]?.ACCTID?.[0] ||
      'DEFAULT_ACCT'
    const bankTranList = statementRs.BANKTRANLIST?.[0]
    const startDate = parseOfxDate(bankTranList?.DTSTART?.[0] || '')
    const endDate = parseOfxDate(bankTranList?.DTEND?.[0] || '')
    const endingBalance = parseFloat(statementRs.LEDGERBAL?.[0]?.BALAMT?.[0] || '0')
    const rawTransactions = (bankTranList?.STMTTRN || []) as OFXTransaction[]

    const bankStatement = await prisma.bankStatement.create({
      data: {
        tenantId,
        fileHash,
        accountId,
        startDate,
        endDate,
        startingBalance: 0,
        endingBalance,
      },
      select: { id: true },
    })

    const txInserts = rawTransactions.map((transaction) => {
      const amount = parseFloat(transaction.TRNAMT?.[0] || '0')

      return {
        statementId: bankStatement.id,
        tenantId,
        date: parseOfxDate(transaction.DTPOSTED?.[0]),
        amount,
        description: transaction.MEMO?.[0] || '',
        documentNumber: transaction.FITID?.[0] || '',
        transactionType: amount >= 0 ? 'CREDIT' : 'DEBIT',
        matchStatus: 'UNMATCHED',
      }
    })

    if (txInserts.length > 0) {
      await prisma.bankStatementTransaction.createMany({
        data: txInserts,
      })
    }

    return {
      success: true,
      statementId: bankStatement.id,
      transacoesImportadas: txInserts.length,
    }
  }
}
