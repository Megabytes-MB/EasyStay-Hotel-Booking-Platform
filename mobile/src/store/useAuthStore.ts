import Taro from '@tarojs/taro'
import { create } from 'zustand'
import {
  login as loginApi,
  wechatPhoneLogin as wechatPhoneLoginApi,
  register as registerApi,
  type UserData,
} from '../services/auth'

export interface UserInfo {
  id: number
  name: string
  username?: string
  phone: string
  avatar: string
  role?: string
  favorites: number[]
  wechatBound?: boolean
}

interface AuthState {
  token: string
  userInfo: UserInfo | null
  isLogin: boolean
  login: (payload: { username: string; password: string }) => Promise<boolean>
  loginWithWechat: () => Promise<boolean>
  loginWithWechatPhone: (phoneCode: string) => Promise<boolean>
  register: (payload: {
    username: string
    password: string
    phone?: string
    verifyCode?: string
  }) => Promise<boolean>
  logout: () => void
  toggleFavorite: (hotelId: number) => void
  updateUserInfo: (info: Partial<UserInfo>) => void
}

const STORAGE_KEY = 'easy-stay-auth'

const readStorage = (): Pick<AuthState, 'token' | 'userInfo' | 'isLogin'> => {
  const cached = Taro.getStorageSync(STORAGE_KEY)
  if (!cached) {
    return { token: '', userInfo: null, isLogin: false }
  }
  return cached
}

const normalizeUserInfo = (user: UserData): UserInfo => ({
  id: user.id,
  name: user.nickname || user.username,
  username: user.username,
  phone: user.phone || '',
  avatar:
    user.avatar ||
    'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200',
  role: user.role,
  favorites: [],
  wechatBound: user.wechatBound,
})

const saveAuthData = (
  set: (updater: any) => void,
  token: string,
  user: UserData
) => {
  const next = {
    token,
    isLogin: true,
    userInfo: normalizeUserInfo(user),
  }
  Taro.setStorageSync(STORAGE_KEY, next)
  set(next)
}

export const useAuthStore = create<AuthState>(set => ({
  ...readStorage(),
  login: async ({ username, password }) => {
    try {
      const response = await loginApi({ username, password })
      if (response.code === 200 && response.data) {
        saveAuthData(set, response.data.token, response.data.user)
        Taro.showToast({ title: '登录成功', icon: 'success' })
        return true
      }
      Taro.showToast({ title: response.message || '登录失败', icon: 'none' })
      return false
    } catch (error: any) {
      console.error('Login error:', error)
      Taro.showToast({ title: error.message || '登录失败', icon: 'none' })
      return false
    }
  },
  loginWithWechatPhone: async phoneCode => {
    try {
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        Taro.showToast({ title: '请在微信小程序内使用', icon: 'none' })
        return false
      }

      if (!phoneCode) {
        Taro.showToast({ title: '未获取到手机号授权', icon: 'none' })
        return false
      }

      const loginRes = await Taro.login()
      if (!loginRes.code) {
        Taro.showToast({ title: '获取微信登录态失败', icon: 'none' })
        return false
      }

      let profile: { nickName?: string; avatarUrl?: string } = {}
      try {
        const profileRes = await Taro.getUserProfile({
          desc: '用于完善账号昵称与头像',
        })
        profile = profileRes.userInfo || {}
      } catch {
        // Profile authorization is optional for login.
      }

      const response = await wechatPhoneLoginApi({
        loginCode: loginRes.code,
        phoneCode,
        nickname: profile.nickName,
        avatar: profile.avatarUrl,
      })

      if (response.code === 200 && response.data) {
        saveAuthData(set, response.data.token, response.data.user)
        Taro.showToast({ title: '微信手机号登录成功', icon: 'success' })
        return true
      }

      Taro.showToast({
        title: response.message || '微信手机号登录失败',
        icon: 'none',
      })
      return false
    } catch (error: any) {
      console.error('WeChat phone login error:', error)
      Taro.showToast({
        title: error.message || '微信手机号登录失败',
        icon: 'none',
      })
      return false
    }
  },
  // Backward compatibility for stale builds still calling loginWithWechat().
  loginWithWechat: async () => {
    try {
      if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
        Taro.showToast({ title: '请在微信小程序内使用', icon: 'none' })
        return false
      }

      const loginRes = await Taro.login()
      if (!loginRes.code) {
        Taro.showToast({ title: '获取微信登录态失败', icon: 'none' })
        return false
      }

      let profile: { nickName?: string; avatarUrl?: string } = {}
      try {
        const profileRes = await Taro.getUserProfile({
          desc: '用于完善账号昵称与头像',
        })
        profile = profileRes.userInfo || {}
      } catch {
        // Profile authorization is optional for login.
      }

      const response = await wechatPhoneLoginApi({
        loginCode: loginRes.code,
        nickname: profile.nickName,
        avatar: profile.avatarUrl,
      })

      if (response.code === 200 && response.data) {
        saveAuthData(set, response.data.token, response.data.user)
        Taro.showToast({ title: '微信登录成功', icon: 'success' })
        return true
      }

      Taro.showToast({
        title: response.message || '微信登录失败',
        icon: 'none',
      })
      return false
    } catch (error: any) {
      console.error('WeChat login error:', error)
      Taro.showToast({
        title: error.message || '微信登录失败',
        icon: 'none',
      })
      return false
    }
  },
  register: async ({ username, password, phone, verifyCode }) => {
    try {
      const response = await registerApi({
        username,
        password,
        phone,
        verifyCode,
      })
      if (response.code === 200) {
        Taro.showToast({ title: '注册成功，请登录', icon: 'success' })
        return true
      }
      Taro.showToast({ title: response.message || '注册失败', icon: 'none' })
      return false
    } catch (error: any) {
      console.error('Register error:', error)
      Taro.showToast({ title: error.message || '注册失败', icon: 'none' })
      return false
    }
  },
  logout: () =>
    set(() => {
      const next = { token: '', userInfo: null, isLogin: false }
      Taro.removeStorageSync(STORAGE_KEY)
      return next
    }),
  toggleFavorite: hotelId =>
    set(state => {
      if (!state.userInfo) return state
      const exists = state.userInfo.favorites.includes(hotelId)
      const favorites = exists
        ? state.userInfo.favorites.filter(id => id !== hotelId)
        : [...state.userInfo.favorites, hotelId]
      const next = {
        ...state,
        userInfo: { ...state.userInfo, favorites },
      }
      Taro.setStorageSync(STORAGE_KEY, next)
      return next
    }),
  updateUserInfo: info =>
    set(state => {
      if (!state.userInfo) return state
      const next = {
        ...state,
        userInfo: { ...state.userInfo, ...info },
      }
      Taro.setStorageSync(STORAGE_KEY, next)
      return next
    }),
}))
