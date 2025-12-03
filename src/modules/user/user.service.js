const { getConnection } = require('../../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class UserService {
  async getAllUsers(page = 1, limit = 50, filters = {}) {
    try {
      const db = getConnection();
      let query = db('users')
        .select(
          'users.id',
          'users.username',
          'users.name',
          'users.email',
          'users.role',
          'users.auth_provider',
          'users.unit_bidang_id',
          'users.is_active',
          'users.created_at',
          'users.updated_at',
          'unit_bidang.id as unit_id',
          'unit_bidang.kode as unit_kode',
          'unit_bidang.nama as unit_nama'
        )
        .leftJoin('unit_bidang', 'users.unit_bidang_id', 'unit_bidang.id')
        .where('users.is_active', true);

      // Apply filters
      if (filters.search) {
        query = query.where(function() {
          this.where('users.name', 'ilike', `%${filters.search}%`)
              .orWhere('users.email', 'ilike', `%${filters.search}%`);
        });
      }

      if (filters.role && filters.role.length > 0) {
        query = query.whereIn('users.role', filters.role);
      }

      if (filters.auth_provider && filters.auth_provider.length > 0) {
        query = query.whereIn('users.auth_provider', filters.auth_provider);
      }

      // Get total count
      const totalQuery = query.clone().clearSelect().count('users.id as count');
      const total = await totalQuery.first();

      // Apply pagination
      const offset = (page - 1) * limit;
      const users = await query
        .orderBy('users.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Transform users to include unit information
      const transformedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        auth_provider: user.auth_provider,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        unit: user.unit_id ? {
          id: user.unit_id,
          kode: user.unit_kode,
          nama: user.unit_nama
        } : null
      }));

      return {
        data: transformedUsers,
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
      const db = getConnection();
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
      const db = getConnection();
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
      const db = getConnection();
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

      // Prepare update data - exclude password field
      const { password, ...dataWithoutPassword } = userData;
      const updateData = {
        ...dataWithoutPassword,
        updated_at: new Date().toISOString()
      };

      // Hash and update password only if provided and not empty
      if (password && password.trim() !== '' && userData.auth_provider === 'local') {
        updateData.password_hash = await bcrypt.hash(password, 10);
      }

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
      const db = getConnection();
      const deleted = await db('users').where('id', id).del();
      return deleted > 0;
    } catch (error) {
      throw error;
    }
  }

  async getUserStats() {
    try {
      const db = getConnection();
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

