# 04 - Impropriedades/Reparações (Sistema Completo)

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

Consulte: [VEHICLE_REPAIRS_SYSTEM.md](../VEHICLE_REPAIRS_SYSTEM.md) para documentação completa do sistema de impropriedades.

## 🎯 Resumo Rápido

Sistema permite marcar carros como em reparação (impro), bloqueia aluguel automático, e quando fechada, carro fica disponível em qualquer estação.

### Endpoints Principais

```bash
# Abrir reparação
POST /vehicle-repairs/open
{ "vehicleId": 5, "reason": "Motor", "kmWhenOpened": 45230 }

# Adquirir lock para fechar
POST /vehicle-repairs/{id}/acquire-close-lock

# Renov lock (heartbeat)
PATCH /vehicle-repairs/{id}/renew-close-lock

# Fechar reparação
PATCH /vehicle-repairs/{id}/close
{ "closedAtStationId": "PORTO", "kmWhenClosed": 45310 }

# Obter detalhes
GET /vehicle-repairs/{id}ok

# Listar por veículo
GET /vehicle-repairs/vehicle/{vehicleId}

# Listar abertas da estação
GET /vehicle-repairs/station/{stationId}/open

# Cancelar
POST /vehicle-repairs/{id}/cancel
```

### Estados e Transições

```
OPEN ─────→ IN_PROGRESS ─────→ COMPLETED
  │                                ↑
  └──────────────────→ CANCELLED ──┘
                          ↑
                          │ (manual abort)
```

### Vehicle Status Durante Reparação

```
AVAILABLE → IN_REPAIR (quando abre) → AVAILABLE (quando fecha)
                                       (na estação de fechamento)
```

### Bloqueio Automático de Aluguel

Quando tenta alugar carro em IN_REPAIR:
```json
{
  "statusCode": 409,
  "message": "Vehicle is in active repair RPR-2025-123. Cannot create reservation."
}
```

