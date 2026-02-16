# 09 - Modelos de Dados (Database Schema)

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

## 📊 Visão Geral do Schema

**Total de Modelos**: 14  
**Migrations**: 11  
**Tabelas**: 14 principais + 3 de auditoria  
**Relações**: 23 foreign keys

---

## 👤 Tabela: `Users`

**Propósito**: Armazenar utilizadores do sistema

```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  password     String   // bcrypt hash
  name         String
  stationId    String   // Isolamento multi-estação
  roles        Role[]   @relation("UserRoles")
  
  reservations Reservation[]
  contracts    Contract[]
  locks        RecordLock[] @relation("LockedByUser")
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Índices**:
- `email` (UNIQUE)
- `stationId` (para queries de users por estação)

**Exemplo**:
```json
{
  "id": 1,
  "email": "joao@empresa.com",
  "name": "João Silva",
  "stationId": "LISBOA",
  "roles": ["CLIENT"]
}
```

---

## 🚗 Tabela: `Vehicles`

**Propósito**: Informação de carros do frota

```prisma
model Vehicle {
  id                Int      @id @default(autoincrement())
  licensePlate      String   @unique
  brand             String
  model             String
  year              Int
  status            VehicleStatus  // AVAILABLE, IN_USE, IN_REPAIR, IN_TRANSFER
  currentStationId  String   // Estação actual
  registeredStationId String // Estação de matrícula
  
  typeId            Int
  vehicleType       VehicleType @relation(fields: [typeId], references: [id])
  
  mileage           Int      @default(0)
  dailyRate         Decimal  @db.Decimal(10, 2)
  
  reservations      Reservation[]
  contracts         Contract[]
  repairs           VehicleRepair[]
  transfers         VehicleTransfer[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum VehicleStatus {
  AVAILABLE
  IN_USE
  IN_REPAIR
  IN_TRANSFER
}
```

**Índices**:
- `licensePlate` (UNIQUE)
- `status` (para queries "carros disponíveis")
- `currentStationId` (para queries por estação)

**Exemplo**:
```json
{
  "id": 5,
  "licensePlate": "20-AB-BC",
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2024,
  "status": "AVAILABLE",
  "currentStationId": "LISBOA",
  "dailyRate": 45.00,
  "mileage": 45230
}
```

---

## 📅 Tabela: `Reservations`

**Propósito**: Reservas de carros pelos clientes

```prisma
model Reservation {
  id               String   @id @default(nanoid(12))
  status           ReservationStatus // PENDING, CONFIRMED, CANCELLED
  
  vehicleId        Int
  vehicle          Vehicle  @relation(fields: [vehicleId], references: [id])
  
  userId           Int
  user             User     @relation(fields: [userId], references: [id])
  
  pickupDate       DateTime
  dropoffDate      DateTime
  estimatedDays    Int
  
  pickupStationId  String
  dropoffStationId String
  
  totalPrice       Decimal  @db.Decimal(12, 2)
  rentType         RentType // DAILY, WEEKLY, MONTHLY
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

enum ReservationStatus {
  PENDING_CONFIRMATION
  CONFIRMED
  CONVERTED_TO_CONTRACT
  CANCELLED
}
```

**Índices**:
- `vehicleId` + `pickupDate` + `dropoffDate` (para collision detection)
- `userId` (para queries "minhas reservas")

---

## 📋 Tabela: `Contracts`

**Propósito**: Contratos activos de aluguel

```prisma
model Contract {
  id                String   @id @default(nanoid(12))
  status            ContractStatus // ACTIVE, COMPLETED, CANCELLED
  
  vehicleId         Int
  vehicle           Vehicle  @relation(fields: [vehicleId], references: [id])
  
  reservationId     String?
  
  userId            Int
  user              User     @relation(fields: [userId], references: [id])
  
  pickupDate        DateTime
  dropoffDate       DateTime
  
  pickupStationId   String
  returnStationId   String!
  
  kmWhenPickedUp    Int
  kmWhenReturned    Int?
  
  basePrice         Decimal  @db.Decimal(12, 2)
  totalPrice        Decimal  @db.Decimal(12, 2)
  
  extras            ContractExtra[]
  damages           ContractDamage[]
  payments          Payment[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum ContractStatus {
  ACTIVE
  RETURNED
  COMPLETED
  CANCELLED
}
```

---

## 💳 Tabela: `Payments`

**Propósito**: Processamento de pagamentos

```prisma
model Payment {
  id              String   @id @default(nanoid(12))
  status          PaymentStatus // PENDING, CONFIRMED, FAILED, REFUNDED
  
  contractId      String
  contract        Contract @relation(fields: [contractId], references: [id])
  
  amount          Decimal  @db.Decimal(12, 2)
  method          PaymentMethod // CREDIT_CARD, DEBIT_CARD, CASH, TRANSFER
  
  // Para CARD
  cardTokenId     String?  // Stripe/Checkout token
  lastFourDigits  String?
  
  // Para TRANSFER
  bankAccount     String?
  
  transactionId   String?  // ID do gateway (stripe_ch_*)
  receipt         String?  // URL ou JSON da recepção
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum PaymentStatus {
  PENDING
  CONFIRMED
  FAILED
  REFUNDED
}

enum PaymentMethod {
  CREDIT_CARD
  DEBIT_CARD
  CASH
  BANK_TRANSFER
}
```

---

## 🏦 Tabela: `ContractDeposit` (Cauções)

**Propósito**: Gerenciar depósitos/cauções em contratos

```prisma
model ContractDeposit {
  id              String   @id @default(nanoid(12))
  contractId      String
  contract        Contract @relation(fields: [contractId], references: [id])
  
  depositType     DepositType  // STANDARD (50%), REINFORCED (100%), INSURANCE
  amount          Decimal  @db.Decimal(12, 2)  // Valor final (com desconto)
  originalAmount  Decimal  @db.Decimal(12, 2)  // Valor antes desconto
  
  insuranceType   InsuranceType?  // BASIC (-20%), PREMIUM (-40%), NONE
  discountPercent Int?
  
  paymentMethod   PaymentMethod
  cardTokenId     String?
  
  status          DepositStatus  // HELD, PARTIALLY_RELEASED, FULLY_RELEASED, FORFEITED
  releasedAmount  Decimal  @db.Decimal(12, 2) @default(0)
  releasedDate    DateTime?
  
  observations    String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum DepositType {
  STANDARD     // 50% do aluguel
  REINFORCED   // 100% do aluguel
  INSURANCE    // Com seguro
}

enum DepositStatus {
  HELD              // Bloqueada
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

**Exemplo**:
```json
{
  "id": "DEP-2026-001",
  "contractId": "CNT-2026-00001",
  "depositType": "STANDARD",
  "originalAmount": 50.00,
  "amount": 40.00,
  "insuranceType": "BASIC",
  "discountPercent": 20,
  "status": "HELD"
}
```

---

## 🔧 Tabela: `VehicleRepair`

**Propósito**: Rastreamento de reparações de veículos

```prisma
model VehicleRepair {
  id                   String   @id @default(nanoid(12))
  status               VehicleRepairStatus // OPEN, IN_PROGRESS, COMPLETED, CANCELLED
  
  vehicleId            Int
  vehicle              Vehicle  @relation(fields: [vehicleId], references: [id])
  
  reason               String
  observations         String?
  
  fromStationId        String   // Estação onde foi aberta
  closedAtStationId    String?  // Estação onde foi fechada
  
  kmWhenOpened         Int
  kmWhenClosed         Int?
  
  estimatedCost        Decimal  @db.Decimal(12, 2)?
  actualCost           Decimal  @db.Decimal(12, 2)?
  
  // Lock para fechar (5 minutos, renovável)
  closeLockedBy        Int?
  closeLockedByUser    User?    @relation(fields: [closeLockedBy], references: [id])
  closeLockedAt        DateTime?
  closeLockedExpires   DateTime?
  
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

enum VehicleRepairStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

**Índices**:
- `vehicleId` + `status` (reparações abertas por carro)
- `fromStationId` (reparações abertas na estação)

---

## 🚚 Tabela: `VehicleTransfer`

**Propósito**: Transferências de carros entre estações

```prisma
model VehicleTransfer {
  id                    String   @id @default(nanoid(12))
  status                TransferStatus // PENDING, IN_TRANSIT, ARRIVED, CANCELLED
  
  vehicleId             Int
  vehicle               Vehicle  @relation(fields: [vehicleId], references: [id])
  
  fromStationId         String
  toStationId           String
  
  kmWhenTransferred     Int
  kmWhenArrived         Int?
  
  estimatedDeliveryDate DateTime
  arrivedAt             DateTime?
  observations          String?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum TransferStatus {
  PENDING
  IN_TRANSIT
  ARRIVED
  CANCELLED
}
```

---

## 🔒 Tabela: `RecordLock`

**Propósito**: Sincronização de edições concorrentes

```prisma
model RecordLock {
  id              String   @id @default(nanoid(12))
  
  recordType      String   // "CONTRACT", "RESERVATION", "VEHICLE", etc
  recordId        String   // ID do registo bloqueado
  
  mode            LockMode // EXCLUSIVE (editar), VIEW (ler)
  
  lockedByUserId  Int
  lockedByUser    User     @relation("LockedByUser", fields: [lockedByUserId], references: [id])
  
  lockedAt        DateTime @default(now())
  expiresAt       DateTime // 5 minutos
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum LockMode {
  EXCLUSIVE  // 1 user pode editar
  VIEW       // múltiplos users podem ler
}
```

**Índice Único**:
```sql
UNIQUE(recordType, recordId, mode) WHERE status = 'active'
```

---

## 📊 Relações Visualmente

```
┌─────────────────────────────────────────────────┐
│ User                                            │
│ ├─ 1:N Reservation (userId)                    │
│ ├─ 1:N Contract (userId)                        │
│ └─ 1:N RecordLock (lockedByUserId)              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Vehicle                                         │
│ ├─ 1:N Reservation (vehicleId)                 │
│ ├─ 1:N Contract (vehicleId)                     │
│ ├─ 1:N VehicleRepair (vehicleId)               │
│ ├─ 1:N VehicleTransfer (vehicleId)             │
│ └─ N:1 VehicleType (typeId)                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Reservation                                     │
│ ├─ 1:1 Contract (reservationId)                │
│ └─ 1:N RecordLock                              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Contract                                        │
│ ├─ 1:N ContractExtra (contractId)              │
│ ├─ 1:N ContractDamage (contractId)             │
│ ├─ 1:N ContractDeposit (contractId)            │
│ ├─ 1:N Payment (contractId)                    │
│ └─ 1:N RecordLock                              │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Queries Comuns

### Carros disponíveis numa estação

```sql
SELECT v.* 
FROM vehicles v
WHERE v.current_station_id = 'LISBOA' 
  AND v.status = 'AVAILABLE'
  AND NOT EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.vehicle_id = v.id
      AND r.status = 'CONFIRMED'
      AND r.pickup_date <= NOW()
      AND r.dropoff_date >= NOW()
  );
```

### Carros em reparação por estação

```sql
SELECT v.license_plate, vr.reason, vr.created_at
FROM vehicle_repairs vr
JOIN vehicles v ON v.id = vr.vehicle_id
WHERE vr.from_station_id = 'PORTO'
  AND vr.status IN ('OPEN', 'IN_PROGRESS');
```

### Receita por mês

```sql
SELECT 
  DATE_TRUNC('month', c.created_at)::date as month,
  SUM(p.amount) as total_revenue,
  COUNT(DISTINCT c.id) as num_contracts
FROM contracts c
JOIN payments p ON p.contract_id = c.id
WHERE p.status = 'CONFIRMED'
GROUP BY DATE_TRUNC('month', c.created_at)
ORDER BY month DESC;
```

---

## 📈 Performance Índices Recomendados

```sql
-- Queries de disponibilidade
CREATE INDEX idx_vehicle_status_station 
  ON vehicles(status, current_station_id);

-- Queries de reservas por user
CREATE INDEX idx_reservation_user_date 
  ON reservations(user_id, pickup_date, dropoff_date);

-- Queries de pagamentos
CREATE INDEX idx_payment_contract_status 
  ON payments(contract_id, status);

-- Locks por recurso
CREATE INDEX idx_lock_resource 
  ON record_locks(record_type, record_id, expires_at);

-- Reparações abertas
CREATE INDEX idx_repair_status_station 
  ON vehicle_repairs(status, from_station_id);
```

---

**Versão Schema**: 1.0  
**Última Migração**: 20260216203855  
**Managed by**: Prisma ORM
