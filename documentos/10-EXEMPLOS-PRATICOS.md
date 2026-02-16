# 10 - Exemplos Práticos e Casos de Uso

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

## 📚 Índice de Casos de Uso

1. [Cliente faz aluguel completo](#caso-1)
2. [Lidar com carro danificado](#caso-2)
3. [Transferência de carro entre estações](#caso-3)
4. [Resolver conflito de edição concorrente](#caso-4)
5. [Multi-estação: user vê apenas sua estação](#caso-5)
6. [Operações admin em reparações](#caso-6)
7. [Aluguel COM cauções e seguros](#caso-7)

---

## 🎯 Caso 1: Cliente faz aluguel completo {#caso-1}

**Scenario**: Cliente João quer alugar um carro para viagem de 3 dias em Lisboa.

### Step 1: Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@cliente.com",
    "password": "SenhaSegura123!"
  }'
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 10,
    "email": "joao@cliente.com",
    "name": "João Silva",
    "roles": ["CLIENT"],
    "stationId": "LISBOA"
  }
}
```

### Step 2: Ver carros disponíveis

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET "http://localhost:3000/vehicles/station/LISBOA?status=AVAILABLE" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (excerpt):
```json
{
  "items": [
    {
      "id": 5,
      "licensePlate": "20-AB-BC",
      "brand": "Toyota",
      "model": "Corolla",
      "year": 2024,
      "status": "AVAILABLE",
      "dailyRate": 45.00
    },
    {
      "id": 8,
      "licensePlate": "21-XY-ZW",
      "brand": "Volkswagen",
      "model": "Golf",
      "status": "AVAILABLE",
      "dailyRate": 55.00
    }
  ],
  "total": 7
}
```

Choose: **Carro ID 5 (Toyota Corolla)** - 45€/dia

### Step 3: Fazer reserva

```bash
curl -X POST http://localhost:3000/reservations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": 5,
    "pickupStationId": "LISBOA",
    "dropoffStationId": "LISBOA",
    "pickupDate": "2026-02-20",
    "dropoffDate": "2026-02-23",
    "rentType": "DAILY"
  }'
```

**Response**:
```json
{
  "id": "RES-2026-00512",
  "vehicleId": 5,
  "status": "PENDING_CONFIRMATION",
  "totalPrice": 135.00,
  "estimatedDays": 3
}
```

### Step 4: Confirmar reserva

```bash
curl -X PATCH http://localhost:3000/reservations/RES-2026-00512/confirm \
  -H "Authorization: Bearer $TOKEN"
```

**Response**:
```json
{
  "id": "RES-2026-00512",
  "status": "CONFIRMED",
  "message": "Reservation confirmed. Contract will be created at pickup."
}
```

### Step 5: No dia do aluguel - criar contrato

**Pelo funcionário da estação** (STAFF user):
```bash
STAFF_TOKEN="outro-token..."

curl -X POST http://localhost:3000/contracts \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "RES-2026-00512",
    "vehicleId": 5,
    "pickupDate": "2026-02-20",
    "dropoffDate": "2026-02-23",
    "clientId": 10,
    "kmWhenPickedUp": 45230
  }'
```

**Response**:
```json
{
  "id": "CNT-2026-00001",
  "status": "ACTIVE",
  "vehicleId": 5,
  "basePrice": 135.00,
  "extras": [],
  "totalPrice": 135.00
}
```

### Step 6: Cliente quer GPS (extra)

```bash
# Listar extras disponíveis
curl -X GET http://localhost:3000/extras \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
[
  {
    "id": 1,
    "name": "GPS Navigation",
    "dailyPrice": 5.00
  },
  {
    "id": 2,
    "name": "Child Seat",
    "dailyPrice": 3.00
  }
]
```

Adicionar GPS:
```bash
curl -X POST http://localhost:3000/contracts/CNT-2026-00001/add-extra \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "extraTypeId": 1,
    "quantity": 1,
    "dailyPrice": 5.00
  }'
```

**Response**:
```json
{
  "id": "CNT-2026-00001",
  "basePrice": 135.00,
  "extras": [
    {
      "id": "EXTRA-1",
      "typeId": 1,
      "name": "GPS",
      "quantity": 1,
      "dailyPrice": 5.00,
      "totalPrice": 15.00
    }
  ],
  "totalPrice": 150.00
}
```

### Step 7: Devolução com dano

3 dias depois, cliente retorna carro com pequeno dano:

```bash
curl -X POST http://localhost:3000/contracts/CNT-2026-00001/return \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kmWhenReturned": 45420,
    "returnedAt": "2026-02-23T12:00:00Z",
    "returnStationId": "LISBOA",
    "damages": [
      {
        "description": "Small scratch on driver door",
        "estimatedCost": 50.00
      }
    ]
  }'
