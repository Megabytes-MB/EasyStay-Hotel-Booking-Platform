import { get } from '../utils/request'
import { API_PATHS } from '../config/api'

export interface ReverseGeocodeData {
  city: string
  province: string
  district: string
  cityRaw: string
  formattedAddress: string
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
