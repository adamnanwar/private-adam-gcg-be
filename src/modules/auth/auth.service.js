const { getConnection } = require('../../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const logger = require('../../utils/logger-simple');
const ldapService = require('../../services/ldap.service');

// Ambil 1 nilai (string) dari attributes array (case-insensitive).
function attrVal(attributes, type) {
  if (!Array.isArray(attributes)) return null;
  const wanted = String(type).toLowerCase();

  const found = attributes.find(
    (a) => String(a.type || "").toLowerCase() === wanted
  );
  if (!found) return null;

  // ldapjs kadang pakai .vals, kadang .values
  const vals = Array.isArray(found.values)
    ? found.values
    : Array.isArray(found.vals)
    ? found.vals
    : [];

  return vals.length ? vals[0] : null; // ambil nilai pertama
}

class AuthService {
  constructor() {
    this.ldapClient = null;
  }

  /**
   * Generate JWT token
   */
  _generateToken(userId, expiresIn = process.env.JWT_EXPIRES_IN || '6d') {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn }
    );
  }

  /**
   * Login (unified - supports both local and LDAP)
   */
  async login({ email, password }) {
    // --- Guard input
    if (!email || !password) {
      throw new Error('email and password are required');
    }

    // --- Normalisasi input - support username atau email
    const inputUser = (email || "").trim();

    // Extract username from email if needed (remove @domain)
    // IMPORTANT: Keep spaces in username (e.g., "admin test")
    const cleanUsername = inputUser.includes('@') ? inputUser.split('@')[0] : inputUser;

    logger.info(`Login attempt - Input: "${inputUser}", Clean: "${cleanUsername}"`);

    // --- Cari user di DB (by email, username, or name) - hanya user yang aktif
    const db = getConnection();
    const user = await db('users')
      .leftJoin('unit_bidang', 'users.unit_bidang_id', 'unit_bidang.id')
      .select('users.*', 'unit_bidang.nama as unit_nama', 'unit_bidang.kode as unit_kode')
      .where(function() {
        this.where('users.email', inputUser)
            .orWhere('users.username', cleanUsername)
            .orWhere('users.username', inputUser)
            .orWhere('users.name', inputUser)
            // Also try matching with lowercase for case-insensitive search
            .orWhereRaw('LOWER(users.username) = LOWER(?)', [cleanUsername])
            .orWhereRaw('LOWER(users.name) = LOWER(?)', [cleanUsername]);
      })
      .andWhere('users.is_active', true)
      .first();
    
    logger.info(`User query result: ${user ? 'FOUND' : 'NOT FOUND'}`);
    if (user) {
      logger.info(`User details: ${user.email}, auth_provider: ${user.auth_provider}, is_active: ${user.is_active}`);
    }

    // =========================================================
    // CASE A: User lokal (auth_provider = 'local')
    // =========================================================
    if (user && user.auth_provider === 'local') {
      logger.info(`Local user found: ${user.email}, checking password...`);
      // Check password using bcrypt
      if (user.password_hash) {
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          throw new Error('Invalid password');
        }
      } else {
        throw new Error('No password set for this user');
      }

      const token = this._generateToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
          auth_provider: user.auth_provider,
          unit_bidang_id: user.unit_bidang_id, // Add for compatibility
          unit: user.unit_nama ? {
            id: user.unit_bidang_id,
            nama: user.unit_nama,
            kode: user.unit_kode
          } : null
        },
        accessToken: token
      };
    }

    // =========================================================
    // CASE B: User LDAP exists in DB -> authenticate via LDAP
    // =========================================================
    if (user && user.auth_provider === 'ldap') {
      try {
        const ldapUserData = await ldapService.authenticateUser(cleanUsername, password);
        if (!ldapUserData) {
          throw new Error('Invalid LDAP credentials');
        }

        // Update user with latest LDAP info including unit
        const updatedUser = await ldapService.createOrUpdateUserFromLDAP(ldapUserData);

        const token = this._generateToken(user.id);

        return {
          user: {
            id: user.id,
            email: updatedUser.email,
            name: updatedUser.name,
            username: updatedUser.username,
            role: updatedUser.role,
            auth_provider: updatedUser.auth_provider,
            unit: ldapUserData.unit ? {
              id: ldapUserData.unit.id,
              nama: ldapUserData.unit.nama,
              kode: ldapUserData.unit.kode
            } : null
          },
          accessToken: token
        };
      } catch (error) {
        logger.error('LDAP authentication failed:', error);
        throw new Error('Invalid LDAP credentials');
      }
    }

    // =========================================================
    // CASE C: User belum ada di DB -> coba autentikasi LDAP
    // Jika sukses, auto-provision user ke DB sebagai user
    // =========================================================
    logger.info(`No user found in DB, trying LDAP authentication for: ${cleanUsername}`);
    try {
      const ldapUserData = await ldapService.authenticateUser(cleanUsername, password);
      if (!ldapUserData) {
        throw new Error('User not found or invalid credentials');
      }

      // Create new user from LDAP data
      const newUser = await ldapService.createOrUpdateUserFromLDAP(ldapUserData);
      const token = this._generateToken(newUser.id);

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          username: newUser.username,
          role: newUser.role, // Always 'user' for LDAP users (unless admin)
          auth_provider: newUser.auth_provider,
          unit_bidang_id: ldapUserData.unit?.id, // Add for compatibility
          unit: ldapUserData.unit ? {
            id: ldapUserData.unit.id,
            nama: ldapUserData.unit.nama,
            kode: ldapUserData.unit.kode
          } : null
        },
        accessToken: token
      };
    } catch (error) {
      logger.error('LDAP authentication failed:', error);
      if (error.message.includes('LDAP server not accessible')) {
        throw new Error('LDAP server is currently not available. Please try again later.');
      }
      if (error.message.includes('Invalid credentials') || error.message.includes('Invalid LDAP credentials')) {
        throw new Error('Invalid credentials');
      }
      throw new Error('User not found or invalid credentials');
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get user profile with unit information
   */
  async getProfile(userId) {
    try {
      const db = getConnection();
      const user = await db('users')
        .leftJoin('unit_bidang', 'users.unit_bidang_id', 'unit_bidang.id')
        .select(
          'users.id', 'users.username', 'users.name', 'users.email', 'users.role', 
          'users.auth_provider', 'users.is_active', 'users.created_at', 'users.updated_at',
          'unit_bidang.id as unit_id', 'unit_bidang.nama as unit_nama', 'unit_bidang.kode as unit_kode'
        )
        .where('users.id', userId)
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        auth_provider: user.auth_provider,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        unit_bidang_id: user.unit_id, // Add for compatibility
        unit: user.unit_id ? {
          id: user.unit_id,
          nama: user.unit_nama,
          kode: user.unit_kode
        } : null
      };
    } catch (error) {
      logger.error('Get profile error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
