# Sistema de Locks Multiutilizador

## 📋 Visão Geral

O FleetGate implementa um sistema sofisticado de locks exclusivos para contratos e reservas, permitindo múltiplos utilizadores visualizar simultaneamente sem bloquear a leitura, mas garantindo acesso exclusivo em modo EDIT.

## 🎯 Comportamento

### 1️⃣ Modo VIEW (Leitura) - Múltiplos Utilizadores
- ✅ Múltiplos utilizadores podem abrir o mesmo contrato
- ✅ Cada um vê quem está a editar (se alguém estiver)
- ✅ GET request não adquire lock exclusivo
- ✅ Resposta inclui `_lockInfo` com status do lock

**Exemplo Response:**
```json
{
  "id": 123,
  "number": "C-2025-001",
  "status": "active",
  "_lockInfo": {
    "isLocked": false,
    "lockedBy": null,
    "lockedByName": null,
    "lockedAt": null,
    "expiresAt": null
  }
}
```

### 2️⃣ Modo EDIT (Escrita) - Um Utilizador por Vez
- ✅ Apenas um utilizador pode estar em EDIT por vez
- ✅ Locks duram 5 minutos
- ✅ Se outro tenta editar, recebe erro com nome de quem está a editar
- ✅ PUT/PATCH requer lock exclusivo do utilizador

**Exemplo Erro (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "João da Silva is editing this contract"
}
```

## 🔌 API REST de Locks

### 1. Entrar em Modo EDIT
```bash
POST /locks/acquire-edit/:entityType/:entityId/:stationId
Authorization: Bearer JWT_TOKEN

# Example
POST /locks/acquire-edit/Contract/123/STATION_123
```

**Response:**
```json
{
  "id": "lock_uuid",
  "entityType": "Contract",
  "entityId": "123",
  "lockedBy": 5,
  "stationId": "STATION_123",
  "lockedAt": "2025-02-16T15:30:00Z",
  "expiresAt": "2025-02-16T15:35:00Z",
  "user": {
    "id": 5,
    "fullName": "João da Silva"
  }
}
```

### 2. Registar Visualização (Info Only)
```bash
POST /locks/acquire-view/:entityType/:entityId/:stationId
Authorization: Bearer JWT_TOKEN

# Apenas para UI saber se alguém está a editar
# Não adquire lock, apenas retorna status
```

### 3. Renovar Lock Ativo
```bash
PATCH /locks/renew/:entityType/:entityId/:stationId
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{
  "durationSeconds": 300  // opcional, padrão 300s (5 min)
}

# Útil para heartbeat enquanto utilizador continua a editar
# Estende expiração do lock
```

### 4. Liberar Lock (Sair de EDIT)
```bash
DELETE /locks/release/:entityType/:entityId/:stationId
Authorization: Bearer JWT_TOKEN

# Remove lock e liberta para outro utilizador editar
```

### 5. Verificar Status de Lock
```bash
GET /locks/check/:entityType/:entityId/:stationId

# Retorna info sobre quem está a editar (sem autenticação)
# Útil para UI mostrar avisos em tempo real
```

**Response:**
```json
{
  "isLocked": true,
  "lockedBy": 5,
  "lockedByName": "João da Silva",
  "lockedAt": "2025-02-16T15:30:00Z",
  "expiresAt": "2025-02-16T15:35:00Z"
}
```

## 🔄 Fluxo Típico - Frontend

### Abrir Contrato para Visualização
```javascript
// 1. GET contract data
const contract = await fetch('/contracts/123', {
  headers: { 'Authorization': 'Bearer token' }
});

// Response includes _lockInfo showing who is editing
if (contract._lockInfo.isLocked) {
  showWarning(`${contract._lockInfo.lockedByName} is currently editing`);
}
```

### Entrar em Modo EDIT
```javascript
// 1. Try to acquire edit lock
try {
  const lock = await fetch('/locks/acquire-edit/Contract/123/STATION_123', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer token' }
  });
  
  // Show edit form to user
  // Set lock renewal interval (every 2 minutes)
  setInterval(() => {
    fetch('/locks/renew/Contract/123/STATION_123', {
      method: 'PATCH',
      body: JSON.stringify({ durationSeconds: 300 })
    });
  }, 120000);
  
} catch (e) {
  // 409 Conflict = someone else is editing
  alert(e.message); // "João is editing this contract"
}
```

### Salvar Alterações (PUT)
```javascript
// 1. Update contract
const updated = await fetch('/contracts/123', {
  method: 'PUT',
  body: JSON.stringify(formData),
  headers: { 'Authorization': 'Bearer token' }
});

