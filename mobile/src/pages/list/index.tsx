import React, { useEffect, useState } from 'react'
import { View, Text, Image, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import VirtualList from '../../components/VirtualList'
import CustomCalendar from '../../components/CustomCalendar'
import { fetchHotels, Hotel } from '../../services/hotel'
import { useAuthStore } from '../../store/useAuthStore'
import { formatPrice } from '../../utils/format'
import './index.scss'

const PAGE_SIZE = 8

interface ListFilters {
  roomType: string
  minPrice: string
  maxPrice: string
  startDate: string
  endDate: string
}

const defaultFilters: ListFilters = {
  roomType: '',
  minPrice: '',
  maxPrice: '',
  startDate: '',
  endDate: ''
}

const roomTypeOptions = ['高级大床房', '商务双床房', '景观套房']

const HotelList = () => {
  const router = useRouter()
  const { isLogin } = useAuthStore()
  const [list, setList] = useState<Hotel[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [draftFilters, setDraftFilters] = useState<ListFilters>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<ListFilters>(defaultFilters)

  const city = router.params.city || ''
  const keyword = router.params.keyword || ''
  const tag = router.params.tag || ''

  const loadHotels = async (p: number, reset = false) => {
    if (loading) return
    setLoading(true)
    Taro.showLoading({ title: '加载中' })
    const res = await fetchHotels({
      page: p,
      pageSize: PAGE_SIZE,
      city,
      keyword,
      tag,
      roomType: appliedFilters.roomType || undefined,
      minPrice: appliedFilters.minPrice ? Number(appliedFilters.minPrice) : undefined,
      maxPrice: appliedFilters.maxPrice ? Number(appliedFilters.maxPrice) : undefined,
      startDate: appliedFilters.startDate || undefined,
      endDate: appliedFilters.endDate || undefined
    })
    Taro.hideLoading()
    setLoading(false)
    setHasMore(res.hasMore)
    setList(prev => (reset ? res.list : [...prev, ...res.list]))
  }

  useEffect(() => {
    setPage(1)
    loadHotels(1, true)
  }, [city, keyword, tag, appliedFilters])

  const handleScrollToLower = () => {
    if (!hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    loadHotels(nextPage)
  }

  const goDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${id}` })
  }

  const applyFilters = () => {
    if (
      draftFilters.minPrice &&
      draftFilters.maxPrice &&
      Number(draftFilters.minPrice) > Number(draftFilters.maxPrice)
    ) {
      Taro.showToast({ title: '最低价不能高于最高价', icon: 'none' })
      return
    }
    setAppliedFilters(draftFilters)
    setShowFilter(false)
  }

  const resetFilters = () => {
    setDraftFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
  }

  return (
    <View className="page list-page">
      <View className="filter-header card">
        <View className="filter-top">
          <Text>城市：{city || '全部'}</Text>
          <View className="filter-action" onClick={() => setShowFilter(true)}>
            筛选
          </View>
        </View>
        <Text>关键词：{keyword || '无'}</Text>
        {tag && <Text>标签：{tag}</Text>}
        {appliedFilters.roomType && <Text>房型：{appliedFilters.roomType}</Text>}
        {(appliedFilters.minPrice || appliedFilters.maxPrice) && (
          <Text>
            价格：{appliedFilters.minPrice || '不限'} - {appliedFilters.maxPrice || '不限'}
          </Text>
        )}
        {appliedFilters.startDate && appliedFilters.endDate && (
          <Text>
            日期：{appliedFilters.startDate} 至 {appliedFilters.endDate}
          </Text>
        )}
      </View>

      {list.length === 0 && !loading && <View className="no-more">暂无匹配酒店</View>}

      <VirtualList
        data={list}
        itemHeight={200}
        height={900}
        onReachBottom={handleScrollToLower}
        renderItem={item => (
          <View className="hotel-card" onClick={() => goDetail(item.id)}>
            <Image className="thumb" src={item.thumb} />
            <View className="info">
              <Text className="name">{item.name}</Text>
              <Text className="score">{item.score.toFixed(1)} 分</Text>
              <View className="price-row">
                <Text className="price">{formatPrice(item.price)} 起</Text>
                {isLogin && item.isMemberDeal && <Text className="member-tag">会员价</Text>}
              </View>
            </View>
          </View>
        )}
      />

      {!hasMore && list.length > 0 && <View className="no-more">没有更多了</View>}

      {showFilter && (
        <View className="filter-mask" onClick={() => setShowFilter(false)}>
          <View className="filter-panel" onClick={e => e.stopPropagation()}>
            <Text className="panel-title">筛选条件</Text>

            <View className="panel-block">
              <Text className="block-title">房型</Text>
              <View className="room-types">
                <Text
                  className={`room-chip ${draftFilters.roomType === '' ? 'active' : ''}`}
                  onClick={() => setDraftFilters(prev => ({ ...prev, roomType: '' }))}
                >
                  全部
                </Text>
                {roomTypeOptions.map(item => (
                  <Text
                    key={item}
                    className={`room-chip ${draftFilters.roomType === item ? 'active' : ''}`}
                    onClick={() => setDraftFilters(prev => ({ ...prev, roomType: item }))}
                  >
                    {item}
                  </Text>
                ))}
              </View>
            </View>

            <View className="panel-block">
              <Text className="block-title">价格范围</Text>
              <View className="price-inputs">
                <Input
                  type="digit"
                  value={draftFilters.minPrice}
                  placeholder="最低价"
                  onInput={e =>
                    setDraftFilters(prev => ({ ...prev, minPrice: e.detail.value }))
                  }
                />
                <Text className="price-split">-</Text>
                <Input
                  type="digit"
                  value={draftFilters.maxPrice}
                  placeholder="最高价"
                  onInput={e =>
                    setDraftFilters(prev => ({ ...prev, maxPrice: e.detail.value }))
                  }
                />
              </View>
            </View>

            <View className="panel-block">
              <Text className="block-title">日期</Text>
              <View className="date-field" onClick={() => setShowCalendar(true)}>
                {draftFilters.startDate && draftFilters.endDate
                  ? `${draftFilters.startDate} 至 ${draftFilters.endDate}`
                  : '请选择入住/离店日期'}
              </View>
            </View>

            <View className="panel-actions">
              <View className="btn-reset" onClick={resetFilters}>
                重置
              </View>
              <View className="btn-apply" onClick={applyFilters}>
                应用筛选
              </View>
            </View>
          </View>
        </View>
      )}

      <CustomCalendar
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onConfirm={(startDate, endDate) => {
          setDraftFilters(prev => ({ ...prev, startDate, endDate }))
          setShowCalendar(false)
        }}
      />
    </View>
  )
}

export default HotelList

