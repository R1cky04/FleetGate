# 01 - Arquitetura Técnica

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

---

## 🏗️ Stack Tecnológico

### Backend
- **NestJS 11.0.1** - Framework Node.js robusto e modular
- **PostgreSQL 14+** - Base de dados relacional
- **Prisma 5.22.0** - ORM moderno com type-safety
- **JWT** - Autenticação stateless
- **Passport.js** - Estratégias de autenticação
- **Helmet** - Headers de segurança HTTP
- **Class-Validator** - Validação de dados
- **Swagger/OpenAPI** - Documentação automática

### Cache & Sessions
- **Redis** - Cache distribuído
- **@nestjs/cache-manager** - Gerenciador de cache com TTL

### Monitoramento
- **Prometheus** - Métricas do sistema
- **Winston** - Logging estruturado

### Segurança
- **bcryptjs** - Hashing de passwords
- **@nestjs/throttler** - Rate limiting
- **cors** - Cross-origin requests

---

## 📁 Estrutura de Pastas

```
FleetGate/
├── backend/                          # Código servidor
│   ├── src/
│   │   ├── main.ts                  # Entry point
│   │   ├── app.module.ts            # Root module
│   │   ├── app.controller.ts        # Health check
│   │   ├── prisma.service.ts        # Serviço Prisma
│   │   ├── prisma.module.ts         # Módulo Prisma
│   │   │
│   │   ├── auth/                    # Autenticação
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── types.ts             # JwtUser interface
│   │   │
│   │   ├── shared/                  # Lógica partilhada
│   │   │   ├── shared.module.ts     # Exporta serviços comuns
│   │   │   ├── services/
│   │   │   │   ├── record-lock.service.ts      # Locks
│   │   │   │   └── vehicle-validation.service.ts # Validações
│   │   │   ├── guards/
│   │   │   │   └── station-isolation.guard.ts  # Isolamento
│   │   │   ├── interceptors/
│   │   │   │   ├── record-lock.interceptor.ts  # Lock validation
│   │   │   │   └── validate-vehicle-not-in-repair.interceptor.ts
│   │   │   ├── controllers/
│   │   │   │   └── locks.controller.ts         # REST API locks
│   │   │   └── decorators/
│   │   │       ├── lock-mode.decorator.ts      # @ViewLock, @RequiredLock
│   │   │       └── lock-info.decorator.ts       # Context extraction
│   │   │
│   │   ├── users/                   # Gestão de utilizadores
│   │   ├── stations/                # Gestão de estações
│   │   ├── vehicles/                # Gestão de veículos
│   │   ├── contracts/               # Aluguel de veículos
│   │   ├── reservations/            # Reservações
│   │   ├── payments/                # Pagamentos
│   │   ├── vehicle-transfers/       # Transferências
│   │   ├── vehicle-repairs/         # Reparações
│   │   ├── system-config/           # Configurações globais
│   │   ├── broker-api/              # API parceiros (opcional)
│   │   ├── metrics/                 # Prometheus metrics
│   │   └── notifications/           # Email/SMS (opcional)
│   │
│   ├── prisma/
│   │   ├── schema.prisma            # Definição da BD
│   │   ├── seed.ts                  # Dados iniciais
│   │   └── migrations/              # Histórico de mudanças
│   │
│   ├── test/                        # Testes
│   │   ├── app.e2e-spec.ts
│   │   ├── jest-e2e.json
│   │   └── jest-integration.json
│   │
│   ├── package.json                 # Dependências
│   ├── tsconfig.json                # TypeScript config
│   ├── tsconfig.build.json          # Build config
│   ├── eslint.config.mjs            # Linting
│   ├── nest-cli.json                # NestJS config
│   ├── .env.example                 # Template variáveis
│   └── .env                         # Variáveis locais
│
├── documentos/                      # Documentação
│   ├── README.md
│   ├── 01-VISAO-GERAL.md
│   ├── 02-AUTENTICACAO-AUTORIZACAO.md
│   └── ... (16 ficheiros)
│
├── docker-compose.yml               # Services (PostgreSQL, Redis)
├── docker-compose.dev.yml           # Dev setup
├── prometheus.yml                   # Configuração Prometheus
└── README.md                        # Guia rápido
```

---

## 🔄 Fluxo de Requisição

```
1. Client → HTTP Request
   │
2. Middleware (CORS, Helmet, Logging)
   │
3. Router → Identifica controller
   │
4. JWT Guard → Valida token e extrai User
   │
5. Station Isolation Guard → Valida acesso à estação
   │
6. Interceptor → PRE-processing (validação)
   │
7. Controller Method → Lógica de negócio
   │   └─ Service → Acessa database
   │
8. Interceptor → POST-processing (locks, caching)
   │
9. Response → Serializa para JSON
   │
10. Client← HTTP Response (200, 404, 409, etc)
```

