import { spawn } from "node:child_process";
import http from "node:http";

const DIR = "E:\\DU-AN-PRO\\ai-hair-studio";
const PORT = 8788;
const BASE = `http://127.0.0.1:${PORT}`;

function fetch(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname,
      method, headers: { ...headers }, timeout: 30000,
    };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitForServer(maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try { await fetch("GET", "/"); return; }
    catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  throw new Error("Server did not start");
}

async function testAll() {
  console.log(`Starting wrangler in ${DIR}...`);
  const wranglerPath = `${DIR}\\node_modules\\.bin\\wrangler.cmd`;

  const wrangler = spawn("cmd.exe", ["/c", wranglerPath, "pages", "dev", DIR, "--ip", "127.0.0.1", "--port", String(PORT), "--d1", "DB=ai-hair-db"], {
    cwd: DIR, stdio: ["ignore", "pipe", "pipe"], shell: false,
  });

  let output = "";
  wrangler.stdout.on("data", (d) => { output += d.toString(); });
  wrangler.stderr.on("data", (d) => { output += d.toString(); });

  console.log("Waiting for server...");
  try {
    await waitForServer(25000);
    console.log("Server ready!");
  } catch (err) {
    console.error("FAILED:", err.message);
    console.log("Output:", output.slice(-800));
    wrangler.kill();
    process.exit(1);
  }

  const results = [];
  let token = null;

  // 1. Register
  const r1 = await fetch("POST", "/api/auth/register", { email: "test@demo.com", name: "Demo", password: "123456" });
  token = r1.body?.token || token;
  results.push({ name: "Register", pass: r1.status === 200 && !!token, detail: `status=${r1.status}` });
  console.log(`${results[0].pass ? "✅" : "❌"} Register: ${results[0].detail}`);

  // 2. Login
  const r2 = await fetch("POST", "/api/auth/login", { email: "test@demo.com", password: "123456" });
  token = r2.body?.token || token;
  results.push({ name: "Login", pass: r2.status === 200 && !!r2.body?.token, detail: `status=${r2.status}` });
  console.log(`${results[1].pass ? "✅" : "❌"} Login: ${results[1].detail}`);

  if (!token) {
    console.log("❌ No token, skipping remaining tests");
    wrangler.kill();
    process.exit(1);
  }

  // 3. Me
  const r3 = await fetch("GET", "/api/auth/me", null, { Authorization: `Bearer ${token}` });
  results.push({ name: "Me", pass: r3.status === 200 && r3.body?.user?.email === "test@demo.com", detail: `status=${r3.status} email=${r3.body?.user?.email}` });
  console.log(`${results[2].pass ? "✅" : "❌"} Me: ${results[2].detail}`);

  // 4. Admin block
  const r4 = await fetch("GET", "/api/admin/users", null, { Authorization: `Bearer ${token}` });
  results.push({ name: "Admin block", pass: r4.status === 401, detail: `status=${r4.status}` });
  console.log(`${results[3].pass ? "✅" : "❌"} Admin block: ${results[3].detail}`);

  // 5. Admin login
  const r5 = await fetch("POST", "/api/auth/login", { email: "admin@test.com", password: "admin123" });
  const adminToken = r5.body?.token;
  results.push({ name: "Admin Login", pass: r5.status === 200 && !!adminToken, detail: `status=${r5.status}` });
  console.log(`${results[4].pass ? "✅" : "❌"} Admin Login: ${results[4].detail}`);

  if (!adminToken) {
    console.log("❌ No admin token, skipping admin tests");
    wrangler.kill();
    process.exit(1);
  }

  // 6. Admin list
  const r6 = await fetch("GET", "/api/admin/users", null, { Authorization: `Bearer ${adminToken}` });
  results.push({ name: "Admin list", pass: r6.status === 200 && Array.isArray(r6.body?.users), detail: `status=${r6.status} users=${r6.body?.users?.length}` });
  console.log(`${results[5].pass ? "✅" : "❌"} Admin list: ${results[5].detail}`);

  // 7. Generate
  const r7 = await fetch("POST", "/api/generate", { prompt: "test prompt", aspectRatio: "9:16" }, { Authorization: `Bearer ${adminToken}` });
  results.push({ name: "Generate", pass: r7.status !== 401 && r7.status !== 405, detail: `status=${r7.status} ${r7.body?.error || r7.body?.url ? "has url" : JSON.stringify(r7.body).slice(0, 100)}` });
  console.log(`${results[6].pass ? "✅" : "❌"} Generate: ${results[6].detail}`);

  const passed = results.filter(r => r.pass).length;
  console.log(`\n=== ${passed}/${results.length} passed ===`);
  wrangler.kill();
  setTimeout(() => process.exit(0), 1000);
}

testAll().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
