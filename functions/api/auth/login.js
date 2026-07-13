import { verifyPassword, signJWT } from "../../utils/auth.js";
import { getUserByEmail } from "../../utils/db.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ error: "Email and password are required" }, 400);
    }

    const user = await getUserByEmail(env, email);
    if (!user) {
      return json({ error: "Invalid email or password" }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return json({ error: "Invalid email or password" }, 401);
    }

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
    console.error("Login error:", error);
    return json({ error: error.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