---

## 🗄️ Banco de Dados

### Modelos Principais

```
User (Utilizadores)
├─ id (int)
├─ email (string, unique)
├─ password (string, hashed)
├─ fullName (string)
├─ role (enum: CLIENT, STAFF, FLEET, ADMIN, IT)
├─ status (enum: ACTIVE, INACTIVE, SUSPENDED)
├─ stationId (foreign key → Station)
└─ ... (20+ campos)

Station (Estações)
├─ id (uuid)
├─ code (string, unique)
├─ name (string)
├─ address (string)
├─ isActive (boolean)
└─ ... (15+ campos)

Vehicle (Veículos)
├─ id (int)
├─ licensePlate (string, unique)
├─ vin (string, unique)
├─ make, model, year (string, int)
├─ status (enum: AVAILABLE, RENTED, IN_REPAIR, etc)
├─ stationId (foreign key → Station)
├─ groupId (foreign key → VehicleGroup)
├─ currentKm, lastServiceKm (int)
└─ ... (20+ campos)

Contract (Contratos)
├─ id (int)
├─ number (string, unique)
├─ clientId (foreign key → User)
├─ vehicleId (foreign key → Vehicle)
├─ pickupDate, returnDate (datetime)
├─ status (enum: DRAFT, ACTIVE, COMPLETED, CANCELLED)
├─ totalPrice, paidAmount (float)
├─ lockedBy, lockedAt, lockedExpires (para edição exclusiva)
└─ ... (25+ campos)

Reservation (Reservações)
├─ id (int)
├─ number (string, unique)
├─ clientId (foreign key → User)
├─ vehicleGroupId (foreign key → VehicleGroup)
├─ pickupDate, returnDate (datetime)
├─ status (enum: PENDING, CONFIRMED, ACTIVE, COMPLETED)
├─ dailyRate (float)
└─ ... (15+ campos)

Payment (Pagamentos)
├─ id (int)
├─ contractId (foreign key → Contract)
├─ amount (float)
├─ method (enum: CARD, TRANSFER, MB_WAY, etc)
├─ status (enum: PENDING, PAID, FAILED, REFUNDED)
├─ transactionId (string)
└─ ... (10+ campos)

VehicleRepair (Reparações)
├─ id (uuid)
├─ repairNumber (string, unique)
├─ vehicleId (foreign key → Vehicle)
├─ status (enum: OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
├─ fromStationId → Station (onde abriu)
├─ closedAtStationId → Station (onde fechou)
├─ lockedBy, lockedAt, lockedExpires (para edição exclusiva)
├─ estimatedCost, actualCost (float)
└─ ... (18+ campos)

RecordLock (Locks de Edição)
├─ id (uuid)
├─ entityType (string: "Contract", "Reservation", "Vehicle")
├─ entityId (string)
├─ lockedBy (foreign key → User)
├─ stationId (foreign key → Station)
├─ acquiredAt, expiresAt (datetime)
├─ action (string: "edit", "preview")
└─ isActive (boolean)

VehicleTransfer (Transferências)
├─ id (uuid)
├─ vehicleId (foreign key → Vehicle)
├─ fromStationId, toStationId (foreign keys)
├─ status (enum: PENDING, IN_TRANSIT, COMPLETED, CANCELLED)
├─ driverId (foreign key → User)
└─ ... (15+ campos)

RecordLog (Auditoria)
├─ id (uuid)
├─ userId (foreign key → User)
├─ action (string: "user.created", "contract.completed")
├─ entityType, entityId (string)
├─ details (JSON)
├─ createdAt (datetime)
└─ ipAddress, userAgent (string)
```

### Índices Importantes
```sql
-- Rápida filtragem por estação
CREATE INDEX idx_user_station ON "User"("stationId");
CREATE INDEX idx_vehicle_station ON "Vehicle"("stationId");
CREATE INDEX idx_contract_station ON "Contract"("pickupStationId");

-- Rápida busca por status
CREATE INDEX idx_vehicle_status ON "Vehicle"("status");
CREATE INDEX idx_contract_status ON "Contract"("status");
CREATE INDEX idx_repair_status ON "VehicleRepair"("status");

-- Locks e expiração
CREATE INDEX idx_lock_expires ON "RecordLock"("expiresAt");
CREATE UNIQUE INDEX unique_lock_per_entity ON "RecordLock"(
  "entityType", "entityId", "stationId"
);
```

