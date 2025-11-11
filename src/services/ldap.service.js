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
            // Detailed error logging to distinguish between different failure reasons
            const errorCode = err.code || err.name;
            const errorMsg = err.lde_message || err.message;

            logger.error(`LDAP bind failed for ${cleanUsername}:`, {
              code: errorCode,
              message: errorMsg,
              dn: userDN
            });

            // Check specific error types
            if (errorCode === 49 || errorMsg === 'Invalid Credentials') {
              // Error 49 = Invalid credentials (wrong password OR user doesn't exist)
              logger.warn(`⚠️  LDAP: Username "${cleanUsername}" atau password salah`);
              reject(new Error('Username atau password salah'));
            } else if (errorCode === 'ECONNREFUSED' || errorCode === 'ETIMEDOUT') {
              logger.error('❌ LDAP server tidak dapat dijangkau');
              reject(new Error('LDAP server tidak dapat dijangkau'));
            } else {
              reject(new Error('Invalid credentials'));
            }
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
        // IMPORTANT: Only map users from BATAM location
        const dnLower = userDN.toLowerCase();
        if (!dnLower.includes('batam')) {
          logger.info(`[LDAP Auto-Mapping] User ${username} is NOT from BATAM, skipping auto-mapping. DN: ${userDN}`);
          return null;
        }

        const dnParts = userDN.split(',');
        const ouParts = [];

        // Collect all OU parts (in order - first is most specific)
        for (const part of dnParts) {
          if (part.trim().startsWith('OU=')) {
            ouParts.push(part.trim().substring(3));
          }
        }

        logger.info(`[LDAP Auto-Mapping] User: ${username}, DN: ${userDN}`);
        logger.info(`[LDAP Auto-Mapping] OU Parts: ${JSON.stringify(ouParts)}`);

        // Try to match OU parts in order (first OU has highest priority)
        for (const ouName of ouParts) {
          // Skip generic location OUs (BATAM, JAKARTA, etc) and company name
          if (ouName.toLowerCase() === 'batam' ||
              ouName.toLowerCase() === 'jakarta' ||
              ouName.toLowerCase() === 'plnbatam' ||
              ouName.toLowerCase().includes('provinsi') ||
              ouName.toLowerCase().includes('region')) {
            logger.debug(`[LDAP Auto-Mapping] Skipping generic/location OU: ${ouName}`);
            continue;
          }

          logger.info(`[LDAP Auto-Mapping] Trying to match OU: "${ouName}"`);

          // Try exact match first
          let unit = await this.db('unit_bidang')
            .whereRaw('LOWER(nama) = LOWER(?)', [ouName])
            .first();

          if (unit) {
            logger.info(`✅ LDAP auto-mapping SUCCESS (exact): ${username} → ${unit.nama} (from OU: ${ouName})`);
            return unit;
          }

          // Try partial match with better logic
          // Match if OU name contains unit name OR unit name contains OU name
          const units = await this.db('unit_bidang')
            .where('is_active', true)
            .select('*');

          for (const candidateUnit of units) {
            const unitNameLower = candidateUnit.nama.toLowerCase();
            const ouNameLower = ouName.toLowerCase();

            // Check if they match (either direction)
            if (unitNameLower.includes(ouNameLower) || ouNameLower.includes(unitNameLower)) {
              logger.info(`✅ LDAP auto-mapping SUCCESS (partial): ${username} → ${candidateUnit.nama} (from OU: ${ouName})`);
              return candidateUnit;
            }

            // Also try matching with kode
            const kodeLower = candidateUnit.kode.toLowerCase().replace(/-/g, ' ');
            if (kodeLower.includes(ouNameLower) || ouNameLower.includes(kodeLower)) {
              logger.info(`✅ LDAP auto-mapping SUCCESS (kode): ${username} → ${candidateUnit.nama} (from OU: ${ouName})`);
              return candidateUnit;
            }
          }

          logger.debug(`[LDAP Auto-Mapping] No match found for OU: "${ouName}"`);
        }
      }

      // Method 2: Map by department if available
      if (department) {
        logger.info(`[LDAP Auto-Mapping] Trying department: ${department}`);
        const unit = await this.db('unit_bidang')
          .where('nama', 'like', `%${department}%`)
          .orWhere('deskripsi', 'like', `%${department}%`)
          .first();

        if (unit) {
          logger.info(`✅ LDAP auto-mapping SUCCESS (department): ${username} → ${unit.nama} (from department: ${department})`);
          return unit;
        }
      }

      // If no mapping found, return null (DO NOT assign to TEST unit automatically)
      logger.warn(`❌ No unit mapping found for user: ${username || 'unknown'}, DN: ${userDN || 'none'}`);
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

      logger.info(`[LDAP Auth] User ${cleanUsername} bind successful, attempting to get DN...`);

      // After successful bind, user can search for themselves
      // Try to search for user, but handle search failures gracefully
      let users = [];
      try {
        logger.info(`[LDAP Auth] Searching for user: (sAMAccountName=${cleanUsername})`);

        // If username contains spaces, try multiple search patterns
        let searchFilter;
        if (cleanUsername.includes(' ')) {
          // For usernames with spaces like "admin test", try multiple patterns:
          // 1. Original with spaces
          // 2. With dots: admin.test
          // 3. Without spaces: admintest
          // 4. Search by displayName or cn instead
          const withDots = cleanUsername.replace(/ /g, '.');
          const withoutSpaces = cleanUsername.replace(/ /g, '');

          searchFilter = `(|(sAMAccountName=${cleanUsername})(sAMAccountName=${withDots})(sAMAccountName=${withoutSpaces})(cn=${cleanUsername})(displayName=${cleanUsername}))`;
          logger.info(`[LDAP Auth] Username has spaces, using multi-pattern search: ${searchFilter}`);
        } else {
          searchFilter = `(sAMAccountName=${cleanUsername})`;
        }

        users = await this.searchUsers(
          searchFilter,
          ['sAMAccountName', 'mail', 'displayName', 'cn', 'distinguishedName', 'department', 'ou', 'memberOf']
        );
        logger.info(`[LDAP Auth] Search completed, found ${users.length} users`);
      } catch (searchError) {
        logger.error('[LDAP Auth] Search failed after bind:', searchError.message);
        logger.error('[LDAP Auth] Search error details:', searchError);

        // If search fails but bind succeeded, we cannot get DN -> cannot auto-map
        logger.warn('⚠️  LDAP search failed -> Cannot auto-map unit (DN not available)');
        logger.warn('⚠️  User will need manual unit assignment');

        return {
          username: cleanUsername,
          email: `${cleanUsername}@plnbatam.com`,
          name: cleanUsername,
          unit: null,
          dn: null
        };
      }

      if (users.length > 0) {
        const user = users[0];

        // Debug: Log all attributes received
        logger.info('[LDAP Auth] User attributes received (raw):');
        user.attributes.forEach((attr, index) => {
          // Handle both array and object format
          const attrType = attr.type || attr.name || attr._type || `attr${index}`;
          const attrVals = attr.values || attr._vals || (Array.isArray(attr) ? attr : [attr]);
          const attrVal = Array.isArray(attrVals) ? attrVals[0] : attrVals;
          logger.info(`  [${index}] ${attrType}: ${attrVal}`);
        });

        // Try different ways to get DN
        let userDN = this.getAttributeValue(user.attributes, 'distinguishedName');

        if (!userDN) {
          // Try using dn from entry object
          userDN = user.dn || user.objectName;
        }

        if (!userDN) {
          // Try to find DN by pattern matching in values
          for (const attr of user.attributes) {
            const vals = attr.values || attr._vals || [];
            for (const val of vals) {
              if (typeof val === 'string' && val.includes('CN=') && val.includes('DC=plnbatam')) {
                userDN = val;
                logger.info(`[LDAP Auth] Found DN by pattern matching: ${userDN}`);
                break;
              }
            }
            if (userDN) break;
          }
        }

        // Ensure DN is string (handle DN object from ldapjs)
        if (userDN && typeof userDN !== 'string') {
          userDN = userDN.toString();
        }

        logger.info(`[LDAP Auth] Final extracted DN (string): ${userDN || 'NULL'}`);

        if (!userDN) {
          logger.error('[LDAP Auth] ⚠️  distinguishedName not found in LDAP attributes!');
          logger.error('[LDAP Auth] ⚠️  Cannot auto-map unit without DN');
        }

        let unit = null;

        // Try to get unit info
        try {
          const department = this.getAttributeValue(user.attributes, 'department');
          const ou = this.getAttributeValue(user.attributes, 'ou');
          logger.info(`[LDAP Auth] Department: ${department || 'null'}, OU attr: ${ou || 'null'}`);

          unit = await this.getUserUnit(userDN, username, department || ou);
        } catch (unitError) {
          logger.warn('Failed to get user unit:', unitError.message);
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

      // Determine role based on username OR unit
      const isAdminByUsername = username === 'adminit' || username === 'admin test';

      // IMPORTANT: Users from SEKPER (Sekretariat Perusahaan) are automatically admin
      const isAdminByUnit = unit && (
        unit.kode === 'SEKRETARIAT-PERUSAHAAN' ||
        unit.nama.toLowerCase().includes('sekretariat perusahaan') ||
        unit.nama.toLowerCase().includes('sekper')
      );

      const isAdmin = isAdminByUsername || isAdminByUnit;

      if (isAdminByUnit) {
        logger.info(`🔑 User ${username} is from SEKPER → auto-assigned ADMIN role`);
      }

      const userData = {
        username: username,
        name: name || username,
        email: email,
        role: isAdmin ? 'admin' : 'user',
        auth_provider: 'ldap',
        unit_bidang_id: unit ? unit.id : null,
        is_active: true,
        updated_at: new Date()
      };

      if (existingUser) {
        // IMPORTANT: For existing users, preserve their role (Bug #15 fix)
        // Only update name, email, and unit - DO NOT change role
        const needsUpdate =
          existingUser.name !== (name || username) ||
          existingUser.unit_bidang_id !== (unit ? unit.id : null) ||
          !existingUser.is_active;

        if (needsUpdate) {
          // Update data WITHOUT changing role (preserve existing role)
          const updateData = {
            name: name || username,
            email: email, // Update email if changed
            unit_bidang_id: unit ? unit.id : null,
            // role: PRESERVE EXISTING - DO NOT UPDATE
            is_active: true,
            updated_at: new Date()
          };

          await this.db('users')
            .where('id', existingUser.id)
            .update(updateData);

          logger.info(`Updated existing LDAP user: ${username} → Unit: ${unit ? unit.nama : 'none'}, Role: ${existingUser.role} (PRESERVED)`);

          // Return updated user with PRESERVED role
          return { ...existingUser, ...updateData, role: existingUser.role };
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
