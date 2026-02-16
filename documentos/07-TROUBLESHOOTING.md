# 07 - Troubleshooting e Diagnóstico

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

## 🔴 Problemas Comuns e Soluções

### 1. "Carro não aparece na lista de disponíveis"

**Sintomas**:
- Cliente tenta fazer reserva, carro não aparece em `/vehicles/station/LISBOA?status=AVAILABLE`

**Causas Possíveis**:
1. ✓ Carro em `IN_REPAIR` status
2. ✓ Carro em `IN_TRANSFER` status
3. ✓ Carro em `IN_USE` (aluguel ativo)
4. ✓ User tem permissão menor do que a estação

**Verificación**:
```bash
# Verificar status actual do carro
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/vehicles/5

# Se status = IN_REPAIR, listar reparações abertas
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/vehicle-repairs/vehicle/5

# Se status = IN_TRANSFER, verificar transferências
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/vehicle-transfers/vehicle/5
```

**Solução**:
- Se carro em repair: fechar a reparação com `PATCH /vehicle-repairs/{id}/close`
- Se em transfer: completar transfer com `PATCH /vehicle-transfers/{id}/arrive`
- Se em uso: aguardar devolução

---

### 2. "Erro 409 - Carro está em reparação, mas não conseguo ver a reparação"

**Sintomas**:
```json
{
  "statusCode": 409,
  "message": "Vehicle is in active repair RPR-2025-123"
}
```

Mas `GET /vehicle-repairs/RPR-2025-123` retorna `404`.

**Causa**:
- Reparação foi aberta noutra estação (isolamento de dados)

**Verificação**:
```bash
# User 1 (LISBOA) tenta ver reparação aberta por User 2 (PORTO)
curl -H "Authorization: Bearer {token_lisboa}" \
  http://localhost:3000/vehicle-repairs/RPR-2025-123
# → 404 Não Encontrado (isolamento de estação)
```

**Solução**:
- Contactar admin ou user que abriu a reparação em outra estação
- Admin pode usar `/metrics` para listar todas as reparações do sistema

---

### 3. "Não consigo fechar a reparação - erro de lock"

**Sintomas**:
```json
{
  "statusCode": 423,
  "message": "Cannot close repair: no active close lock. Acquire lock first."
}
```

**Causa**:
- Lock para fechar expirou (5 minutos)
- Outro user tem o lock

**Verificação**:
```bash
# Verificar status da reparação e lock
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/vehicle-repairs/RPR-2025-123
# Verificar "closeLockedBy" e "closeLockedExpires"
```

**Solução**:
```bash
# Re-adquirir o lock
POST /vehicle-repairs/{id}/acquire-close-lock

# Se outro user tem lock, aguardar ou contactar admin
# Admin pode forçar com: DELETE /locks/{lockId}
```

---

### 4. "Múltiplos users podem editar o mesmo contrato"

**Sintomas**:
- 2 users conseguem adicionar extras ao mesmo contrato simultaneamente
- Dados corrompidos (preços, totais inconsistentes)

**Causa**:
- Interceptor de lock não está ativo
- Decorador `@RequiredLock` ausente no endpoint

**Verificação**:
```bash
# User 1: Editar contrato
curl -X PATCH http://localhost:3000/contracts/CNT-001/add-extra

# User 2: Editar MESMO contrato (NÃO DEVE ser permitido)
curl -X PATCH http://localhost:3000/contracts/CNT-001/add-extra
```

**Esperado**:
```json
{
  "statusCode": 423,
  "message": "Record is locked by another user"
}
```

**Solução**:
1. Verificar se `@RequiredLock()` está no controller
2. Verificar se `RecordLockInterceptor` está registado em `app.module.ts`

```typescript
@RequiredLock()
@Controller('contracts')
export class ContractsController {}

// App Module
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RecordLockInterceptor,
    },
  ],
})
```

---

### 5. "Transação incompleta na transferência"

**Sintomas**:
- Carro marcado como chegado, mas still listed em estação anterior
- Mileage não actualizado

**Causa**:
- Erro na transação Prisma
- Falha de conexão durante UPDATE

**Verificação**:
```bash
# Listar carro em ambas estações
GET /vehicles/station/LISBOA?search=20-AB-BC
GET /vehicles/station/PORTO?search=20-AB-BC

# Verificar histórico de transfers
GET /vehicle-transfers/vehicle/5
```

**Solução**:
```bash
# Ver último estado de transfer
GET /vehicle-transfers/5

# Se status = IN_TRANSIT, completar manualmente
PATCH /vehicle-transfers/5/arrive
{
  "kmWhenArrived": 45420,
  "arrivedAt": "2026-02-20T14:00:00Z"
}
```

---

