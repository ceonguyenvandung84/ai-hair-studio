import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./AuthContext";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  title: "AI Hair Studio | Chuyên Gia Tạo Mẫu Tóc AI",
  description: "Phân tích khuôn mặt và khám phá các kiểu tóc phù hợp nhất với AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${outfit.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
