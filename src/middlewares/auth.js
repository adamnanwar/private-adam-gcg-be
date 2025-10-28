const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/database');
const { unauthorizedResponse, forbiddenResponse } = require('../utils/response');
const logger = require('../utils/logger-simple');

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    logger.info(`Auth attempt - Header: ${authHeader}, Token: ${token ? token.substring(0, 20) + '...' : 'none'}`);

    if (!token) {
      logger.warn('No token provided in request');
      return res.status(401).json(unauthorizedResponse('Access token required'));
    }

    // Development mock token support
    if (token === 'dev-mock-jwt-token' || token === 'dev-mock-token') {
      // Provide a mock assessor user in dev
      const db = getConnection();
      const devUser = await db('users')
        .where('email', 'assessor@test.com')
        .first();
      if (devUser) {
        req.user = devUser;
        return next();
      }
      // Fallback: create minimal mock object using valid user ID
      req.user = {
        id: '55170402-db1b-44ea-acfe-7d3ea49f46cb', // Use valid user ID from database
        name: 'Adam Nanwar Test',
        email: 'adamnanwar1201@gmail.com',
        role: 'user',
        auth_provider: 'local'
      };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    logger.info(`Token decoded successfully - UserId: ${decoded.userId}`);

    // Get user from database with unit information
    const db = getConnection();
    const user = await db('users')
      .leftJoin('unit_bidang', 'users.unit_bidang_id', 'unit_bidang.id')
      .select(
        'users.*',
        'unit_bidang.id as unit_id',
        'unit_bidang.nama as unit_nama',
        'unit_bidang.kode as unit_kode'
      )
      .where('users.id', decoded.userId)
      .first();

    if (!user) {
      logger.warn(`User not found in database for userId: ${decoded.userId}`);
      return res.status(401).json(unauthorizedResponse('Invalid token'));
    }

    logger.info(`User authenticated successfully: ${user.email} (${user.role}), Unit ID: ${user.unit_bidang_id || 'none'}`);

    // Format user object with unit information
    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      auth_provider: user.auth_provider,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      unit_bidang_id: user.unit_bidang_id,
      unit: user.unit_id ? {
        id: user.unit_id,
        nama: user.unit_nama,
        kode: user.unit_kode
      } : null
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(unauthorizedResponse('Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(unauthorizedResponse('Invalid token'));
    }
    
    logger.error('Authentication error:', error);
    return res.status(500).json({ status: 'error', message: 'Authentication failed' });
  }
};

/**
 * Middleware to require specific role
 * Admin bypasses all role restrictions
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(unauthorizedResponse('Authentication required'));
    }

    // Admin can access everything - bypass role restrictions
    if (req.user.role === 'admin') {
      return next();
    }

    const userRole = req.user.role;
    if (Array.isArray(roles)) {
      if (!roles.includes(userRole)) {
        return res.status(403).json(forbiddenResponse('Insufficient permissions'));
      }
    } else {
      if (userRole !== roles) {
        return res.status(403).json(forbiddenResponse('Insufficient permissions'));
      }
    }

    next();
  };
};

/**
 * Middleware to require admin role or self-access
 * Admin can access any user's data
 */
const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(unauthorizedResponse('Authentication required'));
  }

  // Admin can access everything
  if (req.user.role === 'admin') {
    return next();
  }

  const userId = req.params.id || req.params.userId;
  if (req.user.id === userId) {
    return next();
  }

  return res.status(403).json(forbiddenResponse('Insufficient permissions'));
};

/**
 * Middleware to require assessment access
 * Admin can access all assessments without restrictions
 */
const requireAssessmentAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json(unauthorizedResponse('Authentication required'));
    }

    // Admin can access all assessments without any restrictions
    if (req.user.role === 'admin') {
      return next();
    }

    const assessmentId = req.params.assessmentId || req.params.id;
    if (!assessmentId) {
      return res.status(400).json({ status: 'error', message: 'Assessment ID required' });
    }

    // Check if user is assessor for this assessment
    const db = getConnection();
    const assessment = await db('assessment')
      .where('id', assessmentId)
      .first();

    if (!assessment) {
      return res.status(404).json({ status: 'error', message: 'Assessment not found' });
    }

    // User can access their own assessments
    if (req.user.role === 'user' && assessment.assessor_id === req.user.id) {
      return next();
    }

    // User can access assessments where they are assigned as PIC
    if (req.user.role === 'user') {
      const picAssignment = await db('pic_map')
        .where('pic_user_id', req.user.id)
        .first();
      
      if (picAssignment) {
        return next();
      }
    }

    return res.status(403).json(forbiddenResponse('No access to this assessment'));
  } catch (error) {
    logger.error('Assessment access check error:', error);
    return res.status(500).json({ status: 'error', message: 'Access check failed' });
  }
};

/**
 * Middleware to require assessment owner or admin
 * Admin can access any assessment without restrictions
 */
const requireAssessmentOwnerOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json(unauthorizedResponse('Authentication required'));
    
    // Admin can access everything without restrictions
    if (req.user.role === 'admin') {
      return next();
    }
    
    const { assessmentId } = req.params;
    const db = getConnection();
    const a = await db('assessment').where('id', assessmentId).first();
    if (!a) return res.status(404).json(forbiddenResponse('Assessment not found'));
    if (a.created_by === req.user.id) return next();
    return res.status(403).json(forbiddenResponse('Insufficient permissions'));
  } catch (e) {
    return res.status(500).json(forbiddenResponse('Internal error'));
  }
};

/**
 * Middleware to require admin role - gives full access to everything
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(unauthorizedResponse('Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json(forbiddenResponse('Admin access required'));
  }

  next();
};

/**
 * Middleware to allow admin or specific role
 * Admin bypasses all restrictions
 */
const requireAdminOrRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(unauthorizedResponse('Authentication required'));
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    const userRole = req.user.role;
    if (Array.isArray(roles)) {
      if (!roles.includes(userRole)) {
        return res.status(403).json(forbiddenResponse('Insufficient permissions'));
      }
    } else {
      if (userRole !== roles) {
        return res.status(403).json(forbiddenResponse('Insufficient permissions'));
      }
    }

    next();
  };
};

/**
 * Optional authentication middleware
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
      const db = getConnection();
      const user = await db('users')
        .where('id', decoded.userId)
        .first();
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireSelfOrAdmin,
  requireAssessmentAccess,
  requireAssessmentOwnerOrAdmin,
  requireAdmin,
  requireAdminOrRole,
  optionalAuth
};

