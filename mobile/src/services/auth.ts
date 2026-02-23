import { post } from '../utils/request'
import { API_PATHS } from '../config/api'

export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams {
  username: string
  password: string
  phone?: string
  verifyCode?: string
}

export interface WechatPhoneLoginParams {
  loginCode: string
  phoneCode?: string
  nickname?: string
  avatar?: string
}

export interface UserData {
  id: number
  username: string
  role: string
  phone?: string
  avatar?: string
  nickname?: string
  wechatBound?: boolean
}

export interface LoginResponse {
  token: string
  user: UserData
}

export const login = async (params: LoginParams) =>
  post<LoginResponse>(API_PATHS.AUTH_LOGIN, params, {
    showLoading: true,
    loadingText: '登录中...',
  })

export const wechatPhoneLogin = async (params: WechatPhoneLoginParams) =>
  post<LoginResponse>(API_PATHS.AUTH_WECHAT_LOGIN, params, {
    showLoading: true,
    loadingText: '微信登录中...',
  })

export const register = async (params: RegisterParams) =>
  post<UserData>(
    API_PATHS.AUTH_REGISTER,
    {
      ...params,
      role: 'user',
    },
    {
      showLoading: true,
      loadingText: '注册中...',
    }
  )

export const sendCode = async (phone: string) =>
  post<{ expiresIn: number; requestId?: string; bizId?: string }>(API_PATHS.AUTH_SEND_CODE, { phone }, {
    showLoading: true,
    loadingText: '发送中...',
  })

export default {
  login,
  wechatPhoneLogin,
  register,
  sendCode,
}
