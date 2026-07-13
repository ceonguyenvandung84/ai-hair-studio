import sys
import argparse
import subprocess
import os

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description="Wan2.1 Video Generation Wrapper")
    parser.add_argument("--image", type=str, required=True, help="Path to input image")
    parser.add_argument("--prompt", type=str, required=True, help="Text prompt for video")
    parser.add_argument("--duration", type=int, default=4, help="Duration in seconds (4, 6, 8, 10)")
    parser.add_argument("--motion", type=int, default=50, help="Motion intensity (1-100)")
    parser.add_argument("--output", type=str, required=True, help="Path to output mp4 file")
    
    args = parser.parse_args()
    
    print("--------------------------------------------------")
    print(f"Kích hoạt Wan2.1 Thực sự (Image-to-Video)...")
    print(f"Ảnh đầu vào: {args.image}")
    print(f"Prompt: '{args.prompt}'")
    
    # Model Wan2.1 yêu cầu frame_num phải là số có dạng 4n+1
    # Quy đổi số giây sang frame (giả định 16fps)
    if args.duration == 4: frame_num = 65
    elif args.duration == 6: frame_num = 97
    elif args.duration == 8: frame_num = 129
    elif args.duration == 10: frame_num = 161
    else: frame_num = 81
    
    print(f"Thời gian render yêu cầu: {args.duration}s -> Cấu hình: {frame_num} frames")
    print("--------------------------------------------------")
    
    # Tìm thư mục Wan2.1 gốc
    wan_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'Wan2.1')
    wan_dir = os.path.abspath(wan_dir)
    
    # Giả định thư mục chứa weights là Wan2.1-I2V-14B-480P
    # (Nếu sếp để tên khác, sếp chỉ cần đổi tên thư mục trọng số cho khớp)
    ckpt_dir = os.path.join(wan_dir, "Wan2.1-I2V-14B-480P")
    
    # Lệnh gọi thẳng vào mã nguồn generate.py của Wan
    cmd = [
        "python", "generate.py",
        "--task", "i2v-14B",
        "--size", "832*480",
        "--ckpt_dir", ckpt_dir,
        "--image", os.path.abspath(args.image),
        "--prompt", args.prompt,
        "--frame_num", str(frame_num),
        "--save_file", os.path.abspath(args.output)
    ]
    
    print(f"Đang thực thi lệnh lõi:\n{' '.join(cmd)}")
    
    try:
        # Gọi tiến trình Wan2.1
        process = subprocess.Popen(cmd, cwd=wan_dir, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace')
        
        for line in process.stdout:
            print(f"[Wan2.1 Core] {line.strip()}")
            
        process.wait()
        
        if process.returncode == 0:
            print(f"\nSUCCESS:{args.output}")
        else:
            print(f"\nLỗi khi chạy Wan2.1 Core. Mã lỗi: {process.returncode}")
            sys.exit(1)
            
    except Exception as e:
        print(f"Ngoại lệ xảy ra: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
