# MASTER PARAMETERS (AI HAIRSTYLIST SDXL)
Cập nhật lần cuối: [Thời điểm hoàn hảo nhất]

Đây là tài liệu lưu trữ toàn bộ kiến trúc mô hình và các thông số đã được căn chỉnh tỉ mỉ nhất ("tỷ lệ vàng") để tạo ra những bức ảnh có độ chân thực cao, sắc nét, và loại bỏ hoàn toàn hiện tượng "mặt nhựa" (plastic face).

## 1. Kiến Trúc Mô Hình (Core Models)
- **Base Model (Mô hình nền):** `leosamHelloworldTurbo_20TurboLCM.safetensors`
  - *Mô tả:* Mô hình SDXL tinh chỉnh công nghệ LCM/Turbo, tối ưu cho tốc độ cực nhanh (~6 giây) nhưng vẫn giữ được độ nét căng.
- **Công nghệ Face Swap (Đổi mặt):** `ReActorFaceSwap`
  - Mô hình nhận diện: `retinaface_resnet50`
  - Mô hình đổi mặt: `inswapper_128.onnx`

## 2. Thông Số Sinh Ảnh (Sampling Parameters)
Các chỉ số quyết định chất lượng nét vẽ và hình khối tổng thể:
- **Steps:** `8` *(Mức tối ưu cho mô hình Turbo/LCM).*
- **CFG Scale:** `2.0` *(Mức chuẩn để ảnh nét căng nhưng không bị cháy sáng hay bệt màu).*
- **Sampler:** `euler_ancestral` *(Chống nhòe, giữ chi tiết rất tốt cho LCM).*
- **Scheduler:** `sgm_uniform`
- **Denoise:** `1.0` *(Tạo mới hoàn toàn từ không gian latent).*

## 3. Trọng Số Phục Hồi Khuôn Mặt (Face Restoration)
Đây là "linh hồn" của bản cập nhật này, quyết định độ mộc mạc và chân thực của da:
- **Mô hình phục hồi:** `codeformer-v0.1.0.pth`
- **`face_restore_visibility`:** `1.0`
  - *Công dụng:* Khử 100% hiện tượng viền mờ của khuôn mặt 128x128 từ inswapper gốc. Bắt buộc phải là 1.0 để ảnh sắc nét.
- **`codeformer_weight`:** `0.35`
  - *Công dụng:* Tỷ lệ vàng. Ở mức 0.35, AI sẽ phục hồi độ nét của khuôn mặt nhưng vẫn nương tay, không "cà láng" bề mặt da, giúp giữ lại các khuyết điểm tự nhiên, lỗ chân lông và kết cấu da thật từ ảnh gốc và prompt.

## 4. Prompt Engineering (Từ khóa dẫn hướng)
Hệ thống nhồi thêm các từ khóa sau lưng người dùng để ép model ra chất lượng nhiếp ảnh gia:

### Positive Prompt (Kích nét da, Khung hình & Ánh sáng)
```text
medium shot, upper body portrait, waist up, capturing the upper body and head perfectly, glossy hair, candid smartphone snapshot, amateur everyday photography, (hyper-detailed sharp background:1.5), (everything in focus:1.5), (f/22 aperture:1.5), (deep depth of field:1.5), dynamic outdoor or indoor environment, natural lighting matching the environment, realistic fair pale skin, raw unfiltered photo, detailed skin pores, rough skin texture, slight freckles, highly detailed skin texture, bright glowing skin tone, highly detailed face, natural lips, pale lipstick, minimal makeup.
```

### Negative Prompt (Chống nhựa, Chống crop & Chống nền trơn/mờ)
```text
professional photography, portrait mode, DSLR, (bokeh:1.5), (shallow depth of field:1.5), (blurred background:1.5), (out of focus background:1.5), extreme close up, macro shot, face cropped, head out of frame, cropped face, zooming in, passport photo, solid background, plain background, simple background, studio background, blank background, monochrome background, grey background, white background, smooth skin, beauty filter, airbrushed, red lipstick, heavy makeup, dark skin, tanned skin, worst quality, blurry, CGI, 3d render, plastic skin
```

---
*Ghi chú: Nếu trong tương lai có bất kỳ thay đổi nào làm ảnh hưởng đến chất lượng ảnh (mờ, nhựa, bệt màu), hãy khôi phục ngay lập tức bộ thông số này.*
