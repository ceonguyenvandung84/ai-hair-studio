import { getAuthUser } from "../../utils/auth.js";
import { getUserById } from "../../utils/db.js";

export async function onRequest(context) {
  const { request, env } = context;

  try {
    const payload = await getAuthUser(request, env);
    if (!payload) {
      return json({ error: "Unauthorized" }, 401);
    }

    const user = await getUserById(env, payload.id);
    if (!user) {
      return json({ error: "User not found" }, 404);
    }

    return json({ user });
  } catch (error) {
    console.error("Me error:", error);
    return json({ error: error.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
