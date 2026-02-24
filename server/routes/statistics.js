const express = require('express');
const { Booking, Hotel } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/statistics/revenue
 * Revenue statistics for admin / merchant.
 */
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'merchant'].includes(req.user.role)) {
      return res.status(403).json({
        code: 403,
        message: 'No permission to access statistics',
      });
    }

    const where = { status: 'confirmed' };
    const hotelWhere = {};

    if (req.user.role === 'merchant') {
      hotelWhere.merchantId = req.user.id;
    }

    const hotelInclude = {
      model: Hotel,
      as: 'hotel',
      attributes: ['id', 'name', 'merchantId'],
      ...(Object.keys(hotelWhere).length ? { where: hotelWhere } : {}),
    };

    const relevantBookings = await Booking.findAll({
      where,
      include: [hotelInclude],
    });

    const relevantHotels = await Hotel.findAll({
      where: hotelWhere,
    });

    const totalRevenue = relevantBookings.reduce((sum, booking) => {
      return sum + Number(booking.totalPrice || 0);
    }, 0);

    const allBookings = await Booking.findAll({
      include: [hotelInclude],
    });
    const totalBookings = allBookings.length;

    const confirmedBookings = relevantBookings.length;

    const pendingBookings = await Booking.count({
      where: { status: 'pending' },
      include: [hotelInclude],
    });

    const avgRevenuePerBooking =
      confirmedBookings > 0
        ? Math.round((totalRevenue / confirmedBookings) * 100) / 100
        : 0;

    const byHotel = relevantHotels.map(hotel => {
      const hotelBookings = relevantBookings.filter(
        booking => booking.hotel && booking.hotel.id === hotel.id
      );

      const revenue = hotelBookings.reduce((sum, booking) => {
        return sum + Number(booking.totalPrice || 0);
      }, 0);

      return {
        hotelId: hotel.id,
        hotelName: hotel.name,
        revenue: Math.round(revenue * 100) / 100,
        bookingCount: hotelBookings.length,
      };
    });

    return res.json({
      code: 200,
      message: 'Fetch success',
      data: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalBookings,
        confirmedBookings,
        pendingBookings,
        avgRevenuePerBooking,
        byHotel,
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message || 'Server error',
    });
  }
});

module.exports = router;
