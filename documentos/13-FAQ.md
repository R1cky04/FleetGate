# 13 - FAQ - Perguntas Frequentes

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

## 🤔 Perguntas Frequentes

### **GERAL**

#### P: Qual é o FleetGate?
**R**: FleetGate é uma plataforma SaaS para gestão de frota de aluguel de carros. Oferece controlo de carros, reservas, contratos, reparações, transferências entre estações e pagamentos.

#### P: Em que tecnologia foi construído?
**R**: 
- Backend: NestJS 11 + PostgreSQL
- Frontend: (a construir)
- Cache: Redis
- Monitoramento: Prometheus + Grafana

#### P: Qual o custo?
**R**: Modelo de preços em discussão. Contacte support@fleetgate.com

---

### **AUTENTICAÇÃO & ACESSO**

#### P: Esqueci minha senha, como recupero?
**R**: Página de login tem link "Forgot Password?". Receberá email com link para reset em 10 minutos. Se não receber:
1. Verificar spam/junk
2. Contactar admin da empresa

#### P: Alguém criou conta com meu email. Como remover?
**R**: Só ADMIN pode deletar usuários. Contacte seu administrator: admin@suaempresa.com

#### P: Posso usar mesma conta em múltiplas estações?
**R**: Não. Uma conta = uma estação (por segurança e isolamento). Se trabalha em 2 estações, precisa 2 contas.

**Exceção**: ADMIN e FLEET roles podem ver todas estações.

#### P: Token expirou, como renovar?
**R**: 
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "..."}'
```

---

### **VEÍCULOS**

#### P: Como adiciono um carro novo ao inventário?
**R**: 
1. Ir a Vehicles
2. Click "+ Add Vehicle"
3. Preencher: License plate, marca, modelo, ano
4. Select estação registada
5. Save

```bash
# Ou via API
curl -X POST http://localhost:3000/vehicles \
  -H "Authorization: Bearer {token}" \
  -d '{
    "licensePlate": "20-AB-CD",
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2024,
    "registeredStationId": "LISBOA"
  }'
```

#### P: Carro aparece como "IN_REPAIR" mas não tem reparação aberta?
**R**: Pode ser:
1. Reparação foi aberta noutro user/estação (isolation)
2. Reparação foi fechada mas status não actualizou (bug raro)

**Solução**: Contactar admin para force-close a reparação.

#### P: Como mudo estação de um carro?
**R**: Via transferência. Create transfer (FLEET role):
```bash
POST /vehicle-transfers/initiate
{
  "vehicleId": 5,
  "fromStationId": "LISBOA",
  "toStationId": "PORTO",
  "kmWhenTransferred": 45230
}
```

---

### **RESERVAS & CONTRATOS**

#### P: Cliente fez reserva, agora preciso criar contrato. Como?
**R**: 
1. No dia do aluguel, abra reserva na lista
2. Click "Create Contract"
3. Preencha KM inicial, data pickup, data dropoff
4. Verifique cliente e carro
5. Save

#### P: Contrato está locked por outro user há 30 minutos. Como desbloqueio?
**R**: Locks expiram automaticamente em 5 minutos. Se passou:
```bash
# Admin pode forçar unlock
DELETE /locks/{lockId}

# Depois consegues editar normalmente
```

#### P: Posso editar contrato após devolução?
**R**: Não. Contrato em status "RETURNED" é read-only. Se precisa ajustar danos:
1. Antes que retorne: yes, pode editar
2. Após devolução: contacte ADMIN para reabrir

#### P: Cliente quer cancelar aluguel 1 dia antes. Possível?
**R**: 
1. Se reserva (ainda não contrato): cancel reservation
2. Se contrato já criado: cancel contract (admin role apenas)

Reembolso:
- Cancelação 3+ dias: 100% reembolso
- Cancelação 1-2 dias: 50% reembolso
- Cancelação day-of: 10% reembolso

---

### **PAGAMENTOS**

#### P: Qual métodos de pagamento são aceites?
**R**: 
- ✅ Cartão crédito/débito (via Stripe)
- ✅ Transferência bancária
- ✅ Cash (na estação)

#### P: Pagamento falhou com "Invalid card". O que fazer?
**R**: 
1. Verificar número cartão
2. Verificar data expiração
3. Contactar banco de cliente
4. Tentar outro cartão

#### P: Posso fazer multiple payments para 1 contrato?
**R**: Sim. Se contrato €200 + danos €50 = €250 total:
```bash
# Payment 1: €200 (deposit)
POST /payments { amount: 200 }

# Payment 2: €50 (danos após devolução)
POST /payments { amount: 50 }
```

#### P: Como obtenho recebimento de pagamento?
**R**: 
```bash
GET /payments/{paymentId}
# Response inclui campo "receipt": "https://..."
```

---

### **REPARAÇÕES (IMPROPRIEDADES)**

#### P: Carro destruído em reparação. Como marca?
**R**: 
```bash
POST /vehicle-repairs/open
{
  "vehicleId": 5,
  "reason": "Major engine damage - vehicle totaled",
  "estimatedCost": 15000
}
```

Carro agora em `IN_REPAIR`, não aparece em disponíveis.

#### P: Reparação completa, mas não conseguo fechar. Erro 423?
**R**: 
```
Error: "Cannot close repair: no active close lock"
```

**Solução**:
```bash
# 1. Adquirir lock
POST /vehicle-repairs/{id}/acquire-close-lock

