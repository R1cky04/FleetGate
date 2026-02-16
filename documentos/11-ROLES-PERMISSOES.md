# 11 - Roles, Permissões e Controle de Acesso (Avançado)

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

## 👥 Sistema de Permissões Detalhado

### 5 Roles Principais

#### 1. **CLIENT**
Pessoa que aluga carros.

**Permissões**:
- ✅ Ver carros disponíveis (sua estação)
- ✅ Fazer reservas
- ✅ Ver suas reservas e contratos
- ❌ Editar/criar contratos
- ❌ Processar pagamentos
- ❌ Acesso à admin

**Endpoints Permitidos**:
```
GET /vehicles/station/{stationId}
POST /reservations
GET /reservations/{id}
PATCH /reservations/{id}/confirm
GET /contracts/{id}
```

---

#### 2. **STAFF**
Funcionário de estação. Executa operações do dia-a-dia.

**Permissões**:
- ✅ TUDO que CLIENT vê
- ✅ Criar contratos (de reservas)
- ✅ Adicionar extras ao contrato
- ✅ Processar devoluções (return)
- ✅ Processar pagamentos
- ✅ Abrir/fechar reparações
- ✅ Geo-lock: apenas estação de atribuição
- ❌ Ver dados de outras estações
- ❌ Criar/editar usuários
- ❌ Rotas administrativas

**Endpoints Permitidos**:
```
POST /contracts
PATCH /contracts/{id}/add-extra
POST /contracts/{id}/return
POST /payments
POST /vehicle-repairs/open
PATCH /vehicle-repairs/{id}/close
```

**Geo-Lock em Ação**:
```bash
# STAFF user de LISBOA tenta listar carros de PORTO
curl -X GET http://localhost:3000/vehicles/station/PORTO \
  -H "Authorization: Bearer {staff_token}"

# Response: 403 Forbidden
# "Access denied. You belong to station LISBOA"
```

---

#### 3. **FLEET**
Gestor de frota. Gerencia inventário de carros e transferências.

**Permissões**:
- ✅ Ver TODOS carros (multi-estação)
- ✅ CRUD vehicles
- ✅ Solicitar transferências
- ✅ Ver status de reparações
- ✅ Gerar relatórios de frota
- ❌ Editar contratos
- ❌ Processar pagamentos
- ❌ Criar usuários

**Endpoints Permitidos**:
```
GET /vehicles (sem restrição de estação)
POST /vehicles
PATCH /vehicles/{id}
DELETE /vehicles/{id}
GET /vehicle-transfers
POST /vehicle-transfers/initiate
GET /vehicle-repairs?status=OPEN
GET /reports/fleet
```

---

#### 4. **ADMIN**
Gestor de operações. Acesso total à aplicação.

**Permissões**:
- ✅ TUDO (sem exceções)
- ✅ Criar/editar usuários
- ✅ Atribuir roles
- ✅ Forçar fechar locks
- ✅ Ver métricas do sistema
- ✅ Gestão de estações
- ✅ Cancelar operações
- ✅ Auditar ações

**Endpoints Privilegiados**:
```
POST /users
PATCH /users/{id}
DELETE /users/{id}
DELETE /locks/{id} (force unlock)
GET /metrics
POST /stations
GET /audit-log
```

---

#### 5. **IT**
Administrador de sistema. Manutenção técnica.

**Permissões**:
- ✅ Acesso a sistema
- ✅ Manutenção database
- ✅ Backups
- ✅ Config do sistema
- ✅ Logs e debugging
- ❌ Operações de negócio (contratos, etc)

**Endpoints IT**:
```
GET /system-config
PATCH /system-config
GET /logs
POST /backup
GET /health/detailed
```

---

## 🔐 Matriz de Permissões (Access Matrix)

