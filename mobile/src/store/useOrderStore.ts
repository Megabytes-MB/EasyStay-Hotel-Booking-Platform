import Taro from '@tarojs/taro'
import { create } from 'zustand'
import {
  getBookings,
  createBooking,
  cancelBooking,
  type Booking,
  type CreateBookingParams,
} from '../services/booking'
import { useAuthStore } from './useAuthStore'
import {
  getBookingStatusConfig,
  getBookingStatusLabel,
  getBookingStatusTone,
  type BookingStatusCode,
} from '../constants/bookingStatus'

export interface OrderItem {
  id: number
  hotelId: number
  hotelName: string
  roomName?: string
  roomType?: string
  checkIn: string
  checkOut: string
  checkInDate?: string
  checkOutDate?: string
  nights: number
  guestName?: string
  guestPhone?: string
  numberOfGuests?: number
  totalPrice?: number
  statusCode: BookingStatusCode
  statusTone: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'default'
  status: string
  createdAt: number
}

interface OrderState {
  orders: OrderItem[]
  loading: boolean
  addOrder: (payload: CreateBookingParams) => Promise<boolean>
  loadOrders: () => Promise<void>
  cancelOrder: (id: number) => Promise<boolean>
  deleteOrder: (id: number) => Promise<boolean>
  clearOrders: () => void
}

const STORAGE_KEY = 'easy-stay-orders'
const HIDDEN_ORDER_IDS_KEY = 'easy-stay-hidden-order-ids'

const LEGACY_STATUS_LABEL_MAP: Record<string, BookingStatusCode> = {
  待确认: 'pending',
  已确认: 'confirmed',
  已取消: 'cancelled',
  已完成: 'completed',
  已入住: 'checked_in',
}

const inferStatusCode = (statusCode?: BookingStatusCode, statusLabel?: string): BookingStatusCode => {
  if (statusCode) return statusCode
  if (!statusLabel) return 'pending'
  return LEGACY_STATUS_LABEL_MAP[statusLabel] || statusLabel
}

