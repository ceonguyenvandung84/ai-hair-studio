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

    print(f"Bắt đầu khởi động HunyuanVideo I2V Engine với prompt: {args.prompt}")
    
    print("Đang nạp HunyuanVideo I2V vào GPU (Hệ thống sẽ tự động tải ~30GB từ HuggingFace nếu chưa có)...")
    
    try:
        import torch
        from diffusers import HunyuanVideoImageToVideoPipeline
        from diffusers.utils import load_image, export_to_video

        # Sử dụng from_pretrained để tự động tải model I2V mới nhất từ Tencent
        pipe = HunyuanVideoImageToVideoPipeline.from_pretrained("tencent/HunyuanVideo-I2V", torch_dtype=torch.bfloat16)
        pipe.to("cuda")

        print("Đang nạp ảnh đầu vào...")
        image = load_image(args.image)

        num_frames = args.duration * 24
        print(f"Đang nội suy {num_frames} khung hình. Quá trình này có thể tốn khá nhiều thời gian...")

        video = pipe(
            image=image,
            prompt=args.prompt,
            height=720,
            width=1280,
            num_frames=num_frames,
            num_inference_steps=50,
        ).frames[0]

        export_to_video(video, args.output, fps=24)
        print(f"\nSUCCESS:{args.output}")

    except Exception as e:
        print(f"Error: Lỗi hệ thống khi sinh video bằng HunyuanVideo: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
