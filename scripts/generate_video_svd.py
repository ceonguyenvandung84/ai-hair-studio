import argparse
import sys
import codecs
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

import torch
from diffusers import StableVideoDiffusionPipeline
from diffusers.utils import export_to_video, load_image

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, required=True)
    parser.add_argument("--prompt", type=str, default="")
    parser.add_argument("--duration", type=int, default=4)
    parser.add_argument("--output", type=str, default="output.mp4")
    args = parser.parse_args()

    print("Loading Stable Video Diffusion Core (SVD-XT 1.1 Unlocked)...")
    try:
        # Sử dụng bản Mirror không bị khóa bản quyền (Ungated)
        pipe = StableVideoDiffusionPipeline.from_pretrained(
            "vdo/stable-video-diffusion-img2vid-xt-1-1", 
            torch_dtype=torch.float16, 
            variant="fp16"
        )
        pipe.enable_model_cpu_offload()
    except Exception as e:
        print(f"Error loading SVD: {e}")
        sys.exit(1)

    print("Preparing input image (SVD portrait 512x768)...")
    try:
        image = load_image(args.image).convert("RGB")
        # SVD có thể tự resize, nhưng ta ép 512x768 (hoặc 576x1024) để tránh lỗi méo ảnh
        # 512x768 là chuẩn dọc 9:16 rất an toàn cho SVD
        image = image.resize((512, 768), resample=3)
    except Exception as e:
        print(f"Error processing image: {e}")
        sys.exit(1)

    print("Activating Motion Bucket (Generating Video)...")
    try:
        video_frames = pipe(
            image, 
            decode_chunk_size=8,
            generator=torch.manual_seed(42),
            motion_bucket_id=127,
            noise_aug_strength=0.02,
            height=768,
            width=512,
            num_frames=25
        ).frames[0]
        
        export_to_video(video_frames, args.output, fps=6)
        print(f"\nSUCCESS:{args.output}")
    except Exception as e:
        print(f"Error generating video: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
