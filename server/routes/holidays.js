const express = require('express');
const https = require('https');
const http = require('http');
const { Op } = require('sequelize');
const { HolidayRule } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const OFFICIAL_SYNC_SOURCE = 'timor.tech';
const DEFAULT_SYNC_URL_TEMPLATE = 'https://timor.tech/api/holiday/year/{year}';
const DEFAULT_DISCOUNT_RATE = Number(process.env.HOLIDAY_DEFAULT_DISCOUNT_RATE || 0.9);

const toDateString = value => {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '';
  return text;
};

const addDays = (dateText, days) => {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const isNextDay = (prevDate, nextDate) => addDays(prevDate, 1) === nextDate;

const ensureAdmin = req => req.user && req.user.role === 'admin';

const toNumberInRange = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < min || n > max) return fallback;
  return n;
};

const requestJson = url =>
  new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    client
      .get(url, response => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`同步失败，远程接口返回 ${response.statusCode}`));
          return;
        }

        let raw = '';
        response.on('data', chunk => {
          raw += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(new Error('同步失败，远程返回不是有效 JSON'));
          }
        });
      })
      .on('error', reject);
  });

const extractHolidayDays = payload => {
  const days = [];

  if (payload && payload.holiday && typeof payload.holiday === 'object') {
    Object.entries(payload.holiday).forEach(([date, item]) => {
      const dateText = toDateString(date);
      if (!dateText || !item || item.holiday !== true) return;
      const name = String(item.name || '').trim();
      if (!name) return;
      days.push({ date: dateText, name });
    });
  }

  if (Array.isArray(payload?.data)) {
    payload.data.forEach(item => {
      const dateText = toDateString(item?.date);
      const isHoliday = item?.holiday === true || item?.isOffDay === true;
      if (!dateText || !isHoliday) return;
      const name = String(item?.name || item?.holidayName || '').trim();
      if (!name) return;
      days.push({ date: dateText, name });
    });
  }

  return days;
};

const mergeHolidayPeriods = dayItems => {
  if (dayItems.length === 0) return [];

  const sorted = [...dayItems].sort((a, b) => (a.date > b.date ? 1 : -1));
  const periods = [];
  let current = {
    name: sorted[0].name,
    startDate: sorted[0].date,
    endDate: sorted[0].date,
  };

  for (let index = 1; index < sorted.length; index += 1) {
    const item = sorted[index];
    const canMerge =
      item.name === current.name && isNextDay(current.endDate, item.date);

    if (canMerge) {
      current.endDate = item.date;
      continue;
    }

    periods.push(current);
    current = {
      name: item.name,
      startDate: item.date,
      endDate: item.date,
    };
  }

  periods.push(current);
  return periods;
};

const normalizeRulePayload = payload => {
  const name = String(payload?.name || '').trim();
  const holidayType = String(payload?.holidayType || 'custom').trim();
  const startDate = toDateString(payload?.startDate);
  const endDate = toDateString(payload?.endDate || payload?.startDate);
  const isActive = payload?.isActive !== false;
  const notes = payload?.notes ? String(payload.notes) : null;
  const discountRate = toNumberInRange(
    payload?.discountRate,
    0.01,
    1,
    DEFAULT_DISCOUNT_RATE
  );

  if (!name) return { error: '节假日/活动名称不能为空' };
  if (!['official', 'custom', 'campaign'].includes(holidayType)) {
    return { error: 'holidayType 必须是 official、custom 或 campaign' };
  }
  if (!startDate || !endDate) return { error: '开始日期和结束日期格式必须为 YYYY-MM-DD' };
  if (endDate < startDate) return { error: '结束日期不能早于开始日期' };

  return {
    data: {
      name,
      holidayType,
      startDate,
      endDate,
      isActive,
      notes,
      discountRate,
      isAutoSynced: false,
      source: 'manual',
      sourceUrl: null,
      syncYear: null,
    },
  };
};

