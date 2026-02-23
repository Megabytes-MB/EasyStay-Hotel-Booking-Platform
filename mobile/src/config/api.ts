/**
 * API 配置文件
 */

declare const __DEV__: boolean
declare const TARO_APP_API_BASE_URL: string

const API_CONFIG = {
  dev: {
    baseURL: 'http://localhost:3000',
  },
  prod: {
    baseURL: 'https://your-production-api.com',
  },
}

const ENV = typeof __DEV__ !== 'undefined' ? (__DEV__ ? 'dev' : 'prod') : 'dev'
const ENV_BASE_URL = typeof TARO_APP_API_BASE_URL !== 'undefined'
  ? TARO_APP_API_BASE_URL
  : ''

export const API_BASE_URL = ENV_BASE_URL || API_CONFIG[ENV].baseURL

export const API_PATHS = {
  // 认证
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_SEND_CODE: '/api/auth/send-code',
  AUTH_WECHAT_LOGIN: '/api/auth/wechat-login',
  AUTH_WECHAT_BIND: '/api/auth/wechat-bind',

  // 酒店
  HOTELS: '/api/hotels',
  HOTEL_HOME_AD: '/api/hotels/home-ad',
  HOTEL_HOME_ADS: '/api/hotels/home-ads',
  HOTEL_DETAIL: (id: number) => `/api/hotels/${id}`,

  // 预订
  BOOKINGS: '/api/bookings',
  BOOKING_DETAIL: (id: number) => `/api/bookings/${id}`,
  CREATE_BOOKING: '/api/bookings',
  UPDATE_BOOKING: (id: number) => `/api/bookings/${id}`,

  // 统计
  STATISTICS: '/api/statistics',

  // 地图
  MAP_REVERSE_GEOCODE: '/api/map/regeo',
  MAP_SEARCH: '/api/map/search',

  // 节假日
  HOLIDAYS: '/api/holidays',
}

export default {
  API_BASE_URL,
  API_PATHS,
}
