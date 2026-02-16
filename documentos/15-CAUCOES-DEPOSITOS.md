# 15 - Sistema de Cauções e Depósitos

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

## 🏦 Visão Geral de Cauções

Sistema permite clientes fornecer **até 2 cauções não-obrigatórias** para reduzir riscos de danos. Seguros diminuem valor de caução.

### Tipos de Caução

| Tipo | Valor Máx | Obrigatório | Nota |
|------|-----------|-------------|------|
| **Caução Padrão** | 50% do aluguel | Não | Padrão da indústria |
| **Caução Reforçada** | 100% do aluguel | Não | Para clientes novos/risco |
| **Caução Seguro** | Customizável | Não | Se cliente contrata seguro |

---

## 💰 Cálculo de Valores

### Sem Seguros

```
Aluguel: €100
├─ Caução Padrão (50%): €50
└─ Caução Reforçada (100%): €100

Total com ambas: €250
```

### Com Seguro Básico (-20% caução)

```
Aluguel: €100
├─ Caução Padrão: €50
│  └─ Com seguro: €50 × 0.80 = €40
└─ Caução Reforçada: €100
   └─ Com seguro: €100 × 0.80 = €80

Total com ambas: €220
```

### Com Seguro Premium (-40% caução)

```
Aluguel: €100
├─ Caução Padrão: €50 × 0.60 = €30
└─ Caução Reforçada: €100 × 0.60 = €60

Total com ambas: €190
```

---

## 📋 Database Schema

```prisma
model ContractDeposit {
  id              String   @id @default(nanoid(12))
  contractId      String
  contract        Contract @relation(fields: [contractId], references: [id])
  
  depositType     DepositType  // STANDARD, REINFORCED, INSURANCE
  amount          Decimal  @db.Decimal(12, 2)  // Valor final após desconto
  originalAmount  Decimal  @db.Decimal(12, 2)  // Valor antes desconto
  
  insuranceType   InsuranceType?  // Qual seguro aplicou desconto
  discountPercent Int?  // Desconto aplicado (20, 40)
  
  paymentMethod   PaymentMethod  // CREDIT_CARD, BANK_TRANSFER, etc
  cardTokenId     String?  // Se CREDIT_CARD
  
  status          DepositStatus  // HELD, PARTIALLY_RELEASED, FULLY_RELEASED, FORFEITED
  
  releasedAmount  Decimal  @db.Decimal(12, 2)  @default(0)  // Já libertado
  releasedDate    DateTime?
  
  observations    String?  // Razão de libertação/bloqueio
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum DepositType {
  STANDARD     // 50% aluguel
  REINFORCED   // 100% aluguel
  INSURANCE    // Seguro
}

enum DepositStatus {
  HELD              // Mantida/Bloqueada
  PARTIALLY_RELEASED // Parcialmente libertada
  FULLY_RELEASED    // Totalmente libertada
  FORFEITED         // Perdida (usada para danos)
}

enum InsuranceType {
  BASIC     // 20% desconto
  PREMIUM   // 40% desconto
  NONE
}
```

---

## 🔄 Fluxo de Caução (Completo)

### 1. Criar Contrato COM Cauções

```bash
POST /contracts
{
  "reservationId": "RES-2026-12345",
  "vehicleId": 5,
  "pickupDate": "2026-02-20",
  "dropoffDate": "2026-02-25",
  "clientId": 10,
  "deposits": [
    {
      "depositType": "STANDARD",     // €50
      "paymentMethod": "CREDIT_CARD",
      "cardToken": "tok_visa_4242"
    },
    {
      "depositType": "REINFORCED",   // €100
      "paymentMethod": "CREDIT_CARD",
      "cardToken": "tok_visa_4242"
    }
  ],
  "insuranceType": "BASIC"  // Aplicar 20% desconto
}
```

**Response**:
```json
{
  "id": "CNT-2026-00001",
  "totalPrice": 100.00,
  "deposits": [
    {
      "id": "DEP-2026-001",
      "depositType": "STANDARD",
      "originalAmount": 50.00,
      "amount": 40.00,  // Com desconto 20% do seguro
      "insuranceType": "BASIC",
      "status": "HELD"
    },
    {
      "id": "DEP-2026-002",
      "depositType": "REINFORCED",
      "originalAmount": 100.00,
      "amount": 80.00,  // Com desconto 20%
      "insuranceType": "BASIC",
      "status": "HELD"
    }
  ],
  "totalDeposits": 120.00,
  "grandTotal": 220.00  // 100 (aluguel) + 120 (cauções)
}
```

---

## 🚗 Devolução COM Danos

### Cenário: Cliente retorna com danos

```bash
POST /contracts/CNT-2026-00001/return
{
  "kmWhenReturned": 45500,
  "returnedAt": "2026-02-25T10:30:00Z",
  "returnStationId": "LISBOA",
  "damages": [
    {
      "description": "Risco porta esquerda",
      "estimatedCost": 75.00
    },
    {
      "description": "Vidro traseiro lascado",
      "estimatedCost": 150.00
    }
  ]
}
```