---

## 🔐 Fluxo de Autenticação

```
1. Client faz login: POST /auth/login
   {
     "email": "user@example.com",
     "password": "123456"
   }
   ↓
2. Backend valida credentials
   - Procura User por email
   - Compara password com hash
   ↓
3. Se válido, gera JWT token
   {
     "id": 5,
     "email": "user@example.com",
     "role": "STAFF",
     "stationId": "LISBON_CENTER",
     "iat": 1708183200,
     "exp": 1708269600    // 24 horas
   }
   ↓
4. Client recebe token e armazena em localStorage
   ↓
5. Client inclui token em todas requisições:
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   ↓
6. Backend valida token:
   - Verifica assinatura
   - Verifica expiração
   - Extrai User info
   ↓
7. Se válido, passa JWT payload para controller
   ↓
8. Controller acessa User info via @CurrentUser() decorator
```

---

## 🔒 Isolamento de Dados (Multi-Tenancy)

```
Objetivo: Cada estação só vê seus dados

Implementação:
1. StationIsolationGuard valida request
   - Extrai stationId do User
   - Valida que User pode ver essa estação
   ↓
2. Nas queries, filtro automático por stationId
   ```typescript
   // Controllers recebem automaticamente
   const { stationId } = user;  // Do JWT
   
   // Query é automaticamente filtrada
   const records = await prisma.contract.findMany({
     where: { pickupStationId: stationId }
   });
   ```
   ↓
3. IT admin tem bypass automático
   - if (user.role === 'IT') → vê tudo
```

---

## 🔄 Sistema de Locks (Record Locking)

```
Objetivo: Evitar conflitos de edição simultânea

Implementação:
1. GET request (visualizar)
   - Carrega RecordLock se existir
   - Retorna no response _lockInfo:
   {
     "id": 123,
     "status": "active",
     "_lockInfo": {
       "isLocked": true,
       "lockedBy": 5,
       "lockedByName": "João Silva",
       "expiresAt": "2025-02-16T16:05:00Z"
     }
   }
   
2. POST /locks/acquire-edit (adquirir lock)
   - Verifica se há lock ativo
   - Se sim e é outro user → Error 409
   - Se não → Cria RecordLock com expiração
   
3. PUT/PATCH request (editar)
   - RecordLockInterceptor valida
   - Só permite se User tem lock ativo
   - Se outro User tem lock → Error 409: "João is editing"
   
4. DELETE /locks/release (liberar lock)
   - Remove RecordLock
   - Permite que outro User edite
   
5. Locks expiram automaticamente
   - Cron job a cada 5 minutos
   - Ou manual cleanup via API
```

---

## 📊 Módulos e Dependências

```
AppModule (Root)
├── PrismaModule               (DB access)
├── AuthModule                 (JWT strategy, guards)
├── SharedModule               (Locks, validation)
│   └── PrismaModule
├── UsersModule                (CRUD users)
│   └── SharedModule
├── StationsModule             (CRUD stations)
│   └── SharedModule
├── VehiclesModule             (CRUD vehicles)
│   └── SharedModule
├── ContractsModule            (Aluguel)
│   └── SharedModule + VehiclesModule
├── ReservationsModule         (Reservações)
│   └── SharedModule + VehiclesModule
├── PaymentsModule             (Pagamentos)
│   └── SharedModule + ContractsModule
├── VehicleTransfersModule    (Transferências)
│   └── SharedModule
├── VehicleRepairsModule      (Reparações)
│   └── SharedModule
├── MetricsModule              (Prometheus)
│   └── PrismaModule
├── SystemConfigModule         (Settings globais)
│   └── SharedModule
└── BrokerApiModule            (API parceiros)
    └── SharedModule
```

---

## 🚀 Deploy

### Development
```bash
npm install
npm run prisma:generate
npm run dev              # Hot reload
```

### Production
```bash
npm install --production
npm run build
npm run prisma:migrate deploy
npm run start
```

### Docker
```bash
docker-compose -f docker-compose.yml up -d
# ou
docker-compose -f docker-compose.dev.yml up -d
```

---

## 📈 Escalabilidade

### Horizontal
- API stateless (JWT tokens)
- Load balancer pode distribuir requisições
- Redis centralizado para cache

### Vertical
- Índices de base de dados otimizados
- Caching de queries frequentes
- Paginação obrigatória em listas

### Futuros
- Replicação de base de dados (read replicas)
- Message queue para jobs async
- Elasticsearch para buscas complexas

