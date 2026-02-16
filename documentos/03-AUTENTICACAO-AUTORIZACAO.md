# 02 - Autenticação e Autorização

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0.0

---

## 🔐 Autenticação com JWT

### Login

**Request:**
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "joao@example.com",
  "password": "senha123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "email": "joao@example.com",
    "fullName": "João Silva",
    "role": "STAFF",
    "stationId": "LISBON_CENTER"
  }
}
```

**Errors:**
- `400`: Email ou password incorretos
- `401`: Conta suspensa

### Register (Novo Utilizador)

Apenas IT admin pode criar utilizadores via:
```bash
POST /users
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json

{
  "email": "novo@example.com",
  "password": "senha123",
  "firstName": "João",
  "lastName": "Silva",
  "phone": "+351912345678",
  "role": "STAFF",
  "stationId": "LISBON_CENTER"
}
```

### Token Refresh

```bash
POST /auth/refresh
Authorization: Bearer OLD_TOKEN

(Token expirado? Gera novo por 24h)
```

---

## 👥 Papéis de Utilizador

### 1. CLIENT (Cliente)
**Permissões:**
- ✅ Ver a própria conta
- ✅ Fazer reservações
- ✅ Ver próprios contratos e pagamentos
- ❌ Não pode gerir recursos da estação

**Acesso:**
- Apenas dados pessoais
- Sem acesso a outras estações

**Casos de Uso:**
- Fazer reservação pelo website
- Consultar estado do aluguel
- Fazer pagamento

---

### 2. STAFF (Funcionário)
**Permissões:**
- ✅ Criar/editar contratos
- ✅ Processar devoluções
- ✅ Criar reservações
- ✅ Registar pagamentos
- ✅ Ver impropriedades
- ❌ Não pode gerir utilizadores ou estações

**Acesso:**
- Apenas sua estação
- Todos os contratos/reservações de sua estação

**Casos de Uso:**
- Criar contrato quando cliente vai alugar
- Processar devolução e danos
- Receber pagamento
- Marcar carro em reparação

---

### 3. FLEET (Gestor de Frota)
**Permissões:**
- ✅ Adicionar/editar veículos
- ✅ Transferir veículos entre estações
- ✅ Marcar veículos em manutenção
- ✅ Ver métricas de frota
- ✅ Fazer operações de STAFF
- ❌ Não pode gerir utilizadores

**Acesso:**
- Sua estação
- Todos veículos da sua estação

**Casos de Uso:**
- Adicionar novo veículo ao sistema
- Mover veículo para outra estação
- Renovar seguros/documentos
- Ver ocupação de frota

---

### 4. ADMIN (Gestor de Estação)
**Permissões:**
- ✅ Tudo no âmbito da estação
- ✅ Gerir STAFF (criar, suspender)
- ✅ Gerir permissões de STAFF
- ✅ Ver relatórios e métricas
- ✅ Configurar parâmetros da estação
- ❌ Não pode ver outras estações

**Acesso:**
- Sua estação
- Gerir utilizadores da sua estação
- Relatórios da sua estação

**Casos de Uso:**
- Contratar novo membro de equipa
- Dar permissão para transferência de veículos
- Ver lucro/receitas da estação
- Configurar horários e regras

---

### 5. IT (Super Admin)
**Permissões:**
- ✅ Acesso total do sistema
- ✅ Gerir todas estações
- ✅ Gerir todos utilizadores
- ✅ Modificar configurações globais
- ✅ Ver auditoria completa
- ✅ Fazer backups

**Acesso:**
- 🌍 Todas estações
- 🌍 Todos utilizadores
- 🌍 Toda a base de dados

**Casos de Uso:**
- Criar nova estação
- Resgatar conta bloqueada
- Análise de fraude
- Debugging de problemas

---

## 🔑 JWT Token Anatomy

```
Header (Algoritmo)
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload (Dados do User)
{
  "id": 5,
  "email": "joao@example.com",
  "fullName": "João Silva",
  "role": "STAFF",
  "stationId": "LISBON_CENTER",
  "iat": 1708183200,      // Criado em
  "exp": 1708269600       // Expira em (24h)
}

Signature (Verificação)
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret_key
)
```

---

## 🛡️ Guards de Autenticação

### JwtAuthGuard
Aplicado globalmente a **todas** as rotas.

```typescript
// Exemplo no controller
@Get('/my-profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: JwtUser) {
  return user;
}
```

**Validações:**
- ✅ Token presente e válido
- ✅ Token não expirado
- ✅ Assinatura verificada

**Se falhar:** `401 Unauthorized`

### StationIsolationGuard
Validar que User pode aceder a determinada estação.

```typescript
@Get('/contracts') // Retorna contratos da estação
@UseGuards(StationIsolationGuard)
getContracts(@CurrentUser() user: JwtUser) {
  // Filtra automaticamente por user.stationId
}
```

**Validações:**
- ✅ User tem stationId
- ✅ User é IT admin OU stationId matches
- ✅ Estação existe

**Se falhar:** `403 Forbidden`

---

## 📋 Permissões Granulares

Além de papéis, users podem ter permissões específicas:

### Adicionar Permissão
```bash
POST /users/{userId}/permissions
Authorization: Bearer ADMIN_TOKEN

