export type MapProvider = 'amap' | 'tencent'

export interface GeoPoint {
  longitude: number
  latitude: number
}

export interface NearbyFeatures {
  subwayDistanceMeters?: number
  hasMall?: boolean
  hasScenicSpot?: boolean
  hasFamilyPOI?: boolean
  hasBusinessDistrict?: boolean
}

const SHANGHAI_CENTER: GeoPoint = { longitude: 121.4737, latitude: 31.2304 }
const HANGZHOU_CENTER: GeoPoint = { longitude: 120.1551, latitude: 30.2741 }
const BEIJING_CENTER: GeoPoint = { longitude: 116.4074, latitude: 39.9042 }
const SHENZHEN_CENTER: GeoPoint = { longitude: 114.0579, latitude: 22.5431 }
const CHENGDU_CENTER: GeoPoint = { longitude: 104.0665, latitude: 30.5723 }

export const CITY_CENTERS: Record<string, GeoPoint> = {
  上海: SHANGHAI_CENTER,
  杭州: HANGZHOU_CENTER,
  北京: BEIJING_CENTER,
  深圳: SHENZHEN_CENTER,
  成都: CHENGDU_CENTER
}

export interface BuildTagsParams {
  score: number
  features: NearbyFeatures
}

export const buildHotelTagsFromFeatures = ({ score, features }: BuildTagsParams) => {
  const tags = new Set<string>()

  if (score >= 4.6) tags.add('高评分')
  if (typeof features.subwayDistanceMeters === 'number' && features.subwayDistanceMeters <= 600) {
    tags.add('近地铁')
  }
  if (features.hasFamilyPOI) tags.add('亲子友好')
  if (features.hasScenicSpot) tags.add('城市景观')
  if (features.hasBusinessDistrict || features.hasMall) tags.add('商圈便利')

  if (tags.size === 0) tags.add('舒适酒店')
  return Array.from(tags)
}

export interface ResolveNearbyFeaturesParams {
  provider: MapProvider
  point: GeoPoint
}

const pseudoDistanceByCoordinate = (point: GeoPoint) => {
  const lngFragment = Math.abs(Math.floor(point.longitude * 1000)) % 7
  const latFragment = Math.abs(Math.floor(point.latitude * 1000)) % 5
  return 200 + lngFragment * 60 + latFragment * 50
}

export const resolveNearbyFeatures = async ({
  provider,
  point
}: ResolveNearbyFeaturesParams): Promise<NearbyFeatures> => {
  // TODO: replace with real API calls from backend:
  // - AMap geocode/regeo + around search
  // - Tencent map geocoder + place search
  const baseDistance = pseudoDistanceByCoordinate(point)
  const providerBias = provider === 'amap' ? 0 : 40
  const subwayDistanceMeters = baseDistance + providerBias

  return {
    subwayDistanceMeters,
    hasMall: subwayDistanceMeters < 700,
    hasScenicSpot: subwayDistanceMeters % 2 === 0,
    hasFamilyPOI: subwayDistanceMeters % 3 !== 0,
    hasBusinessDistrict: subwayDistanceMeters < 550
  }
}

