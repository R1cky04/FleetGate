# FleetGate Backend - Docker & Migrations

## 🚀 Quick Start

### Desenvolvimento Local

1. **Iniciar PostgreSQL com Docker:**
```bash
cd backend
npm run docker:dev
```

2. **Instalar dependências:**
```bash
npm install
```

3. **Gerar Prisma Client:**
```bash
npm run prisma:generate
```

4. **Criar e aplicar migrações:**
```bash
npm run prisma:migrate
```

5. **Iniciar servidor:**
```bash
npm run start:dev
```

O backend estará disponível em: `http://localhost:3000`

---

## 🐳 Docker Commands

### Desenvolvimento (apenas PostgreSQL)

```bash
# Iniciar PostgreSQL
npm run docker:dev

# Parar PostgreSQL
npm run docker:dev:down
```

### Produção (Backend + PostgreSQL)

```bash
# Build e iniciar todos os serviços
npm run docker:build
npm run docker:prod

# Parar todos os serviços
npm run docker:prod:down
```

Ou diretamente na raiz:

```bash
# Build
docker compose build

# Iniciar
docker compose up -d

# Ver logs
docker compose logs -f

# Parar
docker compose down

# Parar e remover volumes
docker compose down -v
```

---

## 📊 Prisma Migrations

### Criar nova migração

```bash
npm run prisma:migrate
# Será solicitado um nome para a migração
```

### Aplicar migrações em produção

```bash
npm run prisma:migrate:deploy
```

### Reset database (⚠️ Apaga todos os dados)

```bash
npm run prisma:migrate:reset
```

### Abrir Prisma Studio (GUI para BD)

```bash
npm run prisma:studio
```

---

## 🗄️ Database Connection

### Local Development
```
postgresql://postgres:anaconda123@localhost:5432/FleetGate?schema=public
```

### Docker (container to container)
```
postgresql://postgres:anaconda123@postgres:5432/FleetGate?schema=public
```

---

## 📁 Project Structure

```
FleetGate/
├── backend/
│   ├── src/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── docker-compose.yml          # Produção
└── docker-compose.dev.yml      # Desenvolvimento
```

---

## 🔧 Troubleshooting

### Erro ao conectar ao banco

1. Verifique se o PostgreSQL está rodando:
```bash
docker ps
```

2. Teste a conexão:
```bash
docker exec -it fleetgate-postgres-dev psql -U postgres -d FleetGate
```

### Rebuild completo

```bash
# Parar tudo e limpar volumes
docker compose down -v

# Rebuild
docker compose build --no-cache

# Iniciar
docker compose up -d
```

### Ver logs do container

```bash
docker compose logs -f backend
docker compose logs -f postgres
```
