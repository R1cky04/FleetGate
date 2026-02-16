# Sistema de Impropriedades (Vehicle Repairs)

## 📋 Visão Geral

O FleetGate implementa um sistema robusto de **impropriedades (reparações)** de veículos que permite:

- ✅ Marcar um carro como em reparação → status `IN_REPAIR`
- ✅ Carro fica **indisponível** para aluguel/reserva enquanto em reparação
- ✅ Fechar reparação em qualquer estação → carro fica `AVAILABLE` nessa estação
- ✅ Locks exclusivos para evitar conflitos com múltiplos utilizadores
- ✅ Histórico completo de reparações por veículo
- ✅ Validações automáticas em reservações/contratos

## 🎯 Fluxo Principal

```
1. MARCAR EM REPARAÇÃO (Impro Aberta)
   User A → POST /vehicle-repairs/open
   → VehicleRepair criada com status: OPEN
   → Vehicle status muda para: IN_REPAIR
   → Carro indisponível para aluguel

2. FECHAR REPARAÇÃO (Impro Fechada)
   User A → POST /vehicle-repairs/{id}/acquire-close-lock
   → Adquire lock exclusivo (5 minutos)
   User A → PATCH /vehicle-repairs/{id}/close
   → VehicleRepair status muda para: COMPLETED
   → Vehicle status muda para: AVAILABLE
   → Vehicle muda para estação de fechamento
   → Lock liberado automaticamente

3. TENTAR ALUGAR CARRO EM REPARO (Bloqueado)
   User B → POST /reservations (com vehicleId em REPAIR)
   → ConflictException: "Vehicle is in active repair"
   → Operação rejeitada
```

## 🔌 API REST - Vehicle Repairs

### 1. Marcar Carro em Reparação

```bash
POST /vehicle-repairs/open
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "vehicleId": 5,
  "reason": "Motor não funciona",
  "description": "Problemas de ignição, possível vela ou bateria",
  "kmWhenOpened": 45230,
  "estimatedCost": 250.00
}
```

**Response (201 Created):**
```json
{
  "id": "repair_uuid",
  "repairNumber": "RPR-1707835200000-a1b2c3d4",
  "vehicleId": 5,
  "vehicle": {
    "id": 5,
    "licensePlate": "AA-11-AA",
    "make": "Toyota",
    "model": "Corolla"
  },
  "fromStationId": "LISBON_CENTER",
  "fromStation": {
    "id": "LISBON_CENTER",
    "code": "LIS",
    "name": "Lisbon Center"
  },
  "status": "OPEN",
  "reason": "Motor não funciona",
  "description": "Problemas de ignição...",
  "kmWhenOpened": 45230,
  "estimatedCost": 250,
  "openedById": 5,
  "openedBy": {
    "id": 5,
    "fullName": "João da Silva"
  },
  "openedAt": "2025-02-16T16:00:00Z",
  "createdAt": "2025-02-16T16:00:00Z",
  "updatedAt": "2025-02-16T16:00:00Z"
}
```

**Errors:**
- `404`: Veículo não encontrado
- `409`: Veículo já está em reparação ativa
- `409`: Veículo em RENTED/RESERVED

---

### 2. Adquirir Lock Exclusivo para Fechar

```bash
POST /vehicle-repairs/{repairId}/acquire-close-lock
Authorization: Bearer JWT_TOKEN
```

**Response (201 Created):**
```json
{
  "repairId": "repair_uuid",
  "lockedBy": 6,
  "expiresAt": "2025-02-16T16:05:00Z",
  "durationSeconds": 300
}
```

**Errors:**
- `404`: Reparação não encontrada
- `409`: Outro utilizador já tem lock (nome do utilizador incluído)
- `409`: Reparação já foi COMPLETED ou CANCELLED

---

### 3. Renovar Lock (Heartbeat)

```bash
PATCH /vehicle-repairs/{repairId}/renew-close-lock
Authorization: Bearer JWT_TOKEN
```

**Response (200 OK):**
```json
{
  "repairId": "repair_uuid",
  "lockedBy": 6,
  "expiresAt": "2025-02-16T16:10:00Z",
  "durationSeconds": 300
}
```

---

### 4. Liberar Lock

```bash
DELETE /vehicle-repairs/{repairId}/release-close-lock
Authorization: Bearer JWT_TOKEN
```

**Response (200 OK):**
```json
{
  "message": "Lock released"
}
```

---

### 5. Fechar Reparação

