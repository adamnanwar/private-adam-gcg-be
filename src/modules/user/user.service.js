const { db } = require('../../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class UserService {
  async getAllUsers(page = 1, limit = 50, filters = {}) {
    try {
      let query = db('users').select('*');

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('name', 'ilike', `%${filters.search}%`)
              .orWhere('email', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.role && filters.role.length > 0) {
        query = query.whereIn('role', filters.role);
      }

      if (filters.auth_provider && filters.auth_provider.length > 0) {
        query = query.whereIn('auth_provider', filters.auth_provider);
      }

      // Get total count
      const totalQuery = query.clone();
      const total = await totalQuery.count('* as count').first();

      // Apply pagination
      const offset = (page - 1) * limit;
      const users = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Remove password hashes from response
      const sanitizedUsers = users.map(user => {
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return {
        data: sanitizedUsers,
        pagination: {
          total: parseInt(total.count),
          page,
          limit,
          pages: Math.ceil(parseInt(total.count) / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const user = await db('users')
        .select('id', 'name', 'email', 'role', 'auth_provider', 'created_at', 'updated_at')
        .where('id', id)
        .first();

      return user;
    } catch (error) {
      throw error;
    }
  }

  async createUser(userData, createdBy) {
    try {
      // Check if email already exists
      const existingUser = await db('users').where('email', userData.email).first();
      if (existingUser) {
        const error = new Error('Email already exists');
        error.code = 'DUPLICATE_EMAIL';
        throw error;
      }

      const userId = uuidv4();
      const now = new Date().toISOString();

      const userToCreate = {
        id: userId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        auth_provider: userData.auth_provider || 'local',
        created_at: now,
        updated_at: now
      };

      // Hash password if provided (for local users)
      if (userData.password && userData.auth_provider === 'local') {
        userToCreate.password_hash = await bcrypt.hash(userData.password, 10);
      }

      await db('users').insert(userToCreate);

      // Return user without password hash
      const { password_hash, ...userWithoutPassword } = userToCreate;
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(id, userData, updatedBy) {
    try {
      // Check if user exists
      const existingUser = await db('users').where('id', id).first();
      if (!existingUser) {
        return null;
      }

      // Check if email already exists for other users
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await db('users')
          .where('email', userData.email)
          .where('id', '!=', id)
          .first();
        
        if (emailExists) {
          const error = new Error('Email already exists');
          error.code = 'DUPLICATE_EMAIL';
          throw error;
        }
      }

      const updateData = {
        ...userData,
        updated_at: new Date().toISOString()
      };

      await db('users').where('id', id).update(updateData);

      // Return updated user without password hash
      const updatedUser = await this.getUserById(id);
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const deleted = await db('users').where('id', id).del();
      return deleted > 0;
    } catch (error) {
      throw error;
    }
  }

  async getUserStats() {
    try {
      const stats = await db('users')
        .select('role')
        .count('* as count')
        .groupBy('role');

      const totalUsers = await db('users').count('* as count').first();

      const roleStats = stats.reduce((acc, stat) => {
        acc[stat.role] = parseInt(stat.count);
        return acc;
      }, {});

      return {
        total: parseInt(totalUsers.count),
        by_role: roleStats
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();

