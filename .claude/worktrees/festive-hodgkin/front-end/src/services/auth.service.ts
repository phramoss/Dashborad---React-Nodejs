import { request } from './api'

interface LoginPayload {
  email: string
  senha: string
}

interface LoginResponse {
  token: string
  usuario: {
    id: number
    nome: string
    email: string
    perfil: 'admin' | 'vendedor' | 'gestor'
  }
}

export const login = (payload: LoginPayload) =>
  request<LoginResponse>({
    method: 'POST',
    url: '/usuarios/login',
    data: payload,
  })

export const logout = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
}

export const getStoredUser = () => {
  const raw = localStorage.getItem('auth_user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as LoginResponse['usuario']
  } catch {
    return null
  }
}

export const storeSession = (response: LoginResponse) => {
  localStorage.setItem('auth_token', response.token)
  localStorage.setItem('auth_user', JSON.stringify(response.usuario))
}
