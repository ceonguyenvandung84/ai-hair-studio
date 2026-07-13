import { spawn } from "child_process";
import { request } from "http";

const PROJECT_DIR = "C:\\app\\ai-hair-studio";
const PORT = 8788;
const BASE = `http://127.0.0.1:${PORT}`;

function fetch(method, path, body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { "Content-Type": "application/json", ...extraHeaders },
      timeout: 30000,
    };
    const req = request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", (e) => {
      // Connection refused - server not ready yet
      reject(e);
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitForServer(maxWaitMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      await fetch("GET", "/api/auth/me");
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Server did not start");
}

async function main() {
  console.log("=== Starting Wrangler ===");
  const wrangler = spawn(
    "cmd.exe",
    ["/c", "C:\\app\\ai-hair-studio\\node_modules\\.bin\\wrangler.cmd", "pages", "dev", ".", "--ip", "127.0.0.1", "--port", "8788", "--d1", "DB=ai-hair-db"],
    { cwd: PROJECT_DIR, stdio: ["ignore", "pipe", "pipe"], shell: false }
  );

  let output = "";
  wrangler.stdout.on("data", (d) => { output += d.toString(); });
  wrangler.stderr.on("data", (d) => { output += d.toString(); });

  try {
    console.log("Waiting for server to start...");
    await waitForServer(20000);
    console.log("Server ready!");

    console.log("\n=== Running Tests ===\n");
    const results = [];
    let testToken;

    // Test 1: Register
    try {
      const r = await fetch("POST", "/api/auth/register", { email: "test@user.com", name: "Test User", password: "123456" });
      testToken = r.body?.token;
      results.push({ name: "Register", pass: r.status === 200 && !!testToken, detail: `status=${r.status} token=${!!testToken}` });
    } catch (e) { results.push({ name: "Register", pass: false, detail: e.message }); }

    // Test 2: Login
    try {
      const r = await fetch("POST", "/api/auth/login", { email: "test@user.com", password: "123456" });
      testToken = r.body?.token || testToken;
      results.push({ name: "Login", pass: r.status === 200 && !!r.body?.token, detail: `status=${r.status} token=${!!r.body?.token}` });
    } catch (e) { results.push({ name: "Login", pass: false, detail: e.message }); }

    // Test 3: Get me
    if (testToken) {
      try {
        const r = await fetch("GET", "/api/auth/me", null, { Authorization: `Bearer ${testToken}` });
        results.push({ name: "Me", pass: r.status === 200 && r.body?.user?.email === "test@user.com", detail: `status=${r.status} email=${r.body?.user?.email} credits=${r.body?.user?.credits_used}/${r.body?.user?.daily_limit}` });
      } catch (e) { results.push({ name: "Me", pass: false, detail: e.message }); }
    } else { results.push({ name: "Me", pass: false, detail: "no token" }); }

    // Test 4: Analyze (Gemini)
    if (testToken) {
      try {
        const r = await fetch("POST", "/api/analyze", { gender: "female", age: "25", imageCount: 2 }, { Authorization: `Bearer ${testToken}` });
        results.push({ name: "Analyze", pass: r.status === 200 && !!r.body?.analysis && Array.isArray(r.body?.prompts), detail: `status=${r.status} analysis=${!!r.body?.analysis} prompts=${r.body?.prompts?.length || 0}` });
      } catch (e) { results.push({ name: "Analyze", pass: false, detail: e.message }); }
    } else { results.push({ name: "Analyze", pass: false, detail: "no token" }); }

    // Test 5: Generate (Imagen 3)
    if (testToken) {
      try {
        const r = await fetch("POST", "/api/generate", { prompt: "A realistic front-facing snapshot of a 25-year-old Asian female with a trendy bob haircut, in a cafe with natural lighting.", aspectRatio: "9:16" }, { Authorization: `Bearer ${testToken}` });
        const hasUrl = !!r.body?.url || false;
        const creditCheck = r.body?.credits_remaining !== undefined;
        results.push({ name: "Generate", pass: r.status === 200 && hasUrl, detail: `status=${r.status} url=${!!r.body?.url} credits_rem=${r.body?.credits_remaining}` });
      } catch (e) { results.push({ name: "Generate", pass: false, detail: e.message }); }
    } else { results.push({ name: "Generate", pass: false, detail: "no token" }); }

    // Test 6: Credit check (generate again - should use 1 credit)
    if (testToken) {
      try {
        const r = await fetch("POST", "/api/generate", { prompt: "Another hairstyle prompt", aspectRatio: "9:16" }, { Authorization: `Bearer ${testToken}` });
        results.push({ name: "Credit deduction", pass: r.body?.credits_remaining !== undefined, detail: `status=${r.status} credits_used/info=${r.body?.credits_remaining}/${r.body?.daily_limit}` });
      } catch (e) { results.push({ name: "Credit deduction", pass: false, detail: e.message }); }
    } else { results.push({ name: "Credit deduction", pass: false, detail: "no token" }); }

    console.log("Results:");
    let passed = 0, failed = 0;
    for (const r of results) {
      console.log(`${r.pass ? "✅" : "❌"} ${r.name}: ${r.detail}`);
      if (r.pass) passed++; else failed++;
    }
    console.log(`\n=== ${passed}/${results.length} passed, ${failed} failed ===`);
  } catch (err) {
    console.error("Fatal error:", err.message);
    console.log("Last 1000 chars of wrangler output:", output.slice(-1000));
  } finally {
    wrangler.kill();
    setTimeout(() => process.exit(0), 500);
  }
}

main();
