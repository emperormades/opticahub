# 🧪 TEST_FIXTURES.md — Dados de Teste Padrão
# Quando a IA precisar testar algo ou criar mocks, use estes dados canônicos.
# Isso garante consistência e rastreabilidade entre sessões de debug.

---

## Tenant de Teste

```json
{
  "id": "tenant-piloto-001",
  "name": "Ótica Modelo Piloto",
  "slug": "otica-modelo",
  "config": {
    "defaultCommissionRate": 0.05,
    "maxDiscountPercent": 15,
    "crediarioMaxInstallments": 10
  }
}
```

## Vendedora Padrão

```json
{
  "id": "seller-ana-001",
  "name": "Ana Silva",
  "email": "ana@oticamodelo.com",
  "role": "SELLER",
  "tenantId": "tenant-piloto-001"
}
```

## Gerente Padrão

```json
{
  "id": "manager-carlos-001",
  "name": "Carlos Souza",
  "email": "carlos@oticamodelo.com",
  "role": "MANAGER",
  "tenantId": "tenant-piloto-001"
}
```

## Cliente Tipo

```json
{
  "id": "customer-maria-001",
  "name": "Maria Oliveira",
  "phone": "11999887766",
  "email": "maria@email.com",
  "tenantId": "tenant-piloto-001"
}
```

## Prescrição Tipo

```json
{
  "customerId": "customer-maria-001",
  "odSphere": -2.50,
  "odCylinder": -0.75,
  "odAxis": 90,
  "oeSphere": -3.00,
  "oeCylinder": -0.50,
  "oeAxis": 80,
  "odAddition": null,
  "oeAddition": null,
  "odDnpMono": 31,
  "oeDnpMono": 30,
  "doctor": "Dr. Roberto Mendes",
  "issuedAt": "2026-01-15"
}
```

## Armação Tipo

```json
{
  "id": "product-frame-001",
  "name": "Ray-Ban RB5228",
  "sku": "RB5228-BLK",
  "itemType": "FRAME",
  "costPrice": 120.00,
  "salePrice": 289.90,
  "stock": 5,
  "minStock": 2,
  "frameDma": 53,
  "frameBridge": 17,
  "tenantId": "tenant-piloto-001"
}
```

## OS Tipo (Venda Completa)

```json
{
  "orderNumber": "OS-2026-0001",
  "customerId": "customer-maria-001",
  "sellerId": "seller-ana-001",
  "status": "DRAFT",
  "subtotal": 589.80,
  "discount": 50.00,
  "total": 539.80,
  "isPaid": false,
  "items": [
    { "description": "Ray-Ban RB5228", "itemType": "FRAME", "quantity": 1, "unitPrice": 289.90, "discount": 30.00, "total": 259.90 },
    { "description": "Lente CR-39 AR", "itemType": "LENS", "quantity": 2, "unitPrice": 149.95, "discount": 10.00, "total": 279.90 }
  ],
  "paymentSplits": [
    { "method": "CREDIT_CARD", "amount": 339.80 },
    { "method": "CREDIARIO", "amount": 200.00 }
  ]
}
```

---

## Uso
- **Debug:** "Crie uma OS com os dados do `TEST_FIXTURES` para testar o fluxo de pagamento"
- **Seed:** "Popule o banco com os fixtures padrão"
- **Validação:** "Verifique se o estorno da OS tipo funciona corretamente"
