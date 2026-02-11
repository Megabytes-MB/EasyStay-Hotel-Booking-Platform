import Taro from '@tarojs/taro'
import { create } from 'zustand'

export interface UserInfo {
  id: number
  name: string
  phone: string
  avatar: string
  favorites: number[]
}

interface AuthState {
  token: string
  userInfo: UserInfo | null
  isLogin: boolean
  login: (payload: { phone: string }) => void
  logout: () => void
  toggleFavorite: (hotelId: number) => void
}

const STORAGE_KEY = 'easy-stay-auth'

const readStorage = (): Pick<AuthState, 'token' | 'userInfo' | 'isLogin'> => {
  const cached = Taro.getStorageSync(STORAGE_KEY)
  if (!cached) {
    return { token: '', userInfo: null, isLogin: false }
  }
  return cached
}

export const useAuthStore = create<AuthState>(set => ({
  ...readStorage(),
  login: ({ phone }) =>
    set(() => {
      const next = {
        token: `token_${Date.now()}`,
        isLogin: true,
        userInfo: {
          id: 1,
          name: '旅行者',
          phone,
          avatar:
            'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200',
          favorites: []
        }
      }
      Taro.setStorageSync(STORAGE_KEY, next)
      return next
    }),
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
        userInfo: { ...state.userInfo, favorites }
      }
      Taro.setStorageSync(STORAGE_KEY, next)
      return next
    })
}))
