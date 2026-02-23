import { get } from '../utils/request'
import { API_PATHS } from '../config/api'

export interface ReverseGeocodeData {
  city: string
  province: string
  district: string
  cityRaw: string
  formattedAddress: string
}

export interface MapSearchItem {
  id: string
  title: string
  address: string
  province: string
  city: string
  district: string
  latitude: number
  longitude: number
}

export const reverseGeocodeByLocation = async (
  longitude: number,
  latitude: number
): Promise<ReverseGeocodeData | null> => {
  const response = await get<ReverseGeocodeData>(API_PATHS.MAP_REVERSE_GEOCODE, {
    longitude,
    latitude,
  })

  if (response.code === 200 && response.data) {
    return response.data
  }

  return null
}

export const searchMapLocation = async (
  keyword: string,
  region?: string
): Promise<MapSearchItem[]> => {
  const response = await get<MapSearchItem[]>(API_PATHS.MAP_SEARCH, {
    keyword,
    region: region || undefined,
    pageSize: 5,
  })

  if (response.code === 200 && Array.isArray(response.data)) {
    return response.data
  }

  return []
}

export const resolveSearchLocationPoint = async (
  keyword: string,
  region?: string
): Promise<{ longitude: number; latitude: number } | null> => {
  const trimmedKeyword = String(keyword || '').trim()
  if (!trimmedKeyword) return null

  const list = await searchMapLocation(trimmedKeyword, region)
  if (list.length === 0) return null

  const first = list[0]
  if (!Number.isFinite(first.longitude) || !Number.isFinite(first.latitude)) return null

  return {
    longitude: first.longitude,
    latitude: first.latitude,
  }
}
