import { getAuthUser } from "../../utils/auth.js";
import { listUsers } from "../../utils/db.js";

export async function onRequest(context) {
  const { request, env } = context;

  const payload = await getAuthUser(request, env);
  if (!payload || payload.role !== "admin") {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const users = await listUsers(env);
    return json({ users });
  } catch (error) {
    console.error("Admin list users error:", error);
    return json({ error: error.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
