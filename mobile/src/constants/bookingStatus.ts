import type { Booking } from '../services/booking'

export type BookingStatusCode = Booking['status'] | 'checked_in' | string

export interface BookingStatusConfig {
  label: string
  tone: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'default'
  removable: boolean
}

const DEFAULT_STATUS_CONFIG: BookingStatusConfig = {
  label: '未知状态',
  tone: 'default',
  removable: false,
}

const BOOKING_STATUS_CONFIGS: Record<string, BookingStatusConfig> = {
  pending: {
    label: '待确认',
    tone: 'pending',
    removable: false,
  },
  confirmed: {
    label: '已确认',
    tone: 'confirmed',
    removable: false,
  },
  cancelled: {
    label: '已取消',
    tone: 'cancelled',
    removable: true,
  },
  completed: {
    label: '已完成',
    tone: 'completed',
    removable: false,
  },
  checked_in: {
    label: '已入住',
    tone: 'confirmed',
    removable: false,
  },
}

export const getBookingStatusConfig = (status: BookingStatusCode): BookingStatusConfig =>
  BOOKING_STATUS_CONFIGS[status] || {
    ...DEFAULT_STATUS_CONFIG,
    label: status || DEFAULT_STATUS_CONFIG.label,
  }

export const getBookingStatusLabel = (status: BookingStatusCode): string =>
  getBookingStatusConfig(status).label

export const getBookingStatusTone = (status: BookingStatusCode): BookingStatusConfig['tone'] =>
  getBookingStatusConfig(status).tone

export const isBookingStatusRemovable = (status: BookingStatusCode): boolean =>
  getBookingStatusConfig(status).removable
