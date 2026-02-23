const express = require('express');
const https = require('https');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Dypnsapi20170525 = require('@alicloud/dypnsapi20170525');
const OpenApi = require('@alicloud/openapi-client');
const Util = require('@alicloud/tea-util');
const Credential = require('@alicloud/credentials');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const CODE_TTL_MS = 5 * 60 * 1000;
const SEND_CODE_COOLDOWN_MS = Number(process.env.SMS_SEND_CODE_COOLDOWN_MS || 60 * 1000);
const sendCodeCooldownByPhone = new Map();
let aliyunSmsClient = null;

const wechatAccessTokenCache = {
  token: '',
  expiresAt: 0,
};

const hasWechatConfig = () =>
  Boolean(process.env.WECHAT_APPID && process.env.WECHAT_SECRET);

const isProdEnv = () => process.env.NODE_ENV === 'production';

const requestGetJson = url =>
  new Promise((resolve, reject) => {
    https
      .get(url, response => {
        let raw = '';
        response.on('data', chunk => {
          raw += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });

const requestPostJson = (url, payload) =>
  new Promise((resolve, reject) => {
    const data = JSON.stringify(payload || {});
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      response => {
        let raw = '';
        response.on('data', chunk => {
          raw += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });

const normalizePhone = phone => String(phone || '').trim();

const isValidChinaMobilePhone = phone => /^1\d{10}$/.test(phone);

const getAliyunSmsBizConfig = () => {
  const signName = process.env.ALIYUN_SMS_SIGN_NAME || '';
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || '';
  const schemeName = process.env.ALIYUN_SMS_SCHEME_NAME || '';
  const countryCode = process.env.ALIYUN_SMS_COUNTRY_CODE || '86';
  const codeKey = process.env.ALIYUN_SMS_TEMPLATE_CODE_KEY || 'code';
  const extraJson = process.env.ALIYUN_SMS_TEMPLATE_EXTRA_JSON || '{}';

  if (!signName || !templateCode) {
    throw new Error(
      'Aliyun SMS config missing: ALIYUN_SMS_SIGN_NAME / ALIYUN_SMS_TEMPLATE_CODE'
    );
  }

  let extraParams = {};
  try {
    extraParams = JSON.parse(extraJson);
  } catch (error) {
    throw new Error('ALIYUN_SMS_TEMPLATE_EXTRA_JSON must be valid JSON');
  }

  return { signName, templateCode, schemeName, countryCode, codeKey, extraParams };
};

const getAliyunSmsClient = () => {
  if (aliyunSmsClient) return aliyunSmsClient;

  const credential = new Credential.default();
  const config = new OpenApi.Config({
    credential,
  });
  config.endpoint = process.env.ALIYUN_DYPN_ENDPOINT || 'dypnsapi.aliyuncs.com';
  aliyunSmsClient = new Dypnsapi20170525.default(config);
  return aliyunSmsClient;
};

const callAliyunSendSmsVerifyCode = async phone => {
  const {
    signName,
    templateCode,
    schemeName,
    countryCode,
    codeKey,
    extraParams,
  } = getAliyunSmsBizConfig();

  const client = getAliyunSmsClient();
  const request = new Dypnsapi20170525.SendSmsVerifyCodeRequest({
    phoneNumber: phone,
    signName,
    templateCode,
    countryCode,
    outId: `easy_stay_${Date.now()}`,
    templateParam: JSON.stringify({
      ...extraParams,
      [codeKey]: '##code##',
    }),
  });

  if (schemeName) {
    request.schemeName = schemeName;
  }

  const resp = await client.sendSmsVerifyCodeWithOptions(
    request,
    new Util.RuntimeOptions({})
  );
  const body = resp && resp.body ? resp.body : {};
  const code = String(body.code || '').toUpperCase();

  if (code && code !== 'OK') {
    throw new Error(body.message || `Aliyun send sms failed: ${body.code}`);
  }

  return {
    requestId: body.requestId || '',
    bizId: (body.model && body.model.bizId) || '',
  };
};

const callAliyunCheckSmsVerifyCode = async (phone, verifyCode) => {
  const { schemeName, countryCode } = getAliyunSmsBizConfig();
  const client = getAliyunSmsClient();
  const request = new Dypnsapi20170525.CheckSmsVerifyCodeRequest({
    phoneNumber: phone,
    verifyCode,
    countryCode,
  });

  if (schemeName) {
    request.schemeName = schemeName;
  }

  const resp = await client.checkSmsVerifyCodeWithOptions(
    request,
    new Util.RuntimeOptions({})
  );
  const body = resp && resp.body ? resp.body : {};
  const resultRaw =
    (body.model && (body.model.verifyResult || body.model.verifyresult)) ||
    body.verifyResult ||
    body.verifyresult ||
    '';
  const verifyResult = String(resultRaw).toUpperCase();
  const passed = verifyResult === 'PASS' || verifyResult === 'SUCCESS' || resultRaw === true;

  return {
    passed,
    verifyResult,
    code: String(body.code || '').toUpperCase(),
    message: body.message || '',
  };
};

const makeJwtPayload = user => ({
  id: user.id,
  username: user.username,
  role: user.role,
});

const buildAuthResponseData = user => {
  const token = jwt.sign(makeJwtPayload(user), process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

  return {
    token: `Bearer ${token}`,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      phone: user.phone || '',
      avatar: user.avatar || '',
      nickname: user.nickname || user.username,
      wechatBound: Boolean(user.wechatOpenId),
    },
  };
};

const getWechatSession = async code => {
  if (!hasWechatConfig()) {
    if (!isProdEnv()) {
      const mockOpenId = `dev_openid_${String(code || '').slice(0, 24) || 'default'}`;
      console.warn('[auth] WECHAT_SECRET not configured, using dev mock openid');
      return { openid: mockOpenId };
    }
    throw new Error('WECHAT_APPID or WECHAT_SECRET is not configured');
  }

  const query = new URLSearchParams({
    appid: process.env.WECHAT_APPID,
    secret: process.env.WECHAT_SECRET,
    js_code: code,
    grant_type: 'authorization_code',
  }).toString();

  const data = await requestGetJson(
    `https://api.weixin.qq.com/sns/jscode2session?${query}`
  );

  if (data.errcode) {
    throw new Error(`WeChat code2session failed: ${data.errmsg || data.errcode}`);
  }

  return data;
};

const makeDevMockPhone = phoneCode => {
  const hex = crypto.createHash('md5').update(String(phoneCode || 'dev')).digest('hex');
  const digits = hex
    .split('')
    .map(ch => parseInt(ch, 16) % 10)
    .join('')
    .slice(0, 9);
  return `13${digits}`;
};

const getWechatAccessToken = async () => {
  if (
    wechatAccessTokenCache.token &&
    Date.now() < wechatAccessTokenCache.expiresAt
  ) {
    return wechatAccessTokenCache.token;
  }

  const query = new URLSearchParams({
    grant_type: 'client_credential',
    appid: process.env.WECHAT_APPID,
    secret: process.env.WECHAT_SECRET,
  }).toString();

  const data = await requestGetJson(
    `https://api.weixin.qq.com/cgi-bin/token?${query}`
  );

  if (data.errcode || !data.access_token) {
    throw new Error(`WeChat get access_token failed: ${data.errmsg || data.errcode}`);
  }

  wechatAccessTokenCache.token = data.access_token;
  wechatAccessTokenCache.expiresAt =
    Date.now() + Math.max((data.expires_in || 7200) - 120, 60) * 1000;
  return wechatAccessTokenCache.token;
};

const getWechatPhoneNumber = async phoneCode => {
  if (!phoneCode) return '';

  if (!hasWechatConfig()) {
    if (!isProdEnv()) {
      const mockPhone = makeDevMockPhone(phoneCode);
      console.warn('[auth] WECHAT_SECRET not configured, using dev mock phone');
      return mockPhone;
    }
    throw new Error('WECHAT_APPID or WECHAT_SECRET is not configured');
  }

  const accessToken = await getWechatAccessToken();
  const data = await requestPostJson(
    `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`,
    { code: phoneCode }
  );

  if (data.errcode) {
    throw new Error(`WeChat getuserphonenumber failed: ${data.errmsg || data.errcode}`);
  }

  const phone =
    data.phone_info?.purePhoneNumber || data.phone_info?.phoneNumber || '';

  if (!phone) {
    throw new Error('WeChat phone number is empty');
  }

  return phone.replace(/^\+86/, '');
};

const genWechatUsernameBase = openid => `wx_${openid.slice(-10)}`;

const createUniqueWechatUsername = async base => {
  let username = base;
  let suffix = 0;
  while (await User.findOne({ where: { username } })) {
    suffix += 1;
    username = `${base}${suffix}`;
  }
  return username;
};

router.post('/send-code', async (req, res) => {
  try {
    const phone = normalizePhone(req.body && req.body.phone);
    if (!phone) {
      return res.status(400).json({
        code: 400,
        message: '手机号不能为空',
      });
    }

    if (!isValidChinaMobilePhone(phone)) {
      return res.status(400).json({
        code: 400,
        message: '手机号格式不正确',
      });
    }

    const now = Date.now();
    const lastSentAt = sendCodeCooldownByPhone.get(phone) || 0;
    if (now - lastSentAt < SEND_CODE_COOLDOWN_MS) {
      const leftMs = SEND_CODE_COOLDOWN_MS - (now - lastSentAt);
      return res.status(429).json({
        code: 429,
        message: `发送过于频繁，请在 ${Math.ceil(leftMs / 1000)} 秒后重试`,
      });
    }

    const result = await callAliyunSendSmsVerifyCode(phone);
    sendCodeCooldownByPhone.set(phone, now);

    return res.json({
      code: 200,
      message: '验证码已发送',
      data: {
        expiresIn: CODE_TTL_MS,
        requestId: result.requestId,
        bizId: result.bizId,
      },
    });
  } catch (error) {
    console.error('Send code error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message || '验证码发送失败',
    });
  }
});

router.post('/wechat-login', async (req, res) => {
  try {
    const { code, loginCode, phoneCode, nickname, avatar } = req.body;
    const realLoginCode = loginCode || code;

    if (!realLoginCode) {
      return res.status(400).json({
        code: 400,
        message: '微信登录 code 不能为空',
      });
    }

    const session = await getWechatSession(realLoginCode);
    const openid = session.openid;
    if (!openid) {
      return res.status(400).json({
        code: 400,
        message: '微信登录失败，未获取到 openid',
      });
    }

    const wechatPhone = await getWechatPhoneNumber(phoneCode);

    let userByOpenId = await User.findOne({ where: { wechatOpenId: openid } });
    const userByPhone = wechatPhone
      ? await User.findOne({ where: { phone: wechatPhone } })
      : null;

    // Same person might have one account bound by phone and another by openid.
    // Prefer phone account to keep login identity stable across devices.
    if (userByOpenId && userByPhone && userByOpenId.id !== userByPhone.id) {
      userByOpenId.wechatOpenId = null;
      await userByOpenId.save();
      userByOpenId = null;
    }

    let user = userByPhone || userByOpenId;

    if (!user) {
      const usernameBase = genWechatUsernameBase(openid);
      const username = await createUniqueWechatUsername(usernameBase);
      const randomPassword = crypto.randomBytes(16).toString('hex');
      user = await User.create({
        username,
        password: randomPassword,
        role: 'user',
        phone: wechatPhone || null,
        avatar: avatar || '',
        nickname: nickname || '',
        wechatOpenId: openid,
      });
    } else {
      let changed = false;

      if (user.wechatOpenId !== openid) {
        const occupied = await User.findOne({ where: { wechatOpenId: openid } });
        if (occupied && occupied.id !== user.id) {
          occupied.wechatOpenId = null;
          await occupied.save();
        }
        user.wechatOpenId = openid;
        changed = true;
      }

      if (wechatPhone && user.phone !== wechatPhone) {
        user.phone = wechatPhone;
        changed = true;
      }

      if (nickname && nickname !== user.nickname) {
        user.nickname = nickname;
        changed = true;
      }

      if (avatar && avatar !== user.avatar) {
        user.avatar = avatar;
        changed = true;
      }

      if (changed) {
        await user.save();
      }
    }

    return res.json({
      code: 200,
      message: '微信手机号登录成功',
      data: buildAuthResponseData(user),
    });
  } catch (error) {
    console.error('WeChat login error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message || '微信登录失败',
    });
  }
});

router.post('/wechat-bind', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        code: 400,
        message: '微信绑定 code 不能为空',
      });
    }

    const session = await getWechatSession(code);
    const openid = session.openid;
    if (!openid) {
      return res.status(400).json({
        code: 400,
        message: '微信绑定失败，未获取到 openid',
      });
    }

    const occupiedUser = await User.findOne({ where: { wechatOpenId: openid } });
    if (occupiedUser && occupiedUser.id !== req.user.id) {
      return res.status(409).json({
        code: 409,
        message: '该微信已绑定其他账号',
      });
    }

    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
      });
    }

    currentUser.wechatOpenId = openid;
    await currentUser.save();

    return res.json({
      code: 200,
      message: '微信绑定成功',
      data: {
        userId: currentUser.id,
        wechatBound: true,
      },
    });
  } catch (error) {
    console.error('WeChat bind error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message || '微信绑定失败',
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, role, verifyCode } = req.body;
    const phone = normalizePhone(req.body && req.body.phone);
    if (!username || !password || !role) {
      return res.status(400).json({
        code: 400,
        message: '用户名、密码、角色不能为空',
      });
    }

    if (!['admin', 'merchant', 'user'].includes(role)) {
      return res.status(400).json({
        code: 400,
        message: '角色必须是 admin、merchant 或 user',
      });
    }

    if (phone) {
      if (!isValidChinaMobilePhone(phone)) {
        return res.status(400).json({
          code: 400,
          message: '手机号格式不正确',
        });
      }

      if (!verifyCode) {
        return res.status(400).json({
          code: 400,
          message: '请输入验证码',
        });
      }

      const verifyResult = await callAliyunCheckSmsVerifyCode(phone, verifyCode);
      if (verifyResult.code && verifyResult.code !== 'OK') {
        return res.status(502).json({
          code: 502,
          message: verifyResult.message || '验证码校验服务异常，请稍后重试',
        });
      }

      if (!verifyResult.passed) {
        return res.status(400).json({
          code: 400,
          message: verifyResult.message || '验证码无效或已过期',
        });
      }
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({
        code: 409,
        message: '用户名已存在',
      });
    }

    const user = await User.create({ username, password, role, phone: phone || null });
    return res.json({
      code: 200,
      message: '注册成功',
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        phone: user.phone || '',
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名和密码不能为空',
      });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
      });
    }

    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
      });
    }

    return res.json({
      code: 200,
      message: '登录成功',
      data: buildAuthResponseData(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

module.exports = router;