/**
 * GET /api/holidays
 * 公共查询：用于前端日历展示和价格计算。
 */
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, activeOnly } = req.query;
    const where = {};

    const queryStart = toDateString(startDate);
    const queryEnd = toDateString(endDate);

    if (activeOnly !== 'false') {
      where.isActive = true;
    }

    if (queryStart && queryEnd) {
      where.startDate = { [Op.lte]: queryEnd };
      where.endDate = { [Op.gte]: queryStart };
    } else if (queryStart) {
      where.endDate = { [Op.gte]: queryStart };
    } else if (queryEnd) {
      where.startDate = { [Op.lte]: queryEnd };
    }

    const rules = await HolidayRule.findAll({
      where,
      order: [
        ['startDate', 'ASC'],
        ['endDate', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    return res.json({
      code: 200,
      message: '获取成功',
      data: rules,
    });
  } catch (error) {
    console.error('Get holidays error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * GET /api/holidays/manage
 * 管理端查询：需要 admin。
 */
router.get('/manage', authenticateToken, async (req, res) => {
  try {
    if (!ensureAdmin(req)) {
      return res.status(403).json({
        code: 403,
        message: '仅管理员可查看节假日配置',
      });
    }

    const rules = await HolidayRule.findAll({
      order: [
        ['startDate', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    return res.json({
      code: 200,
      message: '获取成功',
      data: rules,
    });
  } catch (error) {
    console.error('Get holiday manage list error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * POST /api/holidays
 * 手动新增节假日/活动。
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!ensureAdmin(req)) {
      return res.status(403).json({
        code: 403,
        message: '仅管理员可新增节假日配置',
      });
    }

    const normalized = normalizeRulePayload(req.body);
    if (normalized.error) {
      return res.status(400).json({
        code: 400,
        message: normalized.error,
      });
    }

    const created = await HolidayRule.create({
      ...normalized.data,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    return res.json({
      code: 200,
      message: '新增成功',
      data: created,
    });
  } catch (error) {
    console.error('Create holiday rule error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * PUT /api/holidays/:id
 * 编辑节假日/活动。
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (!ensureAdmin(req)) {
      return res.status(403).json({
        code: 403,
        message: '仅管理员可编辑节假日配置',
      });
    }

    const target = await HolidayRule.findByPk(req.params.id);
    if (!target) {
      return res.status(404).json({
        code: 404,
        message: '节假日配置不存在',
      });
    }

    const normalized = normalizeRulePayload(req.body);
    if (normalized.error) {
      return res.status(400).json({
        code: 400,
        message: normalized.error,
      });
    }

    Object.assign(target, normalized.data, { updatedBy: req.user.id });
    await target.save();

    return res.json({
      code: 200,
      message: '更新成功',
      data: target,
    });
  } catch (error) {
    console.error('Update holiday rule error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/holidays/:id
 * 删除节假日/活动。
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!ensureAdmin(req)) {
      return res.status(403).json({
        code: 403,
        message: '仅管理员可删除节假日配置',
      });
    }

    const target = await HolidayRule.findByPk(req.params.id);
    if (!target) {
      return res.status(404).json({
        code: 404,
        message: '节假日配置不存在',
      });
    }

    await target.destroy();
    return res.json({
      code: 200,
      message: '删除成功',
      data: target,
    });
  } catch (error) {
    console.error('Delete holiday rule error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

/**
 * POST /api/holidays/sync
 * 从互联网同步法定节假日，覆盖当前年份已同步数据，不影响手动配置。
 */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    if (!ensureAdmin(req)) {
      return res.status(403).json({
        code: 403,
        message: '仅管理员可执行同步',
      });
    }

    const requestedYear = Number(req.body?.year);
    const targetYear = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear();
    if (targetYear < 2000 || targetYear > 2100) {
      return res.status(400).json({
        code: 400,
        message: 'year 必须在 2000-2100 之间',
      });
    }

    const discountRate = toNumberInRange(
      req.body?.discountRate,
      0.01,
      1,
      DEFAULT_DISCOUNT_RATE
    );
    const template = String(
      process.env.HOLIDAY_SYNC_URL_TEMPLATE || DEFAULT_SYNC_URL_TEMPLATE
    );
    const requestUrl = template.replace('{year}', String(targetYear));

    const payload = await requestJson(requestUrl);
    const dayItems = extractHolidayDays(payload);
    const periods = mergeHolidayPeriods(dayItems);

    if (periods.length === 0) {
      return res.status(502).json({
        code: 502,
        message: '同步失败：未从远程数据中解析到节假日',
      });
    }

    await HolidayRule.destroy({
      where: {
        source: OFFICIAL_SYNC_SOURCE,
        syncYear: targetYear,
        isAutoSynced: true,
      },
    });

    const rows = periods.map(item => ({
      name: item.name,
      holidayType: 'official',
      startDate: item.startDate,
      endDate: item.endDate,
      discountRate,
      isActive: true,
      isAutoSynced: true,
      source: OFFICIAL_SYNC_SOURCE,
      sourceUrl: requestUrl,
      syncYear: targetYear,
      notes: `同步来源：${OFFICIAL_SYNC_SOURCE}`,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    }));

    const created = await HolidayRule.bulkCreate(rows);

    return res.json({
      code: 200,
      message: `同步成功，新增 ${created.length} 条`,
      data: {
        year: targetYear,
        count: created.length,
        source: OFFICIAL_SYNC_SOURCE,
      },
    });
  } catch (error) {
    console.error('Sync holiday rules error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message || '同步失败',
    });
  }
});

module.exports = router;

