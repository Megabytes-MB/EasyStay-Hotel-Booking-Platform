import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Image, Input } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import dayjs from 'dayjs'
import VirtualList from '../../components/VirtualList'
import CustomCalendar from '../../components/CustomCalendar'
import { fetchHotels, Hotel } from '../../services/hotel'
import { resolveSearchLocationPoint } from '../../services/map'
import { formatPrice } from '../../utils/format'
import './index.scss'

const PAGE_SIZE = 8
const CITY_STORAGE_KEY = 'selected_city'
const QUICK_TAG_OPTIONS = ['高评分', '近地铁', '亲子友好', '城市景观', '免费停车', '豪华', '含早餐', '可取消']
const STAR_OPTIONS = [
  { label: '不限星级', value: '' },
  { label: '3钻及以上', value: '3' },
  { label: '4钻及以上', value: '4' },
  { label: '4.5分及以上', value: '4.5' },
]
const EARTH_RADIUS_KM = 6371

type SortField = '' | 'score' | 'priceStar' | 'distance'
type SortOrder = 'asc' | 'desc'

interface SortState {
  field: SortField
  order: SortOrder
}

interface ListFilters {
  keyword: string
  location: string
  roomType: string
  minPrice: string
  maxPrice: string
  minScore: string
  startDate: string
  endDate: string
  quickTags: string[]
}

const defaultFilters: ListFilters = {
  keyword: '',
  location: '',
  roomType: '',
  minPrice: '',
  maxPrice: '',
  minScore: '',
  startDate: '',
  endDate: '',
  quickTags: [],
}

const roomTypeOptions = ['高级大床房', '商务双床房', '景观套房']

const decodeSafe = (value: string) => {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter(item => typeof item === 'string')
}

const normalizedText = (value: string) => value.toLowerCase().replace(/\s+/g, '')

const matchesQuickTag = (hotel: Hotel, tag: string) => {
  if (tag === '高评分') return hotel.score >= 4.5

  const corpus = normalizedText(
    [
      hotel.name,
      hotel.city,
      hotel.address || '',
      ...(hotel.tags || []),
      ...(hotel.facilities || []),
      ...(hotel.roomTypes || []),
    ].join('|')
  )

  const ruleMap: Record<string, string[]> = {
    免费停车: ['停车', '免费停车'],
    亲子友好: ['亲子', '家庭', '儿童'],
    豪华: ['豪华', '高端', '行政'],
    近地铁: ['地铁', '轨道', '交通'],
    城市景观: ['景观', '夜景', '城市景'],
    含早餐: ['含早', '早餐'],
    可取消: ['可取消', '取消'],
  }

  const keywords = ruleMap[tag] || [tag]
  return keywords.some(keyword => corpus.includes(normalizedText(keyword)))
}

const parseFilterNumber = (value: string) => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toRadians = (degree: number) => (degree * Math.PI) / 180

const calculateDistanceKm = (
  from: { longitude: number; latitude: number },
  to: { longitude: number; latitude: number }
) => {
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)
  const dLat = lat2 - lat1
  const dLng = toRadians(to.longitude - from.longitude)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

