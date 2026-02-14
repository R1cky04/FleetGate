# Broker API Documentation

API pública para integração com sistemas externos de brokers de reservas.

## Base URL

```
/api/broker
```

## Endpoints

### 1. Health Check

Verifica se a API está operacional.

**Endpoint:** `GET /api/broker/health`

**Response:**
```json
{
  "success": true,
  "message": "Broker API is running",
  "timestamp": "2026-02-14T21:35:00.000Z"
}
```

---

### 2. Criar Reserva

Cria uma nova reserva a partir de dados do broker. A API automaticamente cria ou encontra o cliente com base nos dados fornecidos.

**Endpoint:** `POST /api/broker/reservations`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "clientData": {
    "fullName": "João Silva",
    "email": "joao@example.com",
    "phone": "+351912345678",
    "cpf": "12345678900",
    "nif": "123456789",
    "birthDate": "1990-01-01",
    "address": "Rua Example, 123",
    "city": "Lisboa",
    "postalCode": "1000-001",
    "country": "Portugal"
  },
  "vehicleGroupId": "uuid-do-grupo",
  "pickupStationId": "uuid-da-estacao-retirada",
  "returnStationId": "uuid-da-estacao-devolucao",
  "pickupDate": "2026-03-01T10:00:00.000Z",
  "returnDate": "2026-03-08T10:00:00.000Z",
  "dailyRate": 50.00,
  "totalDays": 7,
  "estimatedTotal": 350.00,
  "depositPaid": 100.00,
  "includeInsurance": true,
  "insuranceCost": 70.00,
  "additionalDrivers": 1,
  "additionalDriverCost": 35.00,
  "extras": ["GPS", "Baby Seat"],
  "notes": "Cliente prefere carro automático",
  "source": "booking.com",
  "brokerReference": "BK-2026-12345"
}
```

**Campos Obrigatórios:**
- `clientData` (objeto completo com pelo menos nome, email e telefone)
- `pickupStationId`
- `returnStationId`
- `pickupDate`
- `returnDate`
- `dailyRate`
- `totalDays`
- `estimatedTotal`
- `source` (identificador do broker, ex: "booking.com", "expedia", "rentalcars")

**Campos Opcionais:**
- `vehicleId` (veículo específico) OU `vehicleGroupId` (qualquer veículo do grupo)
- `depositPaid`
- `includeInsurance`, `insuranceCost`
- `additionalDrivers`, `additionalDriverCost`
- `extras` (array de strings)
- `notes`
- `brokerReference` (referência interna do broker)

**Response:**
```json
{
  "success": true,
  "reservationNumber": "RV2026000001",
  "reservation": {
    "id": 1,
    "reservationNumber": "RV2026000001",
    "status": "PENDING",
    "clientId": 5,
    "vehicleGroupId": "uuid-do-grupo",
    "pickupStationId": "uuid-da-estacao-retirada",
    "returnStationId": "uuid-da-estacao-devolucao",
    "pickupDate": "2026-03-01T10:00:00.000Z",
    "returnDate": "2026-03-08T10:00:00.000Z",
    "dailyRate": 50.00,
    "totalDays": 7,
    "estimatedTotal": 350.00,
    "depositPaid": 100.00,
    "createdAt": "2026-02-14T21:35:00.000Z",
    "client": {
      "id": 5,
      "fullName": "João Silva",
      "email": "joao@example.com",
      "phone": "+351912345678"
    },
    "pickupStation": { /* ... */ },
    "returnStation": { /* ... */ }
  }
}
```

**Notas:**
- Se o cliente já existe (mesmo email, CPF ou NIF), a reserva será associada ao cliente existente
- O `brokerReference` será salvo nas notas internas no formato: `[BROKER] Ref: {reference}`
- A reserva é criada com status `PENDING`
- Guarde o `reservationNumber` para consultas e cancelamentos futuros

---

### 3. Consultar Reserva

Busca detalhes de uma reserva pelo número de reserva.

**Endpoint:** `GET /api/broker/reservations/:reservationNumber`

**Exemplo:** `GET /api/broker/reservations/RV2026000001`

**Response:**
```json
{
  "success": true,
  "reservation": {
    "id": 1,
    "reservationNumber": "RV2026000001",
    "status": "CONFIRMED",
    "clientId": 5,
    "vehicleId": 10,
    "pickupDate": "2026-03-01T10:00:00.000Z",
    "returnDate": "2026-03-08T10:00:00.000Z",
    "dailyRate": 50.00,
    "totalDays": 7,
    "estimatedTotal": 350.00,
    "confirmedAt": "2026-02-15T09:00:00.000Z",
    "client": {
      "id": 5,
      "fullName": "João Silva",
      "email": "joao@example.com",
      "phone": "+351912345678"
    },
    "vehicle": {
      "id": 10,
      "plate": "AA-00-BB",
      "brand": "Toyota",
      "model": "Corolla",
      "year": 2024
    },
    "pickupStation": { /* ... */ },
    "returnStation": { /* ... */ }
  }
}
```

---

### 4. Cancelar Reserva

Cancela uma reserva existente.

**Endpoint:** `POST /api/broker/reservations/:reservationNumber/cancel`

**Exemplo:** `POST /api/broker/reservations/RV2026000001/cancel`

**Body:**
```json
{
  "reason": "Cliente solicitou cancelamento",
  "notes": "Reembolso processado pelo broker"
}
```

**Campos Obrigatórios:**
- `reason`

**Response:**
```json
{
  "success": true,
  "reservation": {
    "id": 1,
    "reservationNumber": "RV2026000001",
    "status": "CANCELLED",
    "cancelReason": "Cliente solicitou cancelamento",
    "cancelledAt": "2026-02-16T14:30:00.000Z",
    /* ... outros campos ... */
  }
}
```

**Notas:**
- Apenas reservas com status `PENDING` ou `CONFIRMED` podem ser canceladas
- Se a reserva tinha veículo reservado, ele será liberado automaticamente
- O cancelamento é irreversível

---

### 5. Verificar Disponibilidade

Verifica disponibilidade de veículos para um período específico.

**Endpoint:** `GET /api/broker/availability`

**Query Parameters:**
- `vehicleGroupId` (obrigatório): UUID do grupo de veículos
- `stationId` (obrigatório): UUID da estação
- `startDate` (obrigatório): Data inicial (formato ISO 8601)
- `endDate` (obrigatório): Data final (formato ISO 8601)

**Exemplo:**
```
GET /api/broker/availability?vehicleGroupId=uuid-grupo&stationId=uuid-estacao&startDate=2026-03-01T10:00:00.000Z&endDate=2026-03-08T10:00:00.000Z
```

**Response:**
```json
{
  "success": true,
  "vehicleGroup": "Carros Económicos",
  "station": "Aeroporto de Lisboa",
  "startDate": "2026-03-01T10:00:00.000Z",
  "endDate": "2026-03-08T10:00:00.000Z",
  "totalVehicles": 5,
  "availableVehicles": 3,
  "available": true
}
```

---

## Status das Reservas

| Status | Descrição |
|--------|-----------|
| `PENDING` | Reserva criada, aguardando confirmação |
| `CONFIRMED` | Reserva confirmada com veículo atribuído |
| `ACTIVE` | Cliente retirou o veículo (em andamento) |
| `COMPLETED` | Reserva completada (veículo devolvido) |
| `CANCELLED` | Reserva cancelada |

---

## Códigos de Erro

### 400 Bad Request
- Campos obrigatórios ausentes
- Dados inválidos
- Operação não permitida no estado atual

### 404 Not Found
- Reserva não encontrada
- Estação ou grupo de veículos não encontrado

### 500 Internal Server Error
- Erro interno do servidor

**Exemplo de Erro:**
```json
{
  "statusCode": 400,
  "message": "clientData is required for broker API",
  "error": "Bad Request"
}
```

---

## Notas de Integração

1. **Autenticação**: Atualmente a API pública não requer autenticação. Em produção, implemente autenticação via API Key.

2. **Rate Limiting**: Considere implementar rate limiting para prevenir abuso.

3. **Webhooks**: Para receber notificações de mudanças de status, implemente webhooks (futuro).

4. **Timezone**: Todas as datas devem ser em formato ISO 8601 com timezone UTC.

5. **Idempotência**: O sistema verifica clientes existentes por email/CPF/NIF para evitar duplicatas.

6. **Logs**: Todas as reservas de broker são rastreadas via campo `internalNotes` com o prefixo `[BROKER]`.
