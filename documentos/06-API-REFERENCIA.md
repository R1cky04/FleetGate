# 06 - Guia API Completo

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

## 📋 Índice de Endpoints

| Módulo | Endpoints | Documentação |
|--------|-----------|--------------|
| **Auth** | Login, Register, Refresh | `#autenticacao` |
| **Users** | CRUD Users, Change Password | `#users` |
| **Vehicles** | CRUD Vehicles, Search | `#vehicles` |
| **Stations** | CRUD Stations | `#stations` |
| **Reservations** | Create, Confirm, Cancel | `#reservations` |
| **Contracts** | CRUD, Add Extras, Return | `#contracts` |
| **Payments** | Process, Confirm, History | `#payments` |
| **Transfers** | Initiate, Depart, Arrive | `#transfers` |
| **Repairs** | Open, Close, Cancel, List | `#repairs` |
| **Locks** | Acquire, Release, Status | `#locks` |

## 🔐 Autenticação

### 1. Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "cliente@exemplo.com",
  "password": "Senha123!"
}
```

**Resposta 200**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "user": {
    "id": 1,
    "email": "cliente@exemplo.com",
    "name": "João Silva",
    "roles": ["CLIENT"],
    "stationId": "LISBOA"
  }
}
```

### 2. Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "novo@exemplo.com",
  "password": "Senha123!",
  "name": "Maria Santos",
  "roleId": 1
}
```

## 🚗 Vehicles

### 1. Criar Veículo

```http
POST /vehicles
Authorization: Bearer {token}
Content-Type: application/json

