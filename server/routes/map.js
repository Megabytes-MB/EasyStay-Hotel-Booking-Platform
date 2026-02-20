const express = require('express');
const https = require('https');

const router = express.Router();

const normalizeRegionName = (value = '') => {
  const text = String(value).trim();
  if (!text) return '';

  return text
    .replace(/特别行政区$/u, '')
    .replace(/壮族自治区$/u, '')
    .replace(/回族自治区$/u, '')
    .replace(/维吾尔自治区$/u, '')
    .replace(/自治区$/u, '')
    .replace(/自治州$/u, '')
    .replace(/地区$/u, '')
    .replace(/盟$/u, '')
    .replace(/省$/u, '')
    .replace(/市$/u, '');
};

const requestTencent = params =>
  new Promise((resolve, reject) => {
    const query = new URLSearchParams(params).toString();
    const req = https.get(`https://apis.map.qq.com/ws/geocoder/v1/?${query}`, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        raw += chunk;
      });
      response.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
        resolve({
          statusCode: response.statusCode || 0,
          data: parsed,
          raw,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error('Tencent request timeout'));
    });
  });

/**
 * GET /api/map/regeo?longitude=xxx&latitude=xxx
 * 使用腾讯位置服务 WebService 逆地理编码（服务端 Key）
 */
router.get('/regeo', async (req, res) => {
  try {
    const key = String(process.env.TENCENT_MAP_KEY || '').trim();
    if (!key) {
      return res.status(500).json({
        code: 500,
        message: '服务端未配置 TENCENT_MAP_KEY',
      });
    }

    const lng = Number(req.query.longitude);
    const lat = Number(req.query.latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return res.status(400).json({
        code: 400,
        message: '经纬度参数非法',
      });
    }

    const params = {
      key,
      location: `${lat},${lng}`,
      get_poi: '0',
      output: 'json',
    };

    const tencentResp = await requestTencent(params);
    if (tencentResp.statusCode !== 200) {
      return res.status(502).json({
        code: 502,
        message: `腾讯服务请求失败: HTTP ${tencentResp.statusCode}`,
      });
    }

    const tencentData = tencentResp.data;
    if (!tencentData) {
      return res.status(502).json({
        code: 502,
        message: `腾讯返回非 JSON: ${String(tencentResp.raw || '').slice(0, 100)}`,
      });
    }

    if (Number(tencentData?.status) !== 0) {
      const providerStatus = Number(tencentData?.status);
      const providerMessage = tencentData?.message || `腾讯逆编码失败: status=${providerStatus}`;
      console.warn('Tencent reverse geocode unavailable:', {
        status: providerStatus,
        message: providerMessage,
      });

      return res.json({
        code: 200,
        message: '逆地理编码暂不可用',
        data: {
          city: '',
          province: '',
          district: '',
          cityRaw: '',
          formattedAddress: '',
          providerStatus,
          providerMessage,
        },
      });
    }

    const component = tencentData?.result?.address_component || {};
    const cityRaw = component.city || '';
    const provinceRaw = component.province || '';
    const districtRaw = component.district || '';

    const city = normalizeRegionName(cityRaw || provinceRaw);
    const province = normalizeRegionName(provinceRaw);
    const district = normalizeRegionName(districtRaw);

    return res.json({
      code: 200,
      message: '逆地理编码成功',
      data: {
        city,
        province,
        district,
        cityRaw: cityRaw || provinceRaw,
        formattedAddress:
          tencentData?.result?.formatted_addresses?.recommend ||
          tencentData?.result?.address ||
          '',
      },
    });
  } catch (error) {
    console.error('Tencent reverse geocode error:', error);
    return res.status(500).json({
      code: 500,
      message:
        process.env.NODE_ENV === 'development'
          ? `逆地理编码服务异常: ${error.message || 'unknown'}`
          : '逆地理编码服务异常',
    });
  }
});

module.exports = router;
