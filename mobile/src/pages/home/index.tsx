import React, { useState } from 'react'
import { View, Text, Input, Image, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../store/useAuthStore'
import './index.scss'

const Home = () => {
  const { isLogin, userInfo } = useAuthStore()
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('上海')

  const cities = ['上海', '北京', '杭州', '广州', '深圳', '成都']

  const handleSearch = () => {
    Taro.navigateTo({
      url: `/pages/list/index?city=${city}&keyword=${keyword}`
    })
  }

  const handleTagClick = (tag: string) => {
    Taro.navigateTo({
      url: `/pages/list/index?city=${city}&keyword=&tag=${tag}`
    })
  }

  return (
    <View className="page home">
      <View className="top-bar">
        <Picker
          mode="selector"
          range={cities}
          onChange={e => setCity(cities[Number(e.detail.value)])}
        >
          <View className="location">
            <Text className="label">目的地</Text>
            <Text className="value">{city}</Text>
            <Text className="city-tip">点击更换</Text>
          </View>
        </Picker>
        <View
          className="user-entry"
          onClick={() => Taro.switchTab({ url: '/pages/user/index' })}
        >
          {isLogin ? (
            <Image className="avatar" src={userInfo?.avatar} />
          ) : (
            <Text>登录/我的</Text>
          )}
        </View>
      </View>

      <View className="banner card">
        <Text className="title">轻松找到心仪酒店</Text>
        <Text className="subtitle">智能推荐 · 会员专享 · 即刻预订</Text>
      </View>

      <View className="search card">
        <View className="field">
          <Text className="label">关键词</Text>
          <Input
            value={keyword}
            placeholder="输入酒店/商圈/关键字"
            onInput={e => setKeyword(e.detail.value)}
          />
        </View>
        <View className="btn-primary" onClick={handleSearch}>
          搜索酒店
        </View>
      </View>

      <View className="recommend">
        <Text className="section-title">猜你喜欢</Text>
        <View className="tag-row">
          {['高评分', '近地铁', '亲子友好', '城市景观'].map(tag => (
            <Text key={tag} className="tag" onClick={() => handleTagClick(tag)}>
              {tag}
            </Text>
          ))}
        </View>
      </View>
    </View>
  )
}

export default Home
