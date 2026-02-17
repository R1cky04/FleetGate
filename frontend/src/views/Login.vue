<template>
  <div class="login-container">
    <!-- BARRA INVISÍVEL PARA ARRASTAR A JANELA -->
    <div class="drag-bar">
      <img src="/logo.png" alt="FleetGate" class="header-logo" />
      <span class="window-title">FleetGate - Log In</span>
    </div>

    <!-- BOTÃO X -->
    <button class="close-btn" @click="closeWindow" title="Close">✕</button>
    
    <!-- LOGO GRANDE NO CENTRO -->
    <img src="/logo.png" alt="FleetGate Logo" class="logo-center" />
    
    <!-- FORM (mais para baixo) -->
    <form class="login-form" @submit.prevent="handleLogin">
      <input 
        v-model="username"
        type="text" 
        placeholder="Username" 
        @input="handleUsernameInput"
        @keyup.enter="handleLogin"
        required 
      />
      
      <div class="password-container">
        <input 
          v-model="password" 
          :type="showPassword ? 'text' : 'password'"
          placeholder="Password" 
          @keyup.enter="handleLogin"
          required 
        />
        <button 
          type="button" 
          class="toggle-password" 
          @click="showPassword = !showPassword"
          :title="showPassword ? 'Hide Password' : 'Show Password'"
        >
          <!-- Eye Icon (visible) -->
          <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <!-- Eye-off Icon (hidden) -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        </button>
      </div>

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
const showPassword = ref(false)
const loading = ref(false)
const error = ref("")

// Clear any previous session when login page loads
onMounted(() => {
  authStore.logout()
})

function handleUsernameInput(event: Event) {
  const target = event.target as HTMLInputElement
  const start = target.selectionStart
  const end = target.selectionEnd
  username.value = target.value.toUpperCase()
  
  // Restore cursor position on next tick
  setTimeout(() => {
    target.setSelectionRange(start, end)
  }, 0)
}

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
  box-sizing: border-box;
}

.header-logo {
  height: 24px;
  width: auto;
  margin-right: 8px;
  user-select: none;
  pointer-events: none;
}
/* LOGO GRANDE NO CENTRO */
.logo-center {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 240px;
  object-fit: contain;
  z-index: 5;
  pointer-events: none;
  user-select: none;
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

/* TEXTO "FleetGate" */
.window-title {
  color: #333;
  font-size: 14px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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

/* FORM CENTRADO */
.login-form {
  position: relative;
  width: 70%;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 20;
  -webkit-app-region: no-drag;
  margin-top: 120px;
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

/* PASSWORD CONTAINER */
.password-container {
  position: relative;
  display: flex;
  align-items: center;
}

.password-container input {
  flex: 1;
  padding-right: 40px;
}

.toggle-password {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: color 0.15s;
  line-height: 0;
}

.toggle-password:hover {
  color: #333;
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
