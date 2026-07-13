import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const b64u = s => Buffer.from(s).toString("base64url");

async function main() {
  const k = JSON.parse(readFileSync(join(__dirname, "..", "ceo84-key.json"), "utf-8"));
  
  const now = Math.floor(Date.now() / 1000);
  const pem = k.private_key;
  const pemC = pem.replace("-----BEGIN PRIVATE KEY-----","").replace("-----END PRIVATE KEY-----","").replace(/\s/g,"");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pemC),c=>c.charCodeAt(0)).buffer,
    {name:"RSASSA-PKCS1-v1_5",hash:{name:"SHA-256"}},false,["sign"]);
  const msg = b64u(JSON.stringify({alg:"RS256",typ:"JWT"}))+"."+b64u(JSON.stringify({
    iss:k.client_email,scope:"https://www.googleapis.com/auth/cloud-platform",
    aud:"https://oauth2.googleapis.com/token",exp:now+3600,iat:now
  }));
  const sig = String.fromCharCode(...new Uint8Array(await crypto.subtle.sign({name:"RSASSA-PKCS1-v1_5"},key,new TextEncoder().encode(msg))));
  const jwt = msg+"."+b64u(sig);
  const r = await fetch("https://oauth2.googleapis.com/token",{method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});
  const token = (await r.json()).access_token;
  console.log("Token OK\n");

  // List publisher models
  const regions = ["us-central1", "europe-west4"];
  for (const region of regions) {
    console.log(`=== ${region} ===`);
    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${k.project_id}/locations/${region}/publishers/google/models?pageSize=100`;
    const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (res.ok) {
      const data = await res.json();
      const names = (data.models || []).map(m => m.name.split("/").pop());
      const gemini = names.filter(n => n.includes("gemini"));
      const imagen = names.filter(n => n.includes("imagen"));
      console.log("  Gemini:", gemini.slice(0, 10) || "none");
      console.log("  Imagen:", imagen.slice(0, 10) || "none");
    } else {
      const err = await res.text();
      console.log("  Status:", res.status, err.slice(0, 150));
    }
  }
}
main().catch(e => console.error(e.message));
