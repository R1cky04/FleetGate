# FleetGate Desktop (Vue 3 + Electron)

Frontend desktop para FleetGate com **Vue 3 + Typescript + Electron**.

## 🎯 Features

- ✅ Login page 400x350px com drag bar
- ✅ electron API integration (close window)
- ✅ Pinia store para autenticação
- ✅ Vue Router com protected routes
- ✅ Axios para API calls
- ✅ Vite build system
- ✅ Electron builder para packaging

## 🚀 Como Usar

### Instalação
```bash
cd frontend
npm install
```

### Development
```bash
npm run electron-dev
```
- Abre a app em 400x350
- Login com username/password
- Comunica com backend em http://localhost:3000

### Build
```bash
npm run electron-build
```
- Cria installer Windows (.exe)
- Release folder com app

## 📁 Estrutura

```
frontend/
├── src/
│   ├── views/
│   │   ├── Login.vue       (400x350, drag bar, close btn)
│   │   └── Dashboard.vue   (main view after login)
│   ├── stores/
│   │   └── auth.ts         (Pinia store)
│   ├── router/
│   │   └── index.ts        (Vue Router)
│   ├── App.vue
│   └── main.ts
├── src-electron/
│   ├── main.ts             (Electron main process)
│   └── preload.ts          (Electron preload)
├── public/
│   └── logo.png
├── index.html
├── vite.config.ts
├── electron-builder.json
└── package.json
```

## 🔑 Login Credentials

```
Email: manager@fleetgate.com
Password: password
```

## 🛠️ Configuração API

Editar URL em `src/stores/auth.ts`:
```typescript
const API_URL = 'http://localhost:3000'
```

## 📦 Scripts

- `npm run dev` - Dev server Vite
- `npm run build` - Build frontend
- `npm run electron` - Run Electron (requires build)
- `npm run electron-dev` - Dev + Electron
- `npm run electron-build` - Build installer

## 🎨 UI Details

- **Login**: 400px × 350px, frameless window, draggable bar, close button
- **Colors**: Blue (#0066cc), Gray (#333), White
- **Font**: System fonts
- **Responsive**: Fixed size window

---

**Pronto para usar!** 🎉
