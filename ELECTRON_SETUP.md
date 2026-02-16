# 📱 FleetGate Desktop - Setup Electron + Vue 3

## ✅ Frontend Electron Concluído

Estrutura completa de **Vue 3 + Electron** pronta para usar:

### 📦 Tech Stack

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| **Vue** | 3.3.4 | UI Framework |
| **Electron** | Latest | Desktop App |
| **Vite** | 5.0 | Build tool |
| **TypeScript** | 5.3 | Type safety |
| **Pinia** | 2.1.6 | State management |
| **Vue Router** | 4.2.5 | Routing |
| **Axios** | 1.6 | HTTP client |

### 📁 Estrutura

```
frontend/
├── src/
│   ├── views/
│   │   ├── Login.vue          ✅ 400x350, draggable, close btn
│   │   └── Dashboard.vue      ✅ Main dashboard
│   ├── stores/
│   │   └── auth.ts            ✅ Pinia auth store
│   ├── router/
│   │   └── index.ts           ✅ Vue Router com guards
│   ├── App.vue                ✅ Root component
│   └── main.ts                ✅ Entry point
├── src-electron/
│   ├── main.ts                ✅ Electron main process
│   └── preload.ts             ✅ Electron preload (IPC)
├── public/
│   └── logo.png               📍 Colocar logo aqui
├── index.html
├── vite.config.ts
├── tsconfig.json
├── electron-builder.json      (para build Windows)
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Instalar Dependências
```bash
cd frontend
npm install
```

### 2. Desenvolvimento
```bash
npm run electron-dev
```
Abre a app **frameless 400×350** com:
- ✅ Barra draggable no topo
- ✅ Botão X para fechar
- ✅ Login page com username/password
- ✅ Comunica com backend em `http://localhost:3000`

### 3. Build para Produção
```bash
npm run electron-build
```
Cria installer Windows em `release/` pasta

---

## 🔐 Login Page (400×350)

### Features
- ✅ **Dimensões**: 400px × 350px (fixed)
- ✅ **Frameless**: Sem barra default do Windows
- ✅ **Draggable Bar**: "FleetGate - Login" no topo
- ✅ **Close Button**: X button canto superior direito
- ✅ **Logo Image**: Imagem no topo (de `/logo.png`)
- ✅ **Inputs**: Username + Password
- ✅ **Submit**: Botão "Login" com loading state
- ✅ **Error Message**: Mostrar erro se credenciais inválidas

### Código (src/views/Login.vue)

```vue
<template>
  <div class="login-container">
    <div class="drag-bar">
      <span class="window-title">FleetGate - Login</span>
    </div>
    <button class="close-btn" @click="closeWindow">✕</button>
    <img src="/logo.png" alt="FleetGate Logo" class="logo" />
    <form class="login-form" @submit.prevent="handleLogin">
      <input v-model="username" type="text" placeholder="Username" />
      <input v-model="password" type="password" placeholder="Password" />
      <button type="submit" :disabled="loading">
        {{ loading ? "A entrar..." : "Login" }}
      </button>
      <div v-if="error" class="error-message">{{ error }}</div>
    </form>
  </div>
</template>
```

### Dimensions
```css
.login-container {
  width: 100vw;    /* Preenche a janela */
  height: 100vh;   /* Preenche a janela */
}
```

A janela Electron é criada com **width: 400, height: 350**

---

## 🔑 Autenticação

### Login Flow

1. **User insere credentials** (username/password)
2. **Form submit** → `handleLogin()`
3. **API POST** → `http://localhost:3000/auth/login`
4. **Token salvo** → localStorage
5. **User redirect** → `/dashboard`

### Credenciais Demo

```
Email: manager@fleetgate.com
Password: password
```

### Pinia Store (auth.ts)

```typescript
export const useAuthStore = defineStore('auth', () => {
  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email, password
    })
    // Salva token + user em localStorage
    localStorage.setItem('access_token', response.data.access_token)
    return true
  }
})
```

---

## 🎨 Estilo Login Page

