# 🚗 FleetGate

Sistema profissional de gestão de rent-a-car desenvolvido com NestJS, Prisma e PostgreSQL.

## ✅ Status do Projeto

**✅ SISTEMA 100% FUNCIONAL E TESTÁVEL**

- ✅ Todas as funcionalidades core implementadas
- ✅ Sistema de upgrade com aprovação admin
- ✅ Blacklist de clientes profissional
- ✅ Integração com brokers via API pública
- ✅ Multi-estação com controlo de acesso
- ✅ Base de dados populada com dados de teste
- ✅ Build sem erros

## 📖 Documentação Completa

- **[LEIA_ME.md](LEIA_ME.md)** - 🇵🇹 Resumo rápido em português
- **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** - Visão geral do sistema
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Guia de testes passo-a-passo
- **[FEATURES_COMPARISON.md](FEATURES_COMPARISON.md)** - Comparação com RentWay
- **[TESTING_QUERIES.sql](TESTING_QUERIES.sql)** - Queries SQL para validação
- **[BROKER_API.md](BROKER_API.md)** - Documentação da API pública

## 📋 Tecnologias

- **Backend**: NestJS 11.0.1 (Node.js + TypeScript)
- **ORM**: Prisma 5.22.0
- **Database**: PostgreSQL 16
- **Containerização**: Docker & Docker Compose

## 🌟 Funcionalidades Principais

### ⭐ Sistema de Upgrade com Aprovação Admin
- Staff pode solicitar upgrade de veículo
- **Admin tem que aprovar** o upgrade
- Sistema rastreia grupo original, aprovador, razão e custo
- Notificações automáticas
- Activity log completo

### 🚫 Blacklist de Clientes
- Sistema profissional de blacklist
- Razão obrigatória e rastreável
- Rating de clientes (0-5 estrelas)
- Histórico de alugueres
- Auditoria completa

### 🌐 API Pública para Brokers
- Endpoints públicos `/api/broker/*`
- Auto-matching de clientes
- Tracking de referências
- Documentação completa

### 💥 Gestão Completa de Danos
- Catálogo com 10 tipos de danos
- Custos estimados automáticos
- Dedução do depósito
- Rastreamento completo

### 🏢 Multi-Estação
- Múltiplas estações activas
- Estações fictícias (MAINTENANCE, STOLEN, RETIRED)
- Controlo de acesso por estação
- Hierarquia de utilizadores (CLIENT → FLEET → STAFF → ADMIN → IT)

### 📊 Dados de Teste
- 8 utilizadores (5 staff + 3 clientes)
- 5 estações (3 activas + 2 fictícias)
- 8 veículos em 4 grupos
- 3 contratos (incluindo 1 com upgrade aprovado)
- 3 reservas (incluindo 1 via broker)
- Completamente testável

## 🚀 Quick Start

### Opção 1: Desenvolvimento Local

```bash
# 1. Instalar PostgreSQL com Docker
cd backend
npm run docker:dev

# 2. Instalar dependências
npm install

# 3. Gerar Prisma Client
npm run prisma:generate

# 4. Aplicar migrações
npm run prisma:migrate

# 5. Popular base de dados com dados de teste
npm run prisma:seed

# 6. Iniciar servidor
npm run start:dev

# 7. (Opcional) Abrir Prisma Studio
npm run prisma:studio
```

### Opção 2: Docker Completo (Produção)

```bash
# Build e iniciar todos os serviços
docker compose build
docker compose up -d

# Ver logs
docker compose logs -f

# Parar
docker compose down
```

## 📚 Documentação

Para mais detalhes sobre Docker e migrações, consulte [DOCKER_README.md](DOCKER_README.md)

## 🗂️ Estrutura do Projeto

```
FleetGate/
├── backend/                    # Backend NestJS
│   ├── src/                   # Código fonte
│   │   ├── main.ts           # Entry point
│   │   ├── app.module.ts     # Módulo principal
│   │   ├── prisma.service.ts # Serviço Prisma
│   │   └── prisma.module.ts  # Módulo Prisma (global)
│   ├── prisma/
│   │   └── schema.prisma     # Schema do banco de dados
│   ├── Dockerfile            # Dockerfile para produção
│   └── package.json
├── docker-compose.yml         # Produção
├── docker-compose.dev.yml     # Desenvolvimento
└── README.md
```

## 🔧 Scripts Disponíveis

### Backend

