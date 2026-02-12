# EasyStay 移动端梳理（小程序）

## 1. 当前已实现功能

### 1.1 首页（`pages/home`）
- 目的地选择（城市切换）
- 关键词输入与搜索跳转
- 推荐标签点击跳转列表（按标签筛选）
- 登录入口与个人中心入口（Tab 切换）

### 1.2 酒店列表页（`pages/list`）
- 酒店列表展示（虚拟列表组件 `VirtualList`）
- 上拉加载分页
- 右上角筛选按钮
- 半屏筛选弹层 + 灰色蒙版
- 筛选条件：
  - 房型
  - 价格区间（用户输入）
  - 日期区间（调用 `CustomCalendar`）
- 筛选后“起始价”按可用房型最低价动态计算

### 1.3 酒店详情页（`pages/detail`）
- 轮播图、酒店基础信息、房型列表
- 登录态收藏
- 预订流程：点击预订 -> 弹出日历 -> 确认日期
- 预订确认后写入订单（与“我的订单”联动）

### 1.4 登录与个人中心（`pages/login`、`pages/user`）
- 手机号 + 验证码模拟登录
- 微信授权模拟登录
- 收藏列表展示
- 订单列表展示（读取本地订单 store）
- 退出登录

### 1.5 基础设施
- 全局状态：
  - `useAuthStore`（登录信息、收藏）
  - `useOrderStore`（订单新增、持久化）
- Mock 服务：`services/hotel.ts`
- 自研日历组件：`components/CustomCalendar`

---

## 2. 待实现功能（建议优先级）

### P0（核心业务闭环）
- 真实后端接口替换 mock（酒店列表、详情、订单、收藏）
- 订单状态流转（待支付/待入住/已完成/已取消）
- 下单确认页（价格明细、入住人信息、支付入口）

### P1（可用性提升）
- 筛选条件持久化与回显优化
- 日期可售库存改为真实库存接口
- 列表页排序（价格升降序、评分、距离）
- 错误态与空态统一（网络失败、无库存、无数据）

### P2（工程与体验）
- 单元测试与关键流程 E2E
- 埋点与行为统计（搜索、筛选、预订转化）
- 图片资源本地化/对象存储统一管理
- 国际化（多语言）与文案统一配置

---

## 3. 可能涉及技术栈

- 前端框架：`Taro + React`
- 语言：`TypeScript`
- 样式：`SCSS`
- 状态管理：`Zustand`
- 日期处理：`dayjs`
- 构建：`@tarojs/cli`、`webpack5`
- 运行端：微信小程序（`weapp`）
- 数据层（当前）：本地 mock + 本地持久化（`Taro.setStorageSync`）
- 数据层（目标）：`Node.js/Express` 或 `NestJS` + 数据库

---

## 4. 初步数据结构设计

> 说明：以下为“前后端统一建模”的初稿，便于后续落库和接口对齐。

### 4.1 用户（User）
```ts
interface User {
  id: number
  phone: string
  nickname: string
  avatar: string
  token?: string
  favorites: number[] // hotelId 列表
}
```

### 4.2 酒店（Hotel）
```ts
interface Hotel {
  id: number
  name: string
  city: string
  address: string
  score: number
  tags: string[]
  thumb: string
  banners: string[]
  minPrice: number // 动态计算后的起始价
  isMemberDeal: boolean
}
```

### 4.3 房型（Room）
```ts
interface Room {
  id: number
  hotelId: number
  name: string
  price: number
  breakfast: boolean
  cancelable: boolean
  inventory: number
}
```

### 4.4 库存日历（RoomInventory）
```ts
interface RoomInventory {
  id: number
  roomId: number
  date: string // YYYY-MM-DD
  total: number
  booked: number
  available: number
}
```

### 4.5 订单（Order）
```ts
type OrderStatus = '待支付' | '待入住' | '已完成' | '已取消'

interface Order {
  id: number
  userId: number
  hotelId: number
  roomId: number
  checkIn: string
  checkOut: string
  nights: number
  unitPrice: number
  totalPrice: number
  status: OrderStatus
  createdAt: string
}
```

### 4.6 收藏（Favorite）
```ts
interface Favorite {
  id: number
  userId: number
  hotelId: number
  createdAt: string
}
```

---

## 5. 接口草案（后续落地参考）

- `GET /hotels`：列表查询（城市、关键词、标签、房型、价格、日期、分页）
- `GET /hotels/:id`：酒店详情 + 房型
- `POST /auth/login`：登录
- `POST /favorites/toggle`：收藏切换
- `GET /orders`：我的订单
- `POST /orders`：创建订单
- `GET /inventory`：房型日期库存查询

---

## 6. 当前代码对应关系

- 数据服务：`src/services/hotel.ts`
- 登录状态：`src/store/useAuthStore.ts`
- 订单状态：`src/store/useOrderStore.ts`
- 日历组件：`src/components/CustomCalendar/index.tsx`
- 列表筛选：`src/pages/list/index.tsx`
- 预订联动订单：`src/pages/detail/index.tsx` + `src/pages/user/index.tsx`