{
  "licensePlate": "20-AB-BC",
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2024,
  "registeredStationId": "LISBOA",
  "typeId": 2
}
```

**Resposta 201**:
```json
{
  "id": 5,
  "licensePlate": "20-AB-BC",
  "status": "AVAILABLE",
  "currentStationId": "LISBOA",
  "dailyRate": 45.00,
  "mileage": 0
}
```

### 2. Listar Veículos da Estação

```http
GET /vehicles/station/LISBOA?status=AVAILABLE
Authorization: Bearer {token}
```

**Resposta 200**:
```json
{
  "items": [
    {
      "id": 1,
      "licensePlate": "12-AB-CD",
      "status": "AVAILABLE",
      "brand": "Volkswagen",
      "model": "Passat"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10
}
```

## 📅 Reservations

### 1. Criar Reserva

```http
POST /reservations
Authorization: Bearer {token}
Content-Type: application/json

{
  "vehicleId": 5,
  "pickupStationId": "LISBOA",
  "dropoffStationId": "PORTO",
  "pickupDate": "2026-02-20",
  "dropoffDate": "2026-02-25",
  "rentType": "DAILY"
}
```

**Resposta 201**:
```json
{
  "id": "RES-2026-12345",
  "vehicleId": 5,
  "status": "PENDING_CONFIRMATION",
  "totalPrice": 225.00,
  "estimatedDays": 5
}
```

**Erros Comuns**:
- `400`: Datas inválidas
- `409`: Veículo em repair ou não disponível
- `422`: Campo obrigatório ausente

### 2. Confirmar Reserva

```http
PATCH /reservations/{id}/confirm
Authorization: Bearer {token}
```

## 📋 Contratos

### 1. Criar Contrato de Aluguel

```http
POST /contracts
Authorization: Bearer {token}
Content-Type: application/json

{
  "reservationId": "RES-2026-12345",
  "vehicleId": 5,
  "pickupDate": "2026-02-20",
  "dropoffDate": "2026-02-25",
  "clientId": 10
}
```

**Resposta 201**:
```json
{
  "id": "CNT-2026-00542",
  "status": "ACTIVE",
  "vehicleId": 5,
  "basePrice": 225.00,
  "extras": [],
  "totalPrice": 225.00
}
```

### 2. Adicionar Extra

```http
POST /contracts/{id}/add-extra
Authorization: Bearer {token}
Content-Type: application/json

{
  "extraTypeId": 3,
  "quantity": 1,
  "dailyPrice": 15.00
}
```

### 3. Retornar Veículo

```http
POST /contracts/{id}/return
Authorization: Bearer {token}
Content-Type: application/json

{
  "kmWhenReturned": 45500,
  "returnedAt": "2026-02-25T10:30:00Z",
  "returnStationId": "PORTO",
  "damages": [
    {
      "description": "Risco pequeno na porta",
      "estimatedCost": 150.00
    }
  ]
}
```

## 🏦 Cauções (Deposits)

### 1. Criar Contrato COM Cauções

```http
POST /contracts
Authorization: Bearer {token}
Content-Type: application/json

{
  "reservationId": "RES-2026-12345",
  "vehicleId": 5,
  "pickupDate": "2026-02-20",
  "dropoffDate": "2026-02-25",
  "clientId": 10,
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
}
```

**Resposta 201**:
```json
{
  "id": "CNT-2026-00542",
  "totalPrice": 100.00,
  "deposits": [
    {
      "id": "DEP-001",
      "type": "STANDARD",
      "originalAmount": 50.00,
      "amount": 40.00,
      "insuranceDiscount": 20,
      "status": "HELD"
    },
    {
      "id": "DEP-002",
      "type": "REINFORCED",
      "originalAmount": 100.00,
      "amount": 80.00,
      "insuranceDiscount": 20,
      "status": "HELD"
    }
  ],
  "totalDeposits": 120.00,
  "grandTotal": 220.00
}
```

### 2. Adicionar Caução (pós-contrato criado)

```http
POST /contracts/{contractId}/deposits
Authorization: Bearer {token}
Content-Type: application/json

{
  "depositType": "REINFORCED",
  "paymentMethod": "CREDIT_CARD",
  "cardToken": "tok_visa_4242"
}
```

### 3. Listar Cauções de Contrato

```http
GET /contracts/{contractId}/deposits
Authorization: Bearer {token}
```

**Resposta 200**:
```json
{
  "items": [
    {
      "id": "DEP-001",
      "depositType": "STANDARD",
      "amount": 40.00,
      "status": "HELD"
    }
  ]
}
```

### 4. Verificar Status de Libertação

```http
GET /contracts/{contractId}/deposits/{depositId}/release-status
Authorization: Bearer {token}
```

**Resposta 200**:
```json
{
  "depositId": "DEP-001",
  "status": "HELD",
  "currentlyHeld": 40.00,
  "releaseDate": null,
  "estimatedReleaseDate": "2026-02-25"
}
```

### 5. Processar Libertação Manual (Admin)

```http
PATCH /contracts/{contractId}/deposits/{depositId}/release
Authorization: Bearer {token}
Content-Type: application/json

{
  "releaseAmount": 40.00,
  "reason": "No damages found"
}
```

---

## 💳 Pagamentos

### 1. Processar Pagamento

```http
POST /payments
Authorization: Bearer {token}
Content-Type: application/json

{
  "contractId": "CNT-2026-00542",
  "amount": 225.00,
  "method": "CREDIT_CARD",
  "cardToken": "tok_1234567890"
}
```

**Resposta 201**:
```json
{
  "id": "PAY-2026-99999",
  "status": "CONFIRMED",
  "amount": 225.00,
  "transactionId": "ch_1ABC123XYZ",
  "receipt": "https://..."
}
```

**Métodos Aceitos**: `CREDIT_CARD`, `DEBIT_CARD`, `BANK_TRANSFER`, `CASH`

### 2. Confirmar Pagamento

```http
PATCH /payments/{id}/confirm
Authorization: Bearer {token}
X-Idempotency-Key: uuid-único
```

## 🚚 Transferências

### 1. Iniciar Transferência

```http
POST /vehicle-transfers/initiate
Authorization: Bearer {token}
Content-Type: application/json

{
  "vehicleId": 5,
  "fromStationId": "LISBOA",
  "toStationId": "PORTO",
  "kmWhenTransferred": 45230,
  "estimatedDeliveryDate": "2026-02-20"
}
```

### 2. Carro Chegou ao Destino

```http
PATCH /vehicle-transfers/{id}/arrive
Authorization: Bearer {token}
Content-Type: application/json

{
  "kmWhenArrived": 45420,
  "arrivedAt": "2026-02-20T14:00:00Z",
  "observations": "Chapa traseira amassada"
}
```

## 🔧 Reparações

### 1. Abrir Reparação

```http
POST /vehicle-repairs/open
Authorization: Bearer {token}
Content-Type: application/json

{
  "vehicleId": 5,
  "reason": "Substituição de pneu",
  "kmWhenOpened": 45230,
  "estimatedCost": 250.00
}
```

### 2. Adquirir Lock para Fechar

```http
POST /vehicle-repairs/{id}/acquire-close-lock
Authorization: Bearer {token}
```

**Resposta 200**:
```json
{
  "lockId": "LOCK-2026-123",
  "expiresAt": "2026-02-16T11:00:00Z",
  "remainingMinutes": 5
}
```

### 3. Fechar Reparação

```http
PATCH /vehicle-repairs/{id}/close
Authorization: Bearer {token}
Content-Type: application/json

{
  "closedAtStationId": "PORTO",
  "kmWhenClosed": 45310,
  "actualCost": 280.00,
  "observations": "Foram feitos extras para alinhamento"
}
```

## 🔒 Locks (Controle Concorrente)

### 1. Adquirir Lock para Editar

```http
POST /locks/acquire
Authorization: Bearer {token}
Content-Type: application/json

{
  "recordType": "CONTRACT",
  "recordId": "CNT-2026-00542",
  "mode": "EXCLUSIVE"
}
```

### 2. Renovar Lock (Heartbeat)

```http
PATCH /locks/{lockId}/renew
Authorization: Bearer {token}
```

### 3. Verificar Status do Lock

```http
GET /locks/{recordType}/{recordId}
Authorization: Bearer {token}
```

**Resposta 200**:
```json
{
  "locked": true,
  "lockedBy": "user@example.com",
  "lockedAt": "2026-02-16T10:30:00Z",
  "expiresAt": "2026-02-16T10:35:00Z"
}
```

## 📊 Métricas e Monitoramento

### 1. Métricas do Sistema

```http
GET /metrics
```

**Resposta 200** (formato Prometheus):
```
# HELP fleetgate_reservations_total Total reservations
# TYPE fleetgate_reservations_total counter
fleetgate_reservations_total{status="confirmed"} 145
fleetgate_reservations_total{status="cancelled"} 12
```

## ⚠️ Códigos de Erro Comuns

| Código | Descrição | Solução |
|--------|-----------|---------|
| `401` | Não autenticado | Faça login com `/auth/login` |
| `403` | Acesso negado | Verifique permissões da role |
| `404` | Recurso não encontrado | Verifique IDs |
| `409` | Conflito de recurso | Carro em repair, editado por outro, etc |
| `422` | Dados inválidos | Verifique formato e valores |
| `429` | Rate limit | Aguarde antes de nova tentativa |

## 🔑 Headers Obrigatórios

```http
Authorization: Bearer {access_token}
Content-Type: application/json
X-Station-Id: LISBOA (para operações multi-estação)
```

## 📝 Notas sobre Paginação

```http
GET /vehicles?page=1&limit=10&sort=licensePlate&order=asc
```

**Resposta**:
```json
{
  "items": [...],
  "total": 250,
  "page": 1,
  "limit": 10,
  "totalPages": 25
}
```

---

**Swagger Completo**: http://localhost:3000/api/docs  
**Status da API**: http://localhost:3000/health
