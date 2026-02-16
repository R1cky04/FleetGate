# 08 - Setup e Deployment

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

## 🚀 Deployment Initial Setup

### Pré-requisitos

- **Sistema Operativo**: Linux (Ubuntu 20.04+) ou Docker
- **Node.js**: 18.x ou superior
- **PostgreSQL**: 14+
- **Redis**: 6.0+
- **Docker**: 20.10+ (se usar containers)
- **Git**: Para clonar repositório

### Verificar Dependências

```bash
node --version      # v18.x.x
npm --version       # 9.x.x
psql --version      # PostgreSQL 14+
redis-cli --version # redis-cli 6.0+
docker --version    # Docker 20.10+
```

---

## 📦 Instalação Local (Desenvolvimento)

### 1. Clonar Repositório

```bash
git clone https://github.com/empresa/fleetgate.git
cd fleetgate
```

### 2. Instalar Dependências

```bash
cd backend
npm install

# Gerar Prisma client
npx prisma generate
```

### 3. Configurar Variáveis de Ambiente

Criar `.env` na pasta `backend/`:

```env
# Banco de dados
DATABASE_URL="postgresql://user:password@localhost:5432/fleetgate_dev"

# JWT
JWT_SECRET="sua-chave-secreta-super-segura-min-32-chars"
JWT_EXPIRATION="24h"

# Redis
REDIS_URL="redis://localhost:6379"

# Ambiente
NODE_ENV="development"
LOG_LEVEL="debug"

# CORS
CORS_ORIGIN="http://localhost:3000,http://localhost:3001"

# Sistema
SYSTEM_NAME="FleetGate Dev"
```

### 4. Setup da Base de Dados

```bash
# Criar base de dados
createdb fleetgate_dev

# Aplicar migrations
npx prisma migrate deploy

# Seed initial data (opcional)
npx prisma db seed
```

### 5. Iniciar Servidor

```bash
# Modo desenvolvimento (watch mode)
npm run start:dev

# Output esperado:
# [Nest] 13456 - 02/16/2026, 10:30:00 AM
# [NestFactory] Starting Nest application...
# [InstanceLoader] AppModule dependencies initialized
# [RoutesResolver] AppController {/}:
# [NestApplication] Listening on port 3000
```

### 6. Testar Servidor

```bash
# Gealth check
curl http://localhost:3000/health
# → { "status": "ok" }

# Swagger docs
open http://localhost:3000/api/docs
```

---

## 🐳 Deployment com Docker

### 1. Build da Imagem

```bash
docker build -f backend/Dockerfile -t fleetgate:latest .
```

### 2. Docker Compose (Recomendado)

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.yml up -d
```

**Ficheiro docker-compose.yml**:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:senha@db:5432/fleetgate
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: fleetgate
      POSTGRES_PASSWORD: senha
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 3. Verificar Status

```bash
docker-compose ps
# STATUS              PORTS
# Up 2 minutes        0.0.0.0:3000->3000/tcp

# Listar containers
docker ps -a

# Ver logs
docker logs fleetgate-backend -f
```

---

## 🌐 Deployment em Produção

### 1. Servidor Linux (Ubuntu 20.04)

```bash
# 1. Atualizar sistema
sudo apt-get update && sudo apt-get upgrade -y

# 2. Instalar Node.js 18
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Instalar PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# 4. Instalar Redis
sudo apt-get install -y redis-server

# 5. Instalar nginx (reverse proxy)
sudo apt-get install -y nginx

# 6. Instalar PM2 (process manager)
sudo npm install -g pm2
```

### 2. Configurar Nginx (Reverse Proxy)

```bash
sudo nano /etc/nginx/sites-available/fleetgate
```

Conteúdo:
```nginx
upstream fleetgate_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.fleetgate.com;

    # Redirect HTTP → HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.fleetgate.com;

    ssl_certificate /etc/letsencrypt/live/api.fleetgate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.fleetgate.com/privkey.pem;

    # Proxy requests
    location / {
        proxy_pass http://fleetgate_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://fleetgate_backend;
        expires 30d;
    }
}
```

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/fleetgate /etc/nginx/sites-enabled/
sudo nginx -t  # Testar configuração
sudo systemctl restart nginx
```

