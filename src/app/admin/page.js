"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.push("/");
      return;
    }
    fetchUsers();
  }, [user, loading]);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.users) setUsers(data.users);
  };

  const handleEdit = (u) => {
    setEditingUser(u.id);
    setEditRole(u.role);
    setEditLimit(String(u.daily_limit));
    setStatusMsg("");
  };

  const handleSave = async () => {
    const res = await fetch("/api/admin/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: editingUser, role: editRole, daily_limit: parseInt(editLimit) }),
    });
    const data = await res.json();
    if (data.error) {
      setStatusMsg("Lỗi: " + data.error);
    } else {
      setStatusMsg("Đã cập nhật user thành công!");
      setEditingUser(null);
      fetchUsers();
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setStatusMsg("");
  };

  if (loading) return <div className="container" style={{ textAlign: "center", padding: "4rem" }}>Đang tải...</div>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem" }}>Quản trị hệ thống</h1>
        <Link href="/" style={{ color: "var(--primary)", textDecoration: "none" }}>← Về trang chủ</Link>
      </div>

      {statusMsg && (
        <div style={{
          background: statusMsg.startsWith("Lỗi") ? "rgba(244,63,94,0.2)" : "rgba(34,197,94,0.2)",
          border: `1px solid ${statusMsg.startsWith("Lỗi") ? "#f43f5e" : "#22c55e"}`,
          padding: "0.75rem", borderRadius: "0.75rem", marginBottom: "1rem",
          color: statusMsg.startsWith("Lỗi") ? "#f43f5e" : "#22c55e", fontSize: "0.9rem",
        }}>
          {statusMsg}
        </div>
      )}

      <div className="glass-panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
              <th style={{ padding: "0.75rem 0.5rem" }}>Email</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Tên</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Vai trò</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Giới hạn/ngày</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Đã dùng hôm nay</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Reset lúc</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {editingUser === u.id ? (
                  <>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{u.email}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{u.name}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="select" style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}>
                        <option value="free">Free</option>
                        <option value="paid">Paid</option>
                        <option value="unlimited">Unlimited</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <input type="number" value={editLimit} onChange={(e) => setEditLimit(e.target.value)}
                        className="select" style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem", width: "80px" }} />
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{u.credits_used}</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", opacity: 0.7 }}>{u.last_reset}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <button onClick={handleSave} style={{ background: "#22c55e", color: "white", border: "none", padding: "0.3rem 0.8rem", borderRadius: "0.5rem", cursor: "pointer", marginRight: "0.5rem" }}>Lưu</button>
                      <button onClick={handleCancel} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "none", padding: "0.3rem 0.8rem", borderRadius: "0.5rem", cursor: "pointer" }}>Huỷ</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{u.email}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{u.name}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <span style={{
                        background: u.role === "admin" ? "rgba(139,92,246,0.3)" :
                          u.role === "unlimited" ? "rgba(34,197,94,0.3)" :
                          u.role === "paid" ? "rgba(59,130,246,0.3)" : "rgba(100,116,139,0.3)",
                        padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.8rem",
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{u.daily_limit}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>{u.credits_used}</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.8rem", opacity: 0.7 }}>{u.last_reset}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <button onClick={() => handleEdit(u)}
                        style={{ background: "var(--primary)", color: "white", border: "none", padding: "0.3rem 0.8rem", borderRadius: "0.5rem", cursor: "pointer" }}>
                        Sửa
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p style={{ textAlign: "center", padding: "2rem", opacity: 0.5 }}>Chưa có user nào.</p>
        )}
      </div>
    </main>
  );
}
