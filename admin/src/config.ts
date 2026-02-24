// API 基础配置
export const API_BASE_URL = 'http://localhost:3000';

// API 端点
export const API_ENDPOINTS = {
  // 认证
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
  },
  // 酒店
  hotels: {
    list: '/api/hotels',
    detail: (id: string) => `/api/hotels/${id}`,
    create: '/api/hotels',
    update: (id: string) => `/api/hotels/${id}`,
    uploadImage: '/api/hotels/upload-image',
    updateImages: (id: string) => `/api/hotels/${id}/images`,
    updateStarLevel: (id: string) => `/api/hotels/${id}/star-level`,
    delete: (id: string) => `/api/hotels/${id}`,
  },
  // 预订
  bookings: {
    list: '/api/bookings',
    detail: (id: string) => `/api/bookings/${id}`,
    create: '/api/bookings',
    update: (id: string) => `/api/bookings/${id}`,
    delete: (id: string) => `/api/bookings/${id}`,
  },
  // 统计
  statistics: {
    revenue: '/api/statistics/revenue',
  },
  map: {
    search: '/api/map/search',
  },
  holidays: {
    list: '/api/holidays',
    manage: '/api/holidays/manage',
    create: '/api/holidays',
    update: (id: string | number) => `/api/holidays/${id}`,
    delete: (id: string | number) => `/api/holidays/${id}`,
    sync: '/api/holidays/sync',
  },
};

// 状态常量
export const STATUSES = {
  hotel: {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
  },
  booking: {
    pending: 'pending',
    confirmed: 'confirmed',
    cancelled: 'cancelled',
  },
};

// 角色常量
export const ROLES = {
  admin: 'admin',
  merchant: 'merchant',
};
