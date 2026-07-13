import os

def download():
    print("Initializing VieNeu-TTS Model Download to Local Cache...")
    try:
        from vieneu import Vieneu
        tts = Vieneu()
        print("Success! Model is now cached locally.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    download()
