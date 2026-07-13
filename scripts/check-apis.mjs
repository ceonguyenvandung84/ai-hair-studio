import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function base64UrlEncode(str) {
  return Buffer.from(str).toString("base64url");
}

async function rsaSign(data, pemPrivateKey) {
  const pemContents = pemPrivateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
    false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" }, key, new TextEncoder().encode(data)
  );
  return String.fromCharCode(...new Uint8Array(signature));
}

async function getToken(saKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: saKey.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600, iat: now,
  };
  const msg = `${await base64UrlEncode(JSON.stringify(header))}.${await base64UrlEncode(JSON.stringify(payload))}`;
  const sig = await rsaSign(msg, saKey.private_key);
  const jwt = msg + "." + Buffer.from(sig, "binary").toString("base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await res.json();
  return data.access_token;
}

async function main() {
  const keyPath = join(__dirname, "..", "ceo84-key.json");
  const saKey = JSON.parse(readFileSync(keyPath, "utf-8"));
  console.log("Project:", saKey.project_id);
  console.log("Client:", saKey.client_email);

  const token = await getToken(saKey);
  console.log("Token: OK\n");

  // 1. List enabled APIs
  console.log("=== Enabled APIs (filtered) ===");
  const r1 = await fetch(
    `https://serviceusage.googleapis.com/v1/projects/${saKey.project_id}/services?filter=state:ENABLED`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (r1.ok) {
    const d1 = await r1.json();
    const names = (d1.services || []).map(s => s.config.name);
    const relevant = names.filter(n =>
      n.includes("aiplatform") || n.includes("vertex") ||
      n.includes("generative") || n.includes("imagen") ||
      n.includes("cloud-ai")
    );
    if (relevant.length) {
      relevant.forEach(n => console.log("  ✅", n));
    } else {
      console.log("  ❌ No Vertex AI or generative AI APIs enabled");
      console.log("  (all", names.length, "enabled APIs - none are Vertex/Gemini)");
    }
  } else {
    const e = await r1.text();
    console.log("  Failed:", r1.status, e.slice(0, 100));
  }

  // 2. Try to access Vertex AI directly (check if API responds)
  console.log("\n=== Testing Vertex AI endpoint ===");
  const r2 = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${saKey.project_id}/locations/us-central1`,    
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log("Vertex AI root:", r2.status);

  // 3. Try Gemini API key approach (not service account)
  console.log("\n=== Testing with API key from token_uri ===");
  // Try the generativelanguage API (different from Vertex AI)
  try {
    const r3 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": "test" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
      }
    );
    const t3 = await r3.text();
    console.log("Gemini Language API:", r3.status, t3.slice(0, 100));
  } catch (e) {
    console.log("Gemini Language API error:", e.message);
  }
}

main().catch(e => console.error("Error:", e.message));