```bash
PATCH /vehicle-repairs/{repairId}/close
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "closedAtStationId": "PORTO_AIRPORT",
  "kmWhenClosed": 45310,
  "actualCost": 280.00,
  "notes": "Motor reparado. Funcionando normalmente.",
  "internalNotes": "Substituída vela. Bateria OK."
}
```

**Response (200 OK):**
```json
{
  "id": "repair_uuid",
  "repairNumber": "RPR-1707835200000-a1b2c3d4",
  "vehicleId": 5,
  "vehicle": {
    "id": 5,
    "licensePlate": "AA-11-AA",
    "make": "Toyota",
    "model": "Corolla"
  },
  "fromStationId": "LISBON_CENTER",
  "closedAtStationId": "PORTO_AIRPORT",
  "closedAtStation": {
    "id": "PORTO_AIRPORT",
    "code": "POR",
    "name": "Porto Airport"
  },
  "status": "COMPLETED",
  "reason": "Motor não funciona",
  "kmWhenOpened": 45230,
  "kmWhenClosed": 45310,
  "estimatedCost": 250,
  "actualCost": 280,
  "openedById": 5,
  "closedById": 6,
  "closedBy": {
    "id": 6,
    "fullName": "Maria Santos"
  },
  "openedAt": "2025-02-16T16:00:00Z",
  "closedAt": "2025-02-16T16:08:00Z",
  "notes": "Motor reparado. Funcionando normalmente.",
  "internalNotes": "Substituída vela. Bateria OK."
}
```

**O que muda neste momento:**
- ✅ `VehicleRepair.status` → `COMPLETED`
- ✅ `Vehicle.status` → `AVAILABLE`
- ✅ `Vehicle.stationId` → `PORTO_AIRPORT` (estação de fechamento)
- ✅ `Vehicle.currentKm` → `45310`
- ✅ Lock liberado automaticamente

**Errors:**
- `404`: Reparação não encontrada
- `409`: Não tem lock exclusivo
- `409`: Lock expirou
- `404`: Estação de fechamento não encontrada

---

### 6. Obter Detalhes da Reparação

```bash
GET /vehicle-repairs/{repairId}
Authorization: Bearer JWT_TOKEN
```

**Response (200 OK):** Retorna objeto completo da reparação com relações

---

### 7. Listar Reparações de um Veículo

```bash
GET /vehicle-repairs/vehicle/{vehicleId}
Authorization: Bearer JWT_TOKEN
```

**Response (200 OK):**
```json
[
  {
    "id": "repair_uuid_1",
    "repairNumber": "RPR-1707835200000-a1b2c3d4",
    "status": "COMPLETED",
    "reason": "Motor não funciona",
    "openedAt": "2025-02-16T16:00:00Z",
    "closedAt": "2025-02-16T16:08:00Z",
    "estimatedCost": 250,
    "actualCost": 280,
    "openedBy": { "id": 5, "fullName": "João da Silva" },
    "closedBy": { "id": 6, "fullName": "Maria Santos" },
    "fromStation": { "code": "LIS", "name": "Lisbon Center" },
    "closedAtStation": { "code": "POR", "name": "Porto Airport" }
  },
  {
    "id": "repair_uuid_2",
    "repairNumber": "RPR-1707831600000-z9y8x7w6",
    "status": "OPEN",
    "reason": "Pneu furado",
    "openedAt": "2025-02-16T15:00:00Z",
    "estimatedCost": 80,
    "openedBy": { "id": 7, "fullName": "Carlos Costa" },
    "fromStation": { "code": "LIS", "name": "Lisbon Center" }
  }
]
```

---

### 8. Listar Reparações Abertas de uma Estação

```bash
GET /vehicle-repairs/station/{stationId}/open
Authorization: Bearer JWT_TOKEN
```

**Response (200 OK):** Retorna todas as reparações em status `OPEN` ou `IN_PROGRESS` da estação

---

### 9. Cancelar Reparação

```bash
POST /vehicle-repairs/{repairId}/cancel
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "reason": "Cliente pediu para cancelar reparação"
}
```

**Response (200 OK):**
```json
{
  "id": "repair_uuid",
  "status": "CANCELLED",
  "closedAt": "2025-02-16T16:10:00Z",
  "closedById": 6,
  "internalNotes": "Cancelled: Cliente pediu para cancelar reparação"
}
```

**Efeito:**
- ✅ `VehicleRepair.status` → `CANCELLED`
- ✅ Se `Vehicle.status === IN_REPAIR` → muda para `AVAILABLE`
- ✅ Lock liberado automaticamente

