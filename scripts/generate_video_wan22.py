import sys
import argparse
import os

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, required=True)
    parser.add_argument("--prompt", type=str, required=True)
    parser.add_argument("--duration", type=int, default=4)
    parser.add_argument("--output", type=str, required=True)
    args = parser.parse_args()

    print(f"Bắt đầu khởi động Wan2.2 I2V Engine với prompt: {args.prompt}")
    print(f"Bắt đầu khởi động Wan2.2 I2V Engine với prompt: {args.prompt}")
    
    print("Đang nạp Wan2.2 14B vào GPU (Hệ thống sẽ tự động tải ~35GB từ HuggingFace nếu chưa có)...")
    
    try:
        import torch
        from diffusers import WanImageToVideoPipeline
        from diffusers.utils import load_image, export_to_video

        # Sử dụng from_pretrained do thư viện chưa hỗ trợ đọc file safetensors lẻ cho Wan
        pipe = WanImageToVideoPipeline.from_pretrained("Wan-AI/Wan2.2-I2V-A14B-Diffusers", torch_dtype=torch.bfloat16)
        pipe.to("cuda")

        print("Đang nạp ảnh đầu vào...")
        image = load_image(args.image)

        num_frames = args.duration * 24
        print(f"Đang nội suy {num_frames} khung hình. Quá trình này có thể tốn 5-15 phút...")

        video = pipe(
            image=image,
            prompt=args.prompt,
            negative_prompt="worst quality, blurry, distorted, deformation",
            height=720,
            width=1280,
            num_frames=num_frames,
            num_inference_steps=50,
            guidance_scale=7.0
        ).frames[0]

        export_to_video(video, args.output, fps=24)
        print(f"\nSUCCESS:{args.output}")

    except Exception as e:
        print(f"Error: Lỗi hệ thống khi sinh video bằng Wan2.2: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
