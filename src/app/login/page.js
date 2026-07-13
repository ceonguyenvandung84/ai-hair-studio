"use client";

import { useState } from "react";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/hair");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "420px" }}>
        <h1 style={{ textAlign: "center", marginBottom: "0.5rem", fontSize: "2rem" }}>Đăng nhập</h1>
        <p style={{ textAlign: "center", marginBottom: "2rem", opacity: 0.7 }}>Tiếp tục sử dụng AI Hair Studio</p>

        {error && (
          <div style={{ background: "rgba(244, 63, 94, 0.2)", border: "1px solid #f43f5e", padding: "0.75rem", borderRadius: "0.75rem", marginBottom: "1rem", color: "#f43f5e", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label">Email</label>
            <input className="select" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className="input-group">
            <label className="label">Mật khẩu</label>
            <input className="select" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem" }}>
          Chưa có tài khoản?{" "}
          <Link href="/register" style={{ color: "var(--primary)", textDecoration: "none" }}>
            Đăng ký
          </Link>
        </p>
      </div>
    </main>
  );
}
