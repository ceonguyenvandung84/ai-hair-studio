import os
import sys
import argparse
from vieneu import Vieneu

def generate_audio(text, output_file, ref_audio=None, voice_name=None, speed=1.0):
    try:
        # Khởi tạo mô hình (Mặc định là v3 Turbo)
        tts = Vieneu()
        
        # Tạo âm thanh
        if ref_audio:
            # Chế độ Clone Voice
            audio = tts.infer(text=text, ref_audio=ref_audio, speed=speed)
        elif voice_name:
            # Chế độ Giọng Mẫu
            audio = tts.infer(text=text, voice=voice_name, speed=speed)
        else:
            # Mặc định
            audio = tts.infer(text=text, speed=speed)
            
        # Lưu file
        tts.save(audio, output_file)
        print(f"SUCCESS:{output_file}")
    except Exception as e:
        print(f"ERROR:{str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VieNeu-TTS CLI Generator")
    parser.add_argument("--text", type=str, default="", help="Văn bản cần đọc")
    parser.add_argument("--text_file", type=str, default=None, help="File chứa văn bản cần đọc")
    parser.add_argument("--output", type=str, required=True, help="Đường dẫn file đầu ra (.wav)")
    parser.add_argument("--ref_audio", type=str, default=None, help="Đường dẫn file âm thanh mẫu để Clone")
    parser.add_argument("--voice", type=str, default=None, help="Tên giọng mẫu có sẵn (VD: Ngọc Lan)")
    parser.add_argument("--speed", type=float, default=1.0, help="Tốc độ đọc")
    
    args = parser.parse_args()
    
    text_content = args.text
    if args.text_file and os.path.exists(args.text_file):
        with open(args.text_file, 'r', encoding='utf-8') as f:
            text_content = f.read()

    generate_audio(
        text=text_content,
        output_file=args.output,
        ref_audio=args.ref_audio,
        voice_name=args.voice,
        speed=args.speed
    )
