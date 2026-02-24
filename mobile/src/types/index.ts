/**
 * 共享数据类型定义
 * 前后端都应导入并遵循此文件中的类型定义
 * 
 * 更新时间：2026年2月12日
 * 维护者：EasyStay Team
 */

// ==================== User 相关 ====================

export interface User {
  /** 用户ID，唯一标识 */
  id: number
  /** 手机号，注册凭证 */
  phone: string
  /** 昵称 */
  nickname: string
  /** 头像 URL */
  avatar: string
  /** 认证令牌（登录时返回）*/
  token?: string
  /** 收藏的酒店 ID 列表 */
  favorites: number[]
  /** 是否会员 */
  isMember: boolean
  /** 用户创建时间戳（ms）*/
  createdAt: number
  /** 最后登录时间戳（ms）*/
  updatedAt?: number
}

export interface LoginRequest {
  phone: string
  verifyCode: string
}

export interface LoginResponse {
  user: User
  token: string
}

// ==================== Hotel 相关 ====================

export interface Hotel {
  /** 酒店ID，唯一标识 */
  id: number
  /** 酒店名称 */
  name: string
  /** 酒店星级（1-5星） */
  starLevel?: number
  /** 所在城市 */
  city: string
  /** 详细地址 */
  address: string
  /** 经度（GCJ-02） */
  longitude: number
  /** 纬度（GCJ-02） */
  latitude: number
  /** 评分（0-5） */
  score: number
  /** 标签数组 */
  tags: string[]
  /** 缩略图 URL（600x400） */
  thumb: string
  /** 轮播图 URL 数组（800x500） */
  banners: string[]
  /** 起始价格（动态计算，房型最低价） */
  minPrice: number
  /** 是否有会员优惠 */
  isMemberDeal: boolean
  /** 房型列表（详情页返回，列表页可选） */
  rooms?: Room[]
}

export interface HotelsListRequest {
  pageNo?: number
  pageSize?: number
  city?: string
  keyword?: string
  tag?: string
  roomType?: string
  minPrice?: number
  maxPrice?: number
  startDate?: string
  endDate?: string
}

// ==================== Room 相关 ====================

export interface Room {
  /** 房型ID（酒店内唯一标识） */
  id: number
  /** 所属酒店ID（详情页可选） */
  hotelId?: number
  /** 房型名称（如 '高级大床房'） */
  name: string
  /** 房型价格（单位：人民币元） */
  price: number
  /** 是否包含早餐 */
  breakfast: boolean
  /** 是否可取消 */
  cancelable: boolean
  /** 总库存数（当日可订房间数） */
  inventory: number
  /** 房间面积（m²） */
  area?: number
  /** 床型（单床/大床/双床） */
  bedType?: string
  /** 最多入住人数 */
  maxGuests?: number
  /** 设施列表 */
  amenities?: string[]
}

// ==================== Inventory 相关 ====================

export interface RoomInventory {
  /** 记录ID */
  id: number
  /** 房型ID */
  roomId: number
  /** 日期（YYYY-MM-DD） */
  date: string
  /** 该日期的价格（可能与基础 price 不同） */
  price: number
  /** 房间总数 */
  total: number
  /** 已预订数 */
  booked: number
  /** 可用数（total - booked） */
  available: number
  /** 当日是否可预订 */
  isBookable: boolean
}

export interface RoomInventoryRequest {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

// ==================== Order 相关 ====================

export type OrderStatus = '待支付' | '待入住' | '已完成' | '已取消'

export interface Order {
  /** 订单ID，唯一标识 */
  id: number
  /** 关联用户ID */
  userId: number
  /** 酒店ID */
  hotelId: number
  /** 酒店名称（冗余存储，订单生成时快照） */
  hotelName: string
  /** 房型ID */
  roomId: number
  /** 房型名称（冗余存储） */
  roomName: string
  /** 入住日期（YYYY-MM-DD） */
  checkIn: string
  /** 退房日期（YYYY-MM-DD） */
  checkOut: string
  /** 入住夜数 */
  nights: number
  /** 单晚价格（元） */
  unitPrice: number
  /** 总价格（元，已包含税费） */
  totalPrice: number
  /** 订单状态 */
  status: OrderStatus
  /** 支付方式（可选） */
  paymentMethod?: string
  /** 支付时间戳（ms，仅 status 不为 '待支付' 时存在） */
  paymentTime?: number
  /** 订单创建时间戳（ms） */
  createdAt: number
  /** 最后更新时间戳（ms） */
  updatedAt?: number
  /** 取消时间戳（ms，仅取消时存在） */
  canceledAt?: number
}

export interface CreateOrderRequest {
  hotelId: number
  roomId: number
  checkIn: string
  checkOut: string
}

export interface OrdersListRequest {
  pageNo?: number
  pageSize?: number
  status?: OrderStatus
}

// ==================== Favorite 相关 ====================

export interface Favorite {
  /** 收藏ID */
  id: number
  /** 用户ID */
  userId: number
  /** 酒店ID */
  hotelId: number
  /** 收藏时间戳（ms） */
  createdAt: number
}

export interface AddFavoriteRequest {
  hotelId: number
}

// ==================== API 响应格式 ====================

export interface ApiResponse<T = any> {
  /** 状态码（200=成功, 4xx=客户端错误, 5xx=服务器错误） */
  code: number
  /** 消息描述 */
  message: string
  /** 返回数据 */
  data: T
  /** 响应时间戳（ms） */
  timestamp: number
}

export interface PaginatedData<T> {
  /** 数据记录 */
  records: T[]
  /** 总记录数 */
  total: number
  /** 当前页码 */
  pageNo: number
  /** 每页大小 */
  pageSize: number
  /** 总页数 */
  totalPages: number
}

export type PaginatedApiResponse<T> = ApiResponse<PaginatedData<T>>

// ==================== 辅助类型 ====================

export interface ErrorResponse {
  code: number
  message: string
  timestamp: number
}

export interface FetchHotelsParams {
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
