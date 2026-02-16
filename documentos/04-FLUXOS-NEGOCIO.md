# 03 - Fluxos de Negócio Completos

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

---

## 📋 Fluxo 1: Cliente Faz Reservação

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENTE PROCURA CARRO                                    │
├─────────────────────────────────────────────────────────────┤
│ Acede ao website/app                                         │
│ Seleciona datas: 20-02-2025 a 25-02-2025                    │
│ Seleciona tipo: "SUV"                                       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND PROCURA DISPONIBILIDADE                          │
├─────────────────────────────────────────────────────────────┤
│ GET /vehicles/search                                        │
│ {                                                           │
│   "groupId": "SUV",                                         │
│   "pickupDate": "2025-02-20",                              │
│   "returnDate": "2025-02-25"                               │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Procura VehicleGroup "SUV"                              │
│ ✅ Filtra Vehicle status = AVAILABLE (não RENTED, IN_REPAIR)│
│ ✅ Calcula preço: 5 dias × €60/dia = €300                 │
│ ✅ Retorna lista com 3 carros disponíveis                  │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CLIENTE ESCOLHE CARRO E FAZ RESERVAÇÃO                   │
├─────────────────────────────────────────────────────────────┤
│ POST /reservations                                          │
│ {                                                           │
│   "clientId": 10,                                           │
│   "vehicleGroupId": "SUV",                                  │
│   "pickupDate": "2025-02-20",                              │
│   "returnDate": "2025-02-25",                              │
│   "pickupStationId": "LISBON_CENTER",                      │
│   "returnStationId": "LISBON_CENTER"                       │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Valida que cliente existe                               │
│ ✅ Valida datas (return > pickup)                          │
│ ✅ Valida que estação existe                               │
│ ✅ Cria Reservation com status = PENDING                    │
│ ✅ Retorna reservationNumber = "RES-25-001234"             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CLIENTE RECEBE CONFIRMAÇÃO                               │
├─────────────────────────────────────────────────────────────┤
│ Email:                                                      │
│ \"Sua reservação RES-25-001234 foi criada!\"               │
│ \"Data: 20-02 a 25-02\"                                     │
│ \"Preço: €300\"                                             │
│ \"Código de confirmação: ABC123\"                           │
│                                                             │
│ Cliente recebe:                                             │
│ ✅ Número de reservação                                    │
│ ✅ Datas                                                   │
│ ✅ Preço total                                             │
│ ✅ Instruções para retirada                                │
│ ✅ Horários da estação                                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ADMIN CONFIRMA RESERVAÇÃO (Opcional)                     │
├─────────────────────────────────────────────────────────────┤
│ PATCH /reservations/{id}                                    │
│ {                                                           │
│   "status": "CONFIRMED"                                     │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Muda status para CONFIRMED                              │
│ ✅ Aloca Vehicle específico (se houver)                    │
│ ✅ Envia email ao cliente                                  │
│ ✅ Vehicle status muda para RESERVED                        │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. NO DIA: CLIENTE VAI À ESTAÇÃO                            │
├─────────────────────────────────────────────────────────────┤
│ Cliente apresenta-se e documento com RES-25-001234          │
│ Staff consulta:                                             │
│ GET /reservations/search?number=RES-25-001234              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                    (Próximo fluxo: CONTRATO DE ALUGUEL)
```

---

## 🚗 Fluxo 2: Criar Contrato de Aluguel

```
┌─────────────────────────────────────────────────────────────┐
│ 1. STAFF CRIA CONTRATO                                      │
├─────────────────────────────────────────────────────────────┤
│ POST /contracts                                             │
│ {                                                           │
│   "clientId": 10,                                           │
│   "vehicleId": 25,       // XYZ-11-AA (Toyota Corolla)      │
│   "pickupDate": "2025-02-20T10:00:00Z",                    │
│   "returnDate": "2025-02-25T10:00:00Z",                    │
│   "dailyRate": 60,                                          │
│   "pickupStationId": "LISBON_CENTER",                      │
│   "returnStationId": "LISBON_CENTER",                      │
│   "clientNotes": "Cliente é VIP, dar upgrade grátis",      │
│   "fuelAtPickup": "FULL"                                    │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Valida cliente, veículo, datas                          │
│ ✅ Verifica que Vehicle não está IN_REPAIR                 │
│ ✅ Calcula preço base: 5 dias × €60 = €300                │
│ ✅ Cria Contract com status = DRAFT                         │
│ ✅ Gera contractNumber = "CNT-25-005678"                    │
│ ✅ Vehicle status muda para RENTED                          │
│                                                             │
│ Response:                                                   │
│ {                                                           │
│   \"id\": 1234,                                             │
│   \"number\": \"CNT-25-005678\",                             │
│   \"status\": \"DRAFT\",                                     │
│   \"totalPrice\": 300.00,                                   │
│   \"vehicle\": { \"licensePlate\": \"XYZ-11-AA\" }          │
│ }                                                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ADICIONAR ADICIONAIS (Opcional)                          │
├─────────────────────────────────────────────────────────────┤
│ POST /contracts/{id}/additionals                            │
│ {                                                           │
│   \"type\": \"extra_driver\",                               │
│   \"description\": \"Motorista adicional\",                 │
│   \"cost\": 50.00                                           │
│ }                                                           │
│                                                             │
│ Adicionais possíveis:                                       │
│ - Extra driver (+€50)                                       │
│ - Child seat (+€15)                                         │
│ - GPS (+€10/dia)                                            │
│ - Insurance upgrade (+€25)                                  │
│ - Unlimited distance (+€100)                                │
│                                                             │
│ Backend:                                                    │
│ ✅ Adiciona cada extra ao totalPrice                       │
│ ✅ Novo total: €300 + €50 = €350                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. FINALIZAR CONTRATO                                       │
├─────────────────────────────────────────────────────────────┤
│ PATCH /contracts/{id}                                       │
│ {                                                           │
│   \"status\": \"ACTIVE\",                                    │
│   \"ageAtPickup\": 25,                                      │
│   \"kmAtPickup\": 45230,                                    │
│   \"fuelAtPickup\": \"FULL\",                                │
│   \"damagesAtPickup\": [],                                  │
│   \"insuranceId\": \"INS-123\"                              │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Valida dados                                            │
│ ✅ Muda status para ACTIVE                                  │
│ ✅ Registra KM inicial                                      │
│ ✅ Registra fotos/danos iniciais                            │
│ ✅ Gera impresso para assinatura                            │
│ ✅ Entrega carro ao cliente                                 │
│                                                             │
│ Output: Impresso com:                                       │
│ - Contrato número                                          │
│ - Cliente info                                              │
│ - Veículo info                                              │
│ - Preço total: €350                                         │
│ - Termos e condições                                        │
│ - Campo para assinatura                                     │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                    (CLIENTE USA CARRO POR 5 DIAS)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DEVOLUÇÃO DE CARRO                                       │
├─────────────────────────────────────────────────────────────┤
│ Cliente devolve carro no dia 25-02 às 10h                  │
│                                                             │
│ Staff registra:                                             │
│ PATCH /contracts/{id}/return                                │
│ {                                                           │
│   \"returnStationId\": \"LISBON_CENTER\",                    │
│   \"kmAtReturn\": 45410,        // percorreu 180 km         │
│   \"fuelAtReturn\": \"3/4 TANK\",                            │
│   \"damagesAtReturn\": [                                    │
│     {                                                       │
│       \"description\": \"Risco na lateral direita\",        │
│       \"severity\": \"MINOR\",                              │
│       \"estimatedCost\": 150                                │
│     }                                                       │
│   ]                                                         │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Registra KM final                                        │
│ ✅ Registra danos                                           │
│ ✅ Fotografa danos                                          │
│ ✅ Relaciona danos com tipos conhecidos                     │
│ ✅ Calcula custos de reparação                              │
│ ✅ Muda status para COMPLETED                               │
│ ✅ Liberta vehicle para próximo aluguel                     │
│ ✅ Vehicle status muda para AVAILABLE                        │
│ ✅ Calcula valor final do contrato                          │
│                                                             │
│ Cálculo final:                                              │
│ Base:           €300.00                                    │
│ Adicionais:     €50.00                                     │
│ Combustível:    -€0.00 (devolveu 3/4)                      │
│ Danos:          +€150.00 (risco lateral)                   │
│ ─────────────────────────                                  │
│ TOTAL:          €500.00                                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PROCESSAMENTO DE PAGAMENTO                               │
├─────────────────────────────────────────────────────────────┤
│ Se cliente ainda não pagou:                                │
│ POST /payments                                              │
│ {                                                           │
│   \"contractId\": 1234,                                      │
│   \"amount\": 500.00,                                        │
│   \"method\": \"CREDIT_CARD\",                              │
│   \"cardToken\": \"tok_visa_4242\"                          │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Processa pagamento com gateway                          │
│ ✅ Se sucesso: Cria Payment record                          │
│ ✅ Muda Contract paidAmount para €500                      │
│ ✅ Envia recibo ao cliente                                  │
│ ✅ Marca contrato como PAID                                 │
│                                                             │
│ Se falhar: Retenta automáticamente 3× em 24h              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. REPARAÇÃO DE DANOS (Se houver)                           │
├─────────────────────────────────────────────────────────────┤
│ Staff registra impro:                                       │
│ POST /vehicle-repairs/open                                  │
│ {                                                           │
│   \"vehicleId\": 25,                                         │
│   \"reason\": \"Risco na lateral (contrato CNT-25-005678)\" │
│   \"description\": \"Risco resultado de aluguel\",          │
│   \"estimatedCost\": 150.00,                                │
│   \"kmWhenOpened\": 45410                                   │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Cria VehicleRepair com status OPEN                      │
│ ✅ Vehicle status permanece AVAILABLE (ou muda IN_REPAIR)  │
│ ✅ Técnico repara                                           │
│                                                             │
│ Depois de reparado:                                         │
│ POST /vehicle-repairs/{id}/acquire-close-lock              │
│ PATCH /vehicle-repairs/{id}/close                          │
│ {                                                           │
│   \"closedAtStationId\": \"LISBON_CENTER\",                  │
│   \"actualCost\": 145.00,                                   │
│   \"kmWhenClosed\": 45410,                                  │
│   \"notes\": \"Reparado com sucesso\"                       │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Muda status para COMPLETED                               │
│ ✅ Vehicle status muda para AVAILABLE                        │
│ ✅ Carro disponível para próximo aluguel                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                       FIM DO FLUXO
```

---

## 💰 Fluxo 3: Processamento de Pagamento

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENTE ESCOLHE MÉTODO DE PAGAMENTO                      │
├─────────────────────────────────────────────────────────────┤
│ Opções disponíveis:                                         │
│ - Cartão de Crédito/Débito (Visa, Mastercard)              │
│ - Transferência Bancária                                    │
│ - MB Way                                                    │
│ - Multibanco                                                │
│ - Cash (apenas na estação)                                  │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PROCESSAMENTO DE CARTÃO (Exemplo)                        │
├─────────────────────────────────────────────────────────────┤
│ POST /payments                                              │
│ {                                                           │
│   \"contractId\": 1234,                                      │
│   \"amount\": 500.00,                                        │
│   \"method\": \"CREDIT_CARD\",                              │
│   \"cardToken\": \"tok_4242...\"     (Token Stripe/similar) │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ 1. Valida montante                                         │
│ 2. Chama Stripe API: charge(montante, token)              │
│ 3. Stripe responde com transactionId                       │
│ 4. Cria Payment record com:                                │
│    - status: PAID                                          │
│    - transactionId: \"ch_1234\"                            │
│    - timestamp: 2025-02-25T15:30:00Z                       │
│ 5. Atualiza Contract.paidAmount += 500                     │
│ 6. Envia email \"Pagamento confirmado\"                     │
│                                                             │
│ Se falhar (cartão recusado):                               │
│ - Payment.status = FAILED                                  │
│ - Retry automático em 24h                                  │
│ - Email ao cliente notificando falha                       │
│ - Contract fica pendente de pagamento                      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CONFIRMAÇÃO E RECIBO                                     │
├─────────────────────────────────────────────────────────────┤
│ Email ao cliente:                                           │
│ ────────────────────────────────────────────────────────    │
│ Seu pagamento foi processado com sucesso!                  │
│                                                             │
│ Detalhes:                                                   │
│ Contrato: CNT-25-005678                                    │
│ Montante: €500.00                                          │
│ Método: Cartão de Débito                                   │
│ ID Transação: ch_1234567890                                │
│ Data: 25-02-2025 15:30                                     │
│                                                             │
│ [Descarregar Recibo em PDF]                                │
│ ────────────────────────────────────────────────────────    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                    FIM DO FLUXO DE PAGAMENTO
```

---

## 🏢 Fluxo 4: Transferência de Veículo entre Estações

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INITIATE TRANSFER (Fleet Manager)                        │
├─────────────────────────────────────────────────────────────┤
│ POST /vehicle-transfers                                     │
│ {                                                           │
│   \"vehicleId\": 25,                                         │
│   \"fromStationId\": \"LISBON_CENTER\",                      │
│   \"toStationId\": \"PORTO_AIRPORT\",                        │
│   \"driverId\": 8,     // Qual condutor vai levar           │
│   \"scheduledDate\": \"2025-02-26T10:00:00Z\",              │
│   \"reason\": \"Rebalanceamento de frota\"                   │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Valida veículo, estações, condutor                      │
│ ✅ Cria VehicleTransfer com status = PENDING               │
│ ✅ Gera transferNumber = \"TRA-25-00123\"                   │
│ ✅ Vehicle status muda temporariamente para UNAVAILABLE    │
│ ✅ Envia notificação ao condutor                            │
│                                                             │
│ Response:                                                   │
│ {                                                           │
│   \"id\": \"tra-uuid\",                                      │
│   \"transferNumber\": \"TRA-25-00123\",                       │
│   \"status\": \"PENDING\",                                   │
│   \"vehicle\": { \"licensePlate\": \"XYZ-11-AA\" },         │
│   \"fromStation\": { \"code\": \"LIS\" },                   │
│   \"toStation\": { \"code\": \"POR\" }                      │
│ }                                                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CONDUTOR INICIA VIAGEM                                   │
├─────────────────────────────────────────────────────────────┤
│ PATCH /vehicle-transfers/{id}/depart                        │
│ {                                                           │
│   \"kmAtDeparture\": 45410,                                  │
│   \"departureTime\": \"2025-02-26T10:15:00Z\"               │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Registra hora e KM de partida                            │
│ ✅ Muda status para IN_TRANSIT                              │
│ ✅ Vehicle status permanece indisponível                    │
│ ✅ Notifica estação recebedora                              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                    (Condutor viaja de LIS → POR)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CARRO CHEGA NA ESTAÇÃO DESTINO                           │
├─────────────────────────────────────────────────────────────┤
│ PATCH /vehicle-transfers/{id}/arrive                        │
│ {                                                           │
│   \"kmAtArrival\": 45510,                                    │
│   \"arrivalTime\": \"2025-02-26T14:45:00Z\",                │
│   \"damagesInTransit\": []                                  │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Registra hora e KM de chegada                            │
│ ✅ KM percorrido: 45510 - 45410 = 100 km                   │
│ ✅ Muda status para COMPLETED                               │
│ ✅ Vehicle.stationId muda para \"PORTO_AIRPORT\"            │
│ ✅ Vehicle.status muda para AVAILABLE (novamente)           │
│ ✅ Atualiza Vehicle.currentKm = 45510                       │
│ ✅ Notifica estações de origem e destino                    │
│                                                             │
│ Email ao staff de PORTO:                                   │
│ \"Carro XYZ-11-AA chegou da Lisbon!\"                       │
│ \"Transferência: TRA-25-00123\"                              │
│ \"KM: 45510\"                                                │
│ \"Danos: Nenhum\"                                             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                    FIM DO FLUXO DE TRANSFERÊNCIA
```

---

## 🔧 Fluxo 5: Ciclo de Reparação (Impro)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MARCAR CARRO EM REPARAÇÃO                                │
├─────────────────────────────────────────────────────────────┤
│ POST /vehicle-repairs/open                                  │
│ {                                                           │
│   \"vehicleId\": 25,                                         │
│   \"reason\": \"Motor não funciona\",                        │
│   \"description\": \"Possível vela ou bateria\",             │
│   \"kmWhenOpened\": 45410,                                   │
│   \"estimatedCost\": 250.00                                  │
│ }                                                           │
│                                                             │
│ Backend:                                                    │
│ ✅ Cria VehicleRepair com status = OPEN                    │
│ ✅ Vehicle.status muda para IN_REPAIR                       │
│ ✅ Carro fica indisponível para aluguel                     │
│ ✅ Gera repairNumber = \"RPR-2025-001234\"                  │
│                                                             │
│ Output:                                                     │
│ {                                                           │
│   \"id\": \"repair-uuid\",                                   │
│   \"repairNumber\": \"RPR-2025-001234\",                      │
│   \"status\": \"OPEN\",                                      │
│   \"vehicle\": { \"licensePlate\": \"XYZ-11-AA\" }          │
│ }                                                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. TENTAR ALUGAR ESSE CARRO (Falha)                         │
├─────────────────────────────────────────────────────────────┤
│ POST /reservations                                          │
│ { \"vehicleId\": 25, ... }                                   │
│                                                             │
│ Backend:                                                    │
│ ❌ Detecta Vehicle.status = IN_REPAIR                       │
│ ❌ Rejeita: 409 Conflict                                    │
│    \"Vehicle is in active repair RPR-2025-001234\"          │
│ ❌ Cliente não pode alugar                                  │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. TÉCNICO TRABALHA NA REPARAÇÃO                            │
├─────────────────────────────────────────────────────────────┤
│ (Alguns dias depois)                                        │
│ Reparação está feita, motor funciona novamente              │
│                                                             │
│ Staff quer fechar reparação:                                │
│ POST /vehicle-repairs/{id}/acquire-close-lock               │
│                                                             │
│ Backend:                                                    │
│ ✅ Adquire lock exclusivo para fechar                       │
│ ✅ Expira em 5 minutos                                      │
│ ✅ Outro staff não pode fechar simultaneamente              │
│                                                             │
│ Response:                                                   │
│ {                                                           │
│   \"repairId\": \"repair-uuid\",                            │
│   \"lockedBy\": 5,                                           │
│   \"expiresAt\": \"2025-02-28T10:05:00Z\"                    │
│ }                                                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FECHAR REPARAÇÃO                                         │
├─────────────────────────────────────────────────────────────┤
│ PATCH /vehicle-repairs/{id}/close                           │
│ {                                                           │
│   \"closedAtStationId\": \"PORTO_AIRPORT\",                  │
│   \"actualCost\": 245.00,                                    │
│   \"kmWhenClosed\": 45410,                                   │
│   \"notes\": \"Substituída vela e corrente. Funcionando OK.\" │
│ }                                                           │
│                                                             │
│ Backend (Transação):                                        │
│ ✅ Atualiza VehicleRepair:                                  │
│    - status = COMPLETED                                    │
│    - closedAtStationId = PORTO_AIRPORT                      │
│    - actualCost = 245.00                                   │
│    - closedAt = agora                                       │
│    - lock liberado                                          │
│ ✅ Atualiza Vehicle:                                        │
│    - status = AVAILABLE                                    │
│    - stationId = PORTO_AIRPORT (nova estação!)             │
│    - currentKm = 45410                                      │
│ ✅ Carro está pronto para próximo aluguel                   │
│                                                             │
│ Output:                                                     │
│ {                                                           │
│   \"repairNumber\": \"RPR-2025-001234\",                      │
│   \"status\": \"COMPLETED\",                                 │
│   \"estimatedCost\": 250.00,                                 │
│   \"actualCost\": 245.00,                                    │
│   \"closedAtStation\": { \"code\": \"POR\" }                │
│ }                                                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CARRO VOLTA AO MERCADO                                   │
├─────────────────────────────────────────────────────────────┤
│ POST /reservations                                          │
│ { \"vehicleId\": 25, ... }                                   │
│                                                             │
│ Backend:                                                    │
│ ✅ Vehicle.status = AVAILABLE ✓                             │
│ ✅ Reparação não bloqueia mais                              │
│ ✅ Cliente pode alugar perfeitamente                        │
│ ✅ Carro agora está em PORTO (estação diferente!)          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                    FIM DO FLUXO DE REPARAÇÃO
```

---

## ⚡ Fluxo 6: Multi-Utilizador com Locks

```
┌─────────────────────────────────────────────────────────────┐
│ TEMPO 0:00 - User A (João) abre contrato para visualizar    │
├─────────────────────────────────────────────────────────────┤
│ GET /contracts/1234                                         │
│                                                             │
│ Backend:                                                    │
│ ✅ Valida JWT de João                                       │
│ ✅ Valida acesso à estação                                  │
│ ✅ RecordLockInterceptor carrega lock info                  │
│ ✅ Retorna contrato + _lockInfo                             │
│                                                             │
│ Response:                                                   │
│ {                                                           │
│   \"id\": 1234,                                             │
│   \"number\": \"CNT-25-005678\",                             │
│   \"_lockInfo\": {                                           │
│     \"isLocked\": false,                                     │
│     \"lockedBy\": null                                       │
│   }                                                         │
│ }                                                           │
│                                                             │
│ João vê: \"Ninguém está editando este contrato\" ✓          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ TEMPO 0:10 - User B (Maria) abre MESMO contrato             │
├─────────────────────────────────────────────────────────────┤
│ GET /contracts/1234                                         │
│                                                             │
│ Backend:                                                    │
│ ✅ Valida JWT de Maria                                      │
│ ✅ Valida acesso à estação                                  │
│ ✅ Mesmo contrato que João, mas sem lock ainda              │
│ ✅ Retorna contrato + _lockInfo                             │
│                                                             │
│ Response: {..., \"_lockInfo\": {\"isLocked\": false}}       │
│                                                             │
│ Maria vê: \"Ninguém está editando este contrato\" ✓         │
│                                                             │
│ Nota: Ambos podem VER simultaneamente, sem problema!       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ TEMPO 0:20 - João clica \"EDIT\" e adquire lock              │
├─────────────────────────────────────────────────────────────┤
│ POST /locks/acquire-edit/Contract/1234/STATION_123          │
│                                                             │
│ Backend:                                                    │
│ ✅ Verifica se há lock ativo: NÃO                           │
│ ✅ Cria RecordLock para João (5 minutos)                   │
│ ✅ De agora em diante, apenas João pode editar              │
│                                                             │
│ Response:                                                   │
│ {                                                           │
│   \"repairId\": \"contract:1234\",                           │
│   \"lockedBy\": 2,   // João                                │
│   \"expiresAt\": \"2025-02-25T16:05:00Z\"                    │
│ }                                                           │
│                                                             │
│ João vê: Formulário desbloqueado, pode editar              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ TEMPO 0:21 - Maria Refresh da página para ver atualizações  │
├─────────────────────────────────────────────────────────────┤
│ GET /contracts/1234                                         │
│                                                             │
│ Backend:                                                    │
│ ✅ Valida JWT de Maria                                      │
│ ✅ Verifica locks: HÁ UM LOCK ATIVO                         │
│ ✅ Retorna contrato + _lockInfo com info do lock             │
│                                                             │
│ Response:                                                   │
│ {                                                           │
│   \"id\": 1234,                                             │
│   \"_lockInfo\": {                                           │
│     \"isLocked\": true,                                      │
│     \"lockedBy\": 2,                                        │
│     \"lockedByName\": \"João Silva\",                        │
│     \"expiresAt\": \"2025-02-25T16:05:00Z\"                  │
│   }                                                         │
│ }                                                           │
│                                                             │
│ Maria vê: \"João Silva está editando este contrato\" ⚠️     │
│ Botão EDIT fica desabilitado                                │
│ Contador: \"Liberta em 4 minutos\"                          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ TEMPO 0:30 - João está ainda a editar, renova lock          │
├─────────────────────────────────────────────────────────────┤
│ PATCH /locks/renew/Contract/1234/STATION_123                │
│ {\"durationSeconds\": 300}                                   │
│                                                             │
│ Backend:                                                    │
│ ✅ Atualiza RecordLock.expiresAt para +5 minutos            │
│ ✅ João continua tendo exclusividade                        │
│                                                             │
│ (Frontend faz isto automaticamente a cada 2 minutos)       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ TEMPO 0:40 - Maria tenta EDITAR (falha!)                    │
├─────────────────────────────────────────────────────────────┤
│ PUT /contracts/1234                                         │
│ {\"notes\": \"Cliente é VIP\", ...}                          │
│                                                             │
│ Backend (RecordLockInterceptor):                            │
│ ❌ Detecta que POST é PUT (precisa lock)                    │
│ ❌ Verifica lock: EXISTE e é de João                        │
│ ❌ Maria NÃO tem lock                                        │
│ ❌ Rejeita: 409 Conflict                                    │
│                                                             │
│ Response:                                                   │
│ {                                                           │
│   \"statusCode\": 409,                                       │
│   \"message\": \"João Silva is editing this contract\"       │
│ }                                                           │
│                                                             │
│ Maria vê erro: \"João está editando, tente mais tarde\"    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ TEMPO 0:50 - João termina e faz SAVE                        │
├─────────────────────────────────────────────────────────────┤
│ PUT /contracts/1234                                         │
│ {\"notes\": \"Cliente é VIP mas preferência LOW COST\", ...} │
│                                                             │
│ Backend (RecordLockInterceptor):                            │
│ ✅ Detecta que POST é PUT                                   │
│ ✅ Verifica lock: EXISTE e é de João                        │
│ ✅ João TEM lock                                             │
│ ✅ Permite: Salva dados                                     │
│ ✅ Retorna contrato atualizado                              │
│                                                             │
│ DELETE /locks/release/Contract/1234/STATION_123            │
│                                                             │
│ Backend:                                                    │
│ ✅ Remove RecordLock                                         │
│ ✅ Contrato agora disponível para outro editar              │
│                                                             │
│ João vê: \"Contrato salvo com sucesso\" ✓                   │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ TEMPO 0:51 - Maria pode FINALMENTE editar                   │
├─────────────────────────────────────────────────────────────┤
│ POST /locks/acquire-edit/Contract/1234/STATION_123          │
│                                                             │
│ Backend:                                                    │
│ ✅ Verifica locks: NENHUM                                   │
│ ✅ Cria novo lock para Maria                                │
│ ✅ Maria agora tem exclusividade                            │
│                                                             │
│ PUT /contracts/1234                                         │
│ {\"internalNotes\": \"Carro foi devolvido com dano\"}       │
│                                                             │
│ Backend:                                                    │
│ ✅ Maria tem lock                                           │
│ ✅ Permite salvar                                           │
│                                                             │
│ Maria vê: \"Contrato salvo com sucesso\" ✓                  │
│                                                             │
│ DELETE /locks/release/Contract/1234/STATION_123            │
│ Backend: ✅ Liberta lock                                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                    FIM DO FLUXO MULTI-UTILIZADOR
```

---

## 💰 Fluxo 7: Gestão Completa de Caução com Seguro

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENTE FARÁ ALUGUEL COM CAUÇÃO                          │
├─────────────────────────────────────────────────────────────┤
│ Cliente "Carlos Oliveira" quer alugar BMW X5                │
│ Datas: 01-03-2025 a 08-03-2025 (7 dias)                    │
│ Preço: 7 × €100/dia = €700                                 │
│ Seguro: PREMIUM (reduz cauções em 40%)                     │
│                                                             │
│ Cliente: Colateral e confiança? Sim, quer 2 cauções        │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND CALCULA CAUÇÕES AUTOMATICAMENTE                  │
├─────────────────────────────────────────────────────────────┤
│ POST /contracts                                             │
│ {                                                           │
│   "clientId": 25,                                           │
│   "vehicleId": 1050,                                        │
│   "pickupDate": "2025-03-01",                              │
│   "returnDate": "2025-03-08",                              │
│   "price": 700,                                            │
│   "insuranceType": "PREMIUM",                               │
│   "deposits": [                                             │
│     {"type": "STANDARD", "paymentMethod": "CREDIT_CARD"},   │
│     {"type": "REINFORCED", "paymentMethod": "CREDIT_CARD"}  │
│   ]                                                         │
│ }                                                           │
│                                                             │
│ Backend Calcula:                                            │
│ • Caução STANDARD = 50% × €700 = €350                      │
│   Com PREMIUM (-40%): €350 × 0.60 = €210 (COBRADO)        │
│                                                             │
│ • Caução REINFORCED = 100% × €700 = €700                   │
│   Com PREMIUM (-40%): €700 × 0.60 = €420 (COBRADO)        │
│                                                             │
│ Total a Cobrar:                                             │
│ • Aluguel: €700                                             │
│ • Caução 1: €210 (com desconto)                             │
│ • Caução 2: €420 (com desconto)                             │
│ • TOTAL: €1.330                                             │
│                                                             │
│ Carregamento Automático: 4 transações no cartão             │
│ ✅ €700 - Aluguel (processamento normal)                    │
│ ✅ €210 - Caução STANDARD (hold/blocked na conta)           │
│ ✅ €420 - Caução REINFORCED (hold/blocked na conta)         │
│ ✅ Confirma: Todas 3 transações bem-sucedidas               │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CONTRATO CRIADO: CLIENTE RETIRA CARRO                    │
├─────────────────────────────────────────────────────────────┤
│ GET /contracts/9999 (ver resumo de cauções)                 │
│ {                                                           │
│   "id": 9999,                                               │
│   "clientId": 25,                                           │
│   "vehicleId": 1050,                                        │
│   "status": "ACTIVE",                                       │
│   "totalPrice": 700,                                        │
│   "insuranceType": "PREMIUM",                               │
│   "deposits": [                                             │
│     {                                                       │
│       "id": "DEP-001",                                      │
│       "type": "STANDARD",                                   │
│       "originalAmount": 350,                                │
│       "discountPercent": 40,                                │
│       "amount": 210,                                        │
│       "status": "HELD",                                     │
│       "paymentMethod": "CREDIT_CARD",                       │
│       "cardTokenId": "tok_visa_4242"                        │
│     },                                                      │
│     {                                                       │
│       "id": "DEP-002",                                      │
│       "type": "REINFORCED",                                 │
│       "originalAmount": 700,                                │
│       "discountPercent": 40,                                │
│       "amount": 420,                                        │
│       "status": "HELD",                                     │
│       "paymentMethod": "CREDIT_CARD",                       │
│       "cardTokenId": "tok_visa_4242"                        │
│     }                                                       │
│   ]                                                         │
│ }                                                           │
│                                                             │
│ ✅ Carro entregue ao cliente                                │
│ ✅ Ambas cauções em estado HELD                             │
│ ✅ Francisco (gerente) nota no sistema                      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4A. CENÁRIO: DEVOLUÇÃO SEM DANOS (CENÁRIO FELIZ)            │
├─────────────────────────────────────────────────────────────┤
│ Data: 08-03-2025 às 18:00 - Cliente retorna BMW            │
│ Inspetor: "Carro perfeito! 0 danos!"                       │
│                                                             │
│ PATCH /contracts/9999/return                                │
│ {                                                           │
│   "mileage": 1500,                                          │
│   "fuelLevel": 50,                                          │
│   "damageAssessment": {                                     │
│     "status": "NO_DAMAGE",                                  │
│     "estimatedCost": 0,                                     │
│     "description": "Veículo em perfeito estado"             │
│   }                                                         │
│ }                                                           │
│                                                             │
│ Backend Processa:                                           │
│ ✅ Marca contrato como RETURNED                             │
│ ✅ 0 danos = Cauções NÃO são usadas                        │
│ ✅ Liberta automaticamente AMBAS as cauções                 │
│                                                             │
│ PATCH /contracts/9999/deposits/DEP-001/release              │
│ PATCH /contracts/9999/deposits/DEP-002/release              │
│                                                             │
│ Cada release retorna €210 e €420 ao cartão do cliente       │
│ • DEP-001: Status → FULLY_RELEASED                          │
│ • DEP-002: Status → FULLY_RELEASED                          │
│                                                             │
│ Email ao Cliente:                                           │
│   "Obrigado por devolver nosso BMW! ✓                       │
│    Devolução sem danos.                                    │
│    Cauções totais (€630) foram devolvidas ao seu cartão    │
│    em 1-2 dias úteis."                                     │
│                                                             │
│ Sistema:                                                    │
│ ✅ Contrato: CLOSED_CLEAN                                   │
│ ✅ Carro: Status → AVAILABLE (para próximo aluguel)         │
└──────────────────────────┬──────────────────────────────────┘
```

**Resultado Final (Cenário Sem Danos)**:
```
ORIGINAL (Cliente Paga)
├─ Aluguel: €700 ✓ (FleetGate fica com)
├─ Caução STANDARD: €210 ✓ (Hold + Liberta)
└─ Caução REINFORCED: €420 ✓ (Hold + Liberta)

CLIENTE RECEBE DEPOIS:
├─ Reembolso Caução STANDARD: €210
└─ Reembolso Caução REINFORCED: €420
TOTAL REEMBOLSO: €630

SALDO:
├─ FleetGate: €700 (aluguel)
└─ Cliente: €0 extra (cauções devolvidas)
```

---

```
┌─────────────────────────────────────────────────────────────┐
│ 4B. CENÁRIO: DEVOLUÇÃO COM DANOS PARCIAIS                   │
├─────────────────────────────────────────────────────────────┤
│ Data: 08-03-2025 às 18:15 - Cliente retorna BMW            │
│ Inspetor: "Possível dano na lateral esquerda"              │
│                                                             │
│ PATCH /contracts/9999/return                                │
│ {                                                           │
│   "mileage": 1800,                                          │
│   "fuelLevel": 30,                                          │
│   "damageAssessment": {                                     │
│     "status": "PARTIAL_DAMAGE",                             │
│     "estimatedCost": 550,                                   │
│     "description": "Risco profundo na lateral esquerda,     │
│                    será necessária pintura. Estimado €550"  │
│   }                                                         │
│ }                                                           │
│                                                             │
│ Backend Processa (Dano = €550):                             │
│ ✅ Marca como RETURNED com danos parciais                   │
│ ✅ Danos (€550) < Caução STANDARD (€210)? NÃO              │
│ ✅ Danos (€550) < STANDARD + REINFORCED (€630)? SIM        │
│                                                             │
│ LIBERAÇÃO DE CAUÇÕES (Parcial):                             │
│                                                             │
│ DEP-001 (STANDARD €210): FORFEITED                          │
│   • Status: FULLY_RELEASED (para reparação)                 │
│   • Reembolso ao cliente: €0                                │
│                                                             │
│ DEP-002 (REINFORCED €420):                                  │
│   • Dano = €550, Já coberto por DEP-001 (€210)              │
│   • Restante dano = €550 - €210 = €340                      │
│   • Como €340 < €420 (REINFORCED):                          │
│   • Status: PARTIALLY_RELEASED                              │
│   • Retirado: €340                                          │
│   • Reembolso ao cliente: €420 - €340 = €80                 │
│                                                             │
│ PATCH /contracts/9999/deposits/DEP-001/release              │
│ { "releasedAmount": 0, "status": "FULLY_RELEASED" }         │
│                                                             │
│ PATCH /contracts/9999/deposits/DEP-002/release              │
│ { "releasedAmount": 80, "status": "PARTIALLY_RELEASED" }    │
│                                                             │
│ Email ao Cliente:                                           │
│   "Devolução processada com danos (€550).                  │
│    Caução 1 (€210) foi usada totalmente para reparação.    │
│    Caução 2 (€420): €340 retido para reparação final,      │
│              €80 devolvido.                                 │
│    Total reembolsado: €80"                                  │
│                                                             │
│ Sistema:                                                    │
│ ✅ Contrato: CLOSED_WITH_DAMAGE                             │
│ ✅ Carro: Status → IN_REPAIR (até reparações terminarem)    │
└──────────────────────────┬──────────────────────────────────┘
```

**Resultado Final (Cenário Com Danos Parciais)**:
```
CLIENTE PAGOU (Original)
├─ Aluguel: €700
├─ Caução STANDARD: €210
└─ Caução REINFORCED: €420
TOTAL: €1.330

DANO AVALIADO: €550

CÁLCULO DE REEMBOLSO:
│
├─ Caução 1 (STANDARD): €210 → Totalmente usada
├─ Caução 2 (REINFORCED): €420
│                         ├─ €340 retido (do dano €550 - €210)
│                         └─ €80 reembolso
│
TOTAL REEMBOLSO: €0 + €80 = €80

FLEETGATE FICA COM:
├─ Aluguel: €700
├─ Caução 1: €210 (reparação)
└─ Caução 2: €340 (reparação)
TOTAL: €1.250

Balanço Final:
├─ Cliente: Pagou €1.330, recebeu €80 = Perdeu €1.250 líquido
└─ FleetGate: Receita €1.250 (cobre €550 danos + €700 aluguel)
```

---

```
┌─────────────────────────────────────────────────────────────┐
│ 4C. CENÁRIO: DEVOLUÇÃO COM DANOS GRAVES                     │
├─────────────────────────────────────────────────────────────┤
│ Data: 08-03-2025 às 18:30 - Cliente retorna BMW            │
│ Inspetor: "ACIDENTE GRAVE! Motor danificado!"               │
│                                                             │
│ PATCH /contracts/9999/return                                │
│ {                                                           │
│   "mileage": 2100,                                          │
│   "fuelLevel": 20,                                          │
│   "damageAssessment": {                                     │
│     "status": "TOTAL_DAMAGE",                               │
│     "estimatedCost": 12000,                                 │
│     "description": "Colisão frontal severa.                 │
│                    Motor e caixa danificados.               │
│                    Revisão completa necessária."             │
│   }                                                         │
│ }                                                           │
│                                                             │
│ Backend Processa (Dano = €12.000):                          │
│ ✅ Dano GRAVE (€12.000) >> Cauções (€630 total)            │
│ ✅ Cauções INSUFICIENTES para cobrir                        │
│                                                             │
│ LIBERAÇÃO DE CAUÇÕES (Completa):                            │
│                                                             │
│ DEP-001 (STANDARD €210): FORFEITED                          │
│   • Status: FULLY_RELEASED (direcionado para reparação)    │
│   • Reembolso: €0                                           │
│                                                             │
│ DEP-002 (REINFORCED €420): FORFEITED                        │
│   • Status: FULLY_RELEASED (direcionado para reparação)    │
│   • Reembolso: €0                                           │
│                                                             │
│ DÉBITO EXTRA (Cliente DEVE):                                │
│ • Dano Total: €12.000                                       │
│ • Menos Cauções: €630                                       │
│ • Cliente DEVE: €12.000 - €630 = €11.370                   │
│                                                             │
│ PATCH /contracts/9999/deposits/DEP-001/release              │
│ { "releasedAmount": 0, "status": "FULLY_RELEASED" }         │
│                                                             │
│ PATCH /contracts/9999/deposits/DEP-002/release              │
│ { "releasedAmount": 0, "status": "FULLY_RELEASED" }         │
│                                                             │
│ POST /invoices (Fatura extra)                               │
│ {                                                           │
│   "contractId": 9999,                                       │
│   "type": "DAMAGE_LIABILITY",                               │
│   "amount": 11370,                                          │
│   "deadline": "2025-03-22",                                 │
│   "description": "Danos não cobertos por cauções"           │
│ }                                                           │
│                                                             │
│ Email Urgente ao Cliente:                                   │
│   "IMPORTANTE: Veículo devolvido com danos graves!          │
│    Dano avaliado: €12.000                                  │
│    Suas cauções (€630) foram totalmente usadas.            │
│    Montante adicional devido: €11.370                       │
│                                                             │
│    Fatura gerada (ID: INV-2025-00456)                       │
│    Prazo de pagamento: 21 dias                              │
│    Contactar: suporte@fleetgate.com"                        │
│                                                             │
│ Sistema:                                                    │
│ ✅ Contrato: CLOSED_WITH_SEVERE_DAMAGE                      │
│ ✅ Carro: Status → TOTAL_LOSS (escrever como prejuízo)      │
│ ✅ Invoice: PENDING (aguardando pagamento)                  │
│ ✅ Alert: Notifica gestor + coletor de dívidas              │
└──────────────────────────┬──────────────────────────────────┘
```

**Resultado Final (Cenário Com Danos Graves)**:
```
CLIENTE PAGOU (Original)
├─ Aluguel: €700
├─ Caução STANDARD: €210
└─ Caução REINFORCED: €420
TOTAL: €1.330

DANO AVALIADO: €12.000 (GRAVE!)

APLICAÇÃO DE CAUÇÕES:
│
├─ Caução 1 (STANDARD): €210 → Totalmente aplicada
├─ Caução 2 (REINFORCED): €420 → Totalmente aplicada
│
Total de Cauções Aplicadas: €630

DÉBITO ADICIONAL:
│ Dano €12.000 - Cauções €630 = €11.370 CLIENTE DEVE

FLEETGATE FICA COM:
├─ Aluguel: €700
├─ Caução 1: €210 (reparação)
├─ Caução 2: €420 (reparação)
└─ Fatura a Receber: €11.370 (processo legal se não pagar)
TOTAL: €12.700

Balanço Final:
├─ Cliente: Pagou €1.330 + DEVE €11.370 (total €12.700)
└─ FleetGate: Receita €1.330 + Fatura pendente €11.370
             (cobre €12.000 danos + €700 aluguel)

NOTA: Seguro do Cliente pode cobrir parte dos €11.370
```

---

```
┌─────────────────────────────────────────────────────────────┐
│ 5. PROCESSO DE REEMBOLSO (Qualquer Cenário com Refund)      │
├─────────────────────────────────────────────────────────────┤
│ Backend inicia "Deposit Refund Job" (automático)             │
│                                                             │
│ Para cada Caução com status PARTIALLY_RELEASED ou           │
│ FULLY_RELEASED com reembolso > 0:                           │
│                                                             │
│ POST /payments/process-refund                               │
│ {                                                           │
│   "depositId": "DEP-002",                                   │
│   "amount": 80,                                             │
│   "cardToken": "tok_visa_4242",                             │
│   "reason": "PARTIAL_DAMAGE_RELEASE"                        │
│ }                                                           │
│                                                             │
│ Payment Gateway Processa (Stripe):                          │
│ ✅ Refund de €80 no cartão                                  │
│ ✅ Completa em 1-2 dias úteis                               │
│                                                             │
│ Sistema atualiza:                                           │
│ • DEP-002.releasedAmount = 80 (reembolso processado)        │
│ • DEP-002.releasedDate = 2025-03-09 (data do reembolso)     │
│ • Payment.status = REFUNDED                                 │
│                                                             │
│ Email ao Cliente:                                           │
│   "Reembolso processado: €80                                │
│    Cartão terminado em 4242                                 │
│    Pode levar 1-2 dias úteis a aparecer"                   │
│                                                             │
│ Audit Log:                                                  │
│ □ 2025-03-08 18:00 - Contrato devolvido com danos          │
│ □ 2025-03-08 18:05 - Cauções liberadas (STANDARD €210,      │
│                      REINFORCED €80)                        │
│ □ 2025-03-08 18:10 - Refund iniciado (€80)                 │
│ □ 2025-03-09 10:00 - Refund confirmado (Stripe)            │
│ □ 2025-03-09 10:05 - Cliente notificado                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                    FIM DO FLUXO DE CAUÇÃO
```

---

## 🔍 Matriz de Decisão por Dano

| Cenário | Dano Avaliado | Caução STANDARD | Caução REINFORCED | Decisão | Reembolso |
|---------|---------------|-----------------|-------------------|---------|-----------|
| Sem Danos | €0 | 100% LIBERTA | 100% LIBERTA | Ambas reembolsadas | €630 |
| Danos < STANDARD | €150 | 100% FORFEITA | Parcial (€70) | Standard usada, reforçada parcial | €70 |
| STANDARD < Danos < TOTAL | €550 | 100% FORFEITA | Parcial (€80) | Standard+parte reforçada | €80 |
| Danos > TOTAL | €1.500 | 100% FORFEITA | 100% FORFEITA | Ambas usadas, cliente deve €870 | €0 (-€870) |
| Danificação Total | €12.000 | 100% FORFEITA | 100% FORFEITA | Ambas usadas, cliente deve €11.370 | €0 (-€11.370) |

---

## 📊 Auditoria de Caução (Para Gestor)

```json
GET /contracts/9999/deposits/audit

{
  "contractId": 9999,
  "client": "Carlos Oliveira",
  "vehicle": "BMW X5 (Matrícula: AA-00-XX)",
  "rentalPeriod": "2025-03-01 a 2025-03-08",
  "deposits": [
    {
      "id": "DEP-001",
      "type": "STANDARD",
      "originalAmount": 350,
      "discountApplied": "PREMIUM (-40%)",
      "finalAmount": 210,
      "status": "FULLY_RELEASED",
      "usedFor": "Partial damage repair - pintura lateral",
      "timeline": [
        {
          "timestamp": "2025-03-01T09:00:00Z",
          "action": "CREATED",
          "amount": 210,
          "paymentMethod": "CREDIT_CARD",
          "details": "Caução retida"
        },
        {
          "timestamp": "2025-03-08T18:05:00Z",
          "action": "HELD",
          "amount": 210,
          "details": "Carro devolvido com danos"
        },
        {
          "timestamp": "2025-03-08T18:10:00Z",
          "action": "RELEASED_FOR_DAMAGE",
          "amount": 210,
          "details": "Danos €550 avaliados, STANDARD €210 aplicada"
        }
      ]
    },
    {
      "id": "DEP-002",
      "type": "REINFORCED",
      "originalAmount": 700,
      "discountApplied": "PREMIUM (-40%)",
      "finalAmount": 420,
      "status": "PARTIALLY_RELEASED",
      "usedFor": "Partial damage repair - dano restante €340",
      "timeline": [
        {
          "timestamp": "2025-03-01T09:00:00Z",
          "action": "CREATED",
          "amount": 420,
          "paymentMethod": "CREDIT_CARD",
          "details": "Caução retida"
        },
        {
          "timestamp": "2025-03-08T18:05:00Z",
          "action": "HELD",
          "amount": 420,
          "details": "Carro devolvido com danos"
        },
        {
          "timestamp": "2025-03-08T18:10:00Z",
          "action": "PARTIALLY_RELEASED",
          "releasedAmount": 80,
          "retainedAmount": 340,
          "details": "€340 retido para reparação, €80 reembolsados"
        },
        {
          "timestamp": "2025-03-09T10:00:00Z",
          "action": "REFUND_PROCESSED",
          "amount": 80,
          "method": "CREDIT_CARD_REFUND",
          "details": "Reembolso em cartão (1-2 dias úteis)"
        }
      ]
    }
  ],
  "summary": {
    "totalDepositsHeld": 630,
    "totalRetained": 550,
    "totalRefunded": 80,
    "damageAssessmentCost": 550,
    "insuranceDiscount": 40,
    "percentageApplied": "100% para reparação"
  }
}
```

---

## 🎓 Resumo de Padrões de Fluxo

1. **VIEW**: Múltiplos users podem ver simultaneamente
2. **EDIT**: Apenas um user por vez (com lock exclusivo)
3. **CONFLICT**: Se outro está editando, ConflictException
4. **TIMEOUT**: Lock expira em 5 minutos automaticamente
5. **ISOLATION**: Cada estação vê apenas seus dados