# 2. Fechar reparação
PATCH /vehicle-repairs/{id}/close
{ "closedAtStationId": "PORTO", "kmWhenClosed": 45520 }
```

#### P: Posso fechar reparação noutro station?
**R**: **Sim!** Carro pode ser reparado em PORTO mas fechado em LISBOA.

```bash
# Aberto em: PORTO
POST /vehicle-repairs/open (fromStationId = PORTO)

# Fechado em: LISBOA
PATCH /vehicle-repairs/{id}/close (closedAtStationId = LISBOA)

# Resultado: Carro volta a estar disponível em LISBOA
```

---

### **TRANSFERÊNCIAS**

#### P: Transfer demora muito tempo. Carro pode estar em "IN_TRANSFER" dias?
**R**: Sim, é normal. Transfer é iniciado mas carro chega em data estimada. Estado muda para ARRIVED quando chega.

Se atrasou 2+ dias:
```bash
# Admin pode forçar chegada
PATCH /vehicle-transfers/{id}/arrive
{
  "kmWhenArrived": 45600,
  "arrivedAt": "2026-02-22T14:00:00Z"
}
```

#### P: Transferência foi criada, mas now carro needs repair primeiro. Cancelar transfer?
**R**: 
```bash
POST /vehicle-transfers/{id}/cancel
{
  "reason": "Vehicle needs repair before transfer"
}
```

Carro volta ao status anterior.

---

### **MULTI-ESTAÇÃO & ISOLAMENTO**

#### P: Sou STAFF em LISBOA. Porque não vejo carros de PORTO?
**R**: **By design!** Cada estação vê apenas seus dados:
- STAFF de LISBOA → vê APENAS LISBOA
- STAFF de PORTO → vê APENAS PORTO
- FLEET/ADMIN → veem TUDO

Isso protege dados e evita confusão entre estações.

#### P: Preciso ver dados de outra estação. Como?
**R**: 
1. Contacte FLEET role (podem ver tudo)
2. Ou pedir ADMIN para mudar sua estação
3. Ou mudar role para FLEET (discuss com admin)

---

### **BUGS & PROBLEMAS**

#### P: API retorna 500 Internal Server Error. O que fazer?
**R**: 
1. Tente novamente em 30 segundos (pode ser glitch)
2. Verificar se servidor está up: `GET /health`
3. Contactar support se persiste: support@fleetgate.com

#### P: Página carrega muito lentamente (>5s). Motivo?
**R**: Possíveis causas:
1. Conexão internet lenta
2. Database lenta (index missing)
3. Cache out-of-sync

**Solução**: Contactar DevOps. Verificar:
```bash
# Is server responding?
curl -i http://localhost:3000/health

# Database performance?
psql -c "EXPLAIN ANALYZE SELECT * FROM vehicles WHERE status='AVAILABLE';"
```

#### P: Dois users editam simultaneously, ambos conseguem? Dados ficam errados?
**R**: **Não, is protected!** Sistema bloqueia com locks:
- User A edita → lock EXCLUSIVE criado
- User B tenta editar → 423 Locked
- User B aguarda lock expirar (5 min)
- Dados nunca ficam inconsistentes

---

### **FEATURES FUTURAS**

#### P: Vai ter mobile app?
**R**: Planeado para Q3 2026.

#### P: Vai ter integração com GPS?
**R**: Planeado para Q2 2026. Rastreamento de veículos em tempo real.

#### P: Vai ter invoice/fatura automática?
**R**: Planeado para Q2 2026.

#### P: Vai ter customer app (cliente vê reservas)?
**R**: Planeado para Q3 2026.

---

### **SUPORTE & CONTACTO**

#### P: Tenho bug/feature request. Quem contacto?
**R**: 
- **Bug Report**: support@fleetgate.com
- **Feature Request**: feedback@fleetgate.com
- **Emergency (API down)**: emergency@fleetgate.com
- **Billing Questions**: billing@fleetgate.com

#### P: Preciso de treinamento. Como?
**R**: 
- Online: training@fleetgate.com
- Presencial: arrange via support

#### P: Tenho customização específica. É possível?
**R**: Sim, oferecemos custom development. Contacte sales@fleetgate.com

---

## 📞 Support Tiers

| Tier | Response Time | Available | Cost |
|------|-------------|-----------|------|
| **Free** | 24-48h | Email | Included |
| **Pro** | 4-8h | Email, Chat | €50/mês |
| **Enterprise** | 1h | Email, Chat, Call | €500+/mês |

---

**Última Atualização**: Fevereiro 2026  
**Maintainer**: Support Team