| Feature | CLIENT | STAFF | FLEET | ADMIN | IT |
|---------|--------|-------|-------|-------|-----|
| **Reservations** | | | | | |
| Create | ✅ | ✅ | | ✅ | |
| View Own | ✅ | ✅ | | ✅ | |
| View All | | | | ✅ | |
| **Contracts** | | | | | |
| Create | | ✅ | | ✅ | |
| View | ✅ | ✅ | | ✅ | |
| Add Extras | | ✅ | | ✅ | |
| Return Vehicle | | ✅ | | ✅ | |
| **Payments** | | | | | |
| Process | | ✅ | ⚠️ | ✅ | |
| View Own | ✅ | | | ✅ | |
| View All | | | | ✅ | |
| **Vehicles** | | | | | |
| View (Own Station) | ✅ | ✅ | | | |
| View All | | | ✅ | ✅ | |
| Create | | | ✅ | ✅ | |
| Edit | | | ✅ | ✅ | |
| **Repairs** | | | | | |
| Open | | ✅ | ✅ | ✅ | |
| Close | | ✅ | ✅ | ✅ | |
| View | | ✅ | ✅ | ✅ | |
| **Transfers** | | | | | |
| Create | | | ✅ | ✅ | |
| Complete | | ✅ | ✅ | ✅ | |
| **Users** | | | | | |
| Create | | | | ✅ | ✅ |
| Edit | | | | ✅ | ✅ |
| View All | | | | ✅ | ✅ |
| **System** | | | | | |
| Config | | | | ✅ | ✅ |
| Logs/Audit | | | | ✅ | ✅ |
| Backups | | | | | ✅ |

⚠️ = FLEET pode processar apenas se estiver em seu próprio station

---

## 🎯 Scenários de Controle de Acesso

### Scenario 1: CLIENT tenta editar contrato

```typescript
// client token passado para editar contrato
@RequiredLock()  // Decorator que cria lock
@UseGuards(JwtAuthGuard)
@Patch('contracts/:id/add-extra')
async addExtra(
  @Param('id') contractId: string,
  @CurrentUser() user: JwtUser,  // CLIENT role
  @Body() dto: AddExtraDto
) {
  // Guard 1: Verifica JWT ✅
  // Guard 2: Verifica role - CLIENT não pode ✅ BLOQUEADO
  // Return: 403 - Insufficient permissions
}
```

**Response**:
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required role: STAFF",
  "requiredRole": "STAFF",
  "userRole": "CLIENT"
}
```

---

### Scenario 2: STAFF de LISBOA tenta ver carro de PORTO

```typescript
@UseGuards(JwtAuthGuard, StationIsolationGuard)
@Get('vehicles/station/:stationId')
async listByStation(
  @Param('stationId') stationId: string,
  @CurrentUser() user: JwtUser,  // stationId: "LISBOA"
) {
  // Guard 1: JWT ✅
  // Guard 2: Station Isolation → LISBOA ≠ PORTO ✅ BLOQUEADO
  // Return: 403 - Cross-station access denied
}
```

**Response**:
```json
{
  "statusCode": 403,
  "message": "Station access denied",
  "yourStation": "LISBOA",
  "requestedStation": "PORTO",
  "solution": "Contact admin or FLEET role to access other stations"
}
```

---

### Scenario 3: FLEET processa pagamento (permitido?)

```typescript
@RequiredRole('STAFF', 'ADMIN')  // FLEET não incluído
@Post('payments')
async processPayment(
  @CurrentUser() user: JwtUser,  // role: "FLEET"
  @Body() dto: PaymentDto
) {
  // Guard: JwtAuthGuard ✅
  // Guard: Role check → FLEET não está em ['STAFF', 'ADMIN'] ✅ BLOQUEADO
  // Return: 403 - Role not permitted
}
```

**Response**:
```json
{
  "statusCode": 403,
  "message": "Role not permitted for this operation",
  "requiredRoles": ["STAFF", "ADMIN"],
  "userRole": "FLEET"
}
```

---

### Scenario 4: ADMIN pode fazer tudo

```typescript
@Post('/users')
@RequiredRole('ADMIN', 'IT')
async createUser(
  @CurrentUser() user: JwtUser,  // role: "ADMIN"
  @Body() dto: CreateUserDto
) {
  // Guard: JwtAuthGuard ✅ ADMIN
  // Guard: Role check → ADMIN ✈️ CHECK ✅
  // Guard: Station isolation → ADMIN sem restrição ✅
  // Proceed to crear user
  return { id: 5, email: "novo@empresa.com", role: "STAFF" };
}
```

---

## 🔒 Lock System Detalhado

### Lock Types

#### EXCLUSIVE Lock (para editar)
```typescript
@RequiredLock('EXCLUSIVE')
@Patch('contracts/:id/add-extra')
async addExtra(
  @LockInfo() lock: LockData,  // Informação do lock
  @CurrentUser() user: JwtUser
) {
  // Apenas 1 user pode ter EXCLUSIVE lock
  // Lock dura 5 minutos (renovável)
  // Outro user vê: 423 Locked
}
```

#### VIEW Lock (para ler)
```typescript
@ViewLock()  // Múltiplos users podem ter VIEW locks
@Get('contracts/:id')
async getContract(@Param('id') id: string) {
  // Múltiplos users conseguem ver simultaneamente
  // Não bloqueia EXCLUSIVE locks
}
```

---

## ⏰ Lock Lifecycle

```
┌──────────────────────────────────────────────────────┐
│ User A tenta editar CONTRACT 001                    │
└──────────────────────────────────────────────────────┘
                         │
            ACQUIRE LOCK (se não existir)
                         │
                ┌────────┴────────┐
                │                 │
         LOCK EXISTS         LOCK CRIADO
                │                 │
            BLOQUEADO         5 MINUTOS
             (423)            (expiresAt)
                │                 │
                │         ┌───────┴────────┐
                │         │                │
                │    HEARTBEAT          EXPIRADO
                │    (RENEW)         (auto-remover)
                │         │                │
                │         └────────┬───────┘
                │                  │
                └──────────────────┴──→ RELEASE
