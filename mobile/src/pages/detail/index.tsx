import React, { useEffect, useState } from 'react'
import { View, Swiper, SwiperItem, Image, Button, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { fetchHotelDetail, Hotel, Room } from '../../services/hotel'
import { useAuthStore } from '../../store/useAuthStore'
import { useOrderStore } from '../../store/useOrderStore'
import LoginGuard from '../../components/LoginGuard'
import CustomCalendar from '../../components/CustomCalendar'
import { formatPrice } from '../../utils/format'
import './index.scss'

interface BookingInfo {
  roomName: string
  start: string
  end: string
  days: number
}

const HotelDetail = () => {
  const { id } = useRouter().params
  const { isLogin, userInfo, toggleFavorite } = useAuthStore()
  const { addOrder } = useOrderStore()
  const [detail, setDetail] = useState<Hotel | null>(null)
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null)

  useEffect(() => {
    if (!id) return
    fetchHotelDetail(Number(id)).then(setDetail)
  }, [id])

  const openCalendarForRoom = (room: Room) => {
    setSelectedRoom(room)
    setCalendarVisible(true)
  }

  const handleConfirmBookingDate = (start: string, end: string, days: number) => {
    if (!selectedRoom || !detail) return
    setBookingInfo({
      roomName: selectedRoom.name,
      start,
      end,
      days
    })
    addOrder({
      hotelId: detail.id,
      hotelName: detail.name,
      roomName: selectedRoom.name,
      checkIn: start,
      checkOut: end,
      nights: days,
      status: '待入住'
    })
    setCalendarVisible(false)
    Taro.showToast({ title: '预订成功，已加入订单', icon: 'none' })
  }

  const isFav = userInfo?.favorites.includes(Number(id))

  if (!detail) {
    return <View className="page">加载中...</View>
  }

  return (
    <View className="page detail-page">
      <Swiper indicatorDots autoplay className="banner-swiper">
        {detail.banners.map((url, index) => (
          <SwiperItem key={`${url}-${index}`}>
            <Image src={url} className="banner-img" mode="aspectFill" />
          </SwiperItem>
        ))}
      </Swiper>

      <View className="card header-info">
        <View className="title-row">
          <Text className="title">{detail.name}</Text>
          <LoginGuard onAuthed={() => toggleFavorite(Number(id))}>
            <Text className="fav-btn">{isFav ? '已收藏' : '收藏'}</Text>
          </LoginGuard>
        </View>
        <Text className="muted">
          评分 {detail.score.toFixed(1)} · {detail.city}
        </Text>
      </View>

      {bookingInfo && (
        <View className="card booking-info">
          <Text className="booking-title">已选入住信息</Text>
          <Text className="muted">
            {bookingInfo.roomName} · {bookingInfo.start} 至 {bookingInfo.end} ·{' '}
            {bookingInfo.days} 晚
          </Text>
        </View>
      )}

      <View className="card room-list">
        <Text className="section-title">房型列表</Text>
        {detail.rooms.map(room => (
          <View key={room.id} className="room-item">
            <View>
              <Text className="room-name">{room.name}</Text>
              <Text className="muted">含早 · 可取消</Text>
            </View>
            <View className="price-box">
              <Text className="price">{formatPrice(room.price)}</Text>
              <LoginGuard onAuthed={() => openCalendarForRoom(room)}>
                <Button size="mini">预订</Button>
              </LoginGuard>
            </View>
          </View>
        ))}
      </View>

      {!isLogin && (
        <View className="login-tip">登录后可查看会员价与收藏记录</View>
      )}

      <CustomCalendar
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onConfirm={handleConfirmBookingDate}
      />
    </View>
  )
}

export default HotelDetail
