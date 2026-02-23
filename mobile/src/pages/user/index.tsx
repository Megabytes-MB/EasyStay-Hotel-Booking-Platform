import React, { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useAuthStore } from '../../store/useAuthStore'
import { useOrderStore, type OrderItem } from '../../store/useOrderStore'
import { fetchHotels } from '../../services/hotel'
import { isBookingStatusRemovable } from '../../constants/bookingStatus'
import './index.scss'

const User = () => {
  const { isLogin, userInfo, logout } = useAuthStore()
  const { orders, loading, loadOrders, deleteOrder } = useOrderStore()
  const [favorites, setFavorites] = useState<any[]>([])

  useDidShow(() => {
    if (!isLogin) return
    void loadOrders()
  })

  useEffect(() => {
    if (!isLogin) return
    void loadOrders()
  }, [isLogin, loadOrders])

  useEffect(() => {
    if (!isLogin) return
    fetchHotels({ page: 1, pageSize: 50 }).then(res => {
      const favIds = userInfo?.favorites || []
      setFavorites(res.list.filter(item => favIds.includes(item.id)))
    })
  }, [isLogin, userInfo?.favorites])

  const handleRefreshOrders = async () => {
    await loadOrders()
    Taro.showToast({
      title: '已刷新',
      icon: 'success',
    })
  }

  const canDeleteOrder = (order: OrderItem) => isBookingStatusRemovable(order.statusCode)

  const handleDeleteOrder = async (order: OrderItem) => {
    const modalRes = await Taro.showModal({
      title: '删除预订',
      content: '该记录将从我的订单中移除，确定删除吗？',
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      cancelText: '取消',
    })

    if (!modalRes.confirm) return
    await deleteOrder(order.id)
  }

  if (!isLogin) {
    return (
      <View className="page user-page">
        <View className="card empty">
          <Text>登录后查看收藏与订单</Text>
          <View
            className="btn-primary"
            onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}
          >
            去登录
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="page user-page">
      <View className="card profile">
        <Image className="avatar" src={userInfo?.avatar} />
        <View>
          <Text className="name">{userInfo?.name}</Text>
          <Text className="muted">{userInfo?.phone}</Text>
        </View>
        <View className="logout" onClick={logout}>
          退出
        </View>
      </View>

      <View className="card section">
        <Text className="section-title">我的收藏</Text>
        {favorites.length === 0 && <Text className="muted">暂无收藏</Text>}
        {favorites.map(item => (
          <View
            key={item.id}
            className="fav-item"
            onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${item.id}` })}
          >
            <Text>{item.name}</Text>
            <Text className="muted">点击查看详情</Text>
          </View>
        ))}
      </View>

      <View className="card section">
        <View className="section-header">
          <Text className="section-title">我的订单</Text>
          <View
            className={`refresh-btn ${loading ? 'disabled' : ''}`}
            onClick={loading ? undefined : handleRefreshOrders}
          >
            {loading ? '刷新中...' : '刷新'}
          </View>
        </View>
        {orders.length === 0 && <Text className="muted">暂无订单</Text>}
        {orders.map(order => (
          <View key={order.id} className="order-item">
            <View className="order-info">
              <Text className="order-title">{order.hotelName}</Text>
              <Text className="order-subtitle">{order.roomName}</Text>
              <Text className="order-meta">
                {order.checkIn} 至 {order.checkOut} · {order.nights} 晚
              </Text>
            </View>
            <View className="order-actions">
              <Text className={`status status-${order.statusTone}`}>{order.status}</Text>
              {canDeleteOrder(order) && (
                <View
                  className={`order-delete-btn ${loading ? 'disabled' : ''}`}
                  onClick={loading ? undefined : () => void handleDeleteOrder(order)}
                >
                  ×
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

export default User
