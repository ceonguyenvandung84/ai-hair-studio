import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
from huggingface_hub import hf_hub_download

comfy_models_dir = r"C:\Users\TUAN CAN\.gemini\antigravity\scratch\ComfyUI\models"

downloads = [
    # Wan2.1
    ("Comfy-Org/Wan_2.1_ComfyUI_repackaged", "split_files/diffusion_models/wan2.1_i2v_480p_14B_fp16.safetensors", os.path.join(comfy_models_dir, "diffusion_models")),
    ("Comfy-Org/Wan_2.1_ComfyUI_repackaged", "split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors", os.path.join(comfy_models_dir, "text_encoders")),
    ("Comfy-Org/Wan_2.1_ComfyUI_repackaged", "split_files/vae/wan_2.1_vae.safetensors", os.path.join(comfy_models_dir, "vae")),
    ("Comfy-Org/Wan_2.1_ComfyUI_repackaged", "split_files/clip_vision/clip_vision_h.safetensors", os.path.join(comfy_models_dir, "clip_vision")),
    
    # HunyuanVideo (example, downloading the main weights)
    ("tencent/HunyuanVideo", "hunyuan-video-t2v-720p/hunyuan-video-t2v-720p.safetensors", os.path.join(comfy_models_dir, "diffusion_models")),
]

print("Bắt đầu tiến trình tải nền Wan2.1 và HunyuanVideo...")
for repo_id, filename, target_dir in downloads:
    print(f"Đang đồng bộ: {filename} vào {target_dir}")
    os.makedirs(target_dir, exist_ok=True)
    try:
        downloaded_path = hf_hub_download(
            repo_id=repo_id, 
            filename=filename, 
            local_dir=target_dir, 
            local_dir_use_symlinks=False
        )
        print(f"Hoàn thành: {downloaded_path}")
    except Exception as e:
        print(f"Lỗi tải {filename}: {e}")

print("Toàn bộ tiến trình tải đã hoàn tất.")
