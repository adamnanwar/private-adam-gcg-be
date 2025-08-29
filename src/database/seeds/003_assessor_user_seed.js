/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Check if assessor user already exists
  const existingUser = await knex('users')
    .where('email', 'assessor@test.com')
    .first();

  if (!existingUser) {
    // Create assessor user
    await knex('users').insert({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Dev Assessor',
      email: 'assessor@test.com',
      password_hash: null, // No password for dev
      role: 'assessor',
      auth_provider: 'local',
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log('Assessor user created successfully');
  } else {
    console.log('Assessor user already exists');
  }
};

