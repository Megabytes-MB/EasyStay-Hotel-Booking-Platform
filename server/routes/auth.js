const express = require('express');
const https = require('https');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const verificationCodes = new Map();
const FIXED_CODE = '123456';
const CODE_TTL_MS = 5 * 60 * 1000;

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
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({
        code: 400,
        message: '手机号不能为空',
      });
    }

    verificationCodes.set(phone, {
      code: FIXED_CODE,
      expiresAt: Date.now() + CODE_TTL_MS,
    });

    return res.json({
      code: 200,
      message: '验证码已发送（开发环境固定码）',
      data: {
        code: FIXED_CODE,
        expiresIn: CODE_TTL_MS,
      },
    });
  } catch (error) {
    console.error('Send code error:', error);
    return res.status(500).json({
      code: 500,
      message: error.message,
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
    const { username, password, role, phone, verifyCode } = req.body;
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
      const record = verificationCodes.get(phone);
      if (!verifyCode) {
        return res.status(400).json({
          code: 400,
          message: '请输入验证码',
        });
      }
      if (!record || record.code !== verifyCode || record.expiresAt < Date.now()) {
        return res.status(400).json({
          code: 400,
          message: '验证码无效或已过期',
        });
      }
      verificationCodes.delete(phone);
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
