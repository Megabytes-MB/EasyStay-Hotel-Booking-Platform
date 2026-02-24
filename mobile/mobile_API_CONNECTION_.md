# EasyStay Mobile 移动端（微信小程序）

基于 Taro + React + TypeScript 开发的酒店预订微信小程序应用，已连接后端 API。

## 快速开始

```bash
# 1. 启动后端服务（确保端口 3000）
cd server && npm start

# 2. 启动微信小程序开发模式
cd mobile && npm run dev:weapp

# 3. 使用微信开发者工具打开项目
# - 打开微信开发者工具
# - 导入项目，选择 mobile/dist 目录
# - AppID 使用测试号或自己的小程序 AppID
```

## 技术栈

- **Taro 3.x** - 跨端框架（编译到微信小程序）
- **React + TypeScript** - UI 和类型支持
- **Zustand** - 状态管理
- **Sass** - 样式
- **dayjs** - 日期处理

## 开发环境

- **微信开发者工具** - 小程序开发调试
- **Node.js >= 12** - 运行环境
- **npm/yarn** - 包管理器

## 项目结构

```
mobile/src/
├── config/          # API 配置
├── utils/           # HTTP 请求工具
├── services/        # 业务服务（auth, hotel, booking）
├── store/           # 状态管理（auth, order）
├── pages/           # 页面（home, list, detail, login, user）
├── components/      # 公共组件（Calendar, VirtualList）
└── assets/          # 静态资源
```

## API 使用

### 认证

```typescript
import { useAuthStore } from '@/store/useAuthStore'

const { login, register } = useAuthStore()

// 注册
await register({ username: 'user1', password: '123456' })

// 登录
await login({ username: 'user1', password: '123456' })
```

### 酒店查询

```typescript
import { fetchHotels, fetchHotelDetail } from '@/services/hotel'

// 列表
const { list, hasMore } = await fetchHotels({ 
  city: '上海', 
  page: 1 
})

// 详情
const hotel = await fetchHotelDetail(hotelId)
```

### 预订管理

```typescript
import { useOrderStore } from '@/store/useOrderStore'

const { addOrder, loadOrders, cancelOrder } = useOrderStore()

// 创建预订
await addOrder({
  hotelId: 1,
  guestName: '张三',
  guestPhone: '13800138000',
  roomType: '标准间',
  checkInDate: '2026-03-01',
  checkOutDate: '2026-03-03',
  numberOfGuests: 2,
  totalPrice: 600
})

// 查询订单
await loadOrders()

// 取消订单
await cancelOrder(orderId)
```

## 核心文件

| 文件 | 说明 |
|------|------|
| `config/api.ts` | API 地址和路径配置 |
| `utils/request.ts` | HTTP 请求封装（自动 token、错误处理） |
| `services/auth.ts` | 认证服务 |
| `services/hotel.ts` | 酒店服务（含数据转换） |
| `services/booking.ts` | 预订服务 |
| `store/useAuthStore.ts` | 认证状态 |
| `store/useOrderStore.ts` | 订单状态 |

## 数据转换

后端和前端数据结构不同，服务层自动转换：

**后端** → **前端**
- `pricePerNight` → `price`
- `rating` → `score`
- `imageUrl` → `thumb`
- `images` (JSON string) → `banners` (array)
- `roomTypes` (JSON string) → `rooms` (array)

## 测试流程

### 1. 注册登录
1. 点击"我的" → "登录"
2. 切换到注册，输入用户名（≥3位）、密码（≥6位）
3. 注册后用相同账号登录

### 2. 查询酒店
1. 首页自动加载酒店列表（需后端有数据）
2. 支持城市筛选、关键词搜索
3. 点击酒店查看详情

### 3. 创建预订
1. 酒店详情页选择房型
2. 填写入住信息并提交
3. 在"我的订单"中查看

## 调试技巧

**查看网络请求**（微信开发者工具 → 调试器 → Network）
- 请求地址：`http://localhost:3000/api/...`
- 请求头：`Authorization: Bearer xxx`
- 状态码：200=成功，401=未授权

**提示**：小程序需要配置合法域名或在开发者工具中勾选"不校验合法域名"

**查看本地存储**（调试器 → Storage → Storage）
- `easy-stay-auth` - 登录信息
- `easy-stay-orders` - 订单信息

**真机调试**：
1. 点击"预览"生成二维码
2. 使用微信扫码在手机上预览
3. 开启调试模式查看 vConsole 日志

## 常见问题

**Q: 无法连接后端？**  
A: 确保后端运行在 `http://localhost:3000`，检查 `config/api.ts`；在微信开发者工具中勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"

**Q: request:fail url not in domain list？**  
A: 开发阶段在微信开发者工具 → 详情 → 本地设置 → 勾选"不校验合法域名"；生产环境需在小程序后台配置服务器域名

**Q: 401 未授权？**  
A: 清除本地存储后重新登录（Storage 标签页右键清除）

**Q: 酒店列表为空？**  
A: 后端数据库无数据，通过 admin 后台添加酒店

**Q: 真机预览时无法请求？**  
A: 确保手机和电脑在同一局域网，使用电脑的局域网 IP 替换 localhost（如 `http://192.168.1.100:3000`）

**Q: 小程序体验版/正式版无法请求？**  
A: 需要配置合法的 HTTPS 域名，并在小程序后台添加到服务器域名白名单

## 添加测试数据

使用 admin 后台添加酒店，或通过 API：

```bash
# 1. 以商户身份登录
POST http://localhost:3000/api/auth/login
{ "username": "merchant1", "password": "merchant123" }

# 2. 创建酒店（使用返回的 token）
POST http://localhost:3000/api/hotels
Authorization: Bearer <token>
{
  "name": "测试酒店",
  "city": "上海",
  "address": "测试路123号",
  "pricePerNight": 299,
  "rating": 4.5,
  "imageUrl": "https://picsum.photos/400",
  "images": ["https://picsum.photos/800"],
  "roomTypes": ["标准间", "大床房"],
  "facilities": ["WiFi", "停车场"]
}
```

## 待优化

- [ ] 订单支付流程（接入微信支付）
- [ ] 实时库存查询
- [ ] 搜索历史记录
- [ ] 图片懒加载
- [ ] 请求缓存
- [ ] 微信授权登录
- [ ] 分享功能

## 小程序配置

### 开发阶段

在 `project.config.json` 中配置：

```json
{
  "miniprogramRoot": "dist/",
  "projectname": "easystay-mobile",
  "setting": {
    "urlCheck": false  // 不校验合法域名，方便本地开发
  }
}
```
### 常用命令

```bash
# 微信小程序开发
npm run dev:weapp

# 微信小程序打包
npm run build:weapp

# H5 开发（可选）
npm run dev:h5

# 支付宝小程序（可选）
npm run dev:alipay
```

---
