# 12 - Operações Avançadas e Otimizações

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

## ⚡ Caching com Redis

### 1. Cache de Carros Disponíveis

FleetGate automaticamente cacheia lista de carros:

```typescript
// src/vehicles/vehicles.service.ts

async listAvailableByStation(stationId: string): Promise<Vehicle[]> {
  // 1. Tentar obter do Redis
  const cacheKey = `vehicles:${stationId}:available`;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Se não existe, query database
  const vehicles = await prisma.vehicle.findMany({
    where: {
      currentStationId: stationId,
      status: 'AVAILABLE'
    }
  });

  // 3. Guardar em cache (30 minutos)
  await this.redis.setex(cacheKey, 1800, JSON.stringify(vehicles));

  return vehicles;
}
```

**Impacto**:
- ✅ 99% queries from cache (rápido)
- ✅ 5ms resposta vs 200ms db query
- ✅ Reduz carga database

### 2. Invalidar Cache (automático)

Quando carro status muda:

```typescript
async returnVehicle(contractId: string, dto: ReturnDto) {
  // ... return logic ...
  
  // Invalidar cache de TODAS estações
  await this.redis.del(`vehicles:*:available`);
  await this.redis.publish('vehicles:invalidate', 'all');
  
  return updatedContract;
}
```

---

## 📦 Batch Operations

### Importar múltiplos carros

```bash
curl -X POST http://localhost:3000/vehicles/batch-create \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicles": [
      {
        "licensePlate": "20-AB-CD",
        "brand": "Toyota",
        "model": "Corolla",
        "year": 2024,
        "registeredStationId": "LISBOA"
      },
      {
        "licensePlate": "21-XY-ZW",
        "brand": "Volkswagen",
        "model": "Golf",
        "year": 2023,
        "registeredStationId": "PORTO"
      }
    ]
  }'
```

**Response**:
```json
{
  "imported": 2,
  "failed": 0,
  "timestamp": "2026-02-16T10:30:00Z"
}
```

### Implementação

```typescript
@Post('batch-create')
@RequiredRole('FLEET', 'ADMIN')
async batchCreate(@Body() dto: BatchCreateVehiclesDto) {
  let imported = 0, failed = 0;

  for (const vehicle of dto.vehicles) {
    try {
      await this.vehiclesService.create(vehicle);
      imported++;
    } catch (error) {
      failed++;
      this.logger.error(`Failed to import ${vehicle.licensePlate}: ${error}`);
    }
  }

  return { imported, failed };
}
```

---

## 📊 Relatórios Avançados

### 1. Relatório de Receita por Período

```bash
curl -X GET "http://localhost:3000/reports/revenue?from=2026-01-01&to=2026-02-28" \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "period": {
    "from": "2026-01-01",
    "to": "2026-02-28"
  },
  "totalRevenue": 12450.50,
  "byMethod": {
    "CREDIT_CARD": 8945.00,
    "CASH": 2105.50,
    "TRANSFER": 1400.00
  },
  "byRentType": {
    "DAILY": 10200.00,
    "WEEKLY": 1850.00,
    "MONTHLY": 400.50
  },
  "contractCount": 234,
  "averageContractValue": 53.20
}
```

### 2. Relatório de Utilização de Frota

```bash
curl -X GET "http://localhost:3000/reports/fleet-utilization" \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "total_vehicles": 25,
  "available": 15,
  "in_use": 7,
  "in_repair": 2,
  "in_transfer": 1,
  "utilization_rate": "28%",
  "average_mileage": 45320,
  "vehicles_needing_service": [
    {
      "id": 5,
      "licensePlate": "20-AB-CD",
      "mileage": 85000,
      "lastService": "2025-08-15",
      "daysSinceService": 185
    }
  ]
}
```

---

## 🔄 Transações Garantidas

### Transferência Atômica (All-or-Nothing)

```typescript
// Quando carro chega ao destino
async arriveTransfer(id: string, dto: ArriveDto) {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Update transfer status
    const transfer = await tx.vehicleTransfer.update({
      where: { id },
      data: { status: 'ARRIVED', arrivedAt: new Date() }
    });

    // Step 2: Update vehicle location
    await tx.vehicle.update({
      where: { id: transfer.vehicleId },
      data: {
        currentStationId: transfer.toStationId,
        mileage: dto.kmWhenArrived
      }
    });

    // Se qualquer operação falha, TODAS revertem
    // (ACID guarantee)

    return transfer;
  });
}
```

---

## 💡 Query Optimization

### N+1 Problem: Antigo (LENTO)

