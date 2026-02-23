const express = require('express');
const https = require('https');

const router = express.Router();

const X_PI = (Math.PI * 3000.0) / 180.0;

const isFiniteNumber = value => Number.isFinite(Number(value));
const toNumber = value => Number(value);

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

const getTencentMapKey = () => String(process.env.TENCENT_MAP_KEY || '').trim();
const getBaiduMapAk = () => String(process.env.BAIDU_MAP_AK || '').trim();

const bd09ToGcj02 = (lng, lat) => {
  const x = Number(lng) - 0.0065;
  const y = Number(lat) - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);
  const gcjLng = z * Math.cos(theta);
  const gcjLat = z * Math.sin(theta);
  return {
    longitude: Number(gcjLng.toFixed(7)),
    latitude: Number(gcjLat.toFixed(7)),
  };
};

const requestJson = url =>
  new Promise((resolve, reject) => {
    const req = https.get(url, response => {
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
      req.destroy(new Error('Map provider request timeout'));
    });
  });

const requestTencent = (path, params) => {
  const query = new URLSearchParams(params).toString();
  return requestJson(`https://apis.map.qq.com${path}?${query}`);
};

const requestBaidu = (path, params) => {
  const query = new URLSearchParams(params).toString();
  return requestJson(`https://api.map.baidu.com${path}?${query}`);
};

const isTencentQuotaExceeded = (providerStatus, providerMessage) => {
  const text = String(providerMessage || '');
  return Number(providerStatus) === 121 || /上限|配额|quota|limit/i.test(text);
};

const isInChinaCoordinate = (longitude, latitude) =>
  longitude >= 73.66 &&
  longitude <= 135.05 &&
  latitude >= 3.86 &&
  latitude <= 53.55;

const getBaiduErrorHint = (providerStatus, providerMessage, apiName) => {
  const status = Number(providerStatus);
  const messageText = String(providerMessage || '');

  if (status === 240) {
    return `百度 AK 未启用 ${apiName} 服务，或 AK 安全设置（白名单）不匹配`;
  }
  if (status === 2 || /Parameter Invalid/i.test(messageText)) {
    return '百度接口参数无效，请检查 query/region/location 等参数';
  }
  if (status === 3 || /ak/i.test(messageText)) {
    return '百度 AK 无效，请检查 BAIDU_MAP_AK 是否正确';
  }

  return '';
};

const parseTencentRegeo = tencentData => {
  const component = tencentData?.result?.address_component || {};
  const cityRaw = component.city || '';
  const provinceRaw = component.province || '';
  const districtRaw = component.district || '';

  return {
    city: normalizeRegionName(cityRaw || provinceRaw),
    province: normalizeRegionName(provinceRaw),
    district: normalizeRegionName(districtRaw),
    cityRaw: cityRaw || provinceRaw,
    formattedAddress:
      tencentData?.result?.formatted_addresses?.recommend ||
      tencentData?.result?.address ||
      '',
    mapProvider: 'tencent',
    fallbackNotice: '',
  };
};

const parseBaiduRegeo = baiduData => {
  const component = baiduData?.result?.addressComponent || {};
  const cityRaw = component.city || '';
  const provinceRaw = component.province || '';
  const districtRaw = component.district || '';

  return {
    city: normalizeRegionName(cityRaw || provinceRaw),
    province: normalizeRegionName(provinceRaw),
    district: normalizeRegionName(districtRaw),
    cityRaw: cityRaw || provinceRaw,
    formattedAddress: baiduData?.result?.formatted_address || '',
    mapProvider: 'baidu',
    fallbackNotice: '',
  };
};

