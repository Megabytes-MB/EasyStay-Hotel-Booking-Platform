import React, { useEffect, useState } from 'react'
import { View, Text, Input, Image, Swiper, SwiperItem } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useDidShow } from '@tarojs/taro'
import { useAuthStore } from '../../store/useAuthStore'
import { fetchHomeAdHotels, Hotel } from '../../services/hotel'
import './index.scss'

const CITY_STORAGE_KEY = 'selected_city'
const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200'

const Home = () => {
  const { isLogin, userInfo } = useAuthStore()
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('上海')
  const [homeAds, setHomeAds] = useState<Hotel[]>([])

  const handleSearch = () => {
    Taro.navigateTo({
      url: `/pages/list/index?city=${city}&keyword=${keyword}`,
    })
  }

  const handleTagClick = (tag: string) => {
    Taro.navigateTo({
      url: `/pages/list/index?city=${city}&keyword=&tag=${tag}`,
    })
  }

  useEffect(() => {
    const savedCity = Taro.getStorageSync(CITY_STORAGE_KEY)
    if (typeof savedCity === 'string' && savedCity.trim()) {
      setCity(savedCity)
    }

    fetchHomeAdHotels().then(setHomeAds)
  }, [])

  useDidShow(() => {
    const savedCity = Taro.getStorageSync(CITY_STORAGE_KEY)
    if (typeof savedCity === 'string' && savedCity.trim()) {
      setCity(savedCity)
    }
  })

  const handleAdClick = (hotelId: number) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${hotelId}`,
    })
  }

  const handleCityClick = () => {
    Taro.navigateTo({
      url: `/pages/city-picker/index?city=${encodeURIComponent(city)}`
    })
  }

  return (
    <View className='page home'>
      <View className='top-bar'>
        <View className='location' onClick={handleCityClick}>
          <Text className='label'>目的地</Text>
          <Text className='value'>{city}</Text>
          <Text className='city-tip'>点击切换</Text>
        </View>
        <View className='user-entry' onClick={() => Taro.switchTab({ url: '/pages/user/index' })}>
          {isLogin ? (
            <Image className='avatar' src={userInfo?.avatar || DEFAULT_AVATAR} />
          ) : (
            <Text>登录/我的</Text>
          )}
        </View>
      </View>

      <View className='banner card'>
        <Text className='title'>轻松找到心仪酒店</Text>
        <Text className='subtitle'>智能推荐 · 会员专享 · 即刻预订</Text>
      </View>

      <View className='home-ad card'>
        <Text className='ad-label'>精选广告</Text>
        {homeAds.length > 0 ? (
          <Swiper className='ad-swiper' circular autoplay interval={3200} indicatorDots>
            {homeAds.map(hotel => (
              <SwiperItem key={hotel.id}>
                <View className='ad-item' onClick={() => handleAdClick(hotel.id)}>
                  <Image className='ad-image' src={hotel.thumb} mode='aspectFill' />
                  <View className='ad-content'>
                    <Text className='ad-title'>{hotel.name}</Text>
                    <Text className='ad-subtitle'>{hotel.city} · {hotel.address || '点击查看详情'}</Text>
                  </View>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        ) : (
          <Text className='ad-placeholder'>广告位虚位以待</Text>
        )}
      </View>

      <View className='search card'>
        <View className='field'>
          <Text className='label'>关键词</Text>
          <Input
            value={keyword}
            placeholder='输入酒店/商圈/关键词'
            onInput={e => setKeyword(e.detail.value)}
          />
        </View>
        <View className='btn-primary' onClick={handleSearch}>搜索酒店</View>
      </View>

      <View className='recommend'>
        <Text className='section-title'>猜你喜欢</Text>
        <View className='tag-row'>
          {['高评分', '近地铁', '亲子友好', '城市景观'].map(tag => (
            <Text key={tag} className='tag' onClick={() => handleTagClick(tag)}>
              {tag}
            </Text>
          ))}
        </View>
      </View>
    </View>
  )
}

export default Home
