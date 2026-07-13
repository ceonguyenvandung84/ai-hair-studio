// Cloudflare Pages Advanced Mode - Single Worker Entry Point
// Handles all API routes

import { getAccessToken } from "./functions/utils/vertex-auth.js";
import { getAuthUser, hashPassword, verifyPassword, signJWT } from "./functions/utils/auth.js";
import { getUserByEmail, getUserById, createUser, updateUserCredits, updateUser, listUsers } from "./functions/utils/db.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getPath(request) {
  return new URL(request.url).pathname;
}

// ========== AUTH ROUTES ==========

async function handleRegister(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { email, name, password } = await request.json();
    if (!email || !name || !password) return json({ error: "Email, name, and password are required" }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
    const existing = await getUserByEmail(env, email);
    if (existing) return json({ error: "Email already registered" }, 409);
    const password_hash = await hashPassword(password);
    const id = crypto.randomUUID();
    const user = await createUser(env, { id, email, name, password_hash });
    const token = await signJWT({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET);
    return json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, daily_limit: user.daily_limit, credits_used: user.credits_used } });
  } catch (e) { return json({ error: e.message }, 500); }
}

async function handleLogin(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { email, password } = await request.json();
    if (!email || !password) return json({ error: "Email and password are required" }, 400);
    const user = await getUserByEmail(env, email);
    if (!user) return json({ error: "Invalid email or password" }, 401);
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return json({ error: "Invalid email or password" }, 401);
    const token = await signJWT({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET);
    return json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, daily_limit: user.daily_limit, credits_used: user.credits_used } });
  } catch (e) { return json({ error: e.message }, 500); }
}

async function handleMe(request, env) {
  try {
    const payload = await getAuthUser(request, env);
    if (!payload) return json({ error: "Unauthorized" }, 401);
    const user = await getUserById(env, payload.id);
    if (!user) return json({ error: "User not found" }, 404);
    return json({ user });
  } catch (e) { return json({ error: e.message }, 500); }
}

// ========== ANALYZE ROUTE ==========

async function handleAnalyze(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = await getAuthUser(request, env);
  if (!auth) return json({ error: "Unauthorized" }, 401);
  try {
    const { gender, age, imageCount, faceShape, hairLength, hairTexture, hairColor, vibe, photoBase64 } = await request.json();
    const token = await getAccessToken(env);
    const projectId = JSON.parse(env.GOOGLE_SA_KEY).project_id;
    const count = parseInt(imageCount) || 4;
    let userPreferences = `Gender: ${gender}, Age: ${age}`;
    if (faceShape) userPreferences += `, Face Shape: ${faceShape}`;
    if (hairLength) userPreferences += `, Preferred Length: ${hairLength}`;
    if (hairTexture) userPreferences += `, Preferred Texture: ${hairTexture}`;
    if (hairColor) userPreferences += `, Preferred Color: ${hairColor}`;
    if (vibe) userPreferences += `, Preferred Vibe: ${vibe}`;
    const systemPrompt = `You are an elite Asian master hairstylist in 2026, an absolute expert in the latest, hottest, and most eye-catching hair trends across Asia, specifically focusing on Korean (K-beauty) and Vietnamese styles. 
1. The user will provide their age, gender, a photo of their face, and optionally their face shape and preferences (length, color, texture, vibe).
2. Analyze the user's face from the photo - determine face shape, skin tone, current hairstyle, and facial features.
3. If face shape is provided, validate it against the photo and use your expertise to recommend Asian-trending hairstyles that balance and flatter that face shape.
4. If preferences are provided, incorporate them. If any preference is missing, invent a suitable one based on current Korean/Vietnamese trends.
5. Output a JSON array of exactly ${count} DISTINCT, highly trendy, real-life salon haircuts tailored to the user.
6. For each haircut, provide a detailed image generation prompt for a PHOTOREALISTIC image. The prompt MUST describe a person with the SAME face, skin tone, and facial features from the provided photo, but with the new hairstyle applied.
7. The prompt should describe a realistic front-facing snapshot with specific hairstyle, color, texture, outfit, location, and lighting.
8. Do NOT use fantasy, anime, or 3D render styles. Emphasize "realistic", "candid", "deep focus".
9. Return ONLY a valid JSON object with:
   - "analysis": A brief 2-sentence explanation in Vietnamese summarizing the face analysis and recommendations.
   - "face_analysis": A brief description of the detected face shape and features.
   - "prompts": An array of exactly ${count} English strings containing the image generation prompts.`;
    const parts = [{ text: systemPrompt + "\n\n" + userPreferences }];
    if (photoBase64) {
      const mimeMatch = photoBase64.match(/^data:(image\/\w+);base64,/);
      if (mimeMatch) parts.push({ inlineData: { mimeType: mimeMatch[1], data: photoBase64.split(",")[1] } });
    }
    let response = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
      }),
    });
    // Fallback: nếu ảnh không hợp lệ, thử lại text-only
    if (!response.ok && photoBase64) {
      const fallback = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userPreferences }] }],
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
        }),
      });
      if (fallback.ok) response = fallback;
    }
    if (!response.ok) { const errText = await response.text(); throw new Error(`Gemini API error: ${response.status} ${errText}`); }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from Gemini");
    return json(JSON.parse(text));
  } catch (e) { return json({ error: e.message }, 500); }
}

// ========== GENERATE ROUTE ==========

