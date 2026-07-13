import { hashPassword, signJWT } from "../../utils/auth.js";
import { getUserByEmail, createUser } from "../../utils/db.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { email, name, password } = await request.json();

    if (!email || !name || !password) {
      return json({ error: "Email, name, and password are required" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Password must be at least 6 characters" }, 400);
    }

    const existing = await getUserByEmail(env, email);
    if (existing) {
      return json({ error: "Email already registered" }, 409);
    }

    const password_hash = await hashPassword(password);
    const id = crypto.randomUUID();

    const user = await createUser(env, { id, email, name, password_hash });
    const token = await signJWT({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET);

    return json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        daily_limit: user.daily_limit,
        credits_used: user.credits_used,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return json({ error: error.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
