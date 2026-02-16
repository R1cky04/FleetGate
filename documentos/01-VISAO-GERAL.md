# 00 - Visão Geral do FleetGate

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0  
**Status**: Produção ✅

---

## 🎯 O Que é FleetGate?

FleetGate é um **sistema de gestão de aluguel de veículos** (SaaS) que permite que:

- **Empresas de rent-a-car** gerenciem múltiplas estações/filiais
- **Múltiplos utilizadores** trabalhem simultaneamente sem conflitos
- **Clientes** façam reservações e aluguéis de forma simples
- **Gestores** controlem frota, pagamentos, seguros

---

## ✨ Funcionalidades Principais

### 1️⃣ Gestão de Utilizadores
- Criação de contas com múltiplos papéis (STAFF, FLEET, ADMIN, IT)
- Permissões granulares por utilizador
- Associação a estações específicas
- Histórico de atividades

### 2️⃣ Gestão de Veículos
- Cadastro completo de veículos
- Rastreamento de status (AVAILABLE, RENTED, IN_REPAIR, etc)
- Agrupamento por categoria (Económico, SUV, etc)
- Documentação (seguros, inspeções, matrícula)

### 3️⃣ Múltiplas Estações
- Suporte para múltiplas filiais/estações
- Isolamento de dados por estação
- Transferências entre estações
- Gestão independente por estação

### 4️⃣ Reservações
- Reservação de veículos com datas
- Confirmação automática ou manual
- Cancelamento com políticas
- Histórico de reservações

### 5️⃣ Contratos de Aluguel
- Criação de contratos com cliente
- Cálculo automático de preços
- Adicionais (motoristas, seguros, etc)
- Condições específicas (combustível, KM, etc)

### 6️⃣ Pagamentos
- Múltiplos métodos (cartão, transferência bancária, MB Way, etc)
- Processamento de pagamentos
- Reembolsos
- Histórico de transações

### 7️⃣ Impropriedades/Reparações
- Marcar carros em reparação
- Locks exclusivos para fechar reparação
- Rastreamento de custo e tempo
- Indisponibilidade automática durante reparação

### 8️⃣ Sistema de Locks Multi-Tenancy
- Múltiplos utilizadores podem visualizar dados
- Apenas um pode editar de cada vez
- Locks automáticos com expiração
- Isolamento de dados por estação

---

## 🎭 Papéis de Utilizador

| Papel | Permissões | Acesso |
|-------|-----------|--------|
| **CLIENT** | Ver próprios aluguéis | Dados pessoais |
| **STAFF** | Aluguéis, devoluções, contratos | Sua estação |
| **FLEET** | Veículos, transferências | Sua estação |
| **ADMIN** | Gestão completa de estação | Uma estação |
| **IT** | Acesso total do sistema | Todas estações |

---

## 📊 Estatísticas Suportadas

- Total de veículos por estação
- Ocupação de frota
- Receita por período
- Tempo médio de aluguel
- Taxa de devolução atrasada
- Custos de manutenção
- Aluguéis por grupo de veículo

---

## 🔐 Segurança

- ✅ Autenticação JWT
- ✅ Autorização baseada em papéis
- ✅ Isolamento de dados por estação
- ✅ Locks exclusivos para edição
- ✅ Validação de entrada
- ✅ Rate limiting

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────┐
│         Frontend (Vue/React)        │  ← Aplicação web/mobile
└──────────────────┬──────────────────┘
                   │ API REST / WebSocket
