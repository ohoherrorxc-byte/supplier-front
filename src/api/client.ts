import axios from 'axios'

const TOKEN_KEY = 'srm_token'

/** 获取本地存储的 token */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/** 保存 token */
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

/** 清除 token */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/** 开发环境走 Vite 代理 /api -> 后端；生产可改为同域或 Nginx 反代 */
export const http = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
  paramsSerializer: (params) => {
    // 自定义参数序列化：将数组参数以 foo=1&foo=2 格式发送，而不是 foo[]=1&foo[]=2
    const searchParams = new URLSearchParams()
    for (const key in params) {
      const value = params[key]
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v))
      } else if (value !== undefined && value !== null) {
        searchParams.append(key, value)
      }
    }
    return searchParams.toString()
  }
})

// 请求拦截器：自动附加 Authorization header
http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// 响应拦截器：处理 401 未授权
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken()
      // 避免重复跳转，或在非登录页面时跳转
      if (!window.location.pathname.includes('/login')) {
        window.location.href = import.meta.env.VITE_LOGIN_REDIRECT || '/supplier/login'
      }
    }
    const msg =
      err.response?.data?.message ||
      err.message ||
      '请求失败'
    return Promise.reject(Object.assign(err, { friendlyMessage: msg }))
  }
)
