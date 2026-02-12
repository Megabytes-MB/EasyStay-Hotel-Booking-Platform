# 管理端功能模块梳理

## 一、核心页面结构

### 1. 认证模块
**登录页面**（`/login`）  
- 用户名/邮箱 + 密码登录  
- 记住登录状态  
- 忘记密码功能  

**注册页面**（`/register`）  
- 商户注册表单  
- 邮箱/手机验证  
- 商户基本信息填写  

### 2. 商户端功能（角色：商户）
**酒店信息管理**（`/merchant/hotels`）  
- 酒店列表页  
- 显示商户旗下所有酒店  
- 状态筛选（草稿/待审核/已发布/已下线）  
- 搜索和排序功能  

**酒店信息录入页**（`/merchant/hotels/create`）  
- 必填信息：  
  - 酒店名称（中文/英文）  
  - 酒店地址（支持地图选点）  
  - 酒店星级（1-5星选择）  
  - 房型管理（动态添加多个房型）  
  - 价格设置  
  - 开业时间选择  
- 可选信息：  
  - 周边景点/交通/商场  
  - 优惠策略配置  
  - 酒店图片上传（轮播图）  
  - 酒店设施标签  

**酒店信息编辑页**（`/merchant/hotels/:id/edit`）  
- 同录入页面，回填已有数据  
- 版本历史查看  
- 修改原因备注  

### 3. 管理员端功能（角色：管理员）
**酒店审核管理**（`/admin/review`）  
- 待审核列表  
- 展示所有待审核的酒店信息  
- 优先级排序  
- 批量操作  

**审核详情页**（`/admin/review/:id`）  
- 完整酒店信息预览  
- 审核操作（通过/驳回）  
- 驳回原因填写  
- 历史审核记录  

**已发布酒店管理**（`/admin/hotels`）  
- 酒店列表查看  
- 发布/下线操作  
- 数据统计面板  

### 4. 公共模块
**个人中心**（`/profile`）  
- 个人信息修改  
- 密码修改  
- 操作日志查看  

## 二、可行技术栈

### 1. 前端框架
**Vue 3 + TypeScript**    

### 2. UI 组件库
**Element Plus（PC 端管理系统首选）**  

### 3. 状态管理
**Pinia**   

### 4. 路由管理
**Vue Router 4**  
- 路由守卫（权限控制）  
- 动态路由（按角色加载） 

### 5. HTTP 请求
**Axios + 请求/响应拦截器**  
- Token 自动注入  
- 统一错误处理  

### 6. 表单验证
**VeeValidate / Element Plus 内置验证**  

### 7. 富文本编辑器（酒店描述）
**Quill / TinyMCE**  

### 8. 地图组件（地址选择）
**高德地图 / 百度地图 Web API**  

### 9. 图片上传
**el-upload + OSS 直传**  

### 10. 代码规范
- ESLint + Prettier  
- Husky + lint-staged（Git hooks）  
- Commitlint（提交规范）  

### 11. 构建工具
**Vite**  

## 三、核心数据模型
酒店信息结构
```typescript
interface Hotel {
  id: string;
  // 必填字段
  nameCn: string;           // 中文名称
  nameEn: string;           // 英文名称
  address: string;          // 地址
  location: {               // 经纬度
    lat: number;
    lng: number;
  };
  starRating: 1 | 2 | 3 | 4 | 5;  // 星级
  openingDate: string;      // 开业时间
  
  // 房型和价格
  roomTypes: RoomType[];
  
  // 可选字段
  nearbyAttractions?: string[];  // 周边景点
  transportation?: string[];     // 交通信息
  nearbyMalls?: string[];        // 周边商场
  promotions?: Promotion[];      // 优惠策略
  images: string[];              // 酒店图片
  facilities: string[];          // 设施标签
  
  // 状态字段
  status: 'draft' | 'pending' | 'approved' | 'published' | 'offline';
  merchantId: string;
  createdAt: string;
  updatedAt: string;
}

interface RoomType {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  area: number;
  bedType: string;
  maxOccupancy: number;
}

interface Promotion {
  id: string;
  type: 'discount' | 'package';  // 折扣/套餐
  name: string;
  discountRate?: number;         // 折扣率（8折 = 0.8）
  discountAmount?: number;       // 减免金额
  startDate: string;
  endDate: string;
  conditions?: string;           // 使用条件
}
```

// ...existing code...

## PC端目录结构
admin/
├── public/
├── src/
│   ├── assets/              # 静态资源
│   ├── components/          # 公共组件
│   │   ├── HotelForm/       # 酒店信息表单组件
│   │   ├── ImageUploader/   # 图片上传组件
│   │   ├── MapPicker/       # 地图选点组件
│   │   └── ...
│   ├── views/               # 页面
│   │   ├── auth/            # 登录注册
│   │   ├── merchant/        # 商户端页面
│   │   │   ├── HotelList.vue
│   │   │   ├── HotelCreate.vue
│   │   │   └── HotelEdit.vue
│   │   ├── admin/           # 管理员页面
│   │   │   ├── ReviewList.vue
│   │   │   ├── ReviewDetail.vue
│   │   │   └── HotelManage.vue
│   │   └── profile/         # 个人中心
│   ├── router/              # 路由配置
│   │   ├── index.ts
│   │   └── guards.ts        # 路由守卫
│   ├── store/               # 状态管理
│   │   ├── auth.ts          # 用户认证
│   │   ├── hotel.ts         # 酒店数据
│   │   └── ...
│   ├── api/                 # API接口
│   │   ├── auth.ts
│   │   ├── hotel.ts
│   │   └── ...
│   ├── utils/               # 工具函数
│   ├── types/               # TypeScript类型定义
│   ├── styles/              # 全局样式
│   ├── App.vue
│   └── main.ts
├── .env.development         # 开发环境变量
├── .env.production          # 生产环境变量
├── vite.config.ts
├── tsconfig.json
└── package.json
