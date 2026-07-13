import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const b64u = s => Buffer.from(s).toString("base64url");

async function getToken(saKey) {
  const now = Math.floor(Date.now() / 1000);
  const pem = saKey.private_key;
  const pemC = pem.replace("-----BEGIN PRIVATE KEY-----","").replace("-----END PRIVATE KEY-----","").replace(/\s/g,"");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pemC),c=>c.charCodeAt(0)).buffer,
    {name:"RSASSA-PKCS1-v1_5",hash:{name:"SHA-256"}},false,["sign"]);
  const msg = b64u(JSON.stringify({alg:"RS256",typ:"JWT"}))+"."+b64u(JSON.stringify({
    iss:saKey.client_email,scope:"https://www.googleapis.com/auth/cloud-platform",
    aud:"https://oauth2.googleapis.com/token",exp:now+3600,iat:now
  }));
  const sig = String.fromCharCode(...new Uint8Array(await crypto.subtle.sign({name:"RSASSA-PKCS1-v1_5"},key,new TextEncoder().encode(msg))));
  const jwt = msg+"."+b64u(sig);
  const r = await fetch("https://oauth2.googleapis.com/token",{method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});
  if (!r.ok) throw new Error("OAuth2: "+r.status+" "+(await r.text()));
  return (await r.json()).access_token;
}

async function main() {
  const keyPath = join(__dirname, "..", "ceo84-key.json");
  const saKey = JSON.parse(readFileSync(keyPath, "utf-8"));
  console.log("Project:", saKey.project_id);
  const token = await getToken(saKey);
  console.log("Token: OK\n");

  const pid = saKey.project_id;
  
  // Test various endpoints
  const tests = [
    // Standard Vertex AI generateContent
    { name: "Vertex AI gemini-2.0-flash-exp (v1)", url: `https://us-central1-aiplatform.googleapis.com/v1/projects/${pid}/locations/us-central1/publishers/google/models/gemini-2.0-flash-exp:generateContent` },
    // Try with different API version
    { name: "Vertex AI gemini-2.0-flash-exp (v1beta1)", url: `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${pid}/locations/us-central1/publishers/google/models/gemini-2.0-flash-exp:generateContent` },
    // Try Gemini via AI Platform ML API
    { name: "AI Platform gemini-pro", url: `https://us-central1-ml.googleapis.com/v1/projects/${pid}/locations/us-central1/models/gemini-pro:predict` },
    // Try the older AI Platform
    { name: "AI Platform (ml.googleapis.com)", url: `https://ml.googleapis.com/v1/projects/${pid}/models` },
  ];
  
  for (const t of tests) {
    const r = await fetch(t.url, { method: "POST", headers: { Authorization: "Bearer "+token, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "say hi" }] }] }) });
    const body = await r.text();
    console.log(`${t.name}: ${r.status} ${body.slice(0, 120)}`);
  }
  
  // Test Vertex AI Imagen
  console.log("\n--- Imagen ---");
  const r = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/${pid}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`, {
    method: "POST", headers: { Authorization: "Bearer "+token, "Content-Type": "application/json" },
    body: JSON.stringify({ instances: [{ prompt: "cat" }], parameters: { sampleCount: 1 } })
  });
  const body = await r.text();
  console.log(`Imagen 3: ${r.status} ${body.slice(0, 120)}`);
}

main().catch(e => console.error("FAILED:", e.message));
