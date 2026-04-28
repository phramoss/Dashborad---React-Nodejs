import axios, { type AxiosRequestConfig, type AxiosError } from 'axios'

// VITE_API_URL = '/api'  (relativo — usa proxy do Vite em dev)
// Em produção: URL absoluta do backend
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// Log de requests em desenvolvimento — ajuda a debugar
if (import.meta.env.DEV) {
  apiClient.interceptors.request.use((config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params ?? '')
    return config
  })
}

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (import.meta.env.DEV) {
      const url = error.config?.url
      const status = error.response?.status
      console.error(`[API Error] ${status} ${url}`, error.response?.data)
    }
    return Promise.reject(error)
  },
)

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient(config)
  return response.data
}