### 6. "Utilizador vê carros de outra estação"

**Sintomas**:
- Estação A consegue ver/editar carros da Estação B

**Causa**:
- `StationIsolationGuard` não está activo
- Route não tem `@UseGuards(StationIsolationGuard)`

**Verificação**:
```typescript
// CORRETO:
@UseGuards(JwtAuthGuard, StationIsolationGuard)
@Get('/vehicles/station/:stationId')
listByStation(@Param('stationId') stationId: string) { ... }

// INCORRETO (falta guard):
@UseGuards(JwtAuthGuard)  // Falta StationIsolationGuard
@Get('/vehicles/station/:stationId')
listByStation(@Param('stationId') stationId: string) { ... }
```

**Solução**:
1. Adicionar `StationIsolationGuard` em todas as rotas de dados
2. Testar com users de estações diferentes

---

## ⚠️ Problemas de Performance

### 7. "API responde muito lentamente"

**Verificação**:
```bash
# Medir tempo de resposta
time curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/vehicles

# Verificar métricas
curl http://localhost:3000/metrics | grep duration
```

**Causas Possíveis**:
1. Database sem índices
2. Query N+1 (selects repetidos)
3. Redis não configurado

**Soluções**:
```bash
# Criar índices no PostgreSQL
CREATE INDEX idx_vehicle_status ON vehicles(status);
CREATE INDEX idx_contract_status ON contracts(status);
CREATE INDEX idx_lock_record ON record_locks(recordType, recordId);

# Verificar se Redis está a funcionar
redis-cli ping
# → PONG (se estiver ok)

# Verificar conexão
redis-cli -n 0 INFO stats
```

---

### 8. "Memory leak - servidor consome cada vez mais RAM"

**Verificação**:
```bash
# Monitorar processo Node
ps aux | grep node
# Verificar coluna RSS (memória)

# Se aumenta constantemente, há leak
```

**Causas Comuns**:
1. Listeners de eventos não removidos
2. Timers (setInterval) nunca cancelados
3. Cache RedisNão limitado

**Solução**:
```bash
# Reiniciar servidor
pm2 restart fleetgate-backend

# Se problema persiste, procurar:
# - src/shared/services/*.ts para listeners
# - src/**/*.controller.ts para timers
# - Habilitar garbage collection logging
node --trace-gc dist/main.js
```

---

## 🔄 Problemas de Sincronização

### 9. "Lock expirou durante operação"

**Sintomas**:
```json
{
  "statusCode": 423,
  "message": "Record lock expired"
}
```

**Causa**:
- Operação demorou mais de 5 minutos

**Solução**:
1. Renovar lock durante operação:
```bash
PATCH /locks/{lockId}/renew
```

2. Se operação muito longa, aumentar timeout:
```typescript
// system.config.json
{
  "lockExpirationMinutes": 10,  // era 5
  "lockRenewalIntervalSeconds": 30
}
```

---

## 🚀 Problemas de Deploy

### 10. "Backend não inicia após deploy"

**Verificação**:
```bash
# Ver logs
docker logs fleetgate-backend

# Se conexão DB:
# → "connect ECONNREFUSED 127.0.0.1:5432"
# → Database não está running

# Se Prisma client:
# → "npx prisma generate não foi executado"
```

**Soluções**:
```bash
# Gerar Prisma cliente
npx prisma generate

# Aplicar migrations
npx prisma migrate deploy

# Reiniciar servidor
npm run start:prod
```

---

## 📊 Debug Mode

### Ativar logs detalhados:

```bash
# Em desenvolvimento
DEBUG=fleetgate:* npm run start

# Em produção (arquivo de log)
LOG_LEVEL=DEBUG npm run start:prod > /var/log/fleetgate.log 2>&1
```

### Exemplo de debug:
```typescript
// src/shared/services/vehicle-validation.service.ts
private logger = new Logger('VehicleValidation');

async throwIfVehicleInRepair(vehicleId: number) {
  this.logger.debug(`Checking repair status for vehicle ${vehicleId}`);
  // ...
}
```

---

## 🆘 Contactar Suporte

Se problema persiste após estas soluções:

1. **Recolher informação**:
   - ID do utilizador afectado
   - ID do recurso (veículo, contrato, transferência)
   - Timestamp exacto do erro
   - User agent / browser

2. **Executar diagnóstico**:
   ```bash
   # Script de diagnóstico
   ./scripts/diagnose.sh
   ```

3. **Enviar ao support**:
   - Email: support@fleetgate.com
   - Incluir logs: `docker logs fleetgate-backend > logs.txt`
   - Incluir screenshot do erro

---

**Última Actualização**: Fevereiro 2026  
**Maintainer**: DevOps Team
