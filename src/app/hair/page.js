"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "ai-hair-results-grid";

async function resizeImage(file, maxDim = 1024, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const [creditsRemaining, setCreditsRemaining] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [gender, setGender] = useState("female");
  const [age, setAge] = useState("25");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [imageCount, setImageCount] = useState(4);
  const [faceShape, setFaceShape] = useState("");
  const [hairLength, setHairLength] = useState("");
  const [hairTexture, setHairTexture] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [vibe, setVibe] = useState("");
  const [status, setStatus] = useState("idle"); // idle, analyzing, generating, done
  const [analysisResult, setAnalysisResult] = useState(null);
  const [results, setResults] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const fileInputRef = useRef(null);
  const totalCount = useRef(0);

  // Load results from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setResults(parsed);
        totalCount.current = parsed.length;
        if (parsed.length > 0) setStatus("done");
      }
    } catch {}
  }, []);

  // Save to localStorage when results change
  useEffect(() => {
    if (results.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(results)); } catch {}
    }
  }, [results]);

  const removeImage = (idToRemove) => {
    setResults(prev => {
      const next = prev.filter(img => img.id !== idToRemove);
      try {
        if (next.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        else localStorage.removeItem(STORAGE_KEY);
      } catch {}
      return next;
    });
  };

  const downloadImage = (url, name) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name || "ai_hairstyle.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDragEnter = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault(); e.stopPropagation();
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  };

  const handleFile = async (file) => {
    setPhoto(file);
    setStatus("idle");
    const resized = await resizeImage(file);
    setPreview(resized);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!photo || !preview) return;

    // Append new slots — keep previously generated images
    const count = parseInt(imageCount) || 4;
    totalCount.current += count;
    setCreditsRemaining(null);
    setAnalysisResult(null);
    setStatus("analyzing");

    try {
      // 1. Analyze
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ gender, age, imageCount, faceShape, hairLength, hairTexture, hairColor, vibe, photoBase64: preview })
      });

      const analyzeData = await analyzeRes.json();
      if (analyzeData.error) throw new Error(analyzeData.error);

      setAnalysisResult(analyzeData.analysis || "AI đã phân tích thành công.");
      setStatus("generating");

      // 2. Generate — first image sequentially to establish credit state,
      //    remaining images in a 2-way concurrency pool for speed.
      const promptsArray = analyzeData.prompts || Array(count).fill("trendy hairstyle");
      const batchStamp = Date.now().toString();
      const MIN_GAP = 4000;
      let creditsState = null;
      let minRemaining = null;

      const applyRemaining = (rem) => {
        if (rem === undefined) return;
        if (minRemaining === null || rem < minRemaining) {
          minRemaining = rem;
          setCreditsRemaining(rem);
        }
      };

      const genOne = async (i, explicitCreditsUsed) => {
        const uniqueId = batchStamp + "-" + i;
        const body = { prompt: promptsArray[i], aspectRatio, photoBase64: preview };
        if (explicitCreditsUsed !== null && creditsState) {
          body._skipUserCheck = true;
          body._creditsUsed = explicitCreditsUsed;
          body._lastResetStr = creditsState.lastResetStr;
          body._dailyLimit = creditsState.dailyLimit;
        }
        const MAX_TRIES = 3;
        for (let t = 0; t < MAX_TRIES; t++) {
          try {
            const res = await fetch('/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(body)
            });
            if (res.ok) {
              const data = await res.json();
              if (data.url) {
                setResults(prev => [...prev, { id: uniqueId, url: data.url }]);
                applyRemaining(data.credits_remaining);
                return;
              }
            }
          } catch (err) { /* retry */ }
          if (t < MAX_TRIES - 1) {
            await new Promise(r => setTimeout(r, MIN_GAP + Math.floor(Math.random() * 2000)));
          }
        }
        setResults(prev => [...prev, { id: uniqueId, error: true }]);
      };

      // First image: real user check to establish credit state
      {
        const uniqueId = batchStamp + "-0";
        const body = { prompt: promptsArray[0], aspectRatio, photoBase64: preview };
        try {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              setResults(prev => [...prev, { id: uniqueId, url: data.url }]);
              applyRemaining(data.credits_remaining);
              if (data.daily_limit) {
                creditsState = {
                  creditsUsed: data.daily_limit - data.credits_remaining,
                  lastResetStr: new Date().toISOString(),
                  dailyLimit: data.daily_limit
                };
              }
            } else {
              setResults(prev => [...prev, { id: uniqueId, error: true }]);
            }
          } else {
            setResults(prev => [...prev, { id: uniqueId, error: true }]);
          }
        } catch (err) {
          setResults(prev => [...prev, { id: uniqueId, error: true }]);
        }
      }

      // Remaining images: paced launcher — minimum MIN_GAP ms between
      // consecutive API calls (no simultaneous burst), auto-retry inside genOne.
      const base = creditsState ? creditsState.creditsUsed : null;
      let lastStart = Date.now();
      const tasks = [];
      for (let i = 1; i < promptsArray.length; i++) {
        const idx = i;
        const credits = base !== null ? base + (i - 1) : null;
        tasks.push((async () => {
          const wait = Math.max(0, lastStart + MIN_GAP - Date.now());
          if (wait) await new Promise(r => setTimeout(r, wait));
          lastStart = Date.now();
          await genOne(idx, credits);
        })());
      }
      await Promise.all(tasks);

      setStatus("done");

    } catch (err) {
      setAnalysisResult("Có lỗi xảy ra: " + err.message);
      setStatus("done");
    }
  };

  const slotCount = Math.max(totalCount.current, results.length);
  const showGallery = status !== "idle" || results.length > 0;

  return (
    <main className="container">
      <div className="hero-text">
        <h1>AI Hairstylist</h1>
        <p>Tải ảnh của bạn lên và để AI thiết kế những kiểu tóc thịnh hành nhất, phù hợp nhất với cấu trúc khuôn mặt của bạn.</p>
      </div>

      <div className="main-layout">
        {/* Left Column: Form */}
        <div className="glass-panel">
          <div className="input-group">
            <label className="label">1. Kéo thả hoặc nhấp để tải ảnh khuôn mặt</label>
            <div
              className={`upload-area ${isDragActive ? 'drag-active' : ''}`}
              onClick={handleUploadClick}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
              {preview ? (
                <div className="scanning-container">
                  <img src={preview} alt="Preview" className="preview-image" />
                  {status !== "idle" && status !== "done" && <div className="scanning-line"></div>}
                </div>
              ) : (
                <>
                  <div className="upload-icon">📸</div>
                  <p>Kéo thả ảnh vào đây<br/>hoặc nhấp để chọn ảnh<br/><span style={{fontSize: '0.8rem', opacity: 0.7}}>(Nên chọn ảnh rõ mặt, nhìn thẳng)</span></p>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Tỷ lệ ảnh</label>
              <select className="select" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                <option value="1:1">Vuông (1:1)</option>
                <option value="9:16">Dọc (9:16)</option>
                <option value="16:9">Ngang (16:9)</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Tuổi chính xác *</label>
              <input type="number" className="select" value={age} onChange={(e) => setAge(e.target.value)} placeholder="VD: 25" min="1" max="100" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Giới tính *</label>
              <select className="select" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Dáng khuôn mặt</label>
              <select className="select" value={faceShape} onChange={(e) => setFaceShape(e.target.value)}>
                <option value="">AI tự phân tích</option>
                <option value="oval">Trái xoan (Oval)</option>
                <option value="round">Tròn (Round)</option>
                <option value="square">Vuông (Square)</option>
                <option value="long">Dài (Oblong)</option>
                <option value="heart">Trái tim (Heart)</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Độ dài tóc</label>
              <select className="select" value={hairLength} onChange={(e) => setHairLength(e.target.value)}>
                <option value="">AI tự quyết định</option>
                <option value="short">Ngắn (Pixie/Bob)</option>
                <option value="medium">Ngang vai (Lob)</option>
                <option value="long">Dài</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Kiểu tóc/Kết cấu</label>
              <select className="select" value={hairTexture} onChange={(e) => setHairTexture(e.target.value)}>
                <option value="">AI tự quyết định</option>
                <option value="straight">Thẳng tự nhiên</option>
                <option value="wavy">Uốn lơi/Gợn sóng</option>
                <option value="curly">Uốn lọn to</option>
                <option value="frizzy">Xù cá tính</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Màu tóc</label>
              <select className="select" value={hairColor} onChange={(e) => setHairColor(e.target.value)}>
                <option value="">AI tự quyết định</option>
                <option value="natural black">Đen tự nhiên</option>
                <option value="chestnut brown">Nâu hạt dẻ</option>
                <option value="ash gray">Khói/Xám</option>
                <option value="blonde">Vàng/Blonde</option>
                <option value="highlight">Phẩy lai (Highlight)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Phong cách</label>
              <select className="select" value={vibe} onChange={(e) => setVibe(e.target.value)}>
                <option value="">AI tự quyết định</option>
                <option value="modern trendy">Hiện đại / Trendy</option>
                <option value="elegant office">Thanh lịch / Công sở</option>
                <option value="classic traditional">Cổ điển / Truyền thống</option>
                <option value="edgy street">Phá cách / Đường phố</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="label">Số lượng ảnh</label>
              <select className="select" value={imageCount} onChange={(e) => setImageCount(parseInt(e.target.value))}>
                <option value={2}>2 kiểu</option>
                <option value={4}>4 kiểu</option>
                <option value={6}>6 kiểu</option>
              </select>
            </div>
          </div>

          {user && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', opacity: 0.7 }}>
              <span>Credit: {creditsRemaining !== null ? creditsRemaining : user.daily_limit - user.credits_used}/{user.daily_limit}</span>
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleSubmit}
            disabled={!photo || status === "analyzing" || status === "generating"}
          >
            {status === "idle" && "Bắt đầu Phân tích & Tạo mẫu"}
            {status === "analyzing" && "⏳ Đang phân tích khuôn mặt..."}
            {status === "generating" && "✨ Đang tạo mẫu tóc AI..."}
            {status === "done" && "Tạo thêm mẫu khác"}
          </button>
        </div>

        {/* Right Column: Results */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: showGallery ? 'flex-start' : 'center', alignItems: 'center' }}>
          {!showGallery ? (
            <div style={{ textAlign: 'center', opacity: 0.5 }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
              <h3>Kết quả sẽ hiển thị tại đây</h3>
              <p>Vui lòng tải ảnh và nhấn nút bắt đầu.</p>
            </div>
          ) : (
            <div style={{ width: '100%' }}>
              {/* Analysis */}
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Phân tích AI</h3>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '1rem', borderLeft: '4px solid var(--accent)', marginBottom: '2rem' }}>
                {status === "analyzing" ? (
                  <p className="pulse-text" style={{ animation: 'pulse 1.5s infinite' }}>Đang quét sinh trắc học và cấu trúc xương...</p>
                ) : (
                  <p>{analysisResult}</p>
                )}
              </div>

              {/* Gallery - show immediately */}
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                Gợi ý kiểu tóc
                {status === "generating" && <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '0.5rem' }}>({results.length}/{totalCount.current})</span>}
              </h3>
              <div className="gallery-grid">
                {Array.from({ length: slotCount }).map((_, i) => {
                  const item = results[i];
                  return (
                    <div key={item?.id || "slot-" + i} className="gallery-item">
                      {!item ? (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', opacity: 0.2,
                          background: 'rgba(0,0,0,0.1)', borderRadius: '1rem', minHeight: '200px'
                        }}>
                          <div style={{ fontSize: '2rem', animation: 'pulse 1s infinite' }}>⏳</div>
                        </div>
                      ) : item.error ? (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', opacity: 0.4, gap: '0.5rem',
                          background: 'rgba(0,0,0,0.15)', borderRadius: '1rem', minHeight: '200px'
                        }}>
                          <span style={{ fontSize: '2rem' }}>⚠️</span>
                          <p style={{ fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>Tạo ảnh thất bại</p>
                        </div>
                      ) : (
                        <img src={item.url} alt="" style={{ cursor: 'pointer' }} onClick={() => setFullscreenImage(item.url)} />
                      )}
                      {item && (
                        <div className="action-buttons" style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '5px' }}>
                          {item.url && (
                            <button title="Xem" onClick={() => setFullscreenImage(item.url)} style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>👁️</button>
                          )}
                          {item.url && (
                            <button title="Tải" onClick={() => downloadImage(item.url, `AI_Style_${item.id}.png`)} style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>⬇️</button>
                          )}
                          <button title="Xoá" onClick={() => removeImage(item.id)} style={{ background: 'rgba(255,0,0,0.6)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>🗑️</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {fullscreenImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setFullscreenImage(null)}>
          <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'white', border: 'none', fontSize: '2rem', cursor: 'pointer' }} onClick={() => setFullscreenImage(null)}>✕</button>
          <img src={fullscreenImage} style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain', borderRadius: '10px' }} alt="Fullscreen" />
        </div>
      )}
    </main>
  );
}
