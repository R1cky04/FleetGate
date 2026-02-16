<template>
  <div class="dashboard-container">
    <header class="header">
      <h1>Dashboard</h1>
      <button class="btn-logout" @click="handleLogout">Sair</button>
    </header>

    <main class="content">
      <h2>Bem-vindo, {{ authStore.user?.name }}!</h2>
      <p>Role: {{ authStore.user?.role }}</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.dashboard-container {
  width: 100%;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.header {
  background: white;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.btn-logout {
  padding: 8px 16px;
  background: #d32f2f;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: 0.15s;
}

.btn-logout:hover {
  background: #b71c1c;
}

.content {
  padding: 20px;
}

.content h2 {
  margin: 0 0 10px 0;
  color: #333;
}

.content p {
  color: #666;
  margin: 0;
}
</style>
