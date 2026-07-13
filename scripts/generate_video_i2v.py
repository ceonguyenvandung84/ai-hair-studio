import argparse
import sys
import codecs
# Ép Terminal xuất log bằng UTF-8 để chống lỗi cp1252 trên Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

import torch
from diffusers import I2VGenXLPipeline
from diffusers.utils import export_to_video, load_image

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, required=True)
    parser.add_argument("--prompt", type=str, default="smiling, highly detailed, dynamic motion, fast panning camera, active scene") 
    parser.add_argument("--duration", type=int, default=4)
    parser.add_argument("--output", type=str, default="output.mp4")
    args = parser.parse_args()

    print("Loading I2VGen-XL Core (Alibaba)...")
    try:
        pipe = I2VGenXLPipeline.from_pretrained(
            "ali-vilab/i2vgen-xl", 
            torch_dtype=torch.float16, 
            variant="fp16"
        )
        pipe.enable_model_cpu_offload()
    except Exception as e:
        print(f"Error loading model: {e}")
        sys.exit(1)

    print("Preparing input image...")
    try:
        image = load_image(args.image).convert("RGB")
        # Ép cứng độ phân giải về chuẩn 512x768 (Portrait)
        # Nếu không ép cứng, I2VGen-XL sẽ tự động kéo giãn ngang thành 1280x704 gây méo và ám xanh
        image = image.resize((512, 768), resample=3)
    except Exception as e:
        print(f"Error loading image: {e}")
        sys.exit(1)

    print("Generating cinematic motion...")
    try:
        safe_prompt = str(args.prompt)[:200]
        safe_negative = "blurry, static, ugly, bad anatomy, deformed, motionless"
        
        def get_embeds(pipe_obj, p, np):
            t_in = pipe_obj.tokenizer(p, padding='max_length', max_length=pipe_obj.tokenizer.model_max_length, truncation=True, return_tensors='pt')
            p_emb = pipe_obj.text_encoder(t_in.input_ids.to(pipe_obj.device))[0]
            
            u_in = pipe_obj.tokenizer(np, padding='max_length', max_length=pipe_obj.tokenizer.model_max_length, truncation=True, return_tensors='pt')
            n_emb = pipe_obj.text_encoder(u_in.input_ids.to(pipe_obj.device))[0]
            return p_emb, n_emb
            
        p_emb, n_emb = get_embeds(pipe, safe_prompt, safe_negative)
        
        video_frames = pipe(
            prompt_embeds=p_emb,
            negative_prompt_embeds=n_emb,
            image=image,
            height=768,
            width=512,
            num_inference_steps=50,
            guidance_scale=9.0,
            generator=torch.manual_seed(8888)
        ).frames[0]
        
        export_fps = max(4, round(16 / args.duration))
        export_to_video(video_frames, args.output, fps=export_fps)
        print(f"\nSUCCESS:{args.output}")
    except Exception as e:
        print(f"Error generating video: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
