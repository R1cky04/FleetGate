import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

interface User {
  id: number
  email: string
  name: string
  userCode?: string
  role: string
  companyCode?: string
  tenantDbMode?: 'SHARED' | 'DEDICATED'
}

const parseUserFromToken = (jwtToken: string): User | null => {
  try {
    const parts = jwtToken.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = JSON.parse(atob(parts[1]))
    return {
      id: Number(payload?.sub || 0),
      email: payload?.email || '',
      name: payload?.userCode || payload?.email || 'User',
      userCode: payload?.userCode || '',
      role: payload?.role || 'USER',
      companyCode: payload?.companyCode || '',
      tenantDbMode: payload?.tenantDbMode || 'SHARED',
    }
  } catch {
    return null
  }
}

const isTokenExpired = (jwtToken: string): boolean => {
  try {
    const parts = jwtToken.split('.')
    if (parts.length !== 3) {
      return true
    }

    const payload = JSON.parse(atob(parts[1]))
    if (!payload?.exp) {
      return true
    }

    const nowInSeconds = Math.floor(Date.now() / 1000)
    return Number(payload.exp) <= nowInSeconds
  } catch {
    return true
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)

  const API_URL = 'http://localhost:3000'

  // Initialize from localStorage
  const initAuth = () => {
    const savedToken = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')

    if (
      savedToken &&
      savedToken !== 'undefined' &&
      savedToken !== 'null' &&
      !isTokenExpired(savedToken)
    ) {
      token.value = savedToken

      if (savedUser) {
        user.value = JSON.parse(savedUser)
      } else {
        const tokenUser = parseUserFromToken(savedToken)
        if (!tokenUser) {
          token.value = null
          user.value = null
          localStorage.removeItem('access_token')
          localStorage.removeItem('accessToken')
          localStorage.removeItem('user')
          delete axios.defaults.headers.common['Authorization']
          return
        }
        user.value = tokenUser
        localStorage.setItem('user', JSON.stringify(tokenUser))
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
      return
    }

    token.value = null
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  const login = async (userCode: string, password: string): Promise<void> => {
    try {
      isLoading.value = true
      console.log('Attempting login with:', { userCode, password })

      const response = await axios.post(`${API_URL}/auth/login`, {
        userCode,
        password,
      })

      console.log('Login response:', response.data)
      const accessToken = response.data?.accessToken || response.data?.access_token
      const userData = response.data?.user

      if (!accessToken) {
        throw new Error('Token not returned by server')
      }

      token.value = accessToken
      user.value = userData

      // Save to localStorage
      localStorage.setItem('access_token', String(accessToken))
      localStorage.setItem('user', JSON.stringify(userData))

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    } catch (error: any) {
      console.error('Login error - Full details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      })
      
      // Throw error with meaningful message
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao fazer login'
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  const isAuthenticated = () => !!token.value && !!user.value

  return {
    user,
    currentUser: user, // Alias for compatibility
    token,
    isLoading,
    login,
    logout,
    initAuth,
    isAuthenticated,
  }
})
