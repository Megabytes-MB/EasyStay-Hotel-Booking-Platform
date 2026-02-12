import dayjs from 'dayjs'

export interface Room {
  id: number
  name: string
  price: number
}

export interface Hotel {
  id: number
  name: string
  city: string
  price: number
  score: number
  thumb: string
  banners: string[]
  rooms: Room[]
  isMemberDeal: boolean
  tags: string[]
}

interface FetchHotelsParams {
  page: number
  pageSize: number
  city?: string
  keyword?: string
  tag?: string
  roomType?: string
  minPrice?: number
  maxPrice?: number
  startDate?: string
  endDate?: string
}

const roomTemplates = ['高级大床房', '商务双床房', '景观套房']

const seedHotels: Hotel[] = [
  {
    id: 1001,
    name: '云栖精选酒店 · 人民广场店',
    city: '上海',
    price: 268,
    score: 4.8,
    thumb: 'https://picsum.photos/id/401/600/400',
    banners: [
      'https://picsum.photos/id/402/800/500',
      'https://picsum.photos/id/403/800/500',
      'https://picsum.photos/id/404/800/500'
    ],
    rooms: [
      { id: 1, name: roomTemplates[0], price: 268 },
      { id: 2, name: roomTemplates[1], price: 328 },
      { id: 3, name: roomTemplates[2], price: 498 }
    ],
    isMemberDeal: true,
    tags: ['高评分', '近地铁']
  },
  {
    id: 1002,
    name: '云栖精选酒店 · 西湖湖滨店',
    city: '杭州',
    price: 318,
    score: 4.6,
    thumb: 'https://picsum.photos/id/405/600/400',
    banners: [
      'https://picsum.photos/id/406/800/500',
      'https://picsum.photos/id/407/800/500',
      'https://picsum.photos/id/408/800/500'
    ],
    rooms: [
      { id: 1, name: roomTemplates[0], price: 318 },
      { id: 2, name: roomTemplates[1], price: 358 },
      { id: 3, name: roomTemplates[2], price: 538 }
    ],
    isMemberDeal: false,
    tags: ['亲子友好', '城市景观']
  },
  {
    id: 1003,
    name: '云栖轻奢酒店 · 北京国贸店',
    city: '北京',
    price: 388,
    score: 4.7,
    thumb: 'https://picsum.photos/id/409/600/400',
    banners: [
      'https://picsum.photos/id/410/800/500',
      'https://picsum.photos/id/411/800/500',
      'https://picsum.photos/id/412/800/500'
    ],
    rooms: [
      { id: 1, name: roomTemplates[0], price: 388 },
      { id: 2, name: roomTemplates[1], price: 428 },
      { id: 3, name: roomTemplates[2], price: 628 }
    ],
    isMemberDeal: true,
    tags: ['高评分', '城市景观']
  },
  {
    id: 1004,
    name: '云栖精选酒店 · 深圳科技园店',
    city: '深圳',
    price: 248,
    score: 4.4,
    thumb: 'https://picsum.photos/id/413/600/400',
    banners: [
      'https://picsum.photos/id/414/800/500',
      'https://picsum.photos/id/415/800/500',
      'https://picsum.photos/id/416/800/500'
    ],
    rooms: [
      { id: 1, name: roomTemplates[0], price: 248 },
      { id: 2, name: roomTemplates[1], price: 298 },
      { id: 3, name: roomTemplates[2], price: 468 }
    ],
    isMemberDeal: false,
    tags: ['近地铁', '亲子友好']
  },
  {
    id: 1005,
    name: '云栖精选酒店 · 成都太古里店',
    city: '成都',
    price: 288,
    score: 4.5,
    thumb: 'https://picsum.photos/id/417/600/400',
    banners: [
      'https://picsum.photos/id/418/800/500',
      'https://picsum.photos/id/419/800/500',
      'https://picsum.photos/id/420/800/500'
    ],
    rooms: [
      { id: 1, name: roomTemplates[0], price: 288 },
      { id: 2, name: roomTemplates[1], price: 338 },
      { id: 3, name: roomTemplates[2], price: 518 }
    ],
    isMemberDeal: true,
    tags: ['城市景观', '近地铁']
  }
]

