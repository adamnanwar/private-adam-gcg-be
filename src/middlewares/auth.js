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

    if (!token) {
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
      // Fallback: create minimal mock object (no DB write here)
      req.user = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Dev Assessor',
        email: 'assessor@test.com',
        role: 'assessor',
        auth_provider: 'local'
      };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const db = getConnection();
    const user = await db('users').where('id', decoded.userId).first();
    if (!user) {
      return res.status(401).json(unauthorizedResponse('Invalid token'));
    }

    req.user = user;
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
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(unauthorizedResponse('Authentication required'));
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
 */
const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(unauthorizedResponse('Authentication required'));
  }

  const userId = req.params.id || req.params.userId;
  if (req.user.role === 'admin' || req.user.id === userId) {
    return next();
  }

  return res.status(403).json(forbiddenResponse('Insufficient permissions'));
};

/**
 * Middleware to require assessment access
 */
const requireAssessmentAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json(unauthorizedResponse('Authentication required'));
    }

    const assessmentId = req.params.assessmentId || req.params.id;
    if (!assessmentId) {
      return res.status(400).json({ status: 'error', message: 'Assessment ID required' });
    }

    // Admin can access all assessments
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is assessor for this assessment
    const assessment = await db('assessment')
      .where('id', assessmentId)
      .first();

    if (!assessment) {
      return res.status(404).json({ status: 'error', message: 'Assessment not found' });
    }

    // Assessor can access their own assessments
    if (req.user.role === 'assessor' && assessment.assessor_id === req.user.id) {
      return next();
    }

    // PIC can access assessments where they are assigned
    if (req.user.role === 'pic') {
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
 * Optional authentication middleware
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await db('users').where('id', decoded.userId).first();
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
  optionalAuth
};

