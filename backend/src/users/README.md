# 👥 Módulo de Usuários - FleetGate

## 📋 Visão Geral

O módulo de usuários implementa um sistema completo de gestão de utilizadores com 5 níveis de acesso hierárquicos, cada um com permissões específicas para operações de rent-a-car.

---

## 🎭 Tipos de Usuários

### 1. **CLIENT** (Cliente)
- ✅ Apenas ficha cadastral
- ❌ **SEM LOGIN** - não possui email/password
- 📝 Usado para armazenar dados de clientes em contratos/reservas
- 📄 Requer: documentos (carteira, ID)

### 2. **FLEET** (Gestor de Frota)
- 🚗 Gere veículos e manutenções
- 📊 Visualiza disponibilidade
- 🔧 Agenda manutenções
- ✅ Login obrigatório
- 🏢 Associado a uma estação

### 3. **STAFF** (Funcionário)
- 📋 **Herda permissões FLEET**
- ✍️ Cria contratos e reservas
- 🚀 Check-out e check-in de veículos
- 💰 Processa pagamentos
- 📝 Devolução e cálculo de extras
- ✅ Login obrigatório
- 🏢 Associado a uma estação

### 4. **ADMIN** (Gerente de Estação)
- 👑 **Herda permissões STAFF + FLEET**
- 👥 Move staff entre estações
- 🔑 Concede permissões especiais
- 🚗 Aprova upgrades de veículos
- 📊 Acesso a relatórios financeiros
- 🏢 Gere sua estação
- ✅ Login obrigatório

### 5. **IT** (Super Admin)
- 🌟 **TODAS AS PERMISSÕES**
- 🏢 Cria e gere estações
- 🚗 Cria grupos de veículos
- ⚙️ Configurações do sistema
- 💾 Backups e logs
- 👥 Gere todos os usuários

---

## 🔐 Sistema de Permissões

### Hierarquia de Roles
```
IT
 ├─ ADMIN
 │   ├─ STAFF
 │   │   ├─ FLEET
 │   │   │   └─ CLIENT
```

### Permissões por Categoria

#### 🚗 Vehicles
- `vehicle.view` - Visualizar veículos
- `vehicle.create` - Criar veículos
- `vehicle.update` - Atualizar veículos
- `vehicle.delete` - Deletar veículos
- `vehicle.upgrade` - Aprovar upgrades
- `vehicle.maintenance` - Agendar manutenções

#### 📅 Reservations
- `reservation.view` - Visualizar reservas
- `reservation.create` - Criar reservas
- `reservation.update` - Atualizar reservas
- `reservation.cancel` - Cancelar reservas
- `reservation.confirm` - Confirmar reservas

#### 📋 Contracts
- `contract.view` - Visualizar contratos
- `contract.create` - Criar contratos
- `contract.update` - Atualizar contratos
- `contract.checkout` - Check-out veículos
- `contract.checkin` - Check-in veículos
- `contract.cancel` - Cancelar contratos

#### 💰 Payments
- `payment.view` - Visualizar pagamentos
- `payment.process` - Processar pagamentos
- `payment.refund` - Processar reembolsos

#### 👥 Users & Staff
- `user.view` - Visualizar usuários
- `user.create` - Criar usuários
- `user.update` - Atualizar usuários
- `user.delete` - Deletar usuários
- `user.manage_permissions` - Gerir permissões
- `staff.move` - Mover staff entre estações

#### 🏢 Stations
- `station.view` - Visualizar estações
- `station.create` - Criar estações
- `station.update` - Atualizar estações
- `station.manage` - Gerir estações

---

## 🛠️ API Endpoints

### Users

#### `POST /users`
Criar novo usuário
```json
{
  "role": "STAFF",
  "email": "joao@fleetgate.com",
  "password": "senha123",
  "firstName": "João",
  "lastName": "Silva",
  "phone": "912345678",
  "stationId": "uuid-estacao"
}
```

#### `GET /users`
Listar usuários (com filtros)
```
GET /users?role=STAFF&stationId=uuid&search=joão
```

#### `GET /users/:id`
Buscar usuário por ID

#### `PATCH /users/:id`
Atualizar usuário

#### `DELETE /users/:id`
Deletar usuário (soft delete - marca como INACTIVE)

---

### Permissions