### Cores
- **Background**: White (#ffffff)
- **Button**: Blue (#0066cc)
- **Button Hover**: Dark Blue (#0052a3)
- **Text**: Gray (#333333)
- **Error**: Red (#d32f2f)

### Layout
- **Logo**: 280px × 230px, centrado, no topo
- **Form**: 260px max-width, centrado, abaixo da logo
- **Inputs**: Full width, padding 10px
- **Button**: Full width, padding 10px

### Responsive Behavior
- **Janela fixa**: 400×350 (não redimensionável)
- **Layout centralizado**: Use flexbox
- **Sem scrollbar**: Overflow hidden

---

## 🌐 API Integration

### Backend URL
```typescript
// src/stores/auth.ts
const API_URL = 'http://localhost:3000'
```

### Endpoints Usados

| Método | Endpoint | Uso |
|--------|----------|-----|
| POST | `/auth/login` | Login |
| GET | `/dashboard` | Stats |
| GET | `/vehicles` | List vehicles |
| POST | `/contracts` | Create contract |

---

## 🔧 Configuração Electron

### Main Process (src-electron/main.ts)

```typescript
const mainWindow = new BrowserWindow({
  width: 400,
  height: 350,
  frame: false,  // Janela frameless
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,
    contextIsolation: true
  }
})
```

### Preload (src-electron/preload.ts)

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('close-window')
})
```

### Close Button

```vue
function closeWindow() {
  if (window?.electronAPI?.closeWindow) {
    window.electronAPI.closeWindow()  // Electron
  } else {
    window.close()  // Browser fallback
  }
}
```

---

## 📋 Scripts

### Development
```bash
npm run dev              # Vite dev (http://localhost:5173)
npm run electron-dev    # Electron + Vite dev
```

### Production
```bash
npm run build            # Build frontend
npm run electron-build   # Build Windows installer
```

### Debug
```bash
npm run electron        # Run built app
```

---

## 🐛 Troubleshooting

### "API connection failed"
- Verificar se backend está running: `http://localhost:3000/health`
- Verificar URL em `src/stores/auth.ts`
- Check network tab no DevTools (F12)

### "Window não fecha"
- Verificar se Electron IPC funciona
- Check `src-electron/main.ts` e `preload.ts`

### "Logo não aparece"
- Adicionar `logo.png` em `frontend/public/`
- Verificar path em `Login.vue`: `<img src="/logo.png" />`

### "TypeScript errors"
```bash
npm install --save-dev typescript @types/node
```

---

## 📦 Build & Release

### Windows Installer

1. **Build frontend**:
```bash
npm run build
```

2. **Build instalador**:
```bash
npm run electron-build
```

3. **Resultado**: `release/FleetGate-1.0.0-Setup.exe`

### Configurações (electron-builder.json)
```json
{
  "win": {
    "target": ["nsis"]
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

---

## 🎯 Próximos Passos

1. ✅ **Login Page** - Done! 400×350, frameless
2. ✅ **Auth Store** - Done! Pinia
3. ✅ **Router** - Done! Vue Router
4. **Dashboard** - Próxima view
5. **Vehicles** - List / create
6. **Contracts** - List / create
7. **Transfers** - Inter-station
8. **Repairs** - Vehicle repairs
9. **Payments** - Payment processing
10. **Reports** - Analytics

---

## 📚 Resources

- [Vue 3 Docs](https://vuejs.org)
- [Electron Docs](https://www.electronjs.org/docs)
- [Vite Docs](https://vitejs.dev)
- [Pinia Docs](https://pinia.vuejs.org)
- [Vue Router Docs](https://router.vuejs.org)

---

## ✨ Notas Importantes

- **Window size**: 400×350 fixed (não redimensionável)
- **Frameless**: Sem barra padrão Windows
- **Draggable**: Barra no topo pode ser arrastada
- **Close button**: Botão X canto superior direito
- **No DevTools**: Remover `.webContents.openDevTools()` em produção
- **API**: Conecta a `http://localhost:3000` (backend NestJS)

---

**Status**: ✅ **PRONTO PARA USAR**  
**Data**: Fevereiro 17, 2026  
**Versão**: 1.0.0

```bash
cd frontend
npm install
npm run electron-dev
```

Abre a app! 🎉
