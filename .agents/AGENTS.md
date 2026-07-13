# Kiến Trúc Quy Trình Mục Tiêu SOTA Chuẩn (Virtual Fitting Room)

Tài liệu này lưu trữ chuẩn kiến trúc bắt buộc cho mọi sửa đổi liên quan đến tính năng thử đồ (Fashion Room). BẤT CỨ thay đổi nào cũng PHẢI tuân thủ bảng định tuyến dữ liệu dưới đây để tránh xung đột mô hình.

## Trụ cột Kiến trúc:
1. **Bóc tách:** GroundingDINO + SAM (Chống chỉ định dùng BiRefNet/YOLOWorld do lỗi tương thích).
2. **IPAdapter:** BẮT BUỘC phải sử dụng `attn_mask` (Attention Mask) để giới hạn vùng đổ vật liệu (Áo/Túi). Nếu không có `attn_mask`, SDXL sẽ bị tràn noise toàn khung hình.
3. **ControlNet:** 
   - **Tương tác (Pose):** Dùng `xinsir-openpose-sdxl` với ảnh bộ xương từ `pose_library`.
   - **Cấu trúc (Structure):** Dùng `DepthAnythingV2` kết hợp `xinsir-depth-sdxl`. (CHỐNG CHỈ ĐỊNH dùng Canny trên nền đen vì sẽ xóa sạch ảnh gốc).

## Bảng Định Tuyến Dữ Liệu & Model

| Đối tượng | Luồng Dữ Liệu (Data Flow) | Mô hình (Models) tham gia | Phương án xử lý (Kiến trúc chuẩn) |
| :--- | :--- | :--- | :--- |
| **1. Khuôn mặt & Nền** | Ảnh gốc `Person` $\rightarrow$ Resize $\rightarrow$ `VAE Encode (Inpaint)` | SDXL, VAE | Giới hạn tuyệt đối bằng **Inpaint Mask** (Chỉ vẽ lại vùng Áo và Túi). Giữ nguyên vẹn Pixel gốc ở các vùng khác. |
| **2. Trang phục** | Ảnh `Garment` $\rightarrow$ IPAdapter | GroundingDINO, SAM, IPAdapter | Dùng SAM xuất ra **Garment Mask**. Cắm Mask này vào cổng `attn_mask` của IPAdapter Áo. |
| **3. Sản phẩm (Bag)** | Ảnh `Bag` $\rightarrow$ Composite (Ghép nháp) $\rightarrow$ Depth $\rightarrow$ IPAdapter | DepthAnythingV2, ControlNet Depth | Lấy ảnh túi ghép thô đè lên ảnh người. Đưa bản nháp này qua **DepthAnything** để ép khối lượng 3D. Dùng **Bag Mask** cho IPAdapter Túi với `attn_mask`. |
| **4. Tương tác (Pose)**| `Pose Template` $\rightarrow$ ControlNet | ControlNet OpenPose | Dùng `GrowMask` mở rộng vùng Inpaint đủ lớn để SDXL xóa hẳn tay cũ và vẽ tay mới. |
| **5. Góc Camera** | DeepSeek tạo Prompt $\rightarrow$ SDXL | CLIP Text Encode | Giảm `strength` của ControlNet Depth xuống `0.6` để SDXL linh hoạt bẻ góc phối cảnh theo Prompt. |
| **6. Kích thước** | Ảnh gốc $\rightarrow$ `ImageScaleToTotalPixels` | Image Nodes | Resize ảnh gốc về chuẩn 1 Megapixel của SDXL trước khi nạp vào hệ thống để tránh lỗi móp méo/tràn VRAM. |