async function handleGenerate(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = await getAuthUser(request, env);
  if (!auth) return json({ error: "Unauthorized" }, 401);
  try {
    const { prompt, aspectRatio, photoBase64, _skipUserCheck, _creditsUsed, _lastResetStr, _dailyLimit } = await request.json();
    let creditsUsed, lastResetStr, dailyLimit;
    if (_skipUserCheck && _creditsUsed !== undefined) {
      creditsUsed = _creditsUsed;
      lastResetStr = _lastResetStr;
      dailyLimit = _dailyLimit;
    } else {
      const user = await getUserById(env, auth.id);
      if (!user) return json({ error: "User not found" }, 404);
      dailyLimit = user.daily_limit;
      const now = new Date().toISOString();
      lastResetStr = user.last_reset;
      const lastReset = new Date(user.last_reset + "Z");
      const hoursSinceReset = (Date.now() - lastReset.getTime()) / 3600000;
      creditsUsed = user.credits_used;
      if (hoursSinceReset >= 24) { creditsUsed = 0; lastResetStr = now; }
      if (creditsUsed >= dailyLimit) {
        const resetIn = Math.ceil(24 - hoursSinceReset);
        return json({ error: `Hết credit. Quay lại sau ${resetIn > 0 ? resetIn + " giờ" : "24 giờ"}.`, credits_remaining: 0, daily_limit: dailyLimit }, 429);
      }
    }
    const token = await getAccessToken(env);
    const projectId = JSON.parse(env.GOOGLE_SA_KEY).project_id;
    let aspectRatioStr = "9:16";
    if (aspectRatio === "1:1") aspectRatioStr = "1:1";
    else if (aspectRatio === "16:9") aspectRatioStr = "16:9";
    let imageUrl = null;

    const parts = [{ text: `Generate a photorealistic image of a person matching this description: ${prompt}. IMPORTANT: Keep the person's face identity, skin tone, and facial features exactly the same as in the reference photo, only change the hairstyle.` }];
    if (photoBase64) {
      const mimeMatch = photoBase64.match(/^data:(image\/\w+);base64,/);
      if (mimeMatch) parts.push({ inlineData: { mimeType: mimeMatch[1], data: photoBase64.split(",")[1] } });
    }
    let geminiRes;
    for (let attempt = 0; attempt < 4; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      try {
        geminiRes = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.3,
              candidateCount: 1,
              maxOutputTokens: 8192,
              responseModalities: ["IMAGE", "TEXT"],
              imageConfig: { aspectRatio: aspectRatioStr },
            },
          }),
        });
      } finally { clearTimeout(timeout); }
      if (geminiRes.status === 429) {
        const base = Math.pow(2, attempt + 1) * 1000;
        const jitter = Math.floor(Math.random() * 2000);
        await new Promise(r => setTimeout(r, base + jitter));
        continue;
      }
      break;
    }
    if (geminiRes.ok) {
      const geminiData = await geminiRes.json();
      const parts = geminiData.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith("image/")) { imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; break; }
      }
    } else { const errText = await geminiRes.text(); throw new Error(`Gemini 2.5 Flash Image failed: ${geminiRes.status} ${errText}`); }
    if (!imageUrl) throw new Error("Gemini 2.5 Flash Image returned no image");
    creditsUsed += 1;
    await updateUserCredits(env, auth.id, creditsUsed, lastResetStr);
    return json({ url: imageUrl, credits_remaining: dailyLimit - creditsUsed, daily_limit: dailyLimit });
  } catch (e) { return json({ error: e.message }, 500); }
}

// ========== ADMIN ROUTES ==========

async function handleAdminUsers(request, env) {
  const auth = await getAuthUser(request, env);
  if (!auth || auth.role !== "admin") return json({ error: "Unauthorized" }, 401);
  try { const users = await listUsers(env); return json({ users }); }
  catch (e) { return json({ error: e.message }, 500); }
}

async function handleAdminUser(request, env) {
  const auth = await getAuthUser(request, env);
  if (!auth || auth.role !== "admin") return json({ error: "Unauthorized" }, 401);
  if (request.method !== "PATCH") return json({ error: "Method not allowed" }, 405);
  try {
    const { userId, email, role, daily_limit } = await request.json();
    if (!userId && !email) return json({ error: "userId or email is required" }, 400);
    let existing = userId ? await getUserById(env, userId) : null;
    if (!existing && email) existing = await getUserByEmail(env, email);
    if (!existing) return json({ error: "User not found" }, 404);
    const fields = {};
    if (role !== undefined) fields.role = role;
    if (daily_limit !== undefined) { const limit = parseInt(daily_limit); if (isNaN(limit) || limit < 0) return json({ error: "Invalid daily_limit" }, 400); fields.daily_limit = limit; }
    if (Object.keys(fields).length === 0) return json({ error: "No fields to update" }, 400);
    await updateUser(env, existing.id, fields);
    const updated = await getUserById(env, existing.id);
    return json({ user: updated });
  } catch (e) { return json({ error: e.message }, 500); }
}

// ========== MAIN ROUTER ==========

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case "/api/auth/register": return await handleRegister(request, env);
        case "/api/auth/login": return await handleLogin(request, env);
        case "/api/auth/me": return await handleMe(request, env);
        case "/api/analyze": return await handleAnalyze(request, env);
        case "/api/generate": return await handleGenerate(request, env);
        case "/api/admin/users": return await handleAdminUsers(request, env);
        case "/api/admin/user": return await handleAdminUser(request, env);
        default:
          if (path.startsWith("/api/")) return new Response("Not Found", { status: 404 });
          return env.ASSETS.fetch(request);
      }
    } catch (e) {
      if (!path.startsWith("/api/") && env.ASSETS) return env.ASSETS.fetch(request);
      return json({ error: e.message }, 500);
    }
  },
};