```

---

## 🛡️ Exemplo Completo: Role-Based Endpoint

```typescript
// src/contracts/contracts.controller.ts

@Controller('contracts')
export class ContractsController {
  
  @Post()
  @RequiredRole('STAFF', 'ADMIN')  // Quem pode chamar
  @UseGuards(JwtAuthGuard, StationIsolationGuard)
  async createContract(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateContractDto,
    @LockInfo() lock: LockData
  ) {
    // 1. JwtAuthGuard: Valida token
    // 2. StationIsolationGuard: Verifica user.stationId == reserva.stationId
    // 3. @RequiredRole: Valida user.role está em ['STAFF', 'ADMIN']
    // 4. RecordLockInterceptor: Cria EXCLUSIVE lock
    
    return await this.contractsService.create(dto, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, StationIsolationGuard)
  @ViewLock()  // Múltiplos users podem ler
  async getContract(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser
  ) {
    // 1. JwtAuthGuard: Token ✓
    // 2. StationIsolationGuard: Estação do user ✓
    // 3. @ViewLock: Cria VIEW lock (não-exclusivo)
    
    return await this.contractsService.findById(id);
  }

  @Patch(':id/add-extra')
  @RequiredRole('STAFF', 'ADMIN')
  @RequiredLock()  // EXCLUSIVE
  @UseGuards(JwtAuthGuard, StationIsolationGuard)
  async addExtra(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: AddExtraDto,
    @LockInfo() lock: LockData
  ) {
    // Valida todo: JWT + Station + Role + Lock
    
    if (lock.userId !== user.id) {
      throw new BadRequestException('Lock owned by another user');
    }
    
    // Ao fim da operação, lock libertar-se-á automaticamente
    return await this.contractsService.addExtra(id, dto);
  }
}
```

---

## 🔑 JWT Token Anatomy

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "1",
    "id": 1,
    "email": "joao@empresa.com",
    "name": "João Silva",
    "roles": ["CLIENT"],
    "stationId": "LISBOA",
    "iat": 1676512200,
    "exp": 1676598600
  },
  "signature": "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
}
```

---

## 📊 Auditoria de Permissões

Cada action logged automaticamente:

```Log
2026-02-16T10:32:15Z [CREATE_CONTRACT] user:5 (STAFF) contract:CNT-2026-0001 station:LISBOA ✅
2026-02-16T10:33:22Z [ADD_EXTRA] user:5 (STAFF) contract:CNT-2026-0001 ✅
2026-02-16T10:34:45Z [EDIT_ATTEMPT] user:10 (CLIENT) contract:CNT-2026-0001 ❌ PERMISSION_DENIED
2026-02-16T10:35:00Z [STATION_VIOLATION] user:8 (STAFF/PORTO) vehicles/station/LISBOA ❌ BLOCKED
```

---

**Versão**: 1.0.0  
**Última Atualização**: Fevereiro 2026
