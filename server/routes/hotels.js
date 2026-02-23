const express = require('express');
const { Op } = require('sequelize');
const { Hotel, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const parseCoordinate = value => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return num;
};

const isValidLatitude = value => Number.isFinite(value) && value >= -90 && value <= 90;
const isValidLongitude = value => Number.isFinite(value) && value >= -180 && value <= 180;

/**
 * GET /api/hotels
 * 获取酒店列表（支持角色、状态、城市、关键词筛选）
 */
router.get('/', async (req, res) => {
  try {
    const { status, role, userId, city, keyword } = req.query;
    const where = {};

    if (role === 'merchant' && userId) {
      where.merchantId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (city) {
      where.city = city;
    }

    if (keyword) {
      where.name = { [Op.like]: `%${keyword}%` };
    }

    const hotels = await Hotel.findAll({
      where,
      include: [
        {
          model: User,
          as: 'merchant',
          attributes: ['id', 'username'],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    return res.json({
      code: 200,
      message: '获取成功',
      data: hotels,
    });
  } catch (error) {
    console.error('Get hotels error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * GET /api/hotels/home-ads
 * 获取首页广告位酒店列表（支持多条）
 */
router.get('/home-ads', async (_req, res) => {
  try {
    const hotels = await Hotel.findAll({
      where: {
        isHomeAd: true,
        adStatus: 'approved',
      },
      include: [
        {
          model: User,
          as: 'merchant',
          attributes: ['id', 'username'],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    return res.json({
      code: 200,
      message: '获取成功',
      data: hotels,
    });
  } catch (error) {
    console.error('Get home ad hotels error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * GET /api/hotels/home-ad
 * 兼容旧版：返回单条广告（取第一条）
 */
router.get('/home-ad', async (_req, res) => {
  try {
    const hotel = await Hotel.findOne({
      where: {
        isHomeAd: true,
        adStatus: 'approved',
      },
      include: [
        {
          model: User,
          as: 'merchant',
          attributes: ['id', 'username'],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    return res.json({
      code: 200,
      message: '获取成功',
      data: hotel || null,
    });
  } catch (error) {
    console.error('Get home ad hotel error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * GET /api/hotels/:id
 * 获取单个酒店详情
 */
router.get('/:id', async (req, res) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'merchant',
          attributes: ['id', 'username'],
        },
      ],
    });

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
  } catch (error) {
    console.error('Get hotel detail error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * POST /api/hotels
 * 新增酒店（需要登录）
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      city,
      longitude,
      latitude,
      rating,
      pricePerNight,
      totalRooms,
      availableRooms,
      phoneNumber,
      images,
      amenities,
    } = req.body;

    if (!name || !location || !city || !pricePerNight) {
      return res.status(400).json({
        code: 400,
        message: '酒店名称、地址、城市、价格不能为空',
      });
    }

    const parsedLongitude = parseCoordinate(longitude);
    const parsedLatitude = parseCoordinate(latitude);

    if (parsedLongitude === null || parsedLatitude === null) {
      return res.status(400).json({
        code: 400,
        message: '经纬度必须是有效数字',
      });
    }

    if ((parsedLongitude === undefined) !== (parsedLatitude === undefined)) {
      return res.status(400).json({
        code: 400,
        message: '请同时提交经度和纬度',
      });
    }

    if (parsedLongitude === undefined || parsedLatitude === undefined) {
      return res.status(400).json({
        code: 400,
        message: '请先在地图中选点后再提交酒店',
      });
    }

    if (!isValidLongitude(parsedLongitude) || !isValidLatitude(parsedLatitude)) {
      return res.status(400).json({
        code: 400,
        message: '经纬度超出范围',
      });
    }

    const hotel = await Hotel.create({
      name,
      description,
      location,
      city,
      longitude: parsedLongitude,
      latitude: parsedLatitude,
      rating: rating || 0,
      pricePerNight,
      totalRooms: totalRooms || 0,
      availableRooms: availableRooms || 0,
      phoneNumber,
      images: images || [],
      amenities: amenities || [],
      status: 'pending',
      merchantId: req.user.id,
    });

    await hotel.reload({
      include: [
        {
          model: User,
          as: 'merchant',
          attributes: ['id', 'username'],
        },
      ],
    });

    return res.json({
      code: 200,
      message: '新增成功',
      data: hotel,
    });
  } catch (error) {
    console.error('Create hotel error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * PUT /api/hotels/:id
 * 编辑酒店（商户编辑内容，管理员审核状态）
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        code: 404,
        message: '酒店不存在',
      });
    }

    if (req.user.role === 'merchant' && hotel.merchantId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权限编辑该酒店',
      });
    }

    const {
      name,
      description,
      location,
      city,
      longitude,
      latitude,
      rating,
      pricePerNight,
      totalRooms,
      availableRooms,
      phoneNumber,
      images,
      amenities,
      status,
    } = req.body;

    const parsedLongitude = parseCoordinate(longitude);
    const parsedLatitude = parseCoordinate(latitude);

    if (parsedLongitude === null || parsedLatitude === null) {
      return res.status(400).json({
        code: 400,
        message: '经纬度必须是有效数字',
      });
    }

    if ((parsedLongitude === undefined) !== (parsedLatitude === undefined)) {
      return res.status(400).json({
        code: 400,
        message: '请同时提交经度和纬度',
      });
    }

    if (
      parsedLongitude !== undefined &&
      parsedLatitude !== undefined &&
      (!isValidLongitude(parsedLongitude) || !isValidLatitude(parsedLatitude))
    ) {
      return res.status(400).json({
        code: 400,
        message: '经纬度超出范围',
      });
    }

    if (req.user.role === 'merchant') {
      if (name !== undefined) hotel.name = name;
      if (description !== undefined) hotel.description = description;
      if (location !== undefined) hotel.location = location;
      if (city !== undefined) hotel.city = city;
      if (parsedLongitude !== undefined) hotel.longitude = parsedLongitude;
      if (parsedLatitude !== undefined) hotel.latitude = parsedLatitude;
      if (rating !== undefined) hotel.rating = rating;
      if (pricePerNight !== undefined) hotel.pricePerNight = pricePerNight;
      if (totalRooms !== undefined) hotel.totalRooms = totalRooms;
      if (availableRooms !== undefined) hotel.availableRooms = availableRooms;
      if (phoneNumber !== undefined) hotel.phoneNumber = phoneNumber;
      if (images !== undefined) hotel.images = images;
      if (amenities !== undefined) hotel.amenities = amenities;
    }

    if (req.user.role === 'admin' && status !== undefined) {
      if (!['draft', 'pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          code: 400,
          message: '无效的酒店状态',
        });
      }
      hotel.status = status;
    }

    await hotel.save();

    await hotel.reload({
      include: [
        {
          model: User,
          as: 'merchant',
          attributes: ['id', 'username'],
        },
      ],
    });

    return res.json({
      code: 200,
      message: '更新成功',
      data: hotel,
    });
  } catch (error) {
    console.error('Update hotel error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * PUT /api/hotels/:id/home-ad
 * 广告位流程：
 * - 商户：提交/取消广告申请（pending/none）
 * - 管理员：审核广告申请（approved/rejected）
 */
router.put('/:id/home-ad', authenticateToken, async (req, res) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id);
    if (!hotel) {
      return res.status(404).json({
        code: 404,
        message: '酒店不存在',
      });
    }

    if (req.user.role === 'merchant') {
      if (hotel.merchantId !== req.user.id) {
        return res.status(403).json({
          code: 403,
          message: '无权限操作该酒店广告申请',
        });
      }

      const enabled = req.body?.enabled !== false;
      hotel.adStatus = enabled ? 'pending' : 'none';
      hotel.isHomeAd = false;
      await hotel.save();

      return res.json({
        code: 200,
        message: enabled ? '广告申请已提交，等待管理员审核' : '广告申请已取消',
        data: hotel,
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '仅商家或管理员可操作广告位',
      });
    }

    const reviewStatus = req.body?.reviewStatus;
    if (!['approved', 'rejected'].includes(reviewStatus)) {
      return res.status(400).json({
        code: 400,
        message: '管理员审核参数无效',
      });
    }

    if (reviewStatus === 'approved') {
      // 允许多个广告并行投放
      hotel.isHomeAd = true;
      hotel.adStatus = 'approved';
    } else {
      hotel.isHomeAd = false;
      hotel.adStatus = 'rejected';
    }

    await hotel.save();

    return res.json({
      code: 200,
      message: reviewStatus === 'approved' ? '广告审核通过并已投放' : '广告审核已拒绝',
      data: hotel,
    });
  } catch (error) {
    console.error('Set home ad hotel error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/hotels/:id
 * 删除酒店（商户仅可删除自己的酒店；管理员可删除任意酒店）
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        code: 404,
        message: '酒店不存在',
      });
    }

    if (req.user.role === 'merchant' && hotel.merchantId !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权限删除',
      });
    }

    await hotel.destroy();

    return res.json({
      code: 200,
      message: '删除成功',
      data: hotel,
    });
  } catch (error) {
    console.error('Delete hotel error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

module.exports = router;
