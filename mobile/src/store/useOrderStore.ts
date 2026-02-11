import Taro from '@tarojs/taro'
import { create } from 'zustand'

export interface OrderItem {
  id: number
  hotelId: number
  hotelName: string
  roomName: string
  checkIn: string
  checkOut: string
  nights: number
  status: string
  createdAt: number
}

interface OrderState {
  orders: OrderItem[]
  addOrder: (payload: Omit<OrderItem, 'id' | 'createdAt'>) => void
  clearOrders: () => void
}

const STORAGE_KEY = 'easy-stay-orders'

const readStorage = (): Pick<OrderState, 'orders'> => {
  const cached = Taro.getStorageSync(STORAGE_KEY)
  if (!cached || !Array.isArray(cached.orders)) {
    return { orders: [] }
  }
  return { orders: cached.orders }
}

export const useOrderStore = create<OrderState>(set => ({
  ...readStorage(),
  addOrder: payload =>
    set(state => {
      const nextOrder: OrderItem = {
        ...payload,
        id: Date.now(),
        createdAt: Date.now()
      }
      const next = { orders: [nextOrder, ...state.orders] }
      Taro.setStorageSync(STORAGE_KEY, next)
      return next
    }),
  clearOrders: () =>
    set(() => {
      const next = { orders: [] }
      Taro.setStorageSync(STORAGE_KEY, next)
      return next
    })
}))

