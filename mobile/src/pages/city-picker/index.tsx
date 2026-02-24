import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { reverseGeocodeByLocation } from '../../services/map'
import { designPxToDevicePx, getDeviceWindowWidth } from '../../utils/layout'
import './index.scss'

type TabKey = 'domestic' | 'intl'

interface CityItem {
  name: string
  code: string
  pinyin: string
  group: string
}

const HISTORY_KEY = 'city_pick_history'
const CITY_STORAGE_KEY = 'selected_city'
const LOCATION_CITY_KEY = 'located_city'
const DEFAULT_CITY = '昆明'
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

interface GeoPoint {
  longitude: number
  latitude: number
}

interface CityCenter extends GeoPoint {
  name: string
}

const domesticCities: CityItem[] = [
  { name: '鞍山', code: 'AOG', pinyin: 'anshan', group: 'A' },
  { name: '北京', code: 'BJS', pinyin: 'beijing', group: 'B' },
  { name: '包头', code: 'BAV', pinyin: 'baotou', group: 'B' },
  { name: '成都', code: 'CTU', pinyin: 'chengdu', group: 'C' },
  { name: '重庆', code: 'CKG', pinyin: 'chongqing', group: 'C' },
  { name: '长沙', code: 'CSX', pinyin: 'changsha', group: 'C' },
  { name: '长春', code: 'CGQ', pinyin: 'changchun', group: 'C' },
  { name: '大连', code: 'DLC', pinyin: 'dalian', group: 'D' },
  { name: '东莞', code: 'DGM', pinyin: 'dongguan', group: 'D' },
  { name: '福州', code: 'FOC', pinyin: 'fuzhou', group: 'F' },
  { name: '佛山', code: 'FUO', pinyin: 'foshan', group: 'F' },
  { name: '广州', code: 'CAN', pinyin: 'guangzhou', group: 'G' },
  { name: '贵阳', code: 'KWE', pinyin: 'guiyang', group: 'G' },
  { name: '桂林', code: 'KWL', pinyin: 'guilin', group: 'G' },
  { name: '杭州', code: 'HGH', pinyin: 'hangzhou', group: 'H' },
  { name: '哈尔滨', code: 'HRB', pinyin: 'haerbin', group: 'H' },
  { name: '合肥', code: 'HFE', pinyin: 'hefei', group: 'H' },
  { name: '海口', code: 'HAK', pinyin: 'haikou', group: 'H' },
  { name: '昆明', code: 'KMG', pinyin: 'kunming', group: 'K' },
  { name: '兰州', code: 'LHW', pinyin: 'lanzhou', group: 'L' },
  { name: '丽江', code: 'LJG', pinyin: 'lijiang', group: 'L' },
  { name: '南京', code: 'NKG', pinyin: 'nanjing', group: 'N' },
  { name: '宁波', code: 'NGB', pinyin: 'ningbo', group: 'N' },
  { name: '南宁', code: 'NNG', pinyin: 'nanning', group: 'N' },
  { name: '青岛', code: 'TAO', pinyin: 'qingdao', group: 'Q' },
  { name: '泉州', code: 'JJN', pinyin: 'quanzhou', group: 'Q' },
  { name: '上海', code: 'SHA', pinyin: 'shanghai', group: 'S' },
  { name: '深圳', code: 'SZX', pinyin: 'shenzhen', group: 'S' },
  { name: '苏州', code: 'SZV', pinyin: 'suzhou', group: 'S' },
  { name: '沈阳', code: 'SHE', pinyin: 'shenyang', group: 'S' },
  { name: '三亚', code: 'SYX', pinyin: 'sanya', group: 'S' },
  { name: '天津', code: 'TSN', pinyin: 'tianjin', group: 'T' },
  { name: '太原', code: 'TYN', pinyin: 'taiyuan', group: 'T' },
  { name: '武汉', code: 'WUH', pinyin: 'wuhan', group: 'W' },
  { name: '无锡', code: 'WUX', pinyin: 'wuxi', group: 'W' },
  { name: '乌鲁木齐', code: 'URC', pinyin: 'wulumuqi', group: 'W' },
  { name: '西安', code: 'XIY', pinyin: 'xian', group: 'X' },
  { name: '厦门', code: 'XMN', pinyin: 'xiamen', group: 'X' },
  { name: '烟台', code: 'YNT', pinyin: 'yantai', group: 'Y' },
  { name: '银川', code: 'INC', pinyin: 'yinchuan', group: 'Y' },
  { name: '郑州', code: 'CGO', pinyin: 'zhengzhou', group: 'Z' },
  { name: '珠海', code: 'ZUH', pinyin: 'zhuhai', group: 'Z' },
]