router.get('/regeo', async (req, res) => {
  try {
    const tencentKey = getTencentMapKey();
    const baiduAk = getBaiduMapAk();

    if (!tencentKey && !baiduAk) {
      return res.status(500).json({
        code: 500,
        message: '服务端未配置地图 Key（TENCENT_MAP_KEY / BAIDU_MAP_AK）',
      });
    }

    const longitude = req.query.longitude;
    const latitude = req.query.latitude;
    if (!isFiniteNumber(longitude) || !isFiniteNumber(latitude)) {
      return res.status(400).json({
        code: 400,
        message: '经纬度参数非法',
      });
    }

    const lng = toNumber(longitude);
    const lat = toNumber(latitude);

    let tencentError = null;
    if (tencentKey) {
      const tencentResp = await requestTencent('/ws/geocoder/v1/', {
        key: tencentKey,
        location: `${lat},${lng}`,
        get_poi: '0',
        output: 'json',
      });

      if (tencentResp.statusCode === 200 && tencentResp.data && Number(tencentResp.data.status) === 0) {
        return res.json({
          code: 200,
          message: '逆地理编码成功',
          data: parseTencentRegeo(tencentResp.data),
        });
      }

      tencentError = {
        provider: 'tencent',
        httpStatus: tencentResp.statusCode,
        providerStatus: Number(tencentResp.data?.status),
        providerMessage: String(
          tencentResp.data?.message ||
            (tencentResp.statusCode !== 200
              ? `HTTP ${tencentResp.statusCode}`
              : `invalid json: ${(tencentResp.raw || '').slice(0, 80)}`)
        ),
      };
    }

    const shouldFallback =
      !tencentKey ||
      (tencentError && isTencentQuotaExceeded(tencentError.providerStatus, tencentError.providerMessage));
    const allowBaiduFallbackForCoordinate = isInChinaCoordinate(lng, lat);
    const fallbackByTencentQuota = Boolean(
      tencentError &&
        isTencentQuotaExceeded(tencentError.providerStatus, tencentError.providerMessage)
    );

    if (shouldFallback && baiduAk && allowBaiduFallbackForCoordinate) {
      const baiduResp = await requestBaidu('/reverse_geocoding/v3/', {
        ak: baiduAk,
        output: 'json',
        coordtype: 'gcj02ll',
        location: `${lat},${lng}`,
      });

      if (baiduResp.statusCode === 200 && baiduResp.data && Number(baiduResp.data.status) === 0) {
        if (fallbackByTencentQuota) {
          console.warn('Tencent quota exceeded, fallback to Baidu for /api/map/regeo');
        }

        const regeoData = parseBaiduRegeo(baiduResp.data);
        regeoData.fallbackNotice = fallbackByTencentQuota
          ? '腾讯额度不足，已自动切换百度地图服务'
          : '';

        return res.json({
          code: 200,
          message: fallbackByTencentQuota
            ? '逆地理编码成功（腾讯额度不足，已切换百度）'
            : '逆地理编码成功',
          data: regeoData,
        });
      }

      return res.status(502).json({
        code: 502,
        message: '地图服务不可用',
        data: {
          tencent: tencentError,
          baidu: {
            provider: 'baidu',
            httpStatus: baiduResp.statusCode,
            providerStatus: Number(baiduResp.data?.status),
            providerMessage: String(
              baiduResp.data?.message ||
                (baiduResp.statusCode !== 200
                  ? `HTTP ${baiduResp.statusCode}`
                  : `invalid json: ${(baiduResp.raw || '').slice(0, 80)}`)
            ),
            hint: getBaiduErrorHint(
              Number(baiduResp.data?.status),
              baiduResp.data?.message,
              '逆地理编码'
            ),
          },
        },
      });
    }

    if (shouldFallback && baiduAk && !allowBaiduFallbackForCoordinate) {
      return res.status(502).json({
        code: 502,
        message: '腾讯地图服务不可用',
        data: {
          ...tencentError,
          fallbackBlocked: true,
          fallbackReason: '海外坐标不使用百度回退',
        },
      });
    }

    return res.status(502).json({
      code: 502,
      message: '腾讯地图服务不可用',
      data: tencentError,
    });
  } catch (error) {
    console.error('Map reverse geocode error:', error);
    return res.status(500).json({
      code: 500,
      message:
        process.env.NODE_ENV === 'development'
          ? `逆地理编码服务异常: ${error.message || 'unknown'}`
          : '逆地理编码服务异常',
    });
  }
});