```

**Response**:
```json
{
  "id": "CNT-2026-00001",
  "status": "RETURNED",
  "basePrice": 135.00,
  "extras": 15.00,
  "damages": 50.00,
  "totalPrice": 200.00,
  "kmUsed": 190
}
```

### Step 8: Processar pagamento

```bash
curl -X POST http://localhost:3000/payments \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "CNT-2026-00001",
    "amount": 200.00,
    "method": "CREDIT_CARD",
    "cardToken": "tok_visa_4242"
  }'
```

**Response**:
```json
{
  "id": "PAY-2026-00101",
  "status": "CONFIRMED",
  "amount": 200.00,
  "method": "CREDIT_CARD",
  "transactionId": "ch_1A2B3C4D5E6F7G8H",
  "receipt": "https://receipts.fleetgate.io/PAY-2026-00101.pdf"
}
```

✅ **Ciclo completo concluído!**

---

## 🚗 Caso 2: Carro danificado durante transferência {#caso-2}

**Scenario**: Transfer de carro de Lisboa→Porto, carro que chega danificado.

### Step 1: Iniciar transferência

```bash
STAFF_TOKEN="..."

curl -X POST http://localhost:3000/vehicle-transfers/initiate \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": 5,
    "fromStationId": "LISBOA",
    "toStationId": "PORTO",
    "kmWhenTransferred": 45420,
    "estimatedDeliveryDate": "2026-02-21"
  }'
```

**Response**:
```json
{
  "id": "VTR-2026-00042",
  "status": "IN_TRANSIT",
  "vehicleId": 5,
  "fromStationId": "LISBOA",
  "toStationId": "PORTO"
}
```

### Step 2: Carro chega a Porto (COM DANO)

```bash
curl -X PATCH http://localhost:3000/vehicle-transfers/VTR-2026-00042/arrive \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kmWhenArrived": 45520,
    "arrivedAt": "2026-02-21T14:30:00Z",
    "observations": "Dente dianteiro amassado, vidro traseiro rasgado"
  }'
```

**Response**:
```json
{
  "id": "VTR-2026-00042",
  "status": "ARRIVED",
  "vehicle": {
    "id": 5,
    "currentStationId": "PORTO",
    "status": "AVAILABLE"
  }
}
```

### Step 3: Abrir reparação

```bash
curl -X POST http://localhost:3000/vehicle-repairs/open \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": 5,
    "reason": "Damage during transfer from LISBOA",
    "kmWhenOpened": 45520,
    "estimatedCost": 500.00
  }'
```

**Response**:
```json
{
  "id": "RPR-2026-00089",
  "status": "OPEN",
  "vehicleId": 5,
  "fromStationId": "PORTO",
  "reason": "Damage during transfer",
  "estimatedCost": 500.00
}
```

✅ Carro agora em `IN_REPAIR` status, não aparece em listagem de disponíveis

### Step 4: Quando reparação completa - fechar

```bash
# Step 4a: Adquirir lock para fechar
curl -X POST http://localhost:3000/vehicle-repairs/RPR-2026-00089/acquire-close-lock \
  -H "Authorization: Bearer $STAFF_TOKEN"
```

**Response** (lock válido por 5 minutos):
```json
{
  "lockId": "LOCK-2026-456",
  "expiresAt": "2026-02-21T16:05:00Z"
}
```

# Step 4b: Fechar reparação
```bash
curl -X PATCH http://localhost:3000/vehicle-repairs/RPR-2026-00089/close \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "closedAtStationId": "PORTO",
    "kmWhenClosed": 45520,
    "actualCost": 480.00,
    "observations": "Dente e vidro substituídos"
  }'
```

**Response**:
```json
{
  "id": "RPR-2026-00089",
  "status": "COMPLETED",
  "vehicle": {
    "id": 5,
    "status": "AVAILABLE",
    "currentStationId": "PORTO"
  }
}
```

✅ Carro volta a estar `AVAILABLE` em Porto

---

## 🔄 Caso 3: Transferência multi-estação {#caso-3}

**Scenario**: Carro vai de Lisboa → Porto → Faro

### Transferência 1: Lisboa → Porto

```bash
curl -X POST http://localhost:3000/vehicle-transfers/initiate \
  -H "Authorization: Bearer $TOKEN_LISBOA" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": 8,
    "fromStationId": "LISBOA",
    "toStationId": "PORTO",
    "kmWhenTransferred": 48000,
    "estimatedDeliveryDate": "2026-02-21"
  }'