**Response**:
```json
{
  "id": "CNT-2026-00001",
  "status": "RETURNED",
  "basePrice": 100.00,
  "damages": {
    "totalEstimated": 225.00,
    "items": [...]
  },
  "depositRelease": {
    "totalDeposits": 120.00,
    "damagesCovered": 120.00,  // Cauções cobrem parte
    "damagesNotCovered": 105.00,
    "depositReleaseStatus": [
      {
        "depositId": "DEP-2026-001",
        "originalAmount": 50.00,
        "amount": 40.00,
        "status": "FORFEITED",  // Perdida para pagar danos
        "releasedAmount": 0.00,
        "reason": "Used to cover damages"
      },
      {
        "depositId": "DEP-2026-002",
        "originalAmount": 100.00,
        "amount": 80.00,
        "status": "FORFEITED",  // Também perdida
        "releasedAmount": 0.00,
        "reason": "Used to cover damages"
      }
    ],
    "clientStillOwes": 105.00  // Client deve pagar resto
  },
  "finalPaymentDue": 105.00
}
```

---

## ✅ Devolução SEM Danos

Se cliente retorna sem danos, cauções são **100% libertadas**:

```bash
POST /contracts/CNT-2026-00001/return
{
  "kmWhenReturned": 45420,
  "returnedAt": "2026-02-23T10:00:00Z",
  "returnStationId": "LISBOA",
  "damages": []  // Sem danos
}
```

**Response**:
```json
{
  "id": "CNT-2026-00001",
  "status": "RETURNED",
  "basePrice": 100.00,
  "damages": 0.00,
  "depositRelease": {
    "totalDeposits": 120.00,
    "status": "FULLY_RELEASED",
    "depositReleaseStatus": [
      {
        "depositId": "DEP-2026-001",
        "amount": 40.00,
        "status": "FULLY_RELEASED",
        "releasedAmount": 40.00,
        "releasedDate": "2026-02-23T10:00:00Z",
        "reason": "No damages reported"
      },
      {
        "depositId": "DEP-2026-002",
        "amount": 80.00,
        "status": "FULLY_RELEASED",
        "releasedAmount": 80.00,
        "releasedDate": "2026-02-23T10:00:00Z",
        "reason": "No damages reported"
      }
    ]
  },
  "clientRefund": 120.00,  // Devolve 100% das cauções
  "refundStatus": "PROCESSING"
}
```

---

## 🔍 Casos Especiais de Caução

### Caso 1: Danos Parciais

Danos estimados €75, mas tem 2 cauções (€40 + €80 = €120):

```json
{
  "totalDeposits": 120.00,
  "damagesEstimated": 75.00,
  "result": {
    "depositUsed": 75.00,
    "depositRemaining": 45.00,
    "clientRefund": 45.00
  },
  "depositRelease": [
    {
      "depositId": "DEP-001",
      "amount": 40.00,
      "status": "FORFEITED",
      "reason": "Cover part of damages"
    },
    {
      "depositId": "DEP-002",
      "amount": 80.00,
      "status": "PARTIALLY_RELEASED",
      "releasedAmount": 45.00,
      "forfeited": 35.00
    }
  ]
}
```

### Caso 2: Danos Superiores a Cauções

Danos €250, cauções €120:

```json
{
  "totalDeposits": 120.00,
  "damagesEstimated": 250.00,
  "result": {
    "depositUsed": 120.00,
    "depositsNotEnough": 130.00,
    "clientOwes": 130.00
  },
  "depositRelease": [
    {
      "depositId": "DEP-001",
      "amount": 40.00,
      "status": "FORFEITED"
    },
    {
      "depositId": "DEP-002",
      "amount": 80.00,
      "status": "FORFEITED"
    }
  ],
  "requiresAdditionalPayment": true,
  "paymentDueAmount": 130.00
}
```

### Caso 3: Cliente com Histórico Perfeito

Cliente com 20+ aluguéis sem danos → **caução opcional/dispensada**:

```bash
POST /contracts
{
  "reservationId": "RES-2026-12345",
  "clientId": 10,
  "skipDeposits": true,  # Cliente com histórico > 20 aluguéis zero-dano
  "skipDepositsReason": "CLIENT_EXCELLENT_HISTORY"
}
```

**Response**:
```json
{
  "id": "CNT-2026-00001",
  "deposits": [],
  "totalDeposits": 0.00,
  "reason": "Deposit waived due to excellent client history",
  "totalPrice": 100.00  # Sem cauções
}
```

---

## 📡 Endpoints de Caução

### 1. Criar Caução

```bash
POST /contracts/{contractId}/deposits
{
  "depositType": "STANDARD",
  "paymentMethod": "CREDIT_CARD",
  "cardToken": "tok_visa_4242"
}
```

### 2. Listar Cauções do Contrato

```bash
GET /contracts/{contractId}/deposits
```

