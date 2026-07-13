import sys
import argparse
import os

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, required=True)
    parser.add_argument("--prompt", type=str, required=True)
    parser.add_argument("--duration", type=int, default=4)
    parser.add_argument("--motion", type=int, default=50)
    parser.add_argument("--output", type=str, required=True)
    args = parser.parse_args()

    print(f"Bắt đầu LTX-Video Engine với prompt: {args.prompt}")
    print(f"Thời gian render: {args.duration}s")

    import torch
    from diffusers import LTXImageToVideoPipeline
    from diffusers.utils import load_image, export_to_video

    # Checkpoint path LTX
    ckpt_path = r"C:\Users\TUAN CAN\.gemini\antigravity\scratch\ComfyUI\models\checkpoints\ltx-video-2b-v0.9.1.safetensors"
    
    if not os.path.exists(ckpt_path):
        print(f"Error: Không tìm thấy model LTX tại {ckpt_path}")
        sys.exit(1)
        
    print("Đang kiểm tra và nạp T5 Text Encoder (Não bộ ngôn ngữ)...")
    try:
        from transformers import T5EncoderModel
        # Sử dụng tham số use_safetensors=True để bypass lỗi CVE-2025-32434 của Torch < 2.6
        text_encoder = T5EncoderModel.from_pretrained("google/t5-v1_1-xxl", torch_dtype=torch.bfloat16, use_safetensors=True)
        
        print("Đang nạp LTXImageToVideoPipeline vào GPU...")
        pipe = LTXImageToVideoPipeline.from_single_file(
            ckpt_path, 
            text_encoder=text_encoder,
            torch_dtype=torch.bfloat16
        )
        print("Đang bật chế độ luân chuyển bộ nhớ (Model CPU Offload) để tránh văng VRAM...")
        # Không dùng pipe.to("cuda") vì T5-XXL (9GB) + LTX (4GB) sẽ làm nổ VRAM
        pipe.enable_model_cpu_offload()
    except Exception as e:
        print(f"Error: Thiếu bộ não ngôn ngữ T5 hoặc lỗi nạp pipeline. Chi tiết: {e}")
        sys.exit(1)

    print("Đang nạp ảnh đầu vào...")
    try:
        image = load_image(args.image)
        orig_w, orig_h = image.size
        # LTX-Video chỉ được train trên độ phân giải 512x768. Nếu đưa ảnh lớn hơn (vd 896x1152), AI sẽ bị tràn tọa độ 3D RoPE và đình công (đứng im).
        if orig_h > orig_w:
            vid_w, vid_h = 512, 768
        else:
            vid_w, vid_h = 768, 512
            
        # Thuật toán Center Crop chuẩn (Không bóp méo ảnh)
        target_ratio = vid_w / vid_h
        orig_ratio = orig_w / orig_h
        
        if orig_ratio > target_ratio:
            new_h = vid_h
            new_w = int(new_h * orig_ratio)
        else:
            new_w = vid_w
            new_h = int(new_w / orig_ratio)
            
        image = image.resize((new_w, new_h), resample=3)
        left = (new_w - vid_w) / 2
        top = (new_h - vid_h) / 2
        right = (new_w + vid_w) / 2
        bottom = (new_h + vid_h) / 2
        image = image.crop((left, top, right, bottom))
        print(f"Đã ép khung hình về chuẩn LTX Native {vid_w}x{vid_h} để tránh lỗi RoPE Static.")

    except Exception as e:
        print(f"Lỗi khi load ảnh: {e}")
        sys.exit(1)
    
    # BÍ MẬT CÔNG NGHỆ: Không bao giờ ép LTX sinh quá 33 frames cho ảnh chân dung tĩnh. 
    # Nó sẽ bị "tràn nhận thức thời gian" và sập thành ảnh tĩnh.
    # Muốn video dài (4s), ta sinh 33 frames và xuất video ở tốc độ chậm (Slow-motion 8fps)
    num_frames = 33
    export_fps = max(4, round(33 / args.duration))
    
    print(f"Đang nội suy ({num_frames} frames)... Sẽ xuất video ở tốc độ {export_fps} FPS để đạt {args.duration}s.")
    
    # Ép buộc LTX phải tạo ra chuyển động (LTX mặc định rất lười chuyển động nếu prompt ngắn)
    final_prompt = args.prompt
    if len(final_prompt.split()) < 10:
        final_prompt = f"{final_prompt}, cinematic camera pan, extreme dynamic motion, fast movement, active scene"
        
    try:
        video = pipe(
            image=image,
            prompt=final_prompt,
            negative_prompt="worst quality, blurry, static, frozen, completely still, no motion, lazy, slow",
            width=vid_w,
            height=vid_h,
            num_frames=num_frames,
            frame_rate=24,           # Khóa chuẩn FPS vào thẳng lõi AI
            guidance_scale=2.5,      # ĐÃ FIX: Hạ CFG xuống 2.5 để mở khóa chuyển động (CFG cao làm AI sợ sai nên đứng im)
            num_inference_steps=40,  # 40 steps là mức tối thiểu để khử nhiễu chuyển động dài
        ).frames[0]
        
        export_to_video(video, args.output, fps=export_fps)
        print(f"\nSUCCESS:{args.output}")
    except Exception as e:
        print(f"Lỗi khi sinh video: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
