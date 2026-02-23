/**
 * HTTP 请求工具
 * 封装 Taro.request，提供统一的请求接口和错误处理
 */

import Taro from '@tarojs/taro'
import { API_BASE_URL } from '../config/api'

// 请求返回的数据结构
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

// 请求配置
interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  showLoading?: boolean
  loadingText?: string
}

/**
 * 获取存储的 token
 */
const getToken = (): string => {
  const authData = Taro.getStorageSync('easy-stay-auth')
  return authData?.token || ''
}

const buildAuthHeader = (token: string): string => {
  if (!token) return ''
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`
}

/**
 * 统一请求方法
 */
export const request = async <T = any>(
  config: RequestConfig
): Promise<ApiResponse<T>> => {
  const { url, method = 'GET', data, header = {}, showLoading = false, loadingText = '加载中...' } = config

  // 显示加载提示
  if (showLoading) {
    Taro.showLoading({ title: loadingText, mask: true })
  }

  try {
    // 获取 token
    const token = getToken()

    // 发起请求
    const response = await Taro.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: buildAuthHeader(token) }),
        ...header,
      },
    })

    if (showLoading) {
      Taro.hideLoading()
    }

    // 处理响应
    const result = response.data as ApiResponse<T>

    // 成功响应
    if (result.code === 200 || response.statusCode === 200) {
      return result
    }

    // 业务错误
    if (result.code === 401) {
      // token 失效，清除登录状态
      Taro.removeStorageSync('easy-stay-auth')
      Taro.showToast({
        title: '登录已过期，请重新登录',
        icon: 'none',
      })
      // 跳转到登录页
      setTimeout(() => {
        Taro.navigateTo({ url: '/pages/login/index' })
      }, 1500)
    } else {
      Taro.showToast({
        title: result.message || '请求失败',
        icon: 'none',
      })
    }

    return result
  } catch (error: any) {
    if (showLoading) {
      Taro.hideLoading()
    }

    console.error('Request error:', error)
    
    // 网络错误
    Taro.showToast({
      title: error.errMsg || '网络请求失败',
      icon: 'none',
    })

    return {
      code: -1,
      message: error.errMsg || '网络请求失败',
    }
  }
}

/**
 * GET 请求
 */
export const get = <T = any>(
  url: string,
  params?: any,
  config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
): Promise<ApiResponse<T>> => {
  const queryString = params
    ? '?' + Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&')
    : ''

  return request<T>({
    url: url + queryString,
    method: 'GET',
    ...config,
  })
}

/**
 * POST 请求
 */
export const post = <T = any>(
  url: string,
  data?: any,
  config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
): Promise<ApiResponse<T>> => {
  return request<T>({
    url,
    method: 'POST',
    data,
    ...config,
  })
}

/**
 * PUT 请求
 */
export const put = <T = any>(
  url: string,
  data?: any,
  config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
): Promise<ApiResponse<T>> => {
  return request<T>({
    url,
    method: 'PUT',
    data,
    ...config,
  })
}

/**
 * DELETE 请求
 */
export const del = <T = any>(
  url: string,
  data?: any,
  config?: Omit<RequestConfig, 'url' | 'method' | 'data'>
): Promise<ApiResponse<T>> => {
  return request<T>({
    url,
    method: 'DELETE',
    data,
    ...config,
  })
}

export default {
  request,
  get,
  post,
  put,
  del,
}