### 3. SSL com Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.fleetgate.com
```

### 4. Deploy da Aplicação

```bash
# 1. Clonar repositório em /opt
sudo mkdir -p /opt/fleetgate
cd /opt/fleetgate
git clone https://github.com/empresa/fleetgate.git .

# 2. Instalar dependências
cd backend
npm install --production

# 3. Gerar Prisma
npx prisma generate

# 4. Build
npm run build

# 5. Migrations
npx prisma migrate deploy

# 6. PM2 startup
pm2 start dist/main.js --name "fleetgate-api" --instances max

# 7. Configurar para iniciar com SO
pm2 startup
pm2 save
```

### 5. Variáveis de Ambiente (Produção)

```bash
# .env.production
DATABASE_URL="postgresql://prod_user:SENHA_SEGURA@db.exemplo.com:5432/fleetgate"
JWT_SECRET="CHAVE_MUITO_SEGURA_MIN_32_CARACTERESC"
JWT_EXPIRATION="24h"
REDIS_URL="redis://cache.exemplo.com:6379"
NODE_ENV="production"
LOG_LEVEL="warn"
CORS_ORIGIN="https://app.fleetgate.com,https://admin.fleetgate.com"
```

---

## 📊 Monitoramento

### 1. PM2 Monitoring

```bash
pm2 monit         # Real-time monitor
pm2 logs          # Ver logs
pm2 status        # Status dos processos
pm2 restart all   # Reiniciar
pm2 stop all      # Parar
```

### 2. Prometheus + Grafana

Ver [SYSTEM_OVERVIEW.md](../SYSTEM_OVERVIEW.md) para gráficos.

```bash
# Métricas disponíveis
curl http://localhost:9090/api/v1/label/__name__/values | jq '.data[] | select(. | startswith("fleetgate"))'
```

### 3. Health Checks

```bash
# Automático (cada 30 segundos)
curl -f http://localhost:3000/health

# Se falhar, restart automático
pm2 restart all
```

---

## 🔒 Segurança

### 1. Backup da Base de Dados

```bash
# Manual
pg_dump -U postgres fleetgate > backup_$(date +%Y%m%d).sql

# Automático (script cron)
0 2 * * * pg_dump -U postgres fleetgate | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

### 2. Rotação de Logs

```bash
# /etc/logrotate.d/fleetgate
/var/log/fleetgate*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nobody nobody
    sharedscripts
}
```

### 3. Firewall Rules

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
```

### 4. Variáveis Sensíveis

```bash
# NUNCA commitar .env para git
echo ".env" >> .gitignore
echo ".env.*.local" >> .gitignore

# Usar secrets manager
# AWS Secrets Manager, HashiCorp Vault, ou similar
```

---

## 🔄 Pipeline de Deploy (CI/CD)

### GitHub Actions Exemplo

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, production]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18.x'

      - run: cd backend && npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/production'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/fleetgate
            git pull
            cd backend
            npm install --production
            npx prisma migrate deploy
            npm run build
            pm2 restart fleetgate-api
```

---

## ✅ Checklist de Produção

- [ ] Database PostgreSQL configurada
- [ ] Redis em execução
- [ ] Nginx como reverse proxy
- [ ] SSL/TLS (Let's Encrypt) ativo
- [ ] Firewall configurado
- [ ] Backups automáticos ativados
- [ ] PM2 configurado para iniciar no boot
- [ ] Monitoramento (Prometheus/Grafana) a funcionar
- [ ] Logs centralizados (opcional: ELK stack)
- [ ] Rate limiting ativo
- [ ] CORS correto configurado
- [ ] Variáveis de ambiente seguras
- [ ] Health checks a funcionar
- [ ] Rollback plan documentado

---

**Versão**: 1.0.0  
**Último Update**: Fevereiro 2026  
**Responsável**: DevOps Team
