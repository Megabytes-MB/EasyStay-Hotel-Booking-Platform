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

// 获取酒店列表（带权限检查）
app.get('/api/hotels', (req, res) => {
  const { merchantId, status, role, userId } = req.query;

  let result = hotels;

  // 如果是商户，只返回该商户自己的酒店
  if (role === 'merchant' && userId) {
    result = result.filter(h => h.merchantId === userId);
  }
  // 如果是管理员，返回所有酒店（不过滤 merchantId）

  // 如果传了 merchantId 参数且是管理员，进一步过滤（管理员查某商户的酒店时用）
  if (merchantId && role === 'admin') {
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

// 更新酒店（商户编辑内容 或 管理员审核）
app.put('/api/hotels/:id', (req, res) => {
  const hotelIndex = hotels.findIndex(h => h.id === req.params.id);

  if (hotelIndex === -1) {
    return res.status(404).json({
      code: 404,
      message: '酒店不存在',
    });
  }

  const { role, userId } = req.query;
  const hotel = hotels[hotelIndex];

  // 权限检查：
  // 1. 商户只能编辑自己的酒店内容（不能改状态）
  // 2. 管理员只能改酒店状态（不能改其他内容）

  if (role === 'merchant' && userId !== hotel.merchantId) {
    // 商户试图编辑别人的酒店
    return res.status(403).json({
      code: 403,
      message: '无权限编辑',
    });
  }

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
    status,
  } = req.body;

  // 如果是商户，只允许编辑这些字段（不能改 status）
  if (role === 'merchant') {
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
  }

  // 如果是管理员，只允许改 status（审核）
  if (role === 'admin' && status !== undefined) {
    hotel.status = status;
  }

  hotel.updatedAt = new Date().toISOString();

  return res.json({
    code: 200,
    message: '更新成功',
    data: hotel,
  });
});

// 删除酒店（只有商户自己能删）
app.delete('/api/hotels/:id', (req, res) => {
  const { role, userId } = req.query;
  const hotelIndex = hotels.findIndex(h => h.id === req.params.id);

  if (hotelIndex === -1) {
    return res.status(404).json({
      code: 404,
      message: '酒店不存在',
    });
  }

  const hotel = hotels[hotelIndex];

  // 权限检查：只有酒店的所有者（商户）能删
  if (role === 'merchant' && userId !== hotel.merchantId) {
    return res.status(403).json({
      code: 403,
      message: '无权限删除',
    });
  }

  // 管理员不能删除
  if (role === 'admin') {
    return res.status(403).json({
      code: 403,
      message: '管理员无法删除酒店',
    });
  }

  const deletedHotel = hotels.splice(hotelIndex, 1);

  return res.json({
    code: 200,
    message: '删除成功',
    data: deletedHotel[0],
  });
});
// ==================== 预订管理 API ====================

// 内存存储预订数据
let bookings = [];
let bookingIdCounter = 1;

// 获取预订列表（带权限检查）
app.get('/api/bookings', (req, res) => {
  const { hotelId, role, userId } = req.query;

  let result = bookings;

  // 如果是商户，只返回自己的酒店的预订
  if (role === 'merchant' && userId) {
    const merchantHotels = hotels.filter(h => h.merchantId === userId).map(h => h.id);
    result = result.filter(b => merchantHotels.includes(b.hotelId));
  }
  // 管理员可以看所有预订

  // 如果传了 hotelId，过滤特定酒店的预订
  if (hotelId) {
    result = result.filter(b => b.hotelId === hotelId);
  }

  return res.json({
    code: 200,
    message: '获取成功',
    data: result,
  });
});

// 获取单个预订详情
app.get('/api/bookings/:id', (req, res) => {
  const booking = bookings.find(b => b.id === req.params.id);

  if (!booking) {
    return res.status(404).json({
      code: 404,
      message: '预订不存在',
    });
  }

  return res.json({
    code: 200,
    message: '获取成功',
    data: booking,
  });
});

// 新增预订
app.post('/api/bookings', (req, res) => {
  const {
    hotelId,
    guestName,
    guestPhone,
    guestEmail,
    checkInDate,
    checkOutDate,
    numberOfRooms,
    numberOfGuests,
    totalPrice,
    remarks,
  } = req.body;

  // 简单验证
  if (!hotelId || !guestName || !guestPhone || !checkInDate || !checkOutDate) {
    return res.status(400).json({
      code: 400,
      message: '必填字段不能为空',
    });
  }

  const newBooking = {
    id: `b_${bookingIdCounter++}`,
    hotelId,
    guestName,
    guestPhone,
    guestEmail: guestEmail || '',
    checkInDate,
    checkOutDate,
    numberOfRooms: numberOfRooms || 1,
    numberOfGuests: numberOfGuests || 1,
    totalPrice: totalPrice || 0,
    status: 'pending', // 新预订默认待确认
    remarks: remarks || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  bookings.push(newBooking);

  return res.json({
    code: 200,
    message: '新增成功',
    data: newBooking,
  });
});

// 更新预订（主要是改状态：确认/取消）
app.put('/api/bookings/:id', (req, res) => {
  const bookingIndex = bookings.findIndex(b => b.id === req.params.id);

  if (bookingIndex === -1) {
    return res.status(404).json({
      code: 404,
      message: '预订不存在',
    });
  }

  const { status, remarks } = req.body;
  const booking = bookings[bookingIndex];

  if (status !== undefined) booking.status = status;
  if (remarks !== undefined) booking.remarks = remarks;

  booking.updatedAt = new Date().toISOString();

  return res.json({
    code: 200,
    message: '更新成功',
    data: booking,
  });
});

// 删除预订
app.delete('/api/bookings/:id', (req, res) => {
  const bookingIndex = bookings.findIndex(b => b.id === req.params.id);

  if (bookingIndex === -1) {
    return res.status(404).json({
      code: 404,
      message: '预订不存在',
    });
  }

  const deletedBooking = bookings.splice(bookingIndex, 1);

  return res.json({
    code: 200,
    message: '删除成功',
    data: deletedBooking[0],
  });
});

// ==================== 收入统计 API ====================

// 获取收入统计
app.get('/api/statistics/revenue', (req, res) => {
  const { role, userId } = req.query;

  let relevantBookings = bookings.filter(b => b.status === 'confirmed');
  let relevantHotels = hotels;

  // 如果是商户，只统计自己的酒店的收入
  if (role === 'merchant' && userId) {
    const merchantHotels = hotels.filter(h => h.merchantId === userId).map(h => h.id);
    relevantBookings = relevantBookings.filter(b => merchantHotels.includes(b.hotelId));
    relevantHotels = relevantHotels.filter(h => h.merchantId === userId);
  }
  // 管理员看所有的

  // 计算总收入
  const totalRevenue = relevantBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const totalBookings = bookings.filter(b => {
    if (role === 'merchant' && userId) {
      const merchantHotels = hotels.filter(h => h.merchantId === userId).map(h => h.id);
      return merchantHotels.includes(b.hotelId);
    }
    return true;
  }).length;

  const confirmedBookings = relevantBookings.length;
  const pendingBookings = bookings
    .filter(b => b.status === 'pending')
    .filter(b => {
      if (role === 'merchant' && userId) {
        const merchantHotels = hotels.filter(h => h.merchantId === userId).map(h => h.id);
        return merchantHotels.includes(b.hotelId);
      }
      return true;
    }).length;

  const avgRevenuePerBooking = confirmedBookings > 0 ? Math.round(totalRevenue / confirmedBookings) : 0;

  // 按酒店统计
  const byHotel = relevantHotels.map(hotel => {
    const hotelBookings = relevantBookings.filter(b => b.hotelId === hotel.id);
    const revenue = hotelBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const bookingCount = hotelBookings.length;

    return {
      hotelId: hotel.id,
      hotelName: hotel.name,
      revenue,
      bookingCount,
    };
  });

  return res.json({
    code: 200,
    message: '获取成功',
    data: {
      totalRevenue,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      avgRevenuePerBooking,
      byHotel,
    },
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
