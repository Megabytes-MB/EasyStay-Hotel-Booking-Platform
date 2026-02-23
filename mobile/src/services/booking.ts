/**
 * 预订服务
 */

import { get, post, put } from '../utils/request'
import { API_PATHS } from '../config/api'

export interface Booking {
  id: number
  hotelId: number
  userId: number
  guestName: string
  guestPhone: string
  roomType: string
  checkInDate: string
  checkOutDate: string
  checkIn?: string
  checkOut?: string
  numberOfGuests: number
  totalPrice: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  createdAt: string
  updatedAt: string
  hotel?: {
    id: number
    name: string
    city: string
  }
}

export interface CreateBookingParams {
  hotelId: number
  guestName: string
  guestPhone: string
  roomType: string
  unitPrice?: number
  checkInDate: string
  checkOutDate: string
  numberOfGuests: number
  totalPrice: number
}

export interface UpdateBookingParams {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  guestName?: string
  guestPhone?: string
  numberOfGuests?: number
}

export interface QueryBookingsParams {
  hotelId?: number
  status?: string
  role?: string
  userId?: number
}

export const getBookings = async (params?: QueryBookingsParams) => {
  return get<Booking[]>(API_PATHS.BOOKINGS, params, {
    showLoading: true,
  })
}

export const getBookingDetail = async (id: number) => {
  return get<Booking>(API_PATHS.BOOKING_DETAIL(id), undefined, {
    showLoading: true,
  })
}

export const createBooking = async (params: CreateBookingParams) => {
  return post<Booking>(API_PATHS.CREATE_BOOKING, params, {
    showLoading: true,
    loadingText: '正在提交预订...',
  })
}

export const updateBooking = async (id: number, params: UpdateBookingParams) => {
  return put<Booking>(API_PATHS.UPDATE_BOOKING(id), params, {
    showLoading: true,
    loadingText: '更新中...',
  })
}

export const cancelBooking = async (id: number) => {
  return updateBooking(id, { status: 'cancelled' })
}

export default {
  getBookings,
  getBookingDetail,
  createBooking,
  updateBooking,
  cancelBooking,
}