---

## 🛡️ Validações Automáticas

### 1. Tentativa de Alugar Carro em Reparação
```bash
POST /reservations
{
  "vehicleId": 5,  # Este carro está em IN_REPAIR
  "pickupDate": "2025-02-17"
}
```

**Response (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Vehicle is currently in repair (RPR-1707835200000-a1b2c3d4). " +
             "Opened by João da Silva. Cannot create reservation until repair is completed."
}
```

### 2. Estados Bloqueados
Carros com status `IN_REPAIR`, `MAINTENANCE`, `OUT_OF_SERVICE` não podem ser:
- ✅ Reservados
- ✅ Alugados em novos contratos
- ✅ Transferidos para outra estação regularmente

### 3. Validação de Estação
- User STAFF só pode abrir/fechar reparações na sua estação
- IT admin pode abrir/fechar em qualquer estação

---

## 🔒 Sistema de Locks

### Objetivo
Evitar que dois utilizadores tentem fechar a mesma reparação simultaneamente.

### Comportamento

1. **User A inicia processo de fechamento:**
   ```
   POST /vehicle-repairs/repair_1/acquire-close-lock
   → Lock adquirido
   → Expira em 5 minutos
   ```

2. **User B tenta fechar enquanto User A está:**
   ```
   POST /vehicle-repairs/repair_1/acquire-close-lock
   → Error 409: "João is closing this repair"
   ```

3. **User A continua editando (heartbeat):**
   ```
   PATCH /vehicle-repairs/repair_1/renew-close-lock
   → Lock renovado por mais 5 minutos
   ```

4. **User A completa:**
   ```
   PATCH /vehicle-repairs/repair_1/close
   → Lock liberado automaticamente
   ```

5. **Agora User B pode fechar outra reparação:**
   ```
   POST /vehicle-repairs/repair_2/acquire-close-lock
   → Lock adquirido com sucesso
   ```

---

## 📊 Estados da Reparação

| Status | Descrição | Vehicle Status |
|--------|-----------|-----------------|
| `OPEN` | Reparação recém-aberta, não iniciada | `IN_REPAIR` |
| `IN_PROGRESS` | Técnico está a trabalhar na reparação | `IN_REPAIR` |
| `COMPLETED` | Reparação concluída, carro disponível | `AVAILABLE` |
| `CANCELLED` | Reparação cancelada | `AVAILABLE` |

---

## 📈 Fluxo com Múltiplos Utilizadores

### Cenário: Duas reparações simultâneas em estação

```
Time 0:00  → João abre Reparação #1 (Motor)
           → Vehicle A status: IN_REPAIR
           → João inicia processo de fechamento (adquire lock)
           → Lock expira em 5:00

Time 0:30  → Maria abre Reparação #2 (Pneu)
           → Vehicle B status: IN_REPAIR
           → Maria tenta fechar Reparação #1 (não é dela)
           → Error 409: "João is closing repair #1"
           → Maria fecha Reparação #2 (é dela, sem conflito)
           → Vehicle B status: AVAILABLE em estação de fechamento

Time 3:00  → João renova lock (heartbeat)
           → Lock expira em 8:00
           → Continua preenchendo dados de fechamento

Time 4:30  → João fecha Reparação #1
           → Vehicle A status: AVAILABLE em estação de fechamento
           → Lock liberado

Time 5:00  → Carlos abre Reparação #3 (Óleo)
           → Vehicle C status: IN_REPAIR
           → Sem conflito com outras reparações
```

---

## 🔧 Banco de Dados

### Modelo VehicleRepair
```sql
Fields:
- id (UUID)
- repairNumber (string, unique)
- vehicleId (int)
- fromStationId (string) - Estação onde foi marcado
- closedAtStationId (string, nullable) - Estação onde foi fechado
- status (OPEN | IN_PROGRESS | COMPLETED | CANCELLED)
- reason (string)
- description (string, nullable)
- kmWhenOpened (int)
- kmWhenClosed (int, nullable)
- estimatedCost (float)
- actualCost (float, nullable)
- openedById (int)
- closedById (int, nullable)
- openedAt (datetime)
- closedAt (datetime, nullable)
- notes (string, nullable)
- internalNotes (string, nullable)
- lockedBy (int, nullable) - User com lock para fechar
- lockedAt (datetime, nullable)
- lockedExpires (datetime, nullable)
- createdAt (datetime)
- updatedAt (datetime)
```

### Índices
- `vehicleId` - Rápida busca de reparações por veículo
- `status` - Filtro de reparações abertas/fechadas
- `openedAt` - Ordenação cronológica
- `fromStationId`, `closedAtStationId` - Busca por estação
- `lockedExpires` - Limpeza de locks expirados

---

## 🚀 Fluxo Frontend Recomendado

### 1. Abrir Veículo
```javascript
// GET /vehicles/{id}
→ Mostrar lista de reparações ativas se houver
→ Se Vehicle.status === 'IN_REPAIR'
  → Mostrar aviso: "Veículo em reparação"
  → Desabilitar opção de aluguel
