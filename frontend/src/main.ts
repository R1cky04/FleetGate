import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import axios from 'axios'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Initialize auth from localStorage
const authStore = useAuthStore()
authStore.initAuth()

const resolveToken = () => {
	const storeToken =
		typeof authStore.token === 'string'
			? authStore.token
			: (authStore.token as any)?.value

	const raw =
		storeToken ||
		localStorage.getItem('access_token') ||
		localStorage.getItem('accessToken') ||
		''

	const normalized = String(raw).trim().replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '')
	if (!normalized || normalized === 'undefined' || normalized === 'null') {
		return ''
	}

	return normalized
}

axios.interceptors.request.use((config) => {
	const token = resolveToken()
	const headers = (config.headers || {}) as any

	if (token) {
		headers.Authorization = `Bearer ${token}`
	} else {
		delete headers.Authorization
	}

	;(config as any).headers = headers

	return config
})

axios.interceptors.response.use(
	(response) => response,
	(error) => Promise.reject(error),
)

app.mount('#app')
