import { getAccessToken } from "../utils/vertex-auth.js";
import { getAuthUser } from "../utils/auth.js";

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
    const { gender, age, imageCount, faceShape, hairLength, hairTexture, hairColor, vibe } =
      await request.json();

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
1. The user will provide their age, gender, and optionally their face shape and preferences (length, color, texture, vibe).
2. If face shape is provided, use your elite expertise to recommend Asian-trending hairstyles that perfectly balance and flatter that specific face shape.
3. If preferences are provided, you MUST incorporate them into your recommendations. If any preference is missing, creatively invent a suitable one based on current Korean/Vietnamese trends.
4. Output a JSON array of exactly ${count} DISTINCT, highly trendy, real-life salon haircuts tailored to the user.
5. For each haircut, provide a detailed image generation prompt for a PHOTOREALISTIC image.
6. The prompt MUST follow this exact natural language format: "A realistic front-facing full-focus snapshot of a [age]-year-old Asian [gender] wearing [randomize a hot-trend 2026 Korean basic casual top/shirt that perfectly matches the hairstyle vibe, keep the outfit minimal and basic]. They have a [Haircut Name] haircut, [Color and Texture]. The photo is taken candidly in a [randomize everyday location: street, cafe, office, living room, park, etc., DO NOT always use hair salon] with natural lighting. The image is ultra-realistic with highly detailed facial features, natural skin texture, and a completely sharp background without any blurring or depth of field effects."
7. Do NOT use fantasy, anime, or 3D render styles. Emphasize "A realistic snapshot", "candid", "deep focus", "sharp background".
8. Return ONLY a valid JSON object with:
   - "analysis": A brief 2-sentence explanation of why these ${count} trendy Asian cuts suit the user's demographic and face shape. (in Vietnamese)
   - "prompts": An array of exactly ${count} English strings containing the image generation prompts.`;

    const response = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-001:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userPreferences }] }],
          generationConfig: {
            temperature: 0.7,
            response_mime_type: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from Gemini");

    const content = JSON.parse(text);

    return json(content);
  } catch (error) {
    console.error("Analyze API Error:", error);
    return json({ error: error.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
