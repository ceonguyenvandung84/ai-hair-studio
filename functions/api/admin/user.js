import { getAuthUser } from "../../utils/auth.js";
import { getUserById, updateUser } from "../../utils/db.js";

export async function onRequest(context) {
  const { request, env } = context;

  const payload = await getAuthUser(request, env);
  if (!payload || payload.role !== "admin") {
    return json({ error: "Unauthorized" }, 401);
  }

  if (request.method !== "PATCH") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { userId, role, daily_limit } = await request.json();

    if (!userId) {
      return json({ error: "userId is required" }, 400);
    }

    const existing = await getUserById(env, userId);
    if (!existing) {
      return json({ error: "User not found" }, 404);
    }

    const fields = {};
    if (role !== undefined) fields.role = role;
    if (daily_limit !== undefined) {
      const limit = parseInt(daily_limit);
      if (isNaN(limit) || limit < 0) {
        return json({ error: "Invalid daily_limit" }, 400);
      }
      fields.daily_limit = limit;
    }

    if (Object.keys(fields).length === 0) {
      return json({ error: "No fields to update" }, 400);
    }

    await updateUser(env, userId, fields);
    const updated = await getUserById(env, userId);

    return json({ user: updated });
  } catch (error) {
    console.error("Admin update user error:", error);
    return json({ error: error.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
