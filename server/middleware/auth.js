const jwt = require('jsonwebtoken');

const extractBearerToken = req => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = String(authHeader).split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const verifyJwt = token => jwt.verify(token, process.env.JWT_SECRET);

/**
 * Required JWT middleware.
 */
const authenticateToken = (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({
      code: 401,
      message: 'Missing auth token',
    });
  }

  try {
    req.user = verifyJwt(token);
    return next();
  } catch (_error) {
    return res.status(403).json({
      code: 403,
      message: 'Token is invalid or expired',
    });
  }
};

/**
 * Optional JWT middleware.
 * If token is missing/invalid, request is treated as anonymous.
 */
const optionalAuthenticateToken = (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = verifyJwt(token);
  } catch (_error) {
    req.user = null;
  }

  return next();
};

module.exports = { authenticateToken, optionalAuthenticateToken };
