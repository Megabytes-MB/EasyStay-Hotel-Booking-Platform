const express = require('express');
const cors = require('cors');

const app = express();

// 解析 JSON 请求体
app.use(express.json());

// 允许跨域访问
app.use(cors());

// 内存存储：用来保存已注册的用户（实际项目中这里会是数据库）
let users = [];
let userIdCounter = 1;

// 测试接口
app.get('/ping', (req, res) => {
  res.send('pong');
});

// 注册接口
app.post('/api/auth/register', (req, res) => {
  const { username, password, role } = req.body;

  // 简单验证
  if (!username || !password || !role) {
    return res.status(400).json({
      code: 400,
      message: '用户名、密码、角色不能为空',
    });
  }

  // 检查用户名是否已存在
  if (users.some(u => u.username === username)) {
    return res.status(409).json({
      code: 409,
      message: '用户名已存在',
    });
  }

  // 创建新用户
  const newUser = {
    id: `u_${userIdCounter++}`,
    username,
    password, // 注意：实际项目中需要 hash 密码，现在为了演示先明文存
    role, // 'merchant' 或 'admin'
  };

  users.push(newUser);

  return res.json({
    code: 200,
    message: '注册成功',
    data: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
    },
  });
});

// 登录接口
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // 简单验证
  if (!username || !password) {
    return res.status(400).json({
      code: 400,
      message: '用户名和密码不能为空',
    });
  }

  // 查找用户
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({
      code: 401,
      message: '用户名或密码错误',
    });
  }

  // 登录成功，返回用户信息和 token（简单 token，实际应用中用 JWT）
  return res.json({
    code: 200,
    message: '登录成功',
    data: {
      token: `token_${user.id}_${Date.now()}`, // 简单的 token
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    },
  });
});

// ==================== 酒店管理 API ====================

// 内存存储酒店数据
let hotels = [];
let hotelIdCounter = 1;

// 获取酒店列表（带过滤）
app.get('/api/hotels', (req, res) => {
  const { merchantId, status } = req.query;

  let result = hotels;

  // 如果传了 merchantId，只返回该商户的酒店
  if (merchantId) {
    result = result.filter(h => h.merchantId === merchantId);
  }

  // 如果传了 status，只返回特定状态的酒店
  if (status) {
    result = result.filter(h => h.status === status);
  }

  return res.json({
    code: 200,
    message: '获取成功',
    data: result,
  });
});

// 获取单个酒店详情
app.get('/api/hotels/:id', (req, res) => {
  const hotel = hotels.find(h => h.id === req.params.id);

  if (!hotel) {
    return res.status(404).json({
      code: 404,
      message: '酒店不存在',
    });
  }

  return res.json({
    code: 200,
    message: '获取成功',
    data: hotel,
  });
});

// 新增酒店
app.post('/api/hotels', (req, res) => {
  const {
    name,
    description,
    location,
    city,
    rating,
    pricePerNight,
    totalRooms,
    availableRooms,
    phoneNumber,
    images,
    amenities,
    merchantId,
  } = req.body;

  // 简单验证
  if (!name || !location || !city || !merchantId) {
    return res.status(400).json({
      code: 400,
      message: '必填字段不能为空',
    });
  }

  const newHotel = {
    id: `h_${hotelIdCounter++}`,
    name,
    description: description || '',
    location,
    city,
    rating: rating || 0,
    pricePerNight: pricePerNight || 0,
    totalRooms: totalRooms || 0,
    availableRooms: availableRooms || 0,
    phoneNumber: phoneNumber || '',
    images: images || [],
    amenities: amenities || [],
    status: 'pending', // 新增的酒店默认待审核
    merchantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  hotels.push(newHotel);

  return res.json({
    code: 200,
    message: '新增成功',
    data: newHotel,
  });
});

// 更新酒店（商户编辑自己的酒店 或 管理员审核）
app.put('/api/hotels/:id', (req, res) => {
  const hotelIndex = hotels.findIndex(h => h.id === req.params.id);

  if (hotelIndex === -1) {
    return res.status(404).json({
      code: 404,
      message: '酒店不存在',
    });
  }

  // 允许更新的字段
  const {
    name,
    description,
    location,
    city,
    rating,
    pricePerNight,
    totalRooms,
    availableRooms,
    phoneNumber,
    images,
    amenities,
    status, // 管理员可以改状态
  } = req.body;

  const hotel = hotels[hotelIndex];

  // 只有待审核或已审核的酒店才能更新（拒绝的可能需要重新提交）
  if (name !== undefined) hotel.name = name;
  if (description !== undefined) hotel.description = description;
  if (location !== undefined) hotel.location = location;
  if (city !== undefined) hotel.city = city;
  if (rating !== undefined) hotel.rating = rating;
  if (pricePerNight !== undefined) hotel.pricePerNight = pricePerNight;
  if (totalRooms !== undefined) hotel.totalRooms = totalRooms;
  if (availableRooms !== undefined) hotel.availableRooms = availableRooms;
  if (phoneNumber !== undefined) hotel.phoneNumber = phoneNumber;
  if (images !== undefined) hotel.images = images;
  if (amenities !== undefined) hotel.amenities = amenities;
  if (status !== undefined) hotel.status = status; // 管理员审核时更新状态

  hotel.updatedAt = new Date().toISOString();

  return res.json({
    code: 200,
    message: '更新成功',
    data: hotel,
  });
});

// 删除酒店
app.delete('/api/hotels/:id', (req, res) => {
  const hotelIndex = hotels.findIndex(h => h.id === req.params.id);

  if (hotelIndex === -1) {
    return res.status(404).json({
      code: 404,
      message: '酒店不存在',
    });
  }

  const deletedHotel = hotels.splice(hotelIndex, 1);

  return res.json({
    code: 200,
    message: '删除成功',
    data: deletedHotel[0],
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