const intlCities: CityItem[] = [
  { name: '香港', code: 'HKG', pinyin: 'xianggang', group: 'X' },
  { name: '澳门', code: 'MFM', pinyin: 'aomen', group: 'A' },
  { name: '台北', code: 'TPE', pinyin: 'taibei', group: 'T' },
  { name: '东京', code: 'TYO', pinyin: 'dongjing', group: 'D' },
  { name: '大阪', code: 'OSA', pinyin: 'daban', group: 'D' },
  { name: '首尔', code: 'SEL', pinyin: 'shouer', group: 'S' },
  { name: '新加坡', code: 'SIN', pinyin: 'xinjiapo', group: 'X' },
  { name: '曼谷', code: 'BKK', pinyin: 'mangu', group: 'M' },
  { name: '吉隆坡', code: 'KUL', pinyin: 'jilongpo', group: 'J' },
  { name: '巴黎', code: 'PAR', pinyin: 'bali', group: 'B' },
  { name: '伦敦', code: 'LON', pinyin: 'lundun', group: 'L' },
  { name: '悉尼', code: 'SYD', pinyin: 'xini', group: 'X' },
  { name: '纽约', code: 'NYC', pinyin: 'niuyue', group: 'N' },
]

const hotDomesticCities = [
  '上海',
  '广州',
  '成都',
  '深圳',
  '北京',
  '昆明',
  '重庆',
  '西安',
  '杭州',
  '武汉',
  '南京',
  '郑州',
  '海口',
  '长沙',
  '乌鲁木齐',
  '厦门',
  '青岛',
  '哈尔滨',
  '贵阳',
  '沈阳',
]

const hotIntlCities = ['香港', '澳门', '台北', '东京', '首尔', '新加坡', '伦敦', '纽约']

const CITY_CENTER_CANDIDATES: CityCenter[] = [
  { name: '上海', longitude: 121.4737, latitude: 31.2304 },
  { name: '北京', longitude: 116.4074, latitude: 39.9042 },
  { name: '广州', longitude: 113.2644, latitude: 23.1291 },
  { name: '深圳', longitude: 114.0579, latitude: 22.5431 },
  { name: '成都', longitude: 104.0665, latitude: 30.5723 },
  { name: '杭州', longitude: 120.1551, latitude: 30.2741 },
  { name: '重庆', longitude: 106.5516, latitude: 29.563 },
  { name: '昆明', longitude: 102.8332, latitude: 24.8797 },
  { name: '武汉', longitude: 114.3054, latitude: 30.5931 },
  { name: '南京', longitude: 118.7969, latitude: 32.0603 },
  { name: '西安', longitude: 108.9398, latitude: 34.3416 },
  { name: '郑州', longitude: 113.6254, latitude: 34.7466 },
  { name: '长沙', longitude: 112.9388, latitude: 28.2282 },
  { name: '海口', longitude: 110.1983, latitude: 20.044 },
  { name: '厦门', longitude: 118.0894, latitude: 24.4798 },
  { name: '青岛', longitude: 120.3826, latitude: 36.0671 },
  { name: '哈尔滨', longitude: 126.6424, latitude: 45.7569 },
  { name: '贵阳', longitude: 106.6302, latitude: 26.647 },
  { name: '沈阳', longitude: 123.4315, latitude: 41.8057 },
  { name: '乌鲁木齐', longitude: 87.6168, latitude: 43.8256 },
  { name: '香港', longitude: 114.1694, latitude: 22.3193 },
  { name: '澳门', longitude: 113.5491, latitude: 22.1987 },
  { name: '台北', longitude: 121.5654, latitude: 25.033 },
  { name: '东京', longitude: 139.75, latitude: 35.6833 },
  { name: '大阪', longitude: 135.5023, latitude: 34.6937 },
  { name: '首尔', longitude: 126.978, latitude: 37.5665 },
  { name: '新加坡', longitude: 103.8198, latitude: 1.3521 },
  { name: '曼谷', longitude: 100.5018, latitude: 13.7563 },
  { name: '吉隆坡', longitude: 101.6869, latitude: 3.139 },
  { name: '巴黎', longitude: 2.3522, latitude: 48.8566 },
  { name: '伦敦', longitude: -0.1276, latitude: 51.5072 },
  { name: '悉尼', longitude: 151.2093, latitude: -33.8688 },
  { name: '纽约', longitude: -74.006, latitude: 40.7128 },
]

