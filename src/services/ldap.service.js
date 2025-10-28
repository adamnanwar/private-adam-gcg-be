const ldap = require('ldapjs');
const { getConnection } = require('../config/database');
const ldapConfig = require('../config/ldap.config');
const logger = require('../utils/logger-simple');

class LDAPService {
  constructor() {
    this.client = null;
    this.db = getConnection();
  }

  async connect() {
    try {
      const url = ldapConfig.useTLS 
        ? `ldaps://${ldapConfig.hosts[0]}:${ldapConfig.port}`
        : `ldap://${ldapConfig.hosts[0]}:${ldapConfig.port}`;
        
      this.client = ldap.createClient({
        url: url,
        timeout: ldapConfig.timeout,
        connectTimeout: ldapConfig.timeout,
        tlsOptions: { rejectUnauthorized: false },
      });

      return new Promise((resolve, reject) => {
        this.client.on('error', (err) => {
          logger.error('LDAP connection error:', err);
          reject(new Error('LDAP server not accessible'));
        });

        this.client.on('connect', () => {
          logger.info('LDAP connected successfully');
          resolve();
        });

        this.client.on('timeout', () => {
          logger.error('LDAP connection timeout');
          reject(new Error('LDAP server not accessible'));
        });

        // Set a timeout for connection
        setTimeout(() => {
          reject(new Error('LDAP server not accessible'));
        }, ldapConfig.timeout);
      });
    } catch (error) {
      logger.error('Failed to create LDAP client:', error);
      throw new Error('LDAP server not accessible');
    }
  }

  async bind(username, password) {
    try {
      // Handle username with spaces (like "admin test")
      const cleanUsername = username.trim();
      const userDN = cleanUsername + ldapConfig.accountSuffix;
      
      logger.info(`Attempting LDAP bind for: ${cleanUsername} -> ${userDN}`);
      
      return new Promise((resolve, reject) => {
        this.client.bind(userDN, password, (err) => {
          if (err) {
            logger.error('LDAP bind failed:', err);
            reject(new Error('Invalid credentials'));
          } else {
            logger.info('LDAP bind successful for:', cleanUsername);
            resolve();
          }
        });
      });
    } catch (error) {
      logger.error('LDAP bind error:', error);
      throw new Error('Invalid credentials');
    }
  }

  async searchUsers(searchFilter = '(objectClass=person)', attributes = ['*']) {
    try {
      const baseDN = ldapConfig.baseDN;
      
      return new Promise((resolve, reject) => {
        this.client.search(baseDN, {
          scope: 'sub',
          filter: searchFilter,
          attributes: attributes
        }, (err, res) => {
          if (err) {
            logger.error('LDAP search error:', err);
            reject(err);
            return;
          }

          const users = [];
          
          res.on('searchEntry', (entry) => {
            const user = {
              dn: entry.dn,
              attributes: entry.attributes
            };
            users.push(user);
          });

          res.on('error', (err) => {
            logger.error('LDAP search response error:', err);
            reject(err);
          });

          res.on('end', () => {
            logger.info(`LDAP search completed, found ${users.length} users`);
            resolve(users);
          });
        });
      });
    } catch (error) {
      logger.error('LDAP search error:', error);
      throw error;
    }
  }

  async syncUnitsFromLDAP() {
    try {
      await this.connect();
      
      // Try to search for organizational units in LDAP
      let ldapUnits = [];
      try {
        ldapUnits = await this.searchUsers(
          '(objectClass=organizationalUnit)',
          ['ou', 'name', 'description', 'distinguishedName']
        );
        logger.info(`Found ${ldapUnits.length} organizational units in LDAP`);
      } catch (searchError) {
        logger.warn('LDAP unit search failed, skipping unit sync:', searchError);
        return { success: false, count: 0, error: 'Search failed' };
      }

      // Process each unit
      for (const ldapUnit of ldapUnits) {
        try {
          const unitName = this.getAttributeValue(ldapUnit.attributes, 'ou') || 
                          this.getAttributeValue(ldapUnit.attributes, 'name');
          const description = this.getAttributeValue(ldapUnit.attributes, 'description');
          const dn = this.getAttributeValue(ldapUnit.attributes, 'distinguishedName');
          
          if (unitName && dn) {
            await this.upsertUnit(unitName, description, dn);
          }
        } catch (unitError) {
          logger.error(`Failed to process unit ${ldapUnit.dn}:`, unitError);
        }
      }

      logger.info('LDAP unit sync completed successfully');
      return { success: true, count: ldapUnits.length };
    } catch (error) {
      logger.error('LDAP unit sync failed:', error);
      throw error;
    } finally {
      if (this.client) {
        this.client.unbind();
        this.client.destroy();
      }
    }
  }