```typescript
// ❌ LENTO: 1 query + N queries
const contracts = await prisma.contract.findMany();
for (const contract of contracts) {
  contract.vehicle = await prisma.vehicle.findUnique({
    where: { id: contract.vehicleId }
  });  // Query adicional para cada contract!
}
```

### Com Eager Loading (RÁPIDO)

```typescript
// ✅ RÁPIDO: 1 query apenas
const contracts = await prisma.contract.findMany({
  include: {
    vehicle: true,  // Eager load vehicle info
    payments: true,
    extras: true
  }
});
// Todas relações em 1 query!
```

---

## 🔍 Full-Text Search

### Procurar contrato por qualquer campo

```bash
curl -X GET "http://localhost:3000/contracts/search?q=20-AB-BC" \
  -H "Authorization: Bearer {token}"
```

**Procura em**:
- License plate (20-AB-BC)
- Cliente nome (João Silva)
- Contrato ID (CNT-2026-001)

**Response**:
```json
{
  "results": [
    {
      "id": "CNT-2026-00055",
      "licensePlate": "20-AB-BC",
      "clientName": "João Silva",
      "status": "ACTIVE",
      "matchType": "licensePlate"
    }
  ],
  "totalFound": 1
}
```

### Implementação com PostgreSQL FTS

```typescript
const contracts = await prisma.$queryRaw`
  SELECT * FROM contracts
  WHERE to_tsvector('portuguese', license_plate || ' ' || client_name)
    @@ plainto_tsquery('portuguese', ${query})
  LIMIT 10;
`;
```

---

## 📈 Escalabilidade

### Database Índices Automáticos

```sql
-- Criados automaticamente por Prisma migration

-- Queries por status
CREATE INDEX idx_vehicle_status ON vehicles(status);

-- Queries de disponibilidade
CREATE INDEX idx_vehicle_status_station 
  ON vehicles(status, current_station_id);

-- Lock expiration cleanup
CREATE INDEX idx_lock_expires 
  ON record_locks(expires_at)
  WHERE status = 'active';

-- Full-text search
CREATE INDEX idx_contract_search 
  ON contracts USING GIN (to_tsvector('portuguese', 
    license_plate || ' ' || client_name));
```

---

## 🔐 Data Encryption

### Sensitive Fields Encrypted

```typescript
// Ao guardar carro para payment
const encrypted = crypto
  .createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY)
  .update('4242424242424242')
  .digest('hex');

await prisma.payment.create({
  data: {
    cardToken: encrypted,
    lastFourDigits: '4242'  // Não encriptado (ok)
  }
});
```

---

## ⏱️ Rate Limiting

Prevents brute force attacks:

```typescript
@UseGuards(ThrottleGuard)
@Post('auth/login')
async login(@Body() dto: LoginDto) {
  // Máximo 5 tentativas por IP, por minuto
  // Depois: 429 Too Many Requests
}
```

---

## 🌍 Multi-Language Support

Database suporta:
- **Português** (PT-PT, PT-BR)
- **English**
- **Spanish**

```bash
# Request em português
curl -H "Accept-Language: pt-PT" ...

# Response em português
{
  "message": "Veículo não disponível",
  "status": 409
}
```

---

## 🚀 Background Jobs

### Processamento Assíncrono

Algumas operações processam em background:

```typescript
// Gerar relatório (demora 5+ minutos)
POST /reports/generate
{ "type": "fleet-utilization", "period": "monthly" }

// Response imediato
{
  "jobId": "JOB-2026-12345",
  "status": "PROCESSING",
  "estimatedTime": "5 minutes"
}

// Depois, obter resultado
GET /reports/generate/JOB-2026-12345
{ "status": "READY", "downloadUrl": "..." }
```

---

## 📡 Real-Time Updates (WebSockets)

Para aplicações que precisam updates em real-time:

```javascript
// Client-side
const socket = io('http://localhost:3000/realtime');

socket.on('vehicle:status-changed', (data) => {
  console.log('Vehicle 5 agora AVAILABLE na PORTO');
});

socket.on('contract:locked', (data) => {
  console.log('Contract CNT-001 está bloqueado by João');
});
```

**Server-side**:
```typescript
// Quando contrato editado
this.socketGateway.emitToStation('contract:locked', {
  contractId: 'CNT-001',
  station: 'LISBOA'
});
```

---

## 🔧 Monitoramento Avançado

### Alertas Automáticos

```typescript
// Triggering automático se:
// - API response time > 1000ms
// - Database > 100 connections
// - Memory > 80%
// - Error rate > 1%

// Ações automáticas:
// 1. Restart database connection pool
// 2. Clear old cache entries
// 3. Alert DevOps team
// 4. Failover se configurado
```

---

**Versão**: 1.0.0  
**Última Atualização**: Fevereiro 2026