```

Response: `VTR-2026-00050`

### Chega a Porto

```bash
curl -X PATCH http://localhost:3000/vehicle-transfers/VTR-2026-00050/arrive \
  -H "Authorization: Bearer $TOKEN_PORTO" \
  -d '{
    "kmWhenArrived": 48150,
    "arrivedAt": "2026-02-21T14:00:00Z"
  }'
```

✅ Carro agora em `PORTO`

### Transferência 2: Porto → Faro

```bash
curl -X POST http://localhost:3000/vehicle-transfers/initiate \
  -H "Authorization: Bearer $TOKEN_PORTO" \
  -d '{
    "vehicleId": 8,
    "fromStationId": "PORTO",
    "toStationId": "FARO",
    "kmWhenTransferred": 48150,
    "estimatedDeliveryDate": "2026-02-22"
  }'
```

Response: `VTR-2026-00051`

### Chega a Faro

```bash
curl -X PATCH http://localhost:3000/vehicle-transfers/VTR-2026-00051/arrive \
  -H "Authorization: Bearer $TOKEN_FARO" \
  -d '{
    "kmWhenArrived": 48350,
    "arrivedAt": "2026-02-22T16:00:00Z"
  }'
```

✅ Carro agora em `FARO`, pronto para aluguel

---

## 🔐 Caso 4: Conflito de edição concorrente {#caso-4}

**Scenario**: 2 funcionários tentam editar ao mesmo tempo um contrato. Sistema deve bloquear um deles.

### Funcionário A: Começa a editar contrato

```bash
TOKEN_A="..."

curl -X PATCH http://localhost:3000/contracts/CNT-2026-00001/add-extra \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{
    "extraTypeId": 1,
    "quantity": 1,
    "dailyPrice": 5.00
  }'
```

**Response**:
```json
{
  "id": "CNT-2026-00001",
  "totalPrice": 150.00,
  "lockInfo": {
    "lockId": "LOCK-2026-789",
    "lockedBy": "func.a@company.com",
    "expiresAt": "2026-02-16T10:35:00Z"
  }
}
```

Lock criado! Contract está **bloqueado** para Funcionário A durante 5 minutos.

### Funcionário B: Tenta editar MESMO contrato **simultaneamente**

```bash
TOKEN_B="..."

curl -X PATCH http://localhost:3000/contracts/CNT-2026-00001/add-extra \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{
    "extraTypeId": 2,
    "quantity": 1,
    "dailyPrice": 3.00
  }'
```

**Response** (423 Locked):
```json
{
  "statusCode": 423,
  "message": "Record is locked for editing by another user",
  "lockInfo": {
    "lockedBy": "func.a@company.com",
    "lockedByEmail": "func.a@company.com",
    "expiresAt": "2026-02-16T10:35:00Z",
    "remainingSeconds": 240
  }
}
```

❌ **Funcário B é bloqueado!** Apenas vê erro com info de quem está a editar e quando liberta.

### Solução: Funcionário B aguarda 4 minutos

Após lock expirar, B consegue editar:

```bash
curl -X PATCH http://localhost:3000/contracts/CNT-2026-00001/add-extra \
  -H "Authorization: Bearer $TOKEN_B" \
  -d '...'
```

✅ **Success** - Agora lock está em nome de B

---

## 👥 Caso 5: Multi-tenância - Isolamento de estação {#caso-5}

**Scenario**: User de Lisboa tenta ver/editar contrato de Porto.

### User Lisboa vê APENAS seus dados

```bash
TOKEN_LISBOA="..."
curl -X GET http://localhost:3000/contracts \
  -H "Authorization: Bearer $TOKEN_LISBOA"
```

**Response** (apenas contratos de LISBOA):
```json
{
  "items": [
    {
      "id": "CNT-2026-00001",
      "stationId": "LISBOA",
      "status": "ACTIVE"
    },
    {
      "id": "CNT-2026-00005",
      "stationId": "LISBOA",
      "status": "COMPLETED"
    }
  ],
  "total": 2
}
```

### Tenta ver contrato de PORTO

```bash
curl -X GET http://localhost:3000/contracts/CNT-2026-00100 \
  -H "Authorization: Bearer $TOKEN_LISBOA"