const parseTencentSuggestion = (list, keyword) =>
  list
    .map((item, index) => {
      const latitude = Number(item?.location?.lat);
      const longitude = Number(item?.location?.lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return {
        id: String(item?.id || `${keyword}-${index}`),
        title: String(item?.title || ''),
        address: String(item?.address || ''),
        province: normalizeRegionName(item?.province || ''),
        city: normalizeRegionName(item?.city || ''),
        district: normalizeRegionName(item?.district || ''),
        latitude,
        longitude,
      };
    })
    .filter(Boolean);

const parseBaiduSuggestion = (list, keyword) =>
  list
    .map((item, index) => {
      const bdLng = Number(item?.location?.lng);
      const bdLat = Number(item?.location?.lat);
      if (!Number.isFinite(bdLng) || !Number.isFinite(bdLat)) {
        return null;
      }

      const point = bd09ToGcj02(bdLng, bdLat);

      return {
        id: String(item?.uid || `${keyword}-${index}`),
        title: String(item?.name || ''),
        address: String(item?.address || ''),
        province: '',
        city: normalizeRegionName(item?.city || ''),
        district: normalizeRegionName(item?.district || ''),
        latitude: point.latitude,
        longitude: point.longitude,
      };
    })
    .filter(Boolean);

router.get('/search', async (req, res) => {
  try {
    const tencentKey = getTencentMapKey();
    const baiduAk = getBaiduMapAk();

    if (!tencentKey && !baiduAk) {
      return res.status(500).json({
        code: 500,
        message: '服务端未配置地图 Key（TENCENT_MAP_KEY / BAIDU_MAP_AK）',
      });
    }

    const keyword = String(req.query.keyword || '').trim();
    const region = String(req.query.region || req.query.city || '').trim();
    const pageSizeRaw = Number(req.query.pageSize || 10);
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.min(Math.max(Math.floor(pageSizeRaw), 1), 20)
      : 10;

    if (!keyword) {
      return res.status(400).json({
        code: 400,
        message: 'keyword 不能为空',
      });
    }

    let tencentError = null;
    if (tencentKey) {
      const searchParams = {
        key: tencentKey,
        keyword,
        output: 'json',
        page_size: String(pageSize),
      };
      if (region) {
        searchParams.region = region;
        searchParams.region_fix = '1';
      }

      const tencentResp = await requestTencent('/ws/place/v1/suggestion/', searchParams);
      if (tencentResp.statusCode === 200 && tencentResp.data && Number(tencentResp.data.status) === 0) {
        const list = Array.isArray(tencentResp.data.data) ? tencentResp.data.data : [];
        return res.json({
          code: 200,
          message: '地点搜索成功',
          data: parseTencentSuggestion(list, keyword),
          mapProvider: 'tencent',
          fallbackNotice: '',
        });
      }

      tencentError = {
        provider: 'tencent',
        httpStatus: tencentResp.statusCode,
        providerStatus: Number(tencentResp.data?.status),
        providerMessage: String(
          tencentResp.data?.message ||
            (tencentResp.statusCode !== 200
              ? `HTTP ${tencentResp.statusCode}`
              : `invalid json: ${(tencentResp.raw || '').slice(0, 80)}`)
        ),
      };
    }

    const shouldFallback =
      !tencentKey ||
      (tencentError && isTencentQuotaExceeded(tencentError.providerStatus, tencentError.providerMessage));
    const fallbackByTencentQuota = Boolean(
      tencentError &&
        isTencentQuotaExceeded(tencentError.providerStatus, tencentError.providerMessage)
    );

    if (shouldFallback && baiduAk) {
      const baiduParams = {
        ak: baiduAk,
        output: 'json',
        query: keyword,
        region: region || '全国',
        city_limit: region ? 'true' : 'false',
      };

      const baiduResp = await requestBaidu('/place/v2/suggestion', baiduParams);
      if (baiduResp.statusCode === 200 && baiduResp.data && Number(baiduResp.data.status) === 0) {
        const list = Array.isArray(baiduResp.data.result) ? baiduResp.data.result : [];
        if (fallbackByTencentQuota) {
          console.warn('Tencent quota exceeded, fallback to Baidu for /api/map/search');
        }

        return res.json({
          code: 200,
          message: fallbackByTencentQuota
            ? '地点搜索成功（腾讯额度不足，已切换百度）'
            : '地点搜索成功',
          data: parseBaiduSuggestion(list, keyword),
          mapProvider: 'baidu',
          fallbackNotice: fallbackByTencentQuota
            ? '腾讯额度不足，已自动切换百度地图服务'
            : '',
        });
      }

      return res.status(502).json({
        code: 502,
        message: '地图服务不可用',
        data: {
          tencent: tencentError,
          baidu: {
            provider: 'baidu',
            httpStatus: baiduResp.statusCode,
            providerStatus: Number(baiduResp.data?.status),
            providerMessage: String(
              baiduResp.data?.message ||
                (baiduResp.statusCode !== 200
                  ? `HTTP ${baiduResp.statusCode}`
                  : `invalid json: ${(baiduResp.raw || '').slice(0, 80)}`)
            ),
            hint: getBaiduErrorHint(
              Number(baiduResp.data?.status),
              baiduResp.data?.message,
              '地点搜索'
            ),
          },
        },
      });
    }

    return res.status(502).json({
      code: 502,
      message: '腾讯地图服务不可用',
      data: tencentError,
    });
  } catch (error) {
    console.error('Map search error:', error);
    return res.status(500).json({
      code: 500,
      message:
        process.env.NODE_ENV === 'development'
          ? `地点搜索服务异常: ${error.message || 'unknown'}`
          : '地点搜索服务异常',
    });
  }
});

module.exports = router;