// Interceptor validates user has lock
// If another user edited in meantime, will fail with 409

// 2. Exit edit mode
await fetch('/locks/release/Contract/123/STATION_123', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer token' }
});

// Lock is released, others can now edit
```

## 🛡️ Segurança

### Validações Automatizadas
- ✅ **StationIsolationGuard**: Utilizadores só veem dados da sua estação
- ✅ **RecordLockInterceptor**: Valida locks em PUT/PATCH automaticamente
- ✅ **JWT Auth**: Todos endpoints autenticados (menos GET /locks/check)
- ✅ **Expiration**: Locks expiram automaticamente após 5 minutos

### Permissões por Papel

| Role | View | Edit | Manage Locks |
|------|------|------|-------------|
| STAFF | Própria Estação | Própria Estação | Não |
| FLEET | Própria Estação | Própria Estação | Não |
| IT | Todas | Todas | Sim |
| ADMIN | Todas | Todas | Sim |

## 📊 Monitoramento

### Ver Locks Ativos via PostgreSQL
```sql
SELECT 
  rl.id,
  rl."entityType",
  rl."entityId",
  u."fullName",
  rl."lockedAt",
  rl."expiresAt",
  CASE 
    WHEN rl."expiresAt" < NOW() THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END as status
FROM "RecordLock" rl
JOIN "User" u ON rl."lockedBy" = u.id
WHERE rl."expiresAt" > NOW()
ORDER BY rl."expiresAt" DESC;
```

### Limpeza de Locks Expirados
```bash
# Manual cleanup (scheduled daily)
POST /locks/cleanup
Authorization: Bearer IT_TOKEN
```

## 📝 Notas de Implementação

### Backend (NestJS)
- **Service**: `RecordLockService` com métodos acquireLock(), releaseLock(), renewLock(), getLockInfo()
- **Interceptor**: `RecordLockInterceptor` valida PUTs e adiciona _lockInfo a GETs
- **Guards**: `RecordStationAccessGuard` isola dados por estação
- **Database**: Modelo `RecordLock` com Prisma

### Configuração
```typescript
// Padrão: 5 minutos (300 segundos)
durationSeconds: 300

// Expiração automática
Lock expires após durationSeconds
Pode ser renovado antes de expirar
```

### Tipos Suportados
- `Contract` - Contratos de aluguel
- `Reservation` - Reservas
- `Vehicle` (future) - Veículos

## 🚀 Próximos Passos (Frontend)

1. ✅ Implementar decoradores @ViewLock() e @RequiredLock() no backend
2. ⏳ UI: Modal de "Alguém está a editar" quando abrir contrato com lock ativo
3. ⏳ UI: Form "Modo EDIT" com save/cancel buttons
4. ⏳ UI: Heartbeat renovar lock a cada 2 minutos enquanto em EDIT
5. ⏳ UI: Mostrar tempo restante de lock (countdown)
6. ⏳ Backend: Notificações WebSocket quando lock é adquirido/liberado

## 🔧 Troubleshooting

### "Outro utilizador está a editar" Error
- ✅ Espere o lock expirar (5 minutos)
- ✅ IT admin pode liberar lock manualmente
- ✅ Verifique: `GET /locks/check/Contract/123/STATION_123`

### Lock não expira
- ✅ Verifique relógio do servidor (timezone UTC)
- ✅ Run: `npx prisma db execute`
- ✅ Manual cleanup: `DELETE FROM "RecordLock" WHERE "expiresAt" < NOW();`

### Interceptor não funciona
- ✅ Verificar SharedModule está importado em AppModule
- ✅ Verificar APP_INTERCEPTOR está registado
- ✅ Verificar path do interceptor em routes