```

### 2. Iniciar Reparação
```javascript
// POST /vehicle-repairs/open
→ Mostrar form com campos:
  - Reason (obrigatório)
  - Description (opcional)
  - KM at time of repair (obrigatório)
  - Estimated cost (opcional)
→ Desabilitar após sucesso
→ Mostrar repairNumber
```

### 3. Fechar Reparação (Workflow)
```javascript
// Step 1: Acquire lock
POST /vehicle-repairs/{id}/acquire-close-lock
→ Se OK: Mostrar form de fechamento
→ Se Conflict: "João está a fechar, espere 5 minutos"

// Step 2: User preenche dados
→ Status final (IN_PROGRESS ou COMPLETED)
→ KM at closure
→ Actual cost
→ Notas públicas
→ Notas internas

// Step 3: Heartbeat (a cada 2 min)
PATCH /vehicle-repairs/{id}/renew-close-lock
→ Se falhar por lock expired:
  → POST /vehicle-repairs/{id}/acquire-close-lock (retry)
  → Se outro user tem lock: mostrar aviso

// Step 4: Submeter
PATCH /vehicle-repairs/{id}/close
→ TransactionStatus: COMPLETED
→ Vehicle: AVAILABLE na nova estação
→ Mostrar confirmação
```

### 4. Listar Reparações da Estação
```javascript
GET /vehicle-repairs/station/{stationId}/open
→ Tabela com:
  - Veículo (licensePlate, make/model)
  - Reason
  - Tempo aberto
  - Quem abriu
  - Status (OPEN / IN_PROGRESS)
→ Ações: View | Close | Cancel
```

---

## ⚠️ Troubleshooting

### "Another user is closing this repair"
- **Problema**: Lock adquirido por outro utilizador
- **Solução**: Espere 5 minutos ou coordene com utilizador
- **Alternativa**: IT admin pode forçar release via `DELETE /locks/release`

### "Lock expired"
- **Problema**: Decorreu mais de 5 minutos sem renovação
- **Solução**: Adquira lock novamente com `POST /acquire-close-lock`

### "Vehicle is in active repair"
- **Problema**: Tentou alugar carro já em reparação
- **Solução**: Aguarde conclusão da reparação

### Vehicle ainda em IN_REPAIR após fecha reparação
- **Problema**: Possível erro em transação
- **Solução**: Verifique `SELECT status FROM "Vehicle" WHERE id = ?`
- **Recovery**: IT admin pode atualizar status manualmente

---

## 📋 Query Úteis

### Reparações abertas agora
```sql
SELECT r.repairNumber, v.licensePlate, r.reason, r.openedAt, u.fullName
FROM "VehicleRepair" r
JOIN "Vehicle" v ON r.vehicleId = v.id
JOIN "User" u ON r.openedById = u.id
WHERE r.status IN ('OPEN', 'IN_PROGRESS')
ORDER BY r.openedAt DESC;
```

### Reparações de hoje
```sql
SELECT r.repairNumber, r.reason, r.estimatedCost, r.actualCost,
       r.openedAt, r.closedAt, r."closedAtStationId"
FROM "VehicleRepair" r
WHERE DATE(r."openedAt") = CURRENT_DATE
ORDER BY r."openedAt" DESC;
```

### Reparações com lock expirado
```sql
SELECT r.id, r.repairNumber, r."lockedBy", r."lockedExpires"
FROM "VehicleRepair" r
WHERE r."lockedExpires" IS NOT NULL
  AND r."lockedExpires" < NOW();
```

### Custo total de reparações por mês
```sql
SELECT DATE_TRUNC('month', r."closedAt") as month,
       COUNT(*) as repair_count,
       SUM(r."actualCost") as total_cost,
       AVG(r."actualCost") as avg_cost
FROM "VehicleRepair" r
WHERE r.status = 'COMPLETED'
GROUP BY DATE_TRUNC('month', r."closedAt")
ORDER BY month DESC;
```