{
  "permission": "vehicle.transfer",
  "grantedBy": 1,
  "expiresAt": "2025-12-31T23:59:59Z"  # opcional
}
```

### Remover Permissão
```bash
DELETE /users/{userId}/permissions/{permissionId}
Authorization: Bearer ADMIN_TOKEN
```

### Permissões Existentes
- `vehicle.upgrade` - Pode fazer upgrade de veículo
- `vehicle.transfer` - Pode transferir entre estações
- `station.manage` - Pode gerir parâmetros da estação
- `staff.move` - Pode mover staff entre estações
- `payment.refund` - Pode fazer reembolsos

---

## 🔄 Matriz de Acesso

| Recurso | CLIENT | STAFF | FLEET | ADMIN | IT |
|---------|--------|-------|-------|-------|-----|
| Ver próprio perfil | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editar próprio perfil | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver utilizadores da estação | ❌ | ❌ | ❌ | ✅ | ✅ |
| Criar utilizador da estação | ❌ | ❌ | ❌ | ✅ | ✅ |
| Suspender utilizador | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ver veículos da estação | ❌ | ✅ | ✅ | ✅ | ✅ |
| Adicionar veículo | ❌ | ❌ | ✅ | ✅ | ✅ |
| Transferir veículo | ❌ | ❌ | ✅ | ✅ | ✅ |
| Criar contrato | ❌ | ✅ | ✅ | ✅ | ✅ |
| Processar reembolso | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ver relatórios | ❌ | ❌ | ❌ | ✅ | ✅ |
| Gerir outras estações | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver auditoria global | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🚨 Cenários de Segurança

### Cenário 1: Utilizador Tenta Ver Outra Estação
```
User: João (STAFF, Estação: LISBON)
Action: GET /vehicles (query Estação: PORTO)

Backend:
1. Valida JWT ✅
2. Verifica stationId de João = LISBON
3. Detecta tentativa de acesso a PORTO
4. Retorna: 403 Forbidden "No access to PORTO station"
```

### Cenário 2: Client Tenta Criar Utilizador
```
User: Maria (CLIENT)
Action: POST /users (criar novo user)

Backend:
1. Valida JWT ✅
2. Verifica role = CLIENT
3. Detecta falta de permissão
4. Retorna: 403 Forbidden "Insufficient permissions"
```

### Cenário 3: Token Expirado
```
User: João (token expirado há 1 hora)
Action: GET /contracts

Backend:
1. Valida JWT signature ✅
2. Verifica expiração
3. Detecta token.exp < now()
4. Retorna: 401 Unauthorized "Token expired"
5. Cliente deve fazer refresh ou novo login
```

### Cenário 4: IT Admin Vê Tudo
```
User: IT Admin
Action: GET /vehicles (query Estação: PORTO)

Backend:
1. Valida JWT ✅
2. Verifica role = IT
3. Bypass automático de StationIsolationGuard
4. Retorna veículos de PORTO
5. (IT admin pode ver qualquer estação)
```

---

## 🔐 Boas Práticas de Segurança

### Para Utilizadores
- ✅ Use senha forte (8+ caracteres, maiúsculas, números, símbolos)
- ✅ Não partilhe password com colegas
- ✅ Mude password regularmente
- ✅ Logout quando termina dia de trabalho
- ❌ Não deixe sessão ativa em computador público

### Para Admins
- ✅ Crie contas de serviço para integração
- ✅ Reveja permissões de utilizadores regularmente
- ✅ Desative contas de ex-colaboradores
- ✅ Monitorize tentativas de login falhadas
- ✅ Revoque tokens de utilizadores suspeitos
- ❌ Não dê acesso IT a utilizadores normais

### Para IT
- ✅ Mude JWT secret regularmente
- ✅ Monitorize tentativas de brute force
- ✅ Implemente 2FA para contas admin
- ✅ Faça backups de base de dados
- ✅ Revise logs de auditoria
- ❌ Não exponha configurações sensíveis

---

## 🔧 Troubleshooting

### Erro: "Invalid token"
**Causa:** Token não existe ou é inválido  
**Solução:** Fazer login novamente

### Erro: "Token expired"
**Causa:** Token passou expiração de 24h  
**Solução:** Fazer refresh de token ou novo login

### Erro: "No access to this station"
**Causa:** User tenta aceder estação que não é sua  
**Solução:** Contacte admin para expandir acesso

### Erro: "Insufficient permissions"
**Causa:** User não tem permissão para ação  
**Solução:** Contacte admin ou IT para grant permissão

---

## 📚 Exemplo Completo: Fluxo de Autenticação

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@example.com","password":"senha123"}'

# Response:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
#   "user": { "id": 5, "role": "STAFF", ... }
# }

# 2. Usar token em requisição
curl -X GET http://localhost:3000/contracts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 3. Se token expirar, fazer refresh
curl -X POST http://localhost:3000/auth/refresh \
  -H "Authorization: Bearer EXPIRED_TOKEN"

# 4. Logout (opcional - remove token no cliente)
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer TOKEN"
```

