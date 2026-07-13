// Seed admin user script
// Usage: node scripts/seed-admin.js <email> <name> <password>
// Or run via wrangler d1 execute after deployment

const email = process.argv[2] || "admin@test.com";
const name = process.argv[3] || "Admin";
const password = process.argv[4] || "admin123";

// PBKDF2 hash using WebCrypto (Node.js)
async function main() {
  const crypto = await import("crypto");
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const hash = key.toString("base64");
  const saltB64 = salt.toString("base64");
  const passwordHash = `${saltB64}:${hash}`;
  const id = crypto.randomUUID();

  console.log("-- Run this via wrangler D1:");
  console.log(`INSERT INTO users (id, email, name, password_hash, role, daily_limit)
VALUES ('${id}', '${email}', '${name}', '${passwordHash}', 'admin', 999999);`);
}

main().catch(console.error);
