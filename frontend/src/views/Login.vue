<template>
  <div class="login-container">
    <!-- BARRA INVISÍVEL PARA ARRASTAR A JANELA -->
    <div class="drag-bar">
      <span class="window-title">FleetGate - Login</span>
    </div>

    <!-- BOTÃO X -->
    <button class="close-btn" @click="closeWindow" title="Close">✕</button>

    <!-- LOGO (mais para cima) -->
    <img v-if="logoLoaded" :src="logoUrl" @error="logoError" alt="FleetGate Logo" class="logo" />
    <div v-else class="logo-placeholder">
      <span style="font-size: 48px; color: #0066cc;">🚗</span>
    </div>
    
    <!-- FORM (mais para baixo) -->
    <form class="login-form" @submit.prevent="handleLogin">
      <input 
        v-model="username" 
        type="text" 
        placeholder="User Code (ADMIN)" 
        @keyup.enter="handleLogin"
        required 
      />
      <input 
        v-model="password" 
        type="password" 
        placeholder="Password (admin123)" 
        @keyup.enter="handleLogin"
        required 
      />

      <button type="submit" class="btn-login" :disabled="loading">
        {{ loading ? "A entrar..." : "Login" }}
      </button>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/auth"

declare global {
  interface Window {
    electronAPI?: {
      openModulesWindow: () => void
      closeWindow: () => void
    }
  }
}

const router = useRouter()
const authStore = useAuthStore()

const username = ref("")
const password = ref("")
const loading = ref(false)
const error = ref("")
const logoLoaded = ref(true)
const logoUrl = ref('./logo.png')

// Clear any previous session when login page loads
onMounted(() => {
  authStore.logout()
})

async function handleLogin() {
  error.value = ""
  loading.value = true

  try {
    await authStore.login(username.value, password.value)
    
    // Login successful - open modules window
    if (window?.electronAPI?.openModulesWindow) {
      window.electronAPI.openModulesWindow()
    } else {
      // Fallback for browser
      router.push("/modules")
    }
  } catch (err: any) {
    error.value = err.message || "Erro ao fazer login"
  } finally {
    loading.value = false
  }
}

function closeWindow() {
  if (window?.electronAPI?.closeWindow) {
    window.electronAPI.closeWindow()
  } else {
    window.close()
  }
}

function logoError() {
  logoLoaded.value = false
  console.log('Logo failed to load, using emoji fallback')
}
</script>

<style scoped>
/* FUNDO BRANCO */
.login-container {
  width: 100vw;
  height: 100vh;
  background: white;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* BARRA ARRÁSTAVEL */
.drag-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 42px;
  width: 100%;
  app-region: drag;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  padding-left: 10px;
  z-index: 40;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

/* TEXTO "FleetGate - Login" */
.window-title {
  color: #333;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
  user-select: none;
}

/* BOTÃO X */
.close-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  transition: 0.15s;
  z-index: 60;
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #000;
  background: #e0e0e0;
  border-radius: 4px;
}

/* LOGO MAIS PARA CIMA */
.logo, .logo-placeholder {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  height: 230px;
  object-fit: contain;
  z-index: 5;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* FORM MAIS PARA BAIXO */
.login-form {
  position: relative;
  width: 70%;
  max-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 20;
  margin-top: 120px;
  -webkit-app-region: no-drag;
}

/* INPUTS */
.login-form input {
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  -webkit-app-region: no-drag;
  outline: none;
  transition: 0.15s;
}

.login-form input:focus {
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

/* BOTÃO LOGIN */
.btn-login {
  padding: 10px 12px;
  background: #0066cc;
  color: white;
  border: none;
  font-size: 15px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.15s;
  -webkit-app-region: no-drag;
}

.btn-login:hover:not(:disabled) {
  background: #0052a3;
}

.btn-login:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ERROR MESSAGE */
.error-message {
  color: #d32f2f;
  font-size: 12px;
  text-align: center;
  margin-top: 4px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
