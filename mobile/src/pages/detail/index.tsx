import React, { useEffect, useMemo, useState } from 'react'
import { View, Swiper, SwiperItem, Image, Button, Text, Map } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { fetchHotelDetail, Hotel, Room } from '../../services/hotel'
import { useAuthStore } from '../../store/useAuthStore'
import { useOrderStore } from '../../store/useOrderStore'
import LoginGuard from '../../components/LoginGuard'
import CustomCalendar from '../../components/CustomCalendar'
import { formatPrice } from '../../utils/format'
import { calculateStayPriceWithHolidayDiscount } from '../../utils/holiday'
import { loadHolidayRulesToCache } from '../../services/holiday'
import './index.scss'

interface BookingInfo {
  roomName: string
  start: string
  end: string
  days: number
  originalPrice: number
  finalPrice: number
  discountAmount: number
  holidayNights: number
  holidayNames: string[]
  appliedDiscountRates: number[]
}

interface GeoPoint {
  longitude: number
  latitude: number
}

const HotelDetail = () => {
  const { id } = useRouter().params
  const { isLogin, userInfo, toggleFavorite } = useAuthStore()
  const { addOrder } = useOrderStore()
  const [detail, setDetail] = useState<Hotel | null>(null)
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null)
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null)

  useEffect(() => {
    if (!id) return
    fetchHotelDetail(Number(id)).then(setDetail)
    loadHolidayRulesToCache()
  }, [id])

  const hotelPoint = useMemo<GeoPoint>(
    () => ({
      longitude: detail?.longitude || 121.4737,
      latitude: detail?.latitude || 31.2304,
    }),
    [detail]
  )

  const mapCenter = userLocation || hotelPoint

  const mapMarkers = useMemo(
    () => [
      {
        id: 1,
        latitude: hotelPoint.latitude,
        longitude: hotelPoint.longitude,
        title: detail?.name || '酒店位置',
        width: 26,
        height: 34,
      },
      ...(userLocation
        ? [
            {
              id: 2,
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              title: '我的位置',
              width: 22,
              height: 30,
            },
          ]
        : []),
    ],
    [detail?.name, hotelPoint.latitude, hotelPoint.longitude, userLocation]
  )

  const openCalendarForRoom = (room: Room) => {
    setSelectedRoom(room)
    setCalendarVisible(true)
  }

  const handleConfirmBookingDate = async (start: string, end: string, days: number) => {
    if (!selectedRoom || !detail) return
    await loadHolidayRulesToCache({ startDate: start, endDate: end })
    const priceDetail = calculateStayPriceWithHolidayDiscount({
      startDate: start,
      endDate: end,
      basePrice: selectedRoom.price,
    })

    setBookingInfo({
      roomName: selectedRoom.name,
      start,
      end,
      days,
      originalPrice: priceDetail.originalPrice,
      finalPrice: priceDetail.totalPrice,
      discountAmount: priceDetail.discountAmount,
      holidayNights: priceDetail.holidayNights,
      holidayNames: priceDetail.holidayNames,
      appliedDiscountRates: priceDetail.appliedDiscountRates,
    })

    const success = await addOrder({
      hotelId: detail.id,
      guestName: userInfo?.name || userInfo?.username || '游客',
      guestPhone: userInfo?.phone || '',
      roomType: selectedRoom.name,
      unitPrice: selectedRoom.price,
      checkInDate: start,
      checkOutDate: end,
      numberOfGuests: 1,
      totalPrice: priceDetail.totalPrice,
    })

    if (success) {
      setCalendarVisible(false)
    }
  }

  const handleLocateUser = async () => {
    try {
      const res = await Taro.getLocation({ type: 'gcj02' })
      setUserLocation({ longitude: res.longitude, latitude: res.latitude })
      Taro.showToast({ title: '定位成功', icon: 'success' })
    } catch {
      Taro.showToast({ title: '定位失败，请检查定位权限', icon: 'none' })
    }
  }

  const handleNavigateHotel = () => {
    if (!detail) return

    Taro.openLocation({
      longitude: hotelPoint.longitude,
      latitude: hotelPoint.latitude,
      name: detail.name,
      address: detail.address || detail.city,
      scale: 15,
    })
  }

  const isFav = userInfo?.favorites.includes(Number(id))

  if (!detail) {
    return <View className='page'>加载中...</View>
  }

  return (
    <View className='page detail-page'>
      <Swiper indicatorDots autoplay className='banner-swiper'>
        {detail.banners.map((url, index) => (
          <SwiperItem key={`${url}-${index}`}>
            <Image src={url} className='banner-img' mode='aspectFill' />
          </SwiperItem>
        ))}
      </Swiper>

      <View className='card header-info'>
        <View className='title-row'>
          <Text className='title'>{detail.name}</Text>
          <LoginGuard onAuthed={() => toggleFavorite(Number(id))}>
            <Text className='fav-btn'>{isFav ? '已收藏' : '收藏'}</Text>
          </LoginGuard>
        </View>
        <Text className='muted'>
          评分 {detail.score.toFixed(1)} · {detail.city}
        </Text>
      </View>

      <View className='card map-card'>
        <Text className='section-title'>位置与导航</Text>
        <Text className='muted'>{detail.address || `${detail.city}市中心`}</Text>
        <Map
          id='hotel-map'
          className='hotel-map'
          longitude={mapCenter.longitude}
          latitude={mapCenter.latitude}
          scale={14}
          markers={mapMarkers as any}
          showLocation
        />
        <View className='map-actions'>
          <Button size='mini' onClick={handleLocateUser}>
            定位到我
          </Button>
          <Button size='mini' type='primary' onClick={handleNavigateHotel}>
            导航去酒店
          </Button>
        </View>
      </View>

      {bookingInfo && (
        <View className='card booking-info'>
          <Text className='booking-title'>已选入住信息</Text>
          <Text className='muted'>
            {bookingInfo.roomName} · {bookingInfo.start} 至 {bookingInfo.end} · {bookingInfo.days} 晚
          </Text>
          <Text className='booking-price'>订单总价：{formatPrice(bookingInfo.finalPrice)}</Text>
          {bookingInfo.discountAmount > 0 && (
            <>
              <Text className='booking-discount'>节假日优惠：-{formatPrice(bookingInfo.discountAmount)}</Text>
              <Text className='muted'>
                命中 {bookingInfo.holidayNights} 晚（{bookingInfo.holidayNames.join('、')}），
                {bookingInfo.appliedDiscountRates.length === 1
                  ? `按 ${Math.round(bookingInfo.appliedDiscountRates[0] * 100) / 10} 折计价`
                  : '按活动折扣价计价'}
              </Text>
              <Text className='muted line-through'>原价：{formatPrice(bookingInfo.originalPrice)}</Text>
            </>
          )}
        </View>
      )}

      <View className='card room-list'>
        <Text className='section-title'>房型列表</Text>
        {detail.rooms.map(room => (
          <View key={room.id} className='room-item'>
            <View>
              <Text className='room-name'>{room.name}</Text>
              <Text className='muted'>含早 · 可取消</Text>
            </View>
            <View className='price-box'>
              <Text className='price'>{formatPrice(room.price)}</Text>
              <LoginGuard onAuthed={() => openCalendarForRoom(room)}>
                <Button size='mini'>预订</Button>
              </LoginGuard>
            </View>
          </View>
        ))}
      </View>

      {!isLogin && <View className='login-tip'>登录后可查看会员价与收藏记录</View>}

      <CustomCalendar
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onConfirm={handleConfirmBookingDate}
      />
    </View>
  )
}

export default HotelDetail
