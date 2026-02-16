import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Login from '@/views/Login.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/modules',
    name: 'Modules',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated()) {
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated()) {
    next('/modules')
  } else {
    next()
  }
})

export default router
