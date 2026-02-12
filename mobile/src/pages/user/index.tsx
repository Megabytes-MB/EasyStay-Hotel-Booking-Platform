import React, { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../store/useAuthStore'
import { useOrderStore } from '../../store/useOrderStore'
import { fetchHotels } from '../../services/hotel'
import './index.scss'

const User = () => {
  const { isLogin, userInfo, logout } = useAuthStore()
  const { orders } = useOrderStore()
  const [favorites, setFavorites] = useState<any[]>([])

  useEffect(() => {
    if (!isLogin) return
    fetchHotels({ page: 1, pageSize: 50 }).then(res => {
      const favIds = userInfo?.favorites || []
      setFavorites(res.list.filter(item => favIds.includes(item.id)))
    })
  }, [isLogin, userInfo?.favorites])

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
        <Text className="section-title">我的订单</Text>
        {orders.length === 0 && <Text className="muted">暂无订单</Text>}
        {orders.map(order => (
          <View key={order.id} className="order-item">
            <View>
              <Text>{order.hotelName}</Text>
              <Text className="muted">{order.roomName}</Text>
              <Text className="muted">
                {order.checkIn} 至 {order.checkOut} · {order.nights} 晚
              </Text>
            </View>
            <Text className="status">{order.status}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export default User