**Response**:
```json
{
  "items": [
    {
      "id": "DEP-001",
      "depositType": "STANDARD",
      "originalAmount": 50.00,
      "amount": 40.00,
      "status": "HELD",
      "createdAt": "2026-02-20T..."
    }
  ]
}
```

### 3. Verificar Status de Libertação

```bash
GET /contracts/{contractId}/deposits/{depositId}/release-status
```

**Response**:
```json
{
  "depositId": "DEP-001",
  "status": "HOLD",
  "currentlyHeld": 40.00,
  "releaseDate": null,
  "estimatedReleaseDate": "2026-02-25T10:00:00Z"
}
```

### 4. Processar Libertação Manual

```bash
PATCH /contracts/{contractId}/deposits/{depositId}/release
{
  "releaseAmount": 40.00,
  "reason": "Damage assessment complete"
}
```

### 5. Cancelar Caução (Admin only)

```bash
DELETE /deposits/{depositId}
{
  "reason": "Client dispute",
  "refundReason": "DISPUTE_RESOLUTION"
}
```

---

## 🛡️ Segurança de Cauções

### 1. Encriptação de Cartão

Tokens de cartão:
- Gerados por Stripe/Checkout
- Nunca armazenados em plaintext
- PCI DSS compliant

### 2. Bloqueio Automático

Cauções **automaticamente bloqueadas** quando:
- Contrato criado ✅
- Card charged com sucesso ✅
- Mantém-se bloqueada até devolução

### 3. Libertação com Validação

Cauções só libertadas se:
- Contrato em status RETURNED ✅
- Danos avaliados ✅
- X dias passaram (default 7 dias) ✅
- Admin aprovado (em casos disputados) ✅

### 4. Auditoria Completa

Cada movimento:
```log
2026-02-20T10:30:00Z [DEPOSIT_HELD] DEP-001 €40.00 contract:CNT-2026-00001
2026-02-25T10:00:00Z [RETURN_PROCESSED] contract:CNT-2026-00001 damages:€0.00
2026-02-25T10:05:00Z [DEPOSIT_RELEASED] DEP-001 €40.00 reason:no_damages
```

---

## 📊 Relatório de Cauções

### Cauções por Mês

```bash
GET /reports/deposits?period=monthly&from=2026-01-01&to=2026-02-28
```

**Response**:
```json
{
  "period": "2026-01-01 to 2026-02-28",
  "totalDepositsCollected": 12450.00,
  "depositsHeld": 3200.00,
  "depositsReleased": 8900.00,
  "depositsForfeited": 350.00,
  "byType": {
    "STANDARD": 6200.00,
    "REINFORCED": 5100.00,
    "INSURANCE": 1150.00
  },
  "damagesCoveredByDeposits": 2450.00,
  "clientRefunded": 8900.00
}
```

---

## ⚠️ Edge Cases & Tratamento

### 1. Cliente Disputa Danos

```
Contrato returnado com €150 danos
Cliente disputa: "Danos já existiam"
Status: UNDER_REVIEW

Admin pode:
- Reject dispute → Caução perdida
- Accept dispute → Caução libertada
- Partial → 50% caução libertada
```

### 2. Card Payment Falha

Cliente selectiona caução, mas card falha:

```
Status: PAYMENT_PENDING
Sistema retentar 3x em 24h
Se falhar: Caução cancelada, contrato degradado
```

### 3. Dano Descoberto Posteriormente

Devolução feita, caução libertada, depois descobre-se dano:

```
Caução já libertada → New invoice issued
Cliente deve pagar €X by {date}
Se não pagar: Account blocked
```

### 4. Múltiplas Cauções Diferentes

Cliente providencia:
- €40 STANDARD via CREDIT_CARD
- €100 REINFORCED via BANK_TRANSFER

Na devolução com €75 danos:

```
Sistema liberta em ordem:
1. BANK_TRANSFER (REINFORCED) €100 → €25 liberta
2. CREDIT_CARD (STANDARD) €40 → Inteiro forfeited (€40)
Total deduzido: €75 ✓
```

---

## 🔐 Conformidade

- ✅ GDPR (dados cliente protegidos)
- ✅ PCI DSS (cards encriptados)
- ✅ GDPR Right to erasure (cauções historiadas)
- ✅ Audit trail (cada movimento loggado)

---

## 📞 FAQ - Cauções

**P: Cliente não recebe reembolso. Porque?**
R: Verificar:
1. Contrato em status RETURNED?
2. Danos avaliados?
3. 7+ dias passaram (release hold)?
4. Payment method válido?

**P: Posso aplicar caução depois do contrato criado?**
R: Sim, use `POST /contracts/{id}/deposits` antes da devolução

**P: Qual diferença STANDARD vs REINFORCED?**
R: STANDARD = 50% do aluguel, REINFORCED = 100%

**P: Seguro diminui em quanto?**
R: BASIC = 20%, PREMIUM = 40%

---

**Versão**: 1.0.0  
**Última Atualização**: Fevereiro 2026
