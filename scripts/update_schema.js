const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Update Tenant
if (!schema.includes('BankStatement[]')) {
    schema = schema.replace(
        /systemHealths\s+SystemHealth\[\]\s+@@map\("tenants"\)/,
        `systemHealths        SystemHealth[]\n  bankStatements       BankStatement[]\n  bankTransactions     BankStatementTransaction[]\n  fiscalNotes          FiscalNote[]\n  purchaseOrders       PurchaseOrder[]\n\n  @@map("tenants")`
    );
}

// Update Transaction
if (!schema.includes('BankStatementTransaction[]')) {
    schema = schema.replace(
        /installments Installment\[\] \/\/ ← Relação adicionada para os Carnês/,
        `installments Installment[] // ← Relação adicionada para os Carnês\n  bankMatches  BankStatementTransaction[]`
    );
}

// Update ServiceOrder
if (!schema.includes('FiscalNote?')) {
    schema = schema.replace(
        /followUps       ClinicalFollowUp\[\] \/\/ Agendamentos de retorno clínico/,
        `followUps       ClinicalFollowUp[] // Agendamentos de retorno clínico\n  fiscalNote      FiscalNote?`
    );
}

// Update Product
if (!schema.includes('PurchaseOrderItem[]')) {
    schema = schema.replace(
        /serviceOrderItems ServiceOrderItem\[\]/,
        `serviceOrderItems ServiceOrderItem[]\n  purchaseItems     PurchaseOrderItem[]`
    );
}

// Append new models
const newModels = `
// ─── V2: CONCILIAÇÃO BANCÁRIA E OFX (SESSÃO R) ──────────────────────────────
model BankStatement {
  id              String   @id @default(cuid())
  tenantId        String
  accountId       String?  // ID do banco/conta
  importedAt      DateTime @default(now())
  startDate       DateTime
  endDate         DateTime
  startingBalance Decimal  @db.Decimal(10, 2)
  endingBalance   Decimal  @db.Decimal(10, 2)
  fileHash        String   @unique // Evitar dupla importação

  tenant       Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  transactions BankStatementTransaction[]

  @@index([tenantId])
  @@map("bank_statements")
}

model BankStatementTransaction {
  id              String   @id @default(cuid())
  statementId     String
  tenantId        String
  date            DateTime
  amount          Decimal  @db.Decimal(10, 2)
  description     String
  documentNumber  String?
  transactionType String   // DEBIT | CREDIT
  
  // Conciliação
  matchStatus     String   @default("UNMATCHED") // UNMATCHED, MATCHED, IGNORED
  matchedTxId     String?  // ID da Transaction interna
  
  statement    BankStatement @relation(fields: [statementId], references: [id], onDelete: Cascade)
  tenant       Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  matchAction  Transaction?  @relation(fields: [matchedTxId], references: [id])

  @@index([statementId])
  @@index([tenantId, matchStatus])
  @@map("bank_statement_transactions")
}

// ─── V2: FISCAL (SESSÃO R) ──────────────────────────────────────────────────
model FiscalNote {
  id          String   @id @default(cuid())
  tenantId    String
  orderId     String   @unique
  number      String?  // Número da NFC-e/NF-e
  series      String?
  accessKey   String?  // Chave de acesso de 44 dígitos
  status      String   @default("PENDING") // PENDING, ISSUED, CANCELLED, ERROR
  xmlUrl      String?  // URL do XML na Sefaz/API (Focus NFe)
  pdfUrl      String?  // URL do DANFE
  issuedAt    DateTime?
  amount      Decimal  @db.Decimal(10, 2)
  errorMessage String? @db.Text

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant   Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  order    ServiceOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([tenantId, status])
  @@map("fiscal_notes")
}

// ─── V2: ABASTECIMENTO E COMPRAS B2B (SESSÃO S) ─────────────────────────────
model PurchaseOrder {
  id           String   @id @default(cuid())
  tenantId     String
  supplierName String
  status       String   @default("DRAFT") // DRAFT, SENT, PARTIAL, DELIVERED, CANCELLED
  expectedAt   DateTime?
  deliveredAt  DateTime?
  totalAmount  Decimal  @default(0) @db.Decimal(10, 2)
  notes        String?  @db.Text

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  items  PurchaseOrderItem[]

  @@index([tenantId, status])
  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id              String   @id @default(cuid())
  purchaseOrderId String
  productId       String
  quantityOrdered Int
  quantityReceived Int     @default(0)
  unitCost        Decimal  @db.Decimal(10, 2)

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  product       Product       @relation(fields: [productId], references: [id])

  @@index([purchaseOrderId])
  @@index([productId])
  @@map("purchase_order_items")
}
`;

if (!schema.includes('model BankStatement {')) {
    schema += newModels;
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema atualizado com as tabelas da V2.');