const HotelList = () => {
  const router = useRouter()
  const routeParams = (router?.params || {}) as Record<string, string>

  const initialCity = decodeSafe(routeParams.city || '')
  const initialKeyword = decodeSafe(routeParams.keyword || '')
  const initialLocation = decodeSafe(routeParams.location || '')
  const initialTag = decodeSafe(routeParams.tag || '')
  const initialMinPrice = decodeSafe(routeParams.minPrice || '')
  const initialMaxPrice = decodeSafe(routeParams.maxPrice || '')
  const initialMinScore = decodeSafe(routeParams.minScore || '')
  const [autoSortedLocation, setAutoSortedLocation] = useState('')

  const [city, setCity] = useState(initialCity || '上海')
  const [list, setList] = useState<Hotel[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [activeSection, setActiveSection] = useState<'' | 'price' | 'tags' | 'room'>('')
  const [sortState, setSortState] = useState<SortState>({ field: '', order: 'asc' })
  const [searchPoint, setSearchPoint] = useState<{ longitude: number; latitude: number } | null>(null)
  const [draftFilters, setDraftFilters] = useState<ListFilters>(() => ({
    ...defaultFilters,
    keyword: initialKeyword,
    location: initialLocation,
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    minScore: initialMinScore,
    quickTags: initialTag ? [initialTag] : [],
  }))
  const [appliedFilters, setAppliedFilters] = useState<ListFilters>(() => ({
    ...defaultFilters,
    keyword: initialKeyword,
    location: initialLocation,
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    minScore: initialMinScore,
    quickTags: initialTag ? [initialTag] : [],
  }))
  const searchLocationText = useMemo(
    () => String(appliedFilters.location || '').trim(),
    [appliedFilters.location]
  )
  const canSortByDistance = searchLocationText.length > 0

  const loadHotels = async (p: number, reset = false) => {
    if (loading) return
    setLoading(true)
    Taro.showLoading({ title: '加载中' })

    const res = await fetchHotels({
      page: p,
      pageSize: PAGE_SIZE,
      city,
      keyword: searchLocationText ? undefined : (appliedFilters.keyword || undefined),
      roomType: appliedFilters.roomType || undefined,
      minPrice: appliedFilters.minPrice ? Number(appliedFilters.minPrice) : undefined,
      maxPrice: appliedFilters.maxPrice ? Number(appliedFilters.maxPrice) : undefined,
      startDate: appliedFilters.startDate || undefined,
      endDate: appliedFilters.endDate || undefined,
    })
    const nextList = Array.isArray(res?.list) ? res.list : []
    const safeHasMore = Boolean(res?.hasMore)

    Taro.hideLoading()
    setLoading(false)
    setHasMore(safeHasMore)
    setList(prev => {
      const safePrev = Array.isArray(prev) ? prev : []
      return reset ? nextList : [...safePrev, ...nextList]
    })
  }

  useDidShow(() => {
    const savedCity = Taro.getStorageSync(CITY_STORAGE_KEY)
    if (typeof savedCity === 'string' && savedCity.trim()) {
      setCity(savedCity)
    }
  })

  useEffect(() => {
    setPage(1)
    loadHotels(1, true)
  }, [city, appliedFilters])

  useEffect(() => {
    let active = true
    if (!canSortByDistance) {
      setSearchPoint(null)
      setAutoSortedLocation('')
      if (sortState.field === 'distance') {
        setSortState({ field: '', order: 'asc' })
      }
      return
    }

    resolveSearchLocationPoint(searchLocationText, city)
      .then(point => {
        if (active) {
          setSearchPoint(point)
          if (point && autoSortedLocation !== searchLocationText) {
            // Auto switch to nearest-first once when a new location search resolves.
            setSortState({ field: 'distance', order: 'asc' })
            setAutoSortedLocation(searchLocationText)
          }
          if (!point && sortState.field === 'distance') {
            setSortState({ field: '', order: 'asc' })
          }
        }
      })
      .catch(() => {
        if (active) {
          setSearchPoint(null)
          if (sortState.field === 'distance') {
            setSortState({ field: '', order: 'asc' })
          }
        }
      })

    return () => {
      active = false
    }
  }, [canSortByDistance, searchLocationText, city, sortState.field, autoSortedLocation])

  const stayNights = useMemo(() => {
    if (!draftFilters.startDate || !draftFilters.endDate) return 1
    const diff = dayjs(draftFilters.endDate).diff(dayjs(draftFilters.startDate), 'day')
    return diff > 0 ? diff : 1
  }, [draftFilters.startDate, draftFilters.endDate])

  const filteredList = useMemo(() => {
    const safeList = Array.isArray(list) ? list : []
    const activeQuickTags = ensureStringArray(appliedFilters.quickTags)

    return safeList.filter(item => {
      const minPrice = parseFilterNumber(appliedFilters.minPrice)
      const maxPrice = parseFilterNumber(appliedFilters.maxPrice)
      const minScore = parseFilterNumber(appliedFilters.minScore)

      if (minPrice !== null && item.price < minPrice) return false
      if (maxPrice !== null && item.price > maxPrice) return false
      if (minScore !== null && item.score < minScore) return false

      if (appliedFilters.roomType) {
        const roomMatched =
          (item.roomTypes || []).some(room => room.includes(appliedFilters.roomType)) ||
          (item.rooms || []).some(room => room.name.includes(appliedFilters.roomType))
        if (!roomMatched) return false
      }

      if (activeQuickTags.length > 0) {
        const allMatched = activeQuickTags.every(tagText => matchesQuickTag(item, tagText))
        if (!allMatched) return false
      }

      return true
    })
  }, [list, appliedFilters])

  const sortedList = useMemo(() => {
    if (!sortState.field) return filteredList

    const next = [...filteredList]

    if (sortState.field === 'score') {
      next.sort((a, b) =>
        sortState.order === 'asc' ? a.score - b.score : b.score - a.score
      )
      return next
    }

    if (sortState.field === 'priceStar') {
      next.sort((a, b) => {
        if (a.price === b.price) {
          return sortState.order === 'asc' ? a.score - b.score : b.score - a.score
        }
        return sortState.order === 'asc' ? a.price - b.price : b.price - a.price
      })
      return next
    }

    if (sortState.field === 'distance') {
      if (!searchPoint) return next
      next.sort((a, b) => {
        const distanceA =
          Number.isFinite(a.longitude) && Number.isFinite(a.latitude)
            ? calculateDistanceKm(searchPoint, {
                longitude: Number(a.longitude),
                latitude: Number(a.latitude),
              })
            : Number.POSITIVE_INFINITY
        const distanceB =
          Number.isFinite(b.longitude) && Number.isFinite(b.latitude)
            ? calculateDistanceKm(searchPoint, {
                longitude: Number(b.longitude),
                latitude: Number(b.latitude),
              })
            : Number.POSITIVE_INFINITY
        return sortState.order === 'asc' ? distanceA - distanceB : distanceB - distanceA
      })
    }

    return next
  }, [filteredList, sortState, searchPoint])

  const activeFilterSummary = useMemo(() => {
    const blocks: string[] = []
    const activeQuickTags = ensureStringArray(appliedFilters.quickTags)

    if (appliedFilters.roomType) blocks.push(appliedFilters.roomType)
    if (appliedFilters.minScore) blocks.push(`${appliedFilters.minScore}+`)
    if (appliedFilters.minPrice || appliedFilters.maxPrice) {
      blocks.push(`￥${appliedFilters.minPrice || '0'}-￥${appliedFilters.maxPrice || '不限'}`)
    }
    if (activeQuickTags.length > 0) {
      blocks.push(...activeQuickTags)
    }
    return blocks
  }, [appliedFilters])

  const handleScrollToLower = () => {
    if (!hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    loadHotels(nextPage)
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

    setAppliedFilters({
      ...draftFilters,
      keyword: String(draftFilters.keyword || '').trim(),
      location: String(draftFilters.location || '').trim(),
      quickTags: ensureStringArray(draftFilters.quickTags),
    })
  }

  const resetFilters = () => {
    const resetValue = {
      ...defaultFilters,
      keyword: String(draftFilters.keyword || ''),
      location: String(draftFilters.location || ''),
    }
    setDraftFilters(resetValue)
    setAppliedFilters(resetValue)
  }

  const toggleQuickTag = (tagText: string) => {
    setDraftFilters(prev => {
      const currentQuickTags = ensureStringArray(prev.quickTags)
      const existed = currentQuickTags.includes(tagText)
      return {
        ...prev,
        quickTags: existed
          ? currentQuickTags.filter(tag => tag !== tagText)
          : [...currentQuickTags, tagText],
      }
    })
  }
  const draftQuickTags = useMemo(
    () => ensureStringArray(draftFilters.quickTags),
    [draftFilters.quickTags]
  )

  const toggleSection = (key: 'price' | 'tags' | 'room') => {
    setActiveSection(prev => (prev === key ? '' : key))
  }

  const toggleSort = (field: SortField) => {
    if (!field) return
    if (field === 'distance' && (!canSortByDistance || !searchPoint)) return

    setSortState(prev => {
      if (prev.field === field) {
        return {
          field,
          order: prev.order === 'asc' ? 'desc' : 'asc',
        }
      }
      return {
        field,
        order: 'asc',
      }
    })
  }

  const goDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${id}` })
  }

  const goPickCity = () => {
    Taro.navigateTo({
      url: `/pages/city-picker/index?city=${encodeURIComponent(city)}`
    })
  }

  return (
    <View className='page list-page'>
      <View className='core-filter card'>
        <View className='core-main'>
          <View className='core-left'>
            <View className='core-row'>
              <View className='city-box' onClick={goPickCity}>
                <Text className='core-label'>城市</Text>
                <Text className='core-value city-value'>{city || '全部'}</Text>
              </View>

              <View className='keyword-box'>
                <Text className='core-label'>搜索</Text>
                <Input
                  value={String(draftFilters.location || '')}
                  placeholder='地址/商圈/地标'
                  onInput={e => setDraftFilters(prev => ({ ...prev, location: e.detail.value }))}
                />
              </View>
            </View>

            <View className='core-row'>
              <View className='date-box' onClick={() => setShowCalendar(true)}>
                <Text className='core-label'>入住/离店日期</Text>
                <Text className='core-value'>
                  {draftFilters.startDate && draftFilters.endDate
                    ? `${draftFilters.startDate} - ${draftFilters.endDate}`
                    : '请选择'}
                </Text>
              </View>

              <View className='night-box'>
                <Text className='core-label'>入住间夜</Text>
                <Text className='core-value'>{stayNights} 晚</Text>
              </View>
            </View>
          </View>

          <View className='query-inline-btn tall' onClick={applyFilters}>
            查询
          </View>
        </View>

        <View className='sort-and-filter-row'>
          <View className='sort-options'>
            <View
              className={`sort-chip ${sortState.field === 'score' ? 'active' : ''}`}
              onClick={() => toggleSort('score')}
            >
              评分{sortState.field === 'score' ? (sortState.order === 'asc' ? '↑' : '↓') : ''}
            </View>
            <View
              className={`sort-chip ${sortState.field === 'priceStar' ? 'active' : ''}`}
              onClick={() => toggleSort('priceStar')}
            >
              价格/星级{sortState.field === 'priceStar' ? (sortState.order === 'asc' ? '↑' : '↓') : ''}
            </View>
            <View
              className={`sort-chip ${sortState.field === 'distance' ? 'active' : ''} ${(!canSortByDistance || !searchPoint) ? 'disabled' : ''}`}
              onClick={() => toggleSort('distance')}
            >
              位置距离{sortState.field === 'distance' ? (sortState.order === 'asc' ? '↑' : '↓') : ''}
            </View>
          </View>
          <View className='toggle-filter right' onClick={() => setShowFilter(prev => !prev)}>
            <View className='toggle-filter-icon' />
            <Text className='toggle-filter-arrow'>{showFilter ? '▴' : '▾'}</Text>
          </View>
        </View>
      </View>

      {showFilter && (
        <View className='detail-filter card'>
          <View className='filter-tabs-row'>
            <View
              className={`filter-tab ${activeSection === 'price' ? 'active' : ''}`}
              onClick={() => toggleSection('price')}
            >
              <Text>价格 / 星级</Text>
              <Text className='tab-arrow'>{activeSection === 'price' ? '▾' : '▸'}</Text>
            </View>

            <View
              className={`filter-tab ${activeSection === 'tags' ? 'active' : ''}`}
              onClick={() => toggleSection('tags')}
            >
              <Text>快捷标签</Text>
              <Text className='tab-arrow'>{activeSection === 'tags' ? '▾' : '▸'}</Text>
            </View>

            <View
              className={`filter-tab ${activeSection === 'room' ? 'active' : ''}`}
              onClick={() => toggleSection('room')}
            >
              <Text>房型</Text>
              <Text className='tab-arrow'>{activeSection === 'room' ? '▾' : '▸'}</Text>
            </View>
          </View>

          {activeSection === 'price' && (
            <View className='fold-body'>
              <View className='price-inputs'>
                <Input
                  type='digit'
                  value={draftFilters.minPrice}
                  placeholder='最低价'
                  onInput={e => setDraftFilters(prev => ({ ...prev, minPrice: e.detail.value }))}
                />
                <Text className='price-split'>-</Text>
                <Input
                  type='digit'
                  value={draftFilters.maxPrice}
                  placeholder='最高价'
                  onInput={e => setDraftFilters(prev => ({ ...prev, maxPrice: e.detail.value }))}
                />
              </View>

              <View className='chip-row'>
                {STAR_OPTIONS.map(option => (
                  <Text
                    key={option.value || 'all'}
                    className={`chip ${draftFilters.minScore === option.value ? 'active' : ''}`}
                    onClick={() => setDraftFilters(prev => ({ ...prev, minScore: option.value }))}
                  >
                    {option.label}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {activeSection === 'tags' && (
            <View className='fold-body'>
              <View className='chip-row'>
                {QUICK_TAG_OPTIONS.map(tagText => (
                  <Text
                    key={tagText}
                    className={`chip ${draftQuickTags.includes(tagText) ? 'active' : ''}`}
                    onClick={() => toggleQuickTag(tagText)}
                  >
                    {tagText}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {activeSection === 'room' && (
            <View className='fold-body'>
              <View className='chip-row'>
                <Text
                  className={`chip ${draftFilters.roomType === '' ? 'active' : ''}`}
                  onClick={() => setDraftFilters(prev => ({ ...prev, roomType: '' }))}
                >
                  全部
                </Text>
                {roomTypeOptions.map(item => (
                  <Text
                    key={item}
                    className={`chip ${draftFilters.roomType === item ? 'active' : ''}`}
                    onClick={() => setDraftFilters(prev => ({ ...prev, roomType: item }))}
                  >
                    {item}
                  </Text>
                ))}
              </View>
            </View>
          )}

          <View className='panel-actions'>
            <View className='btn-reset' onClick={resetFilters}>
              重置
            </View>
            <View className='btn-apply' onClick={applyFilters}>
              应用筛选
            </View>
          </View>
        </View>
      )}

      {activeFilterSummary.length > 0 && (
        <View className='active-summary'>
          {activeFilterSummary.map(item => (
            <Text key={item} className='summary-chip'>
              {item}
            </Text>
          ))}
        </View>
      )}

      {sortedList.length === 0 && !loading && <View className='no-more'>暂无匹配酒店</View>}

      <VirtualList<Hotel>
        data={sortedList}
        itemHeight={200}
        height={900}
        onReachBottom={handleScrollToLower}
        renderItem={(item: Hotel) => (
          <View className='hotel-card' onClick={() => goDetail(item.id)}>
            <Image className='thumb' src={item.thumb} />
            <View className='info'>
              <Text className='name'>{item.name}</Text>
              <Text className='score'>{item.score.toFixed(1)} 分</Text>
              <View className='price-row'>
                <Text className='price'>{formatPrice(item.price)} 起</Text>
              </View>
            </View>
          </View>
        )}
      />

      {!hasMore && sortedList.length > 0 && <View className='no-more'>没有更多了</View>}

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