  getAttributeValue(attributes, name) {
    const attr = attributes.find(a => a.name === name);
    return attr ? attr.values[0] : null;
  }

  async upsertUnit(unitName, description, ldapDN) {
    try {
      // Generate unit code from name
      const unitCode = unitName.toUpperCase().replace(/\s+/g, '-');
      
      // Check if unit exists
      const existingUnit = await this.db('unit_bidang')
        .where('ldap_dn', ldapDN)
        .orWhere('kode', unitCode)
        .first();

      if (existingUnit) {
        // Update existing unit
        await this.db('unit_bidang')
          .where('id', existingUnit.id)
          .update({
            nama: unitName,
            deskripsi: description,
            ldap_dn: ldapDN,
            updated_at: new Date()
          });
        
        logger.info(`Updated existing unit: ${unitName}`);
      } else {
        // Create new unit
        await this.db('unit_bidang').insert({
          id: require('crypto').randomUUID(),
          kode: unitCode,
          nama: unitName,
          deskripsi: description,
          ldap_dn: ldapDN,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        logger.info(`Created new unit: ${unitName}`);
      }
    } catch (error) {
      logger.error(`Failed to upsert unit ${unitName}:`, error);
      throw error;
    }
  }

  async getUserUnit(userDN, username = null, department = null) {
    try {
      // Method 1: Extract unit from user's DN (prioritize first OU)
      if (userDN) {
        const dnParts = userDN.split(',');
        const ouParts = [];

        // Collect all OU parts
        for (const part of dnParts) {
          if (part.trim().startsWith('OU=')) {
            ouParts.push(part.trim().substring(3));
          }
        }

        // Try to match OU parts in order (first OU has highest priority)
        for (const ouName of ouParts) {
          // Skip generic OUs like BATAM, JAKARTA, etc
          if (ouName.toLowerCase() === 'batam' || ouName.toLowerCase() === 'jakarta') {
            continue;
          }

          // Try exact match first
          let unit = await this.db('unit_bidang')
            .whereRaw('LOWER(nama) = LOWER(?)', [ouName])
            .first();

          // If no exact match, try partial match
          if (!unit) {
            unit = await this.db('unit_bidang')
              .where('nama', 'like', `%${ouName}%`)
              .orWhere('ldap_dn', 'like', `%${ouName}%`)
              .first();
          }

          if (unit) {
            logger.info(`LDAP auto-mapping: ${username || 'user'} → ${unit.nama} (from OU: ${ouName})`);
            return unit;
          }
        }
      }

      // Method 2: Map by department if available
      if (department) {
        const unit = await this.db('unit_bidang')
          .where('nama', 'like', `%${department}%`)
          .orWhere('deskripsi', 'like', `%${department}%`)
          .first();

        if (unit) {
          logger.info(`LDAP auto-mapping: ${username || 'user'} → ${unit.nama} (from department: ${department})`);
          return unit;
        }
      }

      // Method 3: Default fallback for non-LDAP users → assign to TEST unit
      if (!userDN) {
        const testUnit = await this.db('unit_bidang')
          .where('kode', 'TEST-UNIT')
          .orWhere('nama', 'like', '%Test%')
          .first();

        if (testUnit) {
          logger.info(`Non-LDAP user ${username || 'user'} → ${testUnit.nama} (default test unit)`);
          return testUnit;
        }
      }

      // If no mapping found, return null (user will have no unit assignment)
      logger.warn(`No unit mapping found for user: ${username || 'unknown'}, DN: ${userDN || 'none'}`);
      return null;
    } catch (error) {
      logger.error(`Failed to get user unit from DN ${userDN}:`, error);
      return null;
    }
  }

  async authenticateUser(username, password) {
    try {
      await this.connect();
      await this.bind(username, password);
      
      // Clean username for search
      const cleanUsername = username.includes('@') ? username.split('@')[0] : username;
      
      // If bind successful, get user details
      // Try to search for user, but handle search failures gracefully
      let users = [];
      try {
        users = await this.searchUsers(
          `(sAMAccountName=${cleanUsername})`,
          ['sAMAccountName', 'mail', 'displayName', 'cn', 'distinguishedName', 'department', 'ou']
        );
      } catch (searchError) {
        logger.warn('LDAP search failed, using bind-only authentication:', searchError);
        // If search fails but bind succeeded, create minimal user object
        // Try to map unit based on username
        let unit = null;
        try {
          unit = await this.getUserUnit(null, cleanUsername, null);
        } catch (unitError) {
          logger.warn('Failed to map unit for bind-only auth:', unitError);
        }
        
        return {
          username: cleanUsername,
          email: `${cleanUsername}@plnbatam.com`,
          name: username, // Use username as fallback name
          unit: unit,
          dn: null
        };
      }

      if (users.length > 0) {
        const user = users[0];
        const userDN = this.getAttributeValue(user.attributes, 'distinguishedName');
        let unit = null;
        
        // Try to get unit info, but don't fail if it doesn't work
        try {
          const department = this.getAttributeValue(user.attributes, 'department');
          const ou = this.getAttributeValue(user.attributes, 'ou');
          unit = await this.getUserUnit(userDN, username, department || ou);
        } catch (unitError) {
          logger.warn('Failed to get user unit, proceeding without unit info:', unitError);
        }
        
        return {
          username: this.getAttributeValue(user.attributes, 'sAMAccountName') || username,
          email: this.getAttributeValue(user.attributes, 'mail') || `${username}@plnbatam.com`,
          name: this.getAttributeValue(user.attributes, 'displayName') || 
                this.getAttributeValue(user.attributes, 'cn') || username,
          unit: unit,
          dn: userDN
        };
      }
      
      // If bind succeeded but no user found in search, return basic info
      // Try to map unit based on username
      let unit = null;
      try {
        unit = await this.getUserUnit(null, username, null);
      } catch (unitError) {
        logger.warn('Failed to map unit for no-search-result auth:', unitError);
      }
      
      return {
        username: username,
        email: `${username}@plnbatam.com`,
        name: username,
        unit: unit,
        dn: null
      };
    } catch (error) {
      logger.error('LDAP authentication failed:', error);
      return null;
    } finally {
      if (this.client) {
        this.client.unbind();
        this.client.destroy();
      }
    }
  }

  async createOrUpdateUserFromLDAP(ldapUserData) {
    try {
      const { username, email, name, unit, dn } = ldapUserData;
      
      // Check if user exists
      const existingUser = await this.db('users')
        .where('email', email)
        .orWhere('username', username)
        .first();

      // Determine role based on username
      const isAdmin = username === 'adminit' || username === 'admin test';
      
      const userData = {
        username: username,
        name: name || username,
        email: email,
        role: isAdmin ? 'admin' : 'user', // adminit and admin test are admin, others are user
        auth_provider: 'ldap',
        unit_bidang_id: unit ? unit.id : null,
        is_active: true,
        updated_at: new Date()
      };

      if (existingUser) {
        // Check if update is needed (only update if there are significant changes)
        const needsUpdate =
          existingUser.name !== (name || username) ||
          existingUser.unit_bidang_id !== (unit ? unit.id : null) ||
          !existingUser.is_active;

        if (needsUpdate) {
          // Update data WITHOUT changing role (preserve existing role)
          const updateData = {
            name: name || username,
            unit_bidang_id: unit ? unit.id : null,
            is_active: true,
            updated_at: new Date()
          };

          await this.db('users')
            .where('id', existingUser.id)
            .update(updateData);

          logger.info(`Updated existing LDAP user: ${username} → Unit: ${unit ? unit.nama : 'none'} (role preserved: ${existingUser.role})`);

          // Return updated user with existing role
          return { ...existingUser, ...updateData };
        } else {
          // No update needed, just return existing user
          logger.debug(`LDAP user ${username} login - no changes detected (role: ${existingUser.role}, unit: ${unit ? unit.nama : 'none'})`);
          return existingUser;
        }
      } else {
        // Create new user
        const newUserId = require('crypto').randomUUID();
        await this.db('users').insert({
          id: newUserId,
          ...userData,
          created_at: new Date()
        });
        
        logger.info(`Created new LDAP user: ${username}`);
        return { id: newUserId, ...userData };
      }
    } catch (error) {
      logger.error(`Failed to create/update user from LDAP:`, error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.connect();
      return true;
    } catch (error) {
      logger.error('LDAP connection test failed:', error);
      return false;
    } finally {
      if (this.client) {
        this.client.destroy();
      }
    }
  }
}

module.exports = new LDAPService();