# (CNT-2026-00100 pertence a PORTO)
```

**Response** (403 Forbidden):
```json
{
  "statusCode": 403,
  "message": "Access denied. Record belongs to different station",
  "recordStation": "PORTO",
  "userStation": "LISBOA"
}
```

❌ **Acesso negado!** Isolamento de dados funciona.

### Admin PODE ver tudo

```bash
TOKEN_ADMIN="..."
curl -X GET http://localhost:3000/contracts?station=PORTO \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

✅ **Admin vê todos os dados** (sem restrição de estação)

---

## 👨‍💼 Caso 6: Operações admin em reparações {#caso-6}

**Scenario**: Admin precisa listar todas reparações abertas do sistema

### Admin: Listar todas reparações abertas

```bash
TOKEN_ADMIN="..."

curl -X GET http://localhost:3000/vehicle-repairs?status=OPEN \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

**Response** (dados de TODAS estações):
```json
{
  "items": [
    {
      "id": "RPR-2026-00089",
      "vehicleId": 5,
      "status": "OPEN",
      "fromStationId": "PORTO",
      "reason": "Damage from transfer",
      "estimatedCost": 500.00,
      "createdAt": "2026-02-21T14:30:00Z"
    },
    {
      "id": "RPR-2026-00091",
      "vehicleId": 12,
      "status": "OPEN",
      "fromStationId": "LISBOA",
      "reason": "Engine check",
      "estimatedCost": 250.00,
      "createdAt": "2026-02-21T10:00:00Z"
    }
  ],
  "total": 12
}
```

### Admin: Forçar fechar reparação (lock expirado)

Se uma reparação tem lock expirado e não foi fechada:

```bash
# Primeiro, remover lock
curl -X DELETE http://localhost:3000/locks/LOCK-2026-456 \
  -H "Authorization: Bearer $TOKEN_ADMIN"

# Agora consegue fechar normalmente
curl -X PATCH http://localhost:3000/vehicle-repairs/RPR-2026-00089/close \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -d '{
    "closedAtStationId": "PORTO",
    "kmWhenClosed": 45520,
    "actualCost": 480.00
  }'
```

✅ **Reparação fechada** (lock forcado)

---

## 🏦 Caso 7: Aluguel COM Cauções e Seguros {#caso-7}

**Scenario**: Cliente novo quer alugar carro, pede 2 cauções + seguro para reduzir risco.

### Step 1: Criar Contrato COM Cauções

Cliente quer:
- 1x Caução Padrão (50% do aluguel)
- 1x Caução Reforçada (100% do aluguel)
- Seguro BASIC (-20% cauções)

```bash
STAFF_TOKEN="..."

curl -X POST http://localhost:3000/contracts \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "RES-2026-00520",
    "vehicleId": 5,
    "pickupDate": "2026-02-20",
    "dropoffDate": "2026-02-25",
    "clientId": 15,
    "deposits": [
      {
        "depositType": "STANDARD",
        "paymentMethod": "CREDIT_CARD",
        "cardToken": "tok_visa_4242"
      },
      {
        "depositType": "REINFORCED",
        "paymentMethod": "CREDIT_CARD",
        "cardToken": "tok_visa_4242"
      }
    ],
    "insuranceType": "BASIC"
  }'
```

**Response** (Cálculo com seguros):
```json
{
  "id": "CNT-2026-00089",
  "status": "ACTIVE",
  "vehicleId": 5,
  "basePrice": 100.00,
  "deposits": [
    {
      "id": "DEP-2026-001",
      "depositType": "STANDARD",
      "originalAmount": 50.00,
      "amount": 40.00,
      "insuranceType": "BASIC",
      "discountPercent": 20,
      "status": "HELD"
    },
    {
      "id": "DEP-2026-002",
      "depositType": "REINFORCED",
      "originalAmount": 100.00,
      "amount": 80.00,
      "insuranceType": "BASIC",
      "discountPercent": 20,
      "status": "HELD"
    }
  ],
  "totalDeposits": 120.00,
  "insuranceCost": 12.00,  # BASIC seguro
  "grandTotal": 232.00,    # 100 (aluguel) + 120 (cauções) + 12 (seguro)
  "depositBreakdown": {
    "originalTotal": 150.00,
    "discountApplied": 30.00,
    "finalAmount": 120.00
  }
}
```

✅ **Contrato criado com 2 cauções + desconto 20%**

### Step 2: Devolução SEM Danos

Cliente retorna carro sem qualquer dano. Cauções serem **100% libertadas**:

```bash
curl -X POST http://localhost:3000/contracts/CNT-2026-00089/return \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kmWhenReturned": 45420,
    "returnedAt": "2026-02-25T10:00:00Z",
    "returnStationId": "LISBOA",
    "damages": []
  }'