┌──────────────────▼──────────────────┐
│      Backend NestJS (Node.js)       │  ← API Gateway
├──────────────────────────────────────┤
│  Multics Modules:                    │
│  - Users (Utilizadores)              │
│  - Vehicles (Veículos)               │
│  - Contracts (Contratos)             │
│  - Reservations (Reservações)        │
│  - Payments (Pagamentos)             │
│  - VehicleRepairs (Reparações)       │
│  - Locks (Sistema de locks)          │
│  - Auth (Autenticação)               │
└──────────────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│   PostgreSQL Base de Dados          │  ← Persistência
├──────────────────────────────────────┤
│  - Users (Utilizadores)              │
│  - Vehicles (Veículos)               │
│  - Contracts (Contratos)             │
│  - Reservations (Reservações)        │
│  - Payments (Pagamentos)             │
│  - VehicleRepair (Reparações)        │
│  - RecordLock (Locks)                │
│  - RecordLog (Audit)                 │
└──────────────────────────────────────┘
                   │
                   ├─ Redis (Cache & Sessions)
                   ├─ Prometheus (Métricas)
                   └─ Email Service (Notificações)
```

---

## 🌍 Fluxo de Utilizador Típico

```
1. Cliente acessa site
   ↓
2. Procura carro disponível para datas
   ↓
3. Faz reservação (com ou sem pagamento)
   ↓
4. Recebe confirmação por email
   ↓
5. Va à estação no dia de pickup
   ↓
6. Staff cria contrato e entrega carro
   ↓
7. Cliente aluga carro por período
   ↓
8. Cliente devolve carro na estação (mesmo ou outra)
   ↓
9. Staff valida danos e KM
   ↓
10. Sistema calcula valor final
   ↓
11. Cliente paga (se não pagou na reservação)
   ↓
12. Contrato fechado, carro disponível
```

---

## 📱 Módulos do Sistema

### Core (Obrigatório)
- **Auth**: Autenticação e autorização
- **Users**: Gestão de utilizadores
- **Stations**: Gestão de estações
- **Vehicles**: Gestão de veículos
- **Shared**: Serviços partilhados (locks, validações)

### Feature (Funcionalidades)
- **Contracts**: Aluguel de veículos
- **Reservations**: Reservação de veículos
- **Payments**: Pagamento de aluguéis
- **VehicleTransfers**: Transferências entre estações
- **VehicleRepairs**: Reparações de veículos
- **Metrics**: Monitoramento e métricas

### Integrativos
- **BrokerAPI**: API para parceiros (opcional)
- **Notifications**: Email/SMS (opcional)

---

## 💾 Dados Principais

### Utilizadores
- ID, email, password, nome, contactos
- Papéis, permissões, estação associada
- Status (ACTIVE, INACTIVE, SUSPENDED)

### Veículos
- Matricula, VIN, marca, modelo, ano
- Status, KM atuais, documentos
- Estação, grupo, preço diário
- Histórico de manutenção

### Contratos
- Número, cliente, veículo
- Datas de pickup/return
- Preço, adicionais, seguros
- Status de devolução

### Pagamentos
- Método, valor, status
- Data da transação
- Referência externa

---

## 🎓 Conceitos Importantes

### Multi-Tenancy (Múltiplas Estações)
Cada estação é isolada. Users veem apenas sua estação, execeto IT admin.

### Record Locks (Locks de Edição)
Quando User A visualiza um contrato, User B não vê quem está editando.
Quando User A edita, User B recebe "User A is editing" message.
Locks expiram automaticamente em 5 minutos.

### Estados de Veículo
```
AVAILABLE    → Pronto para aluguel
RESERVED     → Reservado mas não alugado
RENTED       → Alugado a cliente
MAINTENANCE  → Em manutenção preventiva
IN_REPAIR    → Em reparação/impro
OUT_OF_SERVICE → Retirado temporariamente
RETIRED      → Fora de uso permanente
```

---

## 🚀 Proximos Passos

Para aprender mais:
- Leia [01-ARQUITETURA.md](01-ARQUITETURA.md) para entender a estrutura técnica
- Leia [02-AUTENTICACAO-AUTORIZACAO.md](02-AUTENTICACAO-AUTORIZACAO.md) para segurança
- Leia [12-FLUXOS-NEGOCIO-COMPLETOS.md](12-FLUXOS-NEGOCIO-COMPLETOS.md) para casos de uso reais