const generatedHotels: Hotel[] = Array.from({ length: 28 }).map((_, i) => ({
  id: i + 1,
  name: `云栖精选酒店 · ${i + 1} 号店`,
  city: i % 2 === 0 ? '上海' : '杭州',
  price: 198 + (i % 6) * 40,
  score: 4.2 + (i % 5) * 0.1,
  thumb: `https://picsum.photos/id/${120 + (i % 20)}/600/400`,
  banners: [
    `https://picsum.photos/id/${220 + (i % 20)}/800/500`,
    `https://picsum.photos/id/${260 + (i % 20)}/800/500`,
    `https://picsum.photos/id/${300 + (i % 20)}/800/500`
  ],
  rooms: [
    { id: 1, name: roomTemplates[0], price: 299 + (i % 4) * 20 },
    { id: 2, name: roomTemplates[1], price: 269 + (i % 3) * 18 },
    { id: 3, name: roomTemplates[2], price: 459 + (i % 5) * 30 }
  ],
  isMemberDeal: i % 3 === 0,
  tags: [i % 2 === 0 ? '高评分' : '城市景观', i % 3 === 0 ? '近地铁' : '亲子友好']
}))

const hotels: Hotel[] = [...seedHotels, ...generatedHotels]

const roomBookedRanges = (hotelId: number, roomId: number) => {
  const base = dayjs().startOf('month')
  const seed = hotelId + roomId
  const start1 = base.add((seed * 3) % 20, 'day')
  const end1 = start1.add((seed % 3) + 1, 'day')
  const start2 = base.add((seed * 5) % 22, 'day')
  const end2 = start2.add((seed % 2) + 1, 'day')
  return [
    { start: start1, end: end1 },
    { start: start2, end: end2 }
  ]
}

const isRoomAvailable = (
  hotelId: number,
  roomId: number,
  startDate?: string,
  endDate?: string
) => {
  if (!startDate || !endDate) return true
  const targetStart = dayjs(startDate)
  const targetEnd = dayjs(endDate)
  if (!targetStart.isValid() || !targetEnd.isValid()) return true

  return roomBookedRanges(hotelId, roomId).every(range => {
    const overlap =
      targetStart.isBefore(range.end, 'day') && targetEnd.isAfter(range.start, 'day')
    return !overlap
  })
}

export const fetchHotels = async (params: FetchHotelsParams) => {
  const {
    page,
    pageSize,
    city,
    keyword,
    tag,
    roomType,
    minPrice,
    maxPrice,
    startDate,
    endDate
  } = params

  const filtered = hotels
    .map(hotel => {
      const matchCity = city ? hotel.city.includes(city) : true
      const matchKeyword = keyword ? hotel.name.includes(keyword) : true
      const matchTag = tag ? hotel.tags.includes(tag) : true
      if (!matchCity || !matchKeyword || !matchTag) return null

      const availableRooms = hotel.rooms.filter(room => {
        const matchRoomType = roomType ? room.name === roomType : true
        const matchMinPrice = typeof minPrice === 'number' ? room.price >= minPrice : true
        const matchMaxPrice = typeof maxPrice === 'number' ? room.price <= maxPrice : true
        const matchDate = isRoomAvailable(hotel.id, room.id, startDate, endDate)
        return matchRoomType && matchMinPrice && matchMaxPrice && matchDate
      })
      if (availableRooms.length === 0) return null

      const startFromPrice = Math.min(...availableRooms.map(room => room.price))
      return {
        ...hotel,
        price: startFromPrice
      }
    })
    .filter(Boolean) as Hotel[]

  const start = (page - 1) * pageSize
  const end = start + pageSize
  await new Promise(resolve => setTimeout(resolve, 300))
  return {
    list: filtered.slice(start, end),
    hasMore: end < filtered.length
  }
}

export const fetchHotelDetail = async (id: number) => {
  await new Promise(resolve => setTimeout(resolve, 200))
  const hotel = hotels.find(item => item.id === id)
  if (!hotel) throw new Error('Hotel not found')
  const rooms = [...hotel.rooms].sort((a, b) => a.price - b.price)
  return { ...hotel, rooms }
}

export const fetchOrders = async () => {
  await new Promise(resolve => setTimeout(resolve, 200))
  return [
    {
      id: 101,
      name: '云栖精选酒店 · 3 号店',
      date: dayjs().add(2, 'day').format('YYYY-MM-DD'),
      status: '待入住'
    },
    {
      id: 102,
      name: '云栖精选酒店 · 8 号店',
      date: dayjs().subtract(12, 'day').format('YYYY-MM-DD'),
      status: '已完成'
    }
  ]
}
