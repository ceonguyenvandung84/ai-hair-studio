export async function getUserByEmail(env, email) {
  const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).all();
  return results[0] || null;
}

export async function getUserById(env, id) {
  const { results } = await env.DB.prepare("SELECT id, email, name, role, daily_limit, credits_used, last_reset, created_at FROM users WHERE id = ?").bind(id).all();
  return results[0] || null;
}

export async function createUser(env, { id, email, name, password_hash }) {
  await env.DB.prepare(
    "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)"
  ).bind(id, email, name, password_hash).run();
  return getUserById(env, id);
}

export async function updateUserCredits(env, id, creditsUsed, lastReset) {
  await env.DB.prepare(
    "UPDATE users SET credits_used = ?, last_reset = ? WHERE id = ?"
  ).bind(creditsUsed, lastReset, id).run();
}

export async function updateUser(env, id, fields) {
  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = ?`);
    values.push(value);
  }
  values.push(id);

  await env.DB.prepare(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`
  ).bind(...values).run();
}

export async function listUsers(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, email, name, role, daily_limit, credits_used, last_reset, created_at FROM users ORDER BY created_at DESC"
  ).all();
  return results;
}
