# AI Hair Studio

Ứng dụng tạo kiểu tóc bằng AI. Người dùng tải ảnh khuôn mặt lên, AI phân tích cấu trúc khuôn mặt và tạo ra các kiểu tóc thịnh hành (Hàn Quốc / Việt Nam) được cá nhân hoá, giữ nguyên nhận diện khuôn mặt.

Repo: https://github.com/ceonguyenvandung84/ai-hair-studio

## Tính năng

- Đăng ký / đăng nhập bằng JWT (HS256), mật khẩu băm PBKDF2.
- Phân tích khuôn mặt qua **Gemini 2.5 Flash** (dáng mặt, tông da, đặc điểm).
- Sinh ảnh qua **Gemini 2.5 Flash Image**, giữ nguyên khuôn mặt gốc, chỉ đổi kiểu tóc.
- Tuỳ chọn: giới tính, tuổi, dáng mặt, độ dài / kết cấu / màu tóc, phong cách, tỷ lệ ảnh, số lượng ảnh.
- Hệ thống credit theo ngày cho mỗi người dùng.
- Trang quản trị cơ bản.
- Kết quả lưu cục bộ (localStorage), sinh nối tiếp (append) và có nút Xem / Tải / Xoá cho từng ảnh.

## Công nghệ

- **Frontend:** Next.js 16 (App Router) + React 19
- **Backend API:** Cloudflare Pages (Advanced Mode `_worker.js`)
- **Database:** Cloudflare D1 (SQLite)
- **AI:** Google Vertex AI — Gemini 2.5 Flash / Flash Image
- **Auth:** JWT tự cài đặt qua Web Crypto API

## Cấu trúc dự án

```
ai-hair-studio/
├── _worker.js            # Router API (analyze, generate, auth, admin)
├── functions/utils/      # vertex-auth, auth (JWT), db (D1 queries)
├── migrations/           # SQL migration cho D1
├── src/app/              # Next.js pages (login, register, hair, admin)
└── wrangler.toml         # Cấu hình Cloudflare Pages + D1
```

## Bắt đầu

### 1. Cài đặt

```bash
npm install
```

### 2. Biến môi trường

Tạo file `.dev.vars` (không commit) dựa theo `.env.example`:

```
GOOGLE_SA_KEY={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
JWT_SECRET=chuoi-bi-mat-ngau-nhien-it-nhat-32-ky-tu
```

> `GOOGLE_SA_KEY` là nội dung JSON của Service Account có quyền Vertex AI. **Không bao giờ commit file key hoặc `.dev.vars`.**

### 3. Khởi tạo database (local)

```bash
npm run migrate:local
```

### 4. Chạy dev

Cần chạy 2 tiến trình song song:

```bash
npm run dev       # Web (Next.js) tại http://localhost:3005
npm run dev:api   # API (Wrangler) tại http://127.0.0.1:8788
```

Trên Windows có thể chạy nhanh bằng `start.bat`.

## Triển khai (Cloudflare Pages)

```bash
npm run migrate:prod        # migrate D1 production
npm run build:cf            # build + deploy lên Cloudflare Pages
```

Đặt secret trên Cloudflare Dashboard: `GOOGLE_SA_KEY`, `JWT_SECRET`.

## Bảo mật

- File Service Account key (`*-key.json`, `key*.json`, ...) và `.dev.vars` đã được `.gitignore`.
- Kiểm tra kỹ trước khi push để tránh lộ khoá.
