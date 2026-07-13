import { getAccessToken } from "../utils/vertex-auth.js";
import { getAuthUser } from "../utils/auth.js";
import { getUserById, updateUserCredits } from "../utils/db.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = await getAuthUser(request, env);
  if (!auth) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    // Check credits
    const user = await getUserById(env, auth.id);
    if (!user) {
      return json({ error: "User not found" }, 404);
    }

    const now = new Date().toISOString();
    const lastReset = new Date(user.last_reset + "Z");
    const hoursSinceReset = (Date.now() - lastReset.getTime()) / 3600000;

    let creditsUsed = user.credits_used;
    let lastResetStr = user.last_reset;

    // Reset credits if > 24h since last reset
    if (hoursSinceReset >= 24) {
      creditsUsed = 0;
      lastResetStr = now;
    }

    if (creditsUsed >= user.daily_limit) {
      const resetIn = Math.ceil(24 - hoursSinceReset);
      return json({
        error: `Bạn đã hết credit hôm nay. Quay lại sau ${resetIn > 0 ? resetIn + " giờ" : "24 giờ"}.`,
        credits_remaining: 0,
        daily_limit: user.daily_limit,
      }, 429);
    }

    const { prompt, aspectRatio } = await request.json();
    const token = await getAccessToken(env);
    const projectId = JSON.parse(env.GOOGLE_SA_KEY).project_id;

    let aspectRatioStr = "9:16";
    if (aspectRatio === "1:1") aspectRatioStr = "1:1";
    else if (aspectRatio === "16:9") aspectRatioStr = "16:9";

    let imageUrl = null;

    // === TRY IMAGEN 3 ===
    try {
      const imagenRes = await fetch(
        `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { aspectRatio: aspectRatioStr, sampleCount: 1 },
          }),
        }
      );

      if (imagenRes.ok) {
        const data = await imagenRes.json();
        const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
        if (base64Image) {
          imageUrl = `data:image/png;base64,${base64Image}`;
        }
      } else {
        console.warn(`Imagen 3 failed (${imagenRes.status}), falling back to Gemini`);
      }
    } catch (imagenErr) {
      console.warn("Imagen 3 error:", imagenErr.message);
    }

    // === FALLBACK: GEMINI 2.0 FLASH ===
    if (!imageUrl) {
      const geminiRes = await fetch(
        `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash-exp:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `Generate a photorealistic image of a person with this description: ${prompt}` }],
              },
            ],
            generationConfig: { responseModalities: ["Text", "Image"] },
          }),
        }
      );

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const parts = geminiData.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith("image/")) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      } else {
        const errText = await geminiRes.text();
        console.error(`Gemini fallback failed: ${geminiRes.status} ${errText}`);
      }
    }

    if (!imageUrl) {
      throw new Error("Both Imagen 3 and Gemini failed to generate image");
    }

    // Deduct credit
    creditsUsed += 1;
    await updateUserCredits(env, auth.id, creditsUsed, lastResetStr);

    return json({
      url: imageUrl,
      credits_remaining: user.daily_limit - creditsUsed,
      daily_limit: user.daily_limit,
    });
  } catch (error) {
    console.error("Generate API Error:", error);
    return json({ error: error.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
