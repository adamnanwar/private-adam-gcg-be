const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ldap = require('ldapjs');
const { v4: uuidv4 } = require('uuid');
const { getConnection } = require('../../config/database');
const logger = require('../../utils/logger-simple');

class AuthService {
  constructor() {
    this.ldapClient = null;
  }

  /**
   * Initialize LDAP client
   */
  _initLDAP() {
    if (!this.ldapClient) {
      this.ldapClient = ldap.createClient({
        url: process.env.LDAP_URL
      });
    }
    return this.ldapClient;
  }

  /**
   * Generate JWT token
   */
  _generateToken(userId, expiresIn = process.env.JWT_EXPIRES_IN || '15m') {
    return jwt.sign(
      { userId, iat: Math.floor(Date.now() / 1000) },
      process.env.JWT_SECRET,
      { expiresIn }
    );
  }

  /**
   * Generate refresh token
   */
  _generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh', iat: Math.floor(Date.now() / 1000) },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Authenticate local user
   */
  async authenticateLocal(email, password) {
    try {
      const db = getConnection();
      const user = await db('users')
        .where('email', email)
        .where('auth_provider', 'local')
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.password_hash) {
        throw new Error('Password not set for this user');
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Generate tokens
      const accessToken = this._generateToken(user.id);
      const refreshToken = this._generateRefreshToken(user.id);

      // Store refresh token (optional - for token rotation)
      // await this._storeRefreshToken(user.id, refreshToken);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          auth_provider: user.auth_provider
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Local authentication error:', error);
      throw error;
    }
  }

  /**
   * Authenticate LDAP user
   */
  async authenticateLDAP(username, password) {
    return new Promise((resolve, reject) => {
      try {
        const ldapClient = this._initLDAP();
        
        // Bind with admin credentials to search for user
        ldapClient.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD, (err) => {
          if (err) {
            logger.error('LDAP admin bind error:', err);
            return reject(new Error('LDAP connection failed'));
          }

          // Search for user
          const searchOptions = {
            scope: 'sub',
            filter: process.env.LDAP_SEARCH_FILTER.replace('{{username}}', username)
          };

          ldapClient.search(process.env.LDAP_SEARCH_BASE, searchOptions, (err, res) => {
            if (err) {
              logger.error('LDAP search error:', err);
              return reject(new Error('User search failed'));
            }

            let userFound = false;
            let userDN = null;

            res.on('searchEntry', (entry) => {
              userFound = true;
              userDN = entry.objectName;
            });

            res.on('error', (err) => {
              logger.error('LDAP search response error:', err);
              reject(new Error('User search failed'));
            });

            res.on('end', () => {
              if (!userFound) {
                return reject(new Error('User not found in LDAP'));
              }

              // Try to bind with user credentials
              ldapClient.bind(userDN, password, async (err) => {
                if (err) {
                  logger.error('LDAP user bind error:', err);
                  return reject(new Error('Invalid credentials'));
                }

                try {
                  // Find or create user in local database
                  const db = getConnection();
                  let user = await db('users')
                    .where('email', username)
                    .where('auth_provider', 'ldap')
                    .first();

                  if (!user) {
                    // Create new LDAP user
                    const userId = uuidv4();
                    const [newUser] = await db('users').insert({
                      id: userId,
                      name: username, // You might want to get this from LDAP database
                      email: username,
                      auth_provider: 'ldap',
                      role: 'viewer' // Default role for LDAP users
                    }).returning('*');
                    user = newUser;
                  }

                  // Generate tokens
                  const accessToken = this._generateToken(user.id);
                  const refreshToken = this._generateRefreshToken(user.id);

                  resolve({
                    user: {
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      role: user.role,
                      auth_provider: user.auth_provider
                    },
                    accessToken,
                    refreshToken
                  });
                } catch (dbError) {
                  logger.error('Database error during LDAP auth:', dbError);
                  reject(new Error('Failed to create user account'));
                }
              });
            });
          });
        });
      } catch (error) {
        logger.error('LDAP authentication error:', error);
        reject(error);
      }
    });
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const db = getConnection();
      const user = await db('users').where('id', decoded.userId).first();
      if (!user) {
        throw new Error('User not found');
      }

      const newAccessToken = this._generateToken(user.id);
      const newRefreshToken = this._generateRefreshToken(user.id);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          auth_provider: user.auth_provider
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    try {
      const db = getConnection();
      const user = await db('users')
        .select('id', 'name', 'email', 'role', 'auth_provider', 'created_at', 'updated_at')
        .where('id', userId)
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Change password (for local users only)
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const db = getConnection();
      const user = await db('users')
        .where('id', userId)
        .where('auth_provider', 'local')
        .first();

      if (!user) {
        throw new Error('User not found or not local user');
      }

      if (!user.password_hash) {
        throw new Error('Password not set for this user');
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      await db('users')
        .where('id', userId)
        .update({ 
          password_hash: newPasswordHash,
          updated_at: new Date()
        });

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Logout (invalidate refresh token if needed)
   */
  async logout(userId) {
    try {
      // In a real implementation, you might want to blacklist the refresh token
      // For now, we'll just return success
      return { message: 'Logged out successfully' };
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();

