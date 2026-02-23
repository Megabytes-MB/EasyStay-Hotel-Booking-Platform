import dayjs from 'dayjs'
import { get } from '../utils/request'
import { API_PATHS } from '../config/api'

export interface Room {
  id: number
  name: string
  price: number
}

export interface Hotel {
  id: number
  name: string
  city: string
  longitude?: number
  latitude?: number
  address?: string
  description?: string
  price: number
  pricePerNight?: number
  score: number
  rating?: number
  imageUrl?: string
  images?: string[]
  thumb: string
  banners: string[]
  rooms: Room[]
  roomTypes?: string[]
  isMemberDeal: boolean
  tags: string[]
  facilities?: string[]
  status?: string
  isHomeAd?: boolean
  adStatus?: 'none' | 'pending' | 'approved' | 'rejected'
}

interface FetchHotelsParams {
  page?: number
  pageSize?: number
  city?: string
  keyword?: string
  tag?: string
  roomType?: string
  minPrice?: number
  maxPrice?: number
  startDate?: string
  endDate?: string
  status?: string
}

const parseJsonArray = (value: any, fallback: string[] = []): string[] => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return fallback

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

const toNumberOr = (value: any, fallback: number) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const transformHotelData = (hotel: any): Hotel => {
  const images = parseJsonArray(hotel.images)
  const thumb = hotel.imageUrl || images[0] || 'https://picsum.photos/id/401/600/400'
  const banners = images.length > 0
    ? images
    : [
        'https://picsum.photos/id/402/800/500',
        'https://picsum.photos/id/403/800/500',
        'https://picsum.photos/id/404/800/500',
      ]

  const roomTypes = parseJsonArray(hotel.roomTypes, ['标准间', '大床房', '套房'])
  const rooms: Room[] = roomTypes.map((name: string, index: number) => ({
    id: index + 1,
    name,
    price: hotel.pricePerNight ? Number(hotel.pricePerNight) + index * 50 : 200 + index * 50,
  }))

  const facilities = parseJsonArray(hotel.facilities)
  const tags = facilities.length > 0 ? facilities.slice(0, 2) : ['舒适', '便利']

  return {
    id: hotel.id,
    name: hotel.name,
    longitude: toNumberOr(hotel.longitude ?? hotel.lng, 121.4737),
    latitude: toNumberOr(hotel.latitude ?? hotel.lat, 31.2304),
    city: hotel.city || '未知',
    address: hotel.address || hotel.location,
    description: hotel.description,
    price: Number(hotel.pricePerNight || hotel.price || rooms[0]?.price || 200),
    pricePerNight: hotel.pricePerNight ? Number(hotel.pricePerNight) : undefined,
    score: Number(hotel.rating || hotel.score || 4.5),
    rating: hotel.rating,
    imageUrl: hotel.imageUrl,
    images,
    thumb,
    banners,
    rooms,
    roomTypes,
    isMemberDeal: Number(hotel.rating || hotel.score || 0) >= 4.5,
    tags,
    facilities,
    status: hotel.status,
    isHomeAd: hotel.isHomeAd,
    adStatus: hotel.adStatus,
  }
}

/**
 * 获取酒店列表
 */
export const fetchHotels = async (params: FetchHotelsParams) => {
  const {
    page = 1,
    pageSize = 10,
    city,
    keyword,
    status,
  } = params

  try {
    const response = await get<any[]>(API_PATHS.HOTELS, {
      city,
      keyword,
      status: status || undefined,
    })

    if (response.code === 200 && response.data) {
      const hotels = response.data.map(transformHotelData)
      const start = (page - 1) * pageSize
      const end = start + pageSize

      return {
        list: hotels.slice(start, end),
        hasMore: end < hotels.length,
        total: hotels.length,
      }
    }

    return { list: [], hasMore: false, total: 0 }
  } catch (error) {
    console.error('fetchHotels error:', error)
    return { list: [], hasMore: false, total: 0 }
  }
}

/**
 * 获取酒店详情
 */
export const fetchHotelDetail = async (id: number) => {
  try {
    const response = await get<any>(API_PATHS.HOTEL_DETAIL(id))

    if (response.code === 200 && response.data) {
      const hotel = transformHotelData(response.data)
      const rooms = [...hotel.rooms].sort((a, b) => a.price - b.price)
      return { ...hotel, rooms }
    }

    throw new Error('酒店不存在')
  } catch (error) {
    console.error('fetchHotelDetail error:', error)
    throw error
  }
}

/**
 * 获取首页广告酒店（单条，兼容旧调用）
 */
export const fetchHomeAdHotel = async (): Promise<Hotel | null> => {
  try {
    const response = await get<any>(API_PATHS.HOTEL_HOME_AD)
    if (response.code === 200 && response.data) {
      return transformHotelData(response.data)
    }
    return null
  } catch (error) {
    console.error('fetchHomeAdHotel error:', error)
    return null
  }
}

/**
 * 获取首页广告酒店列表（多条）
 */
export const fetchHomeAdHotels = async (): Promise<Hotel[]> => {
  try {
    const response = await get<any[]>(API_PATHS.HOTEL_HOME_ADS)
    if (response.code === 200 && Array.isArray(response.data)) {
      return response.data.map(transformHotelData)
    }
    return []
  } catch (error) {
    console.error('fetchHomeAdHotels error:', error)
    return []
  }
}

/**
 * 获取订单列表（临时实现，建议迁移到 booking service）
 */
export const fetchOrders = async () => {
  await new Promise(resolve => setTimeout(resolve, 200))
  return [
    {
      id: 101,
      name: '云栈精选酒店·3号店',
      date: dayjs().add(2, 'day').format('YYYY-MM-DD'),
      status: '待入住',
    },
    {
      id: 102,
      name: '云栈精选酒店·8号店',
      date: dayjs().subtract(12, 'day').format('YYYY-MM-DD'),
      status: '已完成',
    },
  ]
}