```

**Response**:
```json
{
  "id": "CNT-2026-00089",
  "status": "RETURNED",
  "basePrice": 100.00,
  "insuranceCost": 12.00,
  "damages": 0.00,
  "totalDue": 112.00,
  "deposits": [
    {
      "id": "DEP-2026-001",
      "type": "STANDARD",
      "amount": 40.00,
      "status": "FULLY_RELEASED",
      "releasedDate": "2026-02-25T10:00:00Z",
      "clientReceives": 40.00
    },
    {
      "id": "DEP-2026-002",
      "type": "REINFORCED",
      "amount": 80.00,
      "status": "FULLY_RELEASED",
      "releasedDate": "2026-02-25T10:00:00Z",
      "clientReceives": 80.00
    }
  ],
  "totalDepositRefund": 120.00,
  "finalBalance": {
    "clientPays": 112.00,  # Aluguel + seguro
    "clientReceives": 120.00  # Cauções libertadas
  }
}
```

✅ **Cliente recebe €120 de volta em cauções, paga €112 de aluguel+seguro**

### Step 3: Devolução COM Danos

Outro caso: Cliente com danos €75:

```bash
curl -X POST http://localhost:3000/contracts/CNT-2026-00089/return \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kmWhenReturned": 45500,
    "returnedAt": "2026-02-25T10:30:00Z",
    "returnStationId": "LISBOA",
    "damages": [
      {
        "description": "Vidro traseiro lascado",
        "estimatedCost": 75.00
      }
    ]
  }'
```

**Response** (Cauções cobrem danos):
```json
{
  "id": "CNT-2026-00089",
  "status": "RETURNED",
  "basePrice": 100.00,
  "damages": 75.00,
  "deposits": [
    {
      "id": "DEP-2026-001",
      "type": "STANDARD",
      "amount": 40.00,
      "status": "FORFEITED",
      "releasedAmount": 0.00,
      "reason": "Used to cover damages"
    },
    {
      "id": "DEP-2026-002",
      "type": "REINFORCED",
      "amount": 80.00,
      "status": "PARTIALLY_RELEASED",
      "forfeited": 35.00,
      "releasedAmount": 45.00,
      "reason": "Partial use for damages"
    }
  ],
  "depositBreakdown": {
    "totalHeld": 120.00,
    "usedForDamages": 75.00,
    "clientRefund": 45.00
  },
  "finalBalance": {
    "clientPays": 112.00,    # Aluguel + seguro
    "clientReceives": 45.00  # Saldo de cauções
  }
}
```

✅ **€75 danos cobertos por cauções, cliente recebe €45 de volta**

### Step 4: Danos Superiores a Cauções

Se danos €180, mas apenas tem €120 em cauções:

```bash
curl -X POST http://localhost:3000/contracts/CNT-2026-00089/return \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -d '{
    "damages": [
      {"description": "Engine damage", "estimatedCost": 180.00}
    ]
  }'
```

**Response**:
```json
{
  "deposits": [
    {
      "id": "DEP-2026-001",
      "amount": 40.00,
      "status": "FORFEITED"
    },
    {
      "id": "DEP-2026-002",
      "amount": 80.00,
      "status": "FORFEITED"
    }
  ],
  "damagesCoverageResult": {
    "totalDamages": 180.00,
    "depositsCover": 120.00,
    "damagesNotCovered": 60.00,
    "clientStillOwes": 60.00
  },
  "requiresAdditionalPayment": true,
  "paymentDueAmount": 60.00
}
```

✅ **Todas cauções perdidas (€120), cliente deve ainda €60**

---

## 📊 Summary Casos

| Caso | Objetivo | Endpoints Key | Resultado |
|------|----------|---------------|-----------|
| 1 | Aluguel completo (3 dias) | /reservations, /contracts, /payments | Cliente paga 200€ com extra |
| 2 | Carro danificado na transfer | /vehicle-transfers, /vehicle-repairs | Carro em repair automático |
| 3 | Múltiplas transfers | /vehicle-transfers (x2) | Carro chega a Faro disponível |
| 4 | Conflito concorrente | PATCH contratos (User A + B) | User B bloqueado por 5min |
| 5 | Isolamento estação | GET /contracts (diferentes users) | Dados isolados por estação |
| 6 | Admin force close | DELETE locks, PATCH repairs | Reparação fechada por admin |
| 7 | Aluguel com cauções | /contracts (deposits), /return | Cauções libertadas/perdidas conforme danos |

---

**Versão**: 1.0.0  
**Última Atualização**: Fevereiro 2026
