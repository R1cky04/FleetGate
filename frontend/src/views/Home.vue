<template>
  <div class="modules-container">
    <!-- DRAG BAR -->
    <div class="drag-bar">
      <img src="/logo.png" alt="FleetGate" class="header-logo" />
      <span class="window-title">FleetGate - Modules</span>
    </div>

    <!-- CLOSE BUTTON -->
    <button class="close-btn" @click="handleExit" title="Close">✕</button>

    <div class="content">
      <div class="modules-grid">
        <button class="module-card fleet-management" @click="openModule('fleet')">
        </button>

        <button class="module-card rent-a-car" @click="openModule('rentacar')">
        </button>

        <button class="module-card system-maintenance" @click="openModule('maintenance')">
        </button>

        <button class="module-card language" @click="openModule('language')">
        </button>

        <button class="module-card change-user" @click="changeUser">
        </button>

        <button class="module-card logout" @click="handleExit">
        </button>
      </div>
    </div>

    <!-- ACCESS DENIED MODAL -->
    <div v-if="showAccessModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Access Denied</h2>
        </div>
        <div class="modal-body">
          <p>Only System Administrators can access System Maintenance.</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn" @click="closeModal">OK</button>
        </div>
      </div>
    </div>

    <!-- FOOTER INFO -->
    <div class="footer-info">
      <div class="clock">{{ currentDate }} {{ currentTime }}</div>
      <span class="user-info">User: {{ userName }}</span>
      <span class="user-role">Role: {{ userRole }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const userName = ref('Guest')
const userRole = ref('USER')
const currentTime = ref('')
const currentDate = ref('')
const showAccessModal = ref(false)

onMounted(() => {
  authStore.initAuth()

  if (!authStore.isAuthenticated()) {
    router.push('/login')
  } else {
    const currentUser = (authStore.user as any)?.value ?? authStore.user
    userName.value = currentUser?.userCode || currentUser?.name || currentUser?.email || 'User'
    userRole.value = currentUser?.role || 'USER'
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
  
  if (module === 'maintenance') {
    // Check if user is IT role
    if (userRole.value !== 'IT') {
      showAccessModal.value = true
      return
    }
    // Special handling for maintenance - open new window
    if ((window as any).electronAPI?.openMaintenanceWindow) {
      (window as any).electronAPI.openMaintenanceWindow()
    }
    return
  }
  
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

const closeModal = () => {
  showAccessModal.value = false
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
  min-height: 42px;
  flex: 0 0 42px;
}

.window-title {
  color: #333;
  font-size: 14px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  pointer-events: none;
  user-select: none;
}

.header-logo {
  height: 24px;
  width: auto;
  margin-right: 8px;
  user-select: none;
  pointer-events: none;
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 20px 100px 20px;
  position: relative;
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
  grid-template-columns: repeat(3, 140px);
  grid-template-rows: repeat(2, 140px);
  gap: 16px;
  align-items: center;
  justify-items: center;
  margin-top: 80px;
}

.module-card {
  background: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 4px 2px;
  position: relative;
  overflow: hidden;
  z-index: 5;
  width: 100%;
  height: 100%;
}

.module-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  opacity: 0;
  transition: opacity 0.25s;
  z-index: -1;
  pointer-events: none;
}

.module-card:hover::before {
  opacity: 0;
}

.module-card:hover {
  transform: translateY(-4px) scale(1.02);
  background: #ffffff;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.module-card:active {
  transform: translateY(-1px) scale(1.005);
}

.module-card.fleet-management {
  background-image: url('/fleet-management.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.module-card.rent-a-car {
  background-image: url('/ret-a-car.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.module-card.language {
  background-image: url('/language.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.module-card.system-maintenance {
  background-image: url('/sys-maintenance.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.module-card.change-user {
  background-image: url('/change-user.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.module-card.logout {
  background-image: url('/log-out.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.footer-info {
  position: fixed;
  bottom: 8px;
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  font-size: 14px;
  color: #999;
  user-select: none;
  font-weight: 600;
}

.user-info {
  font-size: 14px;
  color: #999;
  user-select: none;
  font-weight: 600;
}

.user-role {
  font-size: 14px;
  color: #999;
  user-select: none;
  font-weight: 600;
}

.clock {
  font-size: 14px;
  color: #999;
  font-family: 'Courier New', monospace;
  user-select: none;
  font-weight: 600;
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

/* MODAL STYLES */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  -webkit-app-region: no-drag;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90%;
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f9f9f9;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #dc3545;
  font-weight: 600;
}

.modal-body {
  padding: 20px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.modal-body p {
  margin: 0;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #e0e0e0;
  background: #f9f9f9;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.modal-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  color: #333;
  border: 1px solid #c0c0c0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-app-region: no-drag;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  letter-spacing: 0.3px;
}

.modal-btn:hover {
  background: linear-gradient(135deg, #efefef 0%, #dcdcdc 100%);
  border-color: #a0a0a0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.modal-btn:active {
  background: linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 3px rgba(0, 0, 0, 0.1);
  transform: translateY(1px);
}
</style>
