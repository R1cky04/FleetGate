<template>
  <div class="modules-container">
    <!-- DRAG BAR -->
    <div class="drag-bar">
      <span class="window-title">FleetGate - Modules</span>
    </div>

    <!-- CLOSE BUTTON -->
    <button class="close-btn" @click="handleExit" title="Close">✕</button>

    <div class="content">
      <!-- LOGO AREA -->
      <div class="logo-area">
        <img src="/logo.png" alt="FleetGate Logo" class="logo-img" />
      </div>

      <div class="modules-grid">
        <button class="module-card fleet-management" @click="openModule('fleet')">
          <div class="module-name">Fleet Management</div>
        </button>

        <button class="module-card rent-a-car" @click="openModule('rentacar')">
          <div class="module-name">Rent a Car</div>
        </button>

        <button class="module-card" @click="openModule('maintenance')">
          <div class="module-icon">🔧</div>
          <div class="module-name">System Maintenance</div>
        </button>

        <button class="module-card language" @click="openModule('language')">
          <div class="module-name">Language</div>
        </button>

        <button class="module-card" @click="changeUser">
          <div class="module-icon">👤</div>
          <div class="module-name">Change User</div>
        </button>

        <button class="module-card logout" @click="handleExit">
          <div class="module-icon">🚪</div>
          <div class="module-name">Exit</div>
        </button>
      </div>

      <!-- USER INFO -->
      <div class="user-info">
        <span>User: {{ userName }}</span>
      </div>
    </div>

    <!-- CLOCK -->
    <div class="clock">{{ currentDate }} {{ currentTime }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const userName = ref('Guest')
const currentTime = ref('')
const currentDate = ref('')

onMounted(() => {
  // Verificar se o usuário está autenticado
  const user = localStorage.getItem('user')
  if (!user) {
    router.push('/login')
  } else {
    try {
      const userData = JSON.parse(user)
      userName.value = userData.email || userData.name || userData.userCode || 'User'
    } catch (e) {
      userName.value = user
    }
  }

  // Update clock every second
  const updateClock = () => {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    currentDate.value = `${day}/${month}/${year}`
    currentTime.value = `${hours}:${minutes}:${seconds}`
  }
  
  updateClock()
  setInterval(updateClock, 1000)
})

const openModule = (module: string) => {
  console.log('Opening module:', module)
  // Aqui você pode abrir uma nova janela ou navegar para a rota específica
  if ((window as any).electronAPI?.openModule) {
    (window as any).electronAPI.openModule(module)
      .catch((error: Error) => {
        console.error('Error opening module:', error)
        alert(`Failed to open ${module} module: ${error.message}`)
      })
  }
}

const changeUser = () => {
  authStore.logout()
  
  // Immediate transition
  if ((window as any).electronAPI?.returnToLogin) {
    (window as any).electronAPI.returnToLogin()
  } else {
    router.push('/login')
  }
}

const handleExit = () => {
  authStore.logout()
  
  // Immediate transition
  if ((window as any).electronAPI?.returnToLogin) {
    (window as any).electronAPI.returnToLogin()
  } else {
    router.push('/login')
  }
}
</script>

<style scoped>
.modules-container {
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.drag-bar {
  width: 100%;
  app-region: drag;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  padding-left: 10px;
  z-index: 40;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  height: 42px;
}

.window-title {
  color: #333;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
  user-select: none;
}

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

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: -300px 20px 40px 20px;
  position: relative;
}

.logo-area {
  text-align: center;
  margin-top: 8px;
  margin-bottom: -34px;
  position: relative;
  z-index: 10;
}

.logo-img {
  height: 120px;
  width: auto;
  user-select: none;
  object-fit: contain;
}

.title {
  color: #333;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  text-align: center;
  user-select: none;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 4px;
  width: 95%;
  height: 165px;
  justify-self: center;
  align-self: center;
  margin: 15px auto 0 auto;
}

.module-card {
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  padding: 4px 2px;
  position: relative;
  overflow: hidden;
  z-index: 5;
}

.module-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 150, 255, 0.1) 0%, rgba(100, 200, 255, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.25s;
  z-index: -1;
  pointer-events: none;
}

.module-card:hover::before {
  opacity: 1;
}

.module-card:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 1);
}

.module-card:active {
  transform: translateY(-1px) scale(1.005);
}

.module-card.logout:hover {
  background: rgba(255, 230, 230, 1);
}

.module-card.logout:hover::before {
  background: linear-gradient(135deg, rgba(255, 0, 0, 0.1) 0%, rgba(200, 0, 0, 0.1) 100%);
}

.module-card.fleet-management::before {
  background: rgba(0, 0, 0, 0.3);
  opacity: 1;
  z-index: -1;
}

.module-card.fleet-management:hover::before {
  background: rgba(0, 0, 0, 0.1);
  opacity: 1;
}

.module-card.fleet-management .module-name {
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  font-weight: 700;
  z-index: 2;
}

.module-card.rent-a-car {
  background-image: url('/rent-a-car.png');
  background-size: 70%;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.module-card.rent-a-car::before {
  background: rgba(0, 0, 0, 0.3);
  opacity: 1;
  z-index: -1;
}

.module-card.rent-a-car:hover::before {
  background: rgba(0, 0, 0, 0.1);
  opacity: 1;
}

.module-card.rent-a-car .module-name {
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  font-weight: 700;
  z-index: 2;
}

.module-card.language {
  background-image: url('/language.png');
  background-size: 70%;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.module-card.language::before {
  background: rgba(0, 0, 0, 0.3);
  opacity: 1;
  z-index: -1;
}

.module-card.language:hover::before {
  background: rgba(0, 0, 0, 0.1);
  opacity: 1;
}

.module-card.language .module-name {
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  font-weight: 700;
  z-index: 2;
}

.user-info {
  position: fixed;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #666;
  user-select: none;
  font-weight: 500;
}

.clock {
  position: fixed;
  bottom: 8px;
  left: 12px;
  font-size: 12px;
  color: #666;
  font-family: 'Courier New', monospace;
  user-select: none;
  font-weight: 500;
}

.module-icon {
  font-size: 14px;
  user-select: none;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.module-name {
  font-size: 8px;
  font-weight: 600;
  color: #333;
  text-align: center;
  user-select: none;
  line-height: 1.1;
  position: relative;
  z-index: 1;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Fast load animation */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.module-card {
  animation: fadeInUp 0.2s ease-out backwards;
}

.module-card:nth-child(1) { animation-delay: 0s; }
.module-card:nth-child(2) { animation-delay: 0.02s; }
.module-card:nth-child(3) { animation-delay: 0.04s; }
.module-card:nth-child(4) { animation-delay: 0.06s; }
.module-card:nth-child(5) { animation-delay: 0.08s; }
.module-card:nth-child(6) { animation-delay: 0.1s; }
</style>