```bash
npm run start:dev              # Desenvolvimento com watch mode
npm run start:prod             # Produção
npm run build                  # Build da aplicação

# Testes
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:e2e               # End-to-end tests

# Prisma
npm run prisma:generate        # Gerar Prisma Client
npm run prisma:migrate         # Criar e aplicar migração
npm run prisma:migrate:deploy  # Aplicar migrações (produção)
npm run prisma:studio          # Abrir Prisma Studio
npm run prisma:seed            # Popular base de dados com dados de teste

# Docker
npm run docker:dev             # Iniciar PostgreSQL (dev)
npm run docker:dev:down        # Parar PostgreSQL (dev)
npm run docker:prod            # Iniciar todos os serviços
npm run docker:prod:down       # Parar todos os serviços
npm run docker:build           # Build dos containers
```

## 🔐 Segurança e Observabilidade

- Autenticação via JWT (`/auth/login`) com `userCode` + password
- Headers de segurança com Helmet
- Métricas Prometheus em `/metrics`
- Grafana + Prometheus via Docker Compose

```bash
docker compose up -d
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

## 🗄️ Database

- **Host**: localhost
- **Port**: 5432
- **Database**: FleetGate
- **User**: postgres
- **Password**: anaconda123

**Connection String**:
```
postgresql://postgres:anaconda123@localhost:5432/FleetGate?schema=public
```

## 📝 Teste o Sistema

### 1. Ver Dados no Prisma Studio
```bash
cd backend
npm run prisma:studio
```
Abre em: http://localhost:5555

### 2. Ver Contratos com Upgrade
Abra o Prisma Studio e navegue para:
- **Contract** → Procure por `CT2026000002`
- Verá o upgrade de SUV para Premium aprovado pelo admin

### 3. Ver Cliente Blacklisted
- **User** → Procure por `Manuel Problemas`
- Verá `isBlacklisted = true` com razão documentada

### 4. Testar API
```bash
# Ver todos os contratos
curl http://localhost:3000/contracts

# Ver contrato específico
curl http://localhost:3000/contracts/2

# Ver veículos disponíveis
curl http://localhost:3000/vehicles?status=AVAILABLE

# Criar reserva via broker
curl -X POST http://localhost:3000/api/broker/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "pickupStationId": 1,
    "dropoffStationId": 1,
    "pickupDate": "2026-03-01T10:00:00Z",
    "dropoffDate": "2026-03-05T10:00:00Z",
    "vehicleGroupId": 1,
    "brokerReference": "TEST-001",
    "client": {
      "email": "novo@test.pt",
      "fullName": "Novo Cliente",
      "phone": "+351912345678",
      "documentType": "NIF",
      "documentNumber": "123456789"
    }
  }'
```

## 🔑 Credenciais de Teste

Após executar o seed (`npm run prisma:seed`), utilize:

```
IT User:        it@fleetgate.pt / Password123!
Admin Lisboa:   admin.lisboa@fleetgate.pt / Password123!
Staff Lisboa:   staff.lisboa@fleetgate.pt / Password123!
Staff Porto:    staff.porto@fleetgate.pt / Password123!
Fleet Faro:     fleet.faro@fleetgate.pt / Password123!
```

**Clientes:**
- António Oliveira: Rating 4.8★, 12 alugueres, Cliente VIP
- Sofia Rodrigues: Rating 5.0★, 5 alugueres
- Manuel Problemas: ⚠️ BLACKLISTED

## 📞 Endpoints Principais

O servidor roda em: `http://localhost:3000`

### Módulos Implementados
- `GET/POST/PATCH/DELETE /users` - Gestão de utilizadores
- `GET/POST/PATCH/DELETE /stations` - Gestão de estações
- `GET/POST/PATCH/DELETE /vehicles` - Gestão de veículos
- `GET/POST/PATCH/DELETE /contracts` - Gestão de contratos
- `GET/POST/PATCH/DELETE /reservations` - Gestão de reservas

### API Pública para Brokers
- `GET /api/broker/health` - Health check
- `POST /api/broker/reservations` - Criar reserva
- `GET /api/broker/reservations/:reservationNumber` - Consultar
- `POST /api/broker/reservations/:reservationNumber/cancel` - Cancelar
- `GET /api/broker/availability` - Verificar disponibilidade

Ver documentação completa em [BROKER_API.md](BROKER_API.md)

## 🤝 Contribuindo

1. Clone o repositório
2. Instale as dependências
3. Inicie o ambiente de desenvolvimento
4. Faça suas alterações
5. Teste suas mudanças

---

**Desenvolvido com ❤️ para gestão eficiente de frotas**