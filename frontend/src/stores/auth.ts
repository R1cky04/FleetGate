import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

interface User {
  id: number
  email: string
  name: string
  role: string
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

    if (savedToken && savedUser) {
      token.value = savedToken
      user.value = JSON.parse(savedUser)
    }
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
      const { accessToken, user: userData } = response.data

      token.value = accessToken
      user.value = userData

      // Save to localStorage
      localStorage.setItem('access_token', accessToken)
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