const getNights = (checkInDate?: string, checkOutDate?: string) => {
  if (!checkInDate || !checkOutDate) return 1
  const start = new Date(checkInDate)
  const end = new Date(checkOutDate)
  const diff = end.getTime() - start.getTime()
  if (Number.isNaN(diff) || diff <= 0) return 1
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const enrichOrderStatus = (
  order: Omit<OrderItem, 'statusCode' | 'statusTone' | 'status'> & {
    statusCode?: BookingStatusCode
    status?: string
  }
): OrderItem => {
  const resolvedStatusCode = inferStatusCode(order.statusCode, order.status)
  return {
    ...order,
    statusCode: resolvedStatusCode,
    statusTone: getBookingStatusTone(resolvedStatusCode),
    status: getBookingStatusLabel(resolvedStatusCode),
  }
}

const transformBookingToOrder = (booking: Booking): OrderItem => {
  const checkInDate = booking.checkInDate || booking.checkIn || ''
  const checkOutDate = booking.checkOutDate || booking.checkOut || ''

  return enrichOrderStatus({
    id: booking.id,
    hotelId: booking.hotelId,
    hotelName: booking.hotel?.name || '未知酒店',
    roomName: booking.roomType,
    roomType: booking.roomType,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    checkInDate,
    checkOutDate,
    nights: getNights(checkInDate, checkOutDate),
    guestName: booking.guestName,
    guestPhone: booking.guestPhone,
    numberOfGuests: booking.numberOfGuests,
    totalPrice: booking.totalPrice,
    statusCode: booking.status,
    createdAt: new Date(booking.createdAt).getTime(),
  })
}

const readStorage = (): Pick<OrderState, 'orders'> => {
  const cached = Taro.getStorageSync(STORAGE_KEY)
  if (!cached || !Array.isArray(cached.orders)) {
    return { orders: [] }
  }

  const orders = cached.orders
    .filter((item: any) => item && typeof item.id === 'number')
    .map((item: any) =>
      enrichOrderStatus({
        ...item,
        statusCode: item.statusCode,
        status: item.status,
      })
    )

  return { orders }
}

const persistOrders = (orders: OrderItem[]) => {
  Taro.setStorageSync(STORAGE_KEY, { orders })
}

const readHiddenOrderIds = (): number[] => {
  const cached = Taro.getStorageSync(HIDDEN_ORDER_IDS_KEY)
  if (!Array.isArray(cached)) return []
  return cached.filter((id: unknown) => typeof id === 'number')
}

const persistHiddenOrderIds = (ids: number[]) => {
  Taro.setStorageSync(HIDDEN_ORDER_IDS_KEY, ids)
}

const getBookingQueryParams = () => {
  const { userInfo } = useAuthStore.getState()
  if (!userInfo) return undefined

  return {
    role: userInfo.role,
    userId: userInfo.id,
  }
}

export const useOrderStore = create<OrderState>(set => ({
  ...readStorage(),
  loading: false,
  addOrder: async (payload: CreateBookingParams) => {
    try {
      set({ loading: true })
      const response = await createBooking(payload)

      if (response.code === 200 && response.data) {
        const newOrder = transformBookingToOrder(response.data)

        const hiddenOrderIds = readHiddenOrderIds()
        if (hiddenOrderIds.includes(newOrder.id)) {
          persistHiddenOrderIds(hiddenOrderIds.filter(id => id !== newOrder.id))
        }

        set(state => {
          const orders = [newOrder, ...state.orders]
          persistOrders(orders)
          return { orders, loading: false }
        })

        Taro.showToast({
          title: '预订成功',
          icon: 'success',
        })
        return true
      }

      set({ loading: false })
      Taro.showToast({
        title: response.message || '预订失败',
        icon: 'none',
      })
      return false
    } catch (error: any) {
      set({ loading: false })
      console.error('Create booking error:', error)
      Taro.showToast({
        title: error.message || '预订失败',
        icon: 'none',
      })
      return false
    }
  },
  loadOrders: async () => {
    try {
      set({ loading: true })
      const response = await getBookings(getBookingQueryParams())

      if (response.code === 200 && response.data) {
        const hiddenOrderIds = new Set(readHiddenOrderIds())
        const orders = response.data
          .filter(booking => !hiddenOrderIds.has(booking.id))
          .map(transformBookingToOrder)

        persistOrders(orders)
        set({ orders, loading: false })
      } else {
        set({ loading: false })
      }
    } catch (error) {
      set({ loading: false })
      console.error('Load orders error:', error)
    }
  },
  cancelOrder: async (id: number) => {
    try {
      set({ loading: true })
      const response = await cancelBooking(id)

      if (response.code === 200) {
        const cancelledConfig = getBookingStatusConfig('cancelled')
        set(state => {
          const orders = state.orders.map(order =>
            order.id === id
              ? {
                  ...order,
                  statusCode: 'cancelled',
                  statusTone: cancelledConfig.tone,
                  status: cancelledConfig.label,
                }
              : order
          )
          persistOrders(orders)
          return { orders, loading: false }
        })

        Taro.showToast({
          title: '取消成功',
          icon: 'success',
        })
        return true
      }

      set({ loading: false })
      Taro.showToast({
        title: response.message || '取消失败',
        icon: 'none',
      })
      return false
    } catch (error: any) {
      set({ loading: false })
      console.error('Cancel order error:', error)
      Taro.showToast({
        title: error.message || '取消失败',
        icon: 'none',
      })
      return false
    }
  },
  deleteOrder: async (id: number) => {
    try {
      set({ loading: true })

      const hiddenOrderIds = readHiddenOrderIds()
      if (!hiddenOrderIds.includes(id)) {
        persistHiddenOrderIds([...hiddenOrderIds, id])
      }

      set(state => {
        const orders = state.orders.filter(order => order.id !== id)
        persistOrders(orders)
        return { orders, loading: false }
      })

      Taro.showToast({
        title: '已从列表移除',
        icon: 'success',
      })
      return true
    } catch (error: any) {
      set({ loading: false })
      console.error('Hide order error:', error)
      Taro.showToast({
        title: error.message || '操作失败',
        icon: 'none',
      })
      return false
    }
  },
  clearOrders: () =>
    set(() => {
      Taro.removeStorageSync(STORAGE_KEY)
      Taro.removeStorageSync(HIDDEN_ORDER_IDS_KEY)
      return { orders: [] }
    }),
}))