#### `POST /users/permissions/grant`
Conceder permissões a um usuário
```json
{
  "userId": "uuid",
  "permissions": ["vehicle.upgrade", "report.financial"],
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

#### `POST /users/permissions/revoke`
Revogar permissões
```json
{
  "userId": "uuid",
  "permissions": ["vehicle.upgrade"]
}
```

#### `GET /users/:id/permissions`
Listar permissões de um usuário

---

### Staff Management

#### `POST /users/staff/move`
Mover staff para outra estação
```json
{
  "userId": "uuid-staff",
  "newStationId": "uuid-nova-estacao",
  "reason": "Transferência por necessidade operacional"
}
```

#### `GET /users/station/:stationId/staff`
Listar staff de uma estação

---

## 🗄️ Schema do Banco de Dados

### Tabela: `User`
```prisma
- id: UUID
- email: String? (único, opcional para CLIENT)
- password: String? (hash bcrypt)
- role: UserRole (enum)
- status: UserStatus (enum)
- firstName, lastName, fullName
- phone, cpf, nif
- Documentos: licenseNumber, idCardNumber
- Endereço: address, city, postalCode
- Profissional: employeeNumber, stationId, departmentId
- Timestamps: createdAt, updatedAt, lastLoginAt
```

### Tabela: `UserPermission`
```prisma
- id: UUID
- userId: UUID (FK)
- permission: String
- grantedBy: String
- grantedAt: DateTime
- expiresAt: DateTime? (opcional)
- isActive: Boolean
```

### Tabela: `ActivityLog`
```prisma
- id: UUID
- userId: UUID (FK)
- action: String (e.g., "user.created")
- entityType: String (User, Contract, etc.)
- entityId: String
- details: JSON
- ipAddress, userAgent
- createdAt: DateTime
```

---

## 🔒 Guardas e Decorators

### `@Roles(...roles)`
Restringe acesso por role
```typescript
@Roles(UserRole.ADMIN, UserRole.IT)
@Get('sensitive-data')
getSensitiveData() {}
```

### `@RequirePermissions(...permissions)`
Restringe acesso por permissões específicas
```typescript
@RequirePermissions(Permission.VEHICLE_UPGRADE, Permission.STATION_MANAGE)
@Post('upgrade')
upgradeVehicle() {}
```

### `@CurrentUser()`
Obtém usuário atual do request
```typescript
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

---

## 🎯 Casos de Uso

### 1. Cliente aluga veículo
1. **STAFF** cria ficha de **CLIENT** (sem login)
2. **STAFF** cria reserva vinculada ao cliente
3. No check-out, **STAFF** cria contrato
4. **STAFF** processa pagamento do depósito
5. No check-in, **STAFF** calcula extras
6. **STAFF** processa pagamento final

### 2. Admin move funcionário
1. **ADMIN** acessa listagem de staff
2. Seleciona funcionário e nova estação
3. Sistema valida permissões
4. Move funcionário e loga atividade

### 3. IT cria nova estação
1. **IT** cria nova estação
2. **IT** cria usuários **ADMIN** para a estação
3. **ADMIN** cria **STAFF** e **FLEET**
4. **FLEET** adiciona veículos

### 4. Upgrade de veículo
1. **STAFF** solicita upgrade para cliente
2. **ADMIN** com permissão `vehicle.upgrade` aprova
3. Sistema atualiza contrato com novo valor
4. Cliente paga diferença

---

## ✅ Validações Implementadas

- ✔️ CLIENT não requer email/password
- ✔️ STAFF, FLEET, ADMIN, IT requerem email/password
- ✔️ STAFF, FLEET, ADMIN devem ter estação associada
- ✔️ Email único no sistema
- ✔️ CPF/NIF únicos
- ✔️ Senha com hash bcrypt (10 rounds)
- ✔️ Permissões expiram automaticamente
- ✔️ Hierarquia de roles respeitada
- ✔️ Logs de todas as atividades críticas

---

## 🚀 Próximos Passos

- [ ] Implementar autenticação JWT
- [ ] Adicionar módulo de autenticação (login/logout)
- [ ] Implementar refresh tokens
- [ ] Adicionar reset de senha
- [ ] Implementar 2FA para IT e ADMIN
- [ ] Criar testes unitários e E2E
- [ ] Adicionar filtros avançados e paginação
- [ ] Implementar exportação de relatórios

---

## 📚 Dependências Instaladas

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "@nestjs/mapped-types": "^2.0.5"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2"
  }
}
```

---

**Desenvolvido para FleetGate - Sistema profissional de gestão de frotas** 🚗✨
