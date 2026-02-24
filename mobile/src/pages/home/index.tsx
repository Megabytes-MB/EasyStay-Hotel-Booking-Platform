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
const STAR_PRESET_OPTIONS = [
  { label: '不限', value: '' },
  { label: '4钻+', value: '4' },
  { label: '4.5分+', value: '4.5' },
]
const PRICE_PRESET_OPTIONS = [
  { label: '不限', value: '' },
  { label: '￥300以下', value: '0-300' },
  { label: '￥300-600', value: '300-600' },
  { label: '￥600以上', value: '600-99999' },
]

const decodePricePreset = (value: string) => {
  if (!value) return { minPrice: '', maxPrice: '' }
  const [min, max] = value.split('-')
  return {
    minPrice: min || '',
    maxPrice: max || '',
  }
}

const Home = () => {
  const { isLogin, userInfo } = useAuthStore()
  const [locationText, setLocationText] = useState('')
  const [starPreset, setStarPreset] = useState('')
  const [pricePreset, setPricePreset] = useState('')
  const [city, setCity] = useState('上海')
  const [homeAds, setHomeAds] = useState<Hotel[]>([])

  const handleSearch = () => {
    const { minPrice, maxPrice } = decodePricePreset(pricePreset)
    const query = [
      `city=${encodeURIComponent(city)}`,
      'keyword=',
      `location=${encodeURIComponent(locationText.trim())}`,
      `minScore=${encodeURIComponent(starPreset)}`,
      `minPrice=${encodeURIComponent(minPrice)}`,
      `maxPrice=${encodeURIComponent(maxPrice)}`,
    ].join('&')

    Taro.navigateTo({
      url: `/pages/list/index?${query}`,
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
      <View className='home-ad home-ad-full'>
        <View className='ad-label'>
          <View className='label-icon icon-broadcast' />
          <Text>精选广告</Text>
        </View>
        {homeAds.length > 0 ? (
          <Swiper className='ad-swiper' circular autoplay interval={3200} indicatorDots>
            {homeAds.map(hotel => (
              <SwiperItem key={hotel.id}>
                <View className='ad-item' onClick={() => handleAdClick(hotel.id)}>
                  <Image className='ad-image' src={hotel.thumb} mode='aspectFill' />
                  <View className='ad-edge-soften' />
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

      <View className='top-bar'>
        <View className='location' onClick={handleCityClick}>
          <Text className='city-name'>{city}</Text>
          <View className='city-pin' aria-hidden>
            <View className='city-pin-head' />
            <View className='city-pin-tail' />
          </View>
        </View>
        <View className='user-entry' onClick={() => Taro.switchTab({ url: '/pages/user/index' })}>
          {isLogin ? (
            <Image className='avatar' src={userInfo?.avatar || DEFAULT_AVATAR} />
          ) : (
            <Text>登录/我的</Text>
          )}
        </View>
      </View>

      <View className='search card'>
        <View className='field-single'>
          <View className='label'>
            <View className='title-icon icon-location' />
            <Text>位置</Text>
          </View>
          <Input
            value={locationText}
            placeholder='商圈/地铁/地标'
            onInput={e => setLocationText(e.detail.value)}
          />
        </View>

        <View className='option-row'>
          <View className='option-title'>
            <View className='title-icon icon-star' />
            <Text>星级</Text>
          </View>
          <View className='option-chips'>
            {STAR_PRESET_OPTIONS.map(option => (
              <Text
                key={option.label}
                className={`option-chip ${starPreset === option.value ? 'active' : ''}`}
                onClick={() => setStarPreset(option.value)}
              >
                {option.label}
              </Text>
            ))}
          </View>
        </View>

        <View className='option-row'>
          <View className='option-title'>
            <View className='title-icon icon-money' />
            <Text>价格</Text>
          </View>
          <View className='option-chips'>
            {PRICE_PRESET_OPTIONS.map(option => (
              <Text
                key={option.label}
                className={`option-chip ${pricePreset === option.value ? 'active' : ''}`}
                onClick={() => setPricePreset(option.value)}
              >
                {option.label}
              </Text>
            ))}
          </View>
        </View>

        <View className='btn-primary search-btn' onClick={handleSearch}>
          <View className='search-btn-icon icon-search' />
          <Text>搜索酒店</Text>
        </View>
      </View>

      <View className='recommend'>
        <View className='section-title'>
          <View className='title-icon icon-spark' />
          <Text>猜你喜欢</Text>
        </View>
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
