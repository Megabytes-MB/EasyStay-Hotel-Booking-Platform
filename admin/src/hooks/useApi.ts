import { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { API_BASE_URL } from '../config';

interface UseApiOptions {
  showMessage?: boolean;
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  error => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
      message.error('登录已过期，请重新登录');
    }
    return Promise.reject(error);
  }
);

export function useApi(options: UseApiOptions = { showMessage: true }) {
  const [loading, setLoading] = useState(false);

  const request = useCallback(
    async (method: 'get' | 'post' | 'put' | 'delete', url: string, data?: any, config?: any) => {
      try {
        setLoading(true);
        const response = await axiosInstance({
          method,
          url,
          data,
          ...config,
        });

        if (response.data.code === 200) {
          if (options.showMessage && response.data.message) {
            message.success(response.data.message);
          }
          return response;
        }

        if (options.showMessage) {
          message.error(response.data.message || '请求失败');
        }
        return response;
      } catch (error: any) {
        if (options.showMessage) {
          const errorMsg = error.response?.data?.message || error.message || '请求失败';
          message.error(errorMsg);
        }
        console.error('API Error:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [options.showMessage]
  );

  const get = useCallback((url: string, config?: any) => request('get', url, undefined, config), [request]);
  const post = useCallback((url: string, data?: any, config?: any) => request('post', url, data, config), [request]);
  const put = useCallback((url: string, data?: any, config?: any) => request('put', url, data, config), [request]);
  const del = useCallback((url: string, config?: any) => request('delete', url, undefined, config), [request]);

  return useMemo(
    () => ({
      loading,
      get,
      post,
      put,
      delete: del,
    }),
    [loading, get, post, put, del]
  );
}