const toRadians = (degree: number) => (degree * Math.PI) / 180

const distanceInKm = (a: GeoPoint, b: GeoPoint) => {
  const earthRadius = 6371
  const dLat = toRadians(b.latitude - a.latitude)
  const dLng = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const arc = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav))
  return earthRadius * arc
}

const resolveNearestCity = (point: GeoPoint) => {
  let matched: { name: string; distance: number } | null = null
  CITY_CENTER_CANDIDATES.forEach(city => {
    const distance = distanceInKm(point, city)
    if (!matched || distance < matched.distance) {
      matched = { name: city.name, distance }
    }
  })

  if (!matched || matched.distance > 350) {
    return ''
  }
  return matched.name
}

const getSafeStatusBarHeight = () => {
  const windowInfo = (Taro as any).getWindowInfo?.()
  if (windowInfo && typeof windowInfo.statusBarHeight === 'number' && windowInfo.statusBarHeight > 0) {
    return windowInfo.statusBarHeight
  }
  return 20
}

const CityPicker = () => {
  const [tab, setTab] = useState<TabKey>('domestic')
  const [query, setQuery] = useState('')
  const [historyCities, setHistoryCities] = useState<string[]>([])
  const [locatedCity, setLocatedCity] = useState(DEFAULT_CITY)
  const [locating, setLocating] = useState(false)
  const [activeAnchor, setActiveAnchor] = useState('current')
  const autoLocateTriggeredRef = useRef(false)

  const [windowWidth] = useState(() => getDeviceWindowWidth())
  const statusBarHeight = getSafeStatusBarHeight()
  const headerTopPadding = statusBarHeight + designPxToDevicePx(12, windowWidth)
  const headerOffset = statusBarHeight + designPxToDevicePx(170, windowWidth)

  useEffect(() => {
    const savedLocatedCity = Taro.getStorageSync(LOCATION_CITY_KEY)
    if (typeof savedLocatedCity === 'string' && savedLocatedCity.trim()) {
      setLocatedCity(savedLocatedCity)
    } else {
      const savedCity = Taro.getStorageSync(CITY_STORAGE_KEY)
      if (typeof savedCity === 'string' && savedCity.trim()) {
        setLocatedCity(savedCity)
      }
    }

    const savedHistory = Taro.getStorageSync(HISTORY_KEY)
    if (Array.isArray(savedHistory)) {
      const validHistory = savedHistory.filter(item => typeof item === 'string').slice(0, 8)
      setHistoryCities(validHistory)
    }
  }, [])

  useEffect(() => {
    setActiveAnchor('current')
    Taro.nextTick(() => {
      Taro.pageScrollTo({ scrollTop: 0, duration: 0 })
    })
  }, [tab])

  const activeCities = tab === 'domestic' ? domesticCities : intlCities
  const hotCities = tab === 'domestic' ? hotDomesticCities : hotIntlCities
  const normalizedQuery = query.trim().toLowerCase()

  const groupedCities = useMemo(() => {
    const result: Record<string, CityItem[]> = {}
    activeCities.forEach(item => {
      if (!result[item.group]) result[item.group] = []
      result[item.group].push(item)
    })

    LETTERS.forEach(letter => {
      if (result[letter]) {
        result[letter].sort((a, b) => a.pinyin.localeCompare(b.pinyin))
      }
    })

    return result
  }, [activeCities])

  const availableLetters = useMemo(
    () => LETTERS.filter(letter => groupedCities[letter]?.length > 0),
    [groupedCities]
  )

  const searchResult = useMemo(() => {
    if (!normalizedQuery) return []
    const rawQuery = query.trim()
    return activeCities.filter(
      item =>
        item.name.includes(rawQuery) ||
        item.pinyin.includes(normalizedQuery) ||
        item.code.toLowerCase().includes(normalizedQuery)
    )
  }, [activeCities, normalizedQuery, query])

  const sectionAnchors = useMemo(
    () => [
      { key: 'current', label: '当前', id: 'section-current' },
      { key: 'history', label: '历史', id: 'section-history' },
      { key: 'hot', label: '热门', id: 'section-hot' },
      ...availableLetters.map(letter => ({
        key: letter,
        label: letter,
        id: `section-letter-${letter}`,
      })),
    ],
    [availableLetters]
  )

  const jumpToSection = (id: string, key: string) => {
    setActiveAnchor(key)
    Taro.pageScrollTo({
      selector: `#${id}`,
      duration: 220,
      offsetTop: -headerOffset,
    })
  }

  const handleLocateCity = async (options?: { silent?: boolean }) => {
    if (locating) return
    setLocating(true)
    try {
      const res = await Taro.getLocation({ type: 'gcj02' })
      const regeo = await reverseGeocodeByLocation(res.longitude, res.latitude)
      const preciseCity = String(regeo?.city || '').trim()

      const fallbackCity = resolveNearestCity({
        longitude: res.longitude,
        latitude: res.latitude,
      })
      const city = preciseCity || fallbackCity

      if (!city) {
        Taro.showToast({ title: '已定位，暂未识别城市', icon: 'none' })
        return
      }

      setLocatedCity(city)
      Taro.setStorageSync(LOCATION_CITY_KEY, city)
      if (!options?.silent) {
        Taro.showToast({ title: `定位到${city}`, icon: 'success' })
      }
    } catch (error: any) {
      const errMsg = String(error?.errMsg || '')
      if (errMsg.includes('auth deny') || errMsg.includes('authorize')) {
        if (!options?.silent) {
          const result = await Taro.showModal({
            title: '需要定位权限',
            content: '请开启“位置信息”权限后重试',
            confirmText: '去设置',
          })
          if (result.confirm) {
            Taro.openSetting()
          }
        }
      } else if (!options?.silent) {
        Taro.showToast({ title: '定位失败，请重试', icon: 'none' })
      }
    } finally {
      setLocating(false)
    }
  }

  useEffect(() => {
    if (autoLocateTriggeredRef.current) return
    autoLocateTriggeredRef.current = true
    handleLocateCity({ silent: true })
  }, [])

  const selectCity = (city: string) => {
    const nextHistory = [city, ...historyCities.filter(item => item !== city)].slice(0, 8)
    setHistoryCities(nextHistory)
    Taro.setStorageSync(HISTORY_KEY, nextHistory)
    Taro.setStorageSync(CITY_STORAGE_KEY, city)

    const openerChannel = getCurrentInstance().page?.getOpenerEventChannel()
    openerChannel?.emit('citySelected', { city })
    Taro.navigateBack()
  }

  const clearHistory = () => {
    setHistoryCities([])
    Taro.removeStorageSync(HISTORY_KEY)
  }

  return (
    <View className='page city-picker-page'>
      <View className='picker-header' style={{ paddingTop: `${headerTopPadding}px` }}>
        <View className='header-row'>
          <Text className='back-btn' onClick={() => Taro.navigateBack()}>
            &#8249;
          </Text>
          <Text className='header-title'>选择到达地</Text>
          <Text className='header-placeholder'> </Text>
        </View>

        <View className='search-box'>
          <Text className='search-icon'>&#8981;</Text>
          <Input
            value={query}
            placeholder='输入城市或机场中文/英文/三字码'
            onInput={e => setQuery(e.detail.value)}
          />
        </View>

        <View className='tab-row'>
          <View className={`tab-item ${tab === 'domestic' ? 'active' : ''}`} onClick={() => setTab('domestic')}>
            国内
          </View>
          <View className={`tab-item ${tab === 'intl' ? 'active' : ''}`} onClick={() => setTab('intl')}>
            中国港澳台/国际
          </View>
        </View>
      </View>

      <View className='picker-content'>
        {normalizedQuery ? (
          <View className='section search-section'>
            <Text className='section-title'>搜索结果</Text>
            {searchResult.length === 0 ? (
              <Text className='empty-text'>没有匹配城市</Text>
            ) : (
              <View className='city-grid'>
                {searchResult.map(item => (
                  <View key={`${item.name}-${item.code}`} className='city-chip' onClick={() => selectCity(item.name)}>
                    {item.name}
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View className='content-wrap'>
            <View className='section' id='section-current'>
              <Text className='section-title'>当前定位城市</Text>
              <View className='single-city'>
                <View className={`locate-btn ${locating ? 'loading' : ''}`} onClick={handleLocateCity}>
                  {locating ? '定位中' : '定位'}
                </View>
                <View className='city-chip located' onClick={() => selectCity(locatedCity)}>
                  <Text className='location-dot'>●</Text>
                  <Text>{locatedCity}</Text>
                </View>
              </View>
            </View>

            <View className='section' id='section-history'>
              <View className='section-head'>
                <Text className='section-title'>历史记录</Text>
                {historyCities.length > 0 && (
                  <Text className='clear-btn' onClick={clearHistory}>
                    清空
                  </Text>
                )}
              </View>
              {historyCities.length === 0 ? (
                <Text className='empty-text'>暂无历史记录</Text>
              ) : (
                <View className='city-grid'>
                  {historyCities.map(item => (
                    <View key={item} className='city-chip' onClick={() => selectCity(item)}>
                      {item}
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className='section' id='section-hot'>
              <Text className='section-title'>热门城市</Text>
              <View className='city-grid'>
                {hotCities.map(item => (
                  <View key={item} className='city-chip' onClick={() => selectCity(item)}>
                    {item}
                  </View>
                ))}
              </View>
            </View>

            <View className='section'>
              <Text className='section-title'>字母索引</Text>
              <View className='index-grid'>
                {availableLetters.map(letter => (
                  <View
                    key={letter}
                    className='index-chip'
                    onClick={() => jumpToSection(`section-letter-${letter}`, letter)}
                  >
                    {letter}
                  </View>
                ))}
              </View>
            </View>

            {availableLetters.map(letter => (
              <View key={letter} className='section' id={`section-letter-${letter}`}>
                <Text className='section-title'>{letter}</Text>
                <View className='city-grid'>
                  {groupedCities[letter].map(item => (
                    <View
                      key={`${letter}-${item.name}`}
                      className='city-chip'
                      onClick={() => selectCity(item.name)}
                    >
                      {item.name}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {!normalizedQuery && (
        <View className='side-index'>
          {sectionAnchors.map(anchor => (
            <Text
              key={anchor.key}
              className={`side-index-item ${activeAnchor === anchor.key ? 'active' : ''}`}
              onClick={() => jumpToSection(anchor.id, anchor.key)}
            >
              {anchor.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

export default CityPicker
