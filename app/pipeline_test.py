import os, subprocess, tempfile
import sounddevice as sd, numpy as np, wavio

SR = 16000
WHISPER_BIN = "../whisper.cpp/build/bin/whisper-cli"
WHISPER_MODEL = "../whisper.cpp/models/ggml-base.en.bin"

def record(seconds=4):
    os.makedirs("results", exist_ok=True)
    print("🎤 Speak now…")
    audio = sd.rec(int(seconds*SR), samplerate=SR, channels=1, dtype='float32')
    sd.wait()
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    wavio.write(tmp, audio, SR, sampwidth=2)
    return tmp

def transcribe(wav_path):
    norm = wav_path.replace(".wav","_16k.wav")
    subprocess.run(["ffmpeg","-y","-i",wav_path,"-ac","1","-ar",str(SR),norm], check=True)
    out_prefix = tempfile.NamedTemporaryFile(delete=False).name
    cmd = [WHISPER_BIN, "-m", WHISPER_MODEL, "-f", norm, "-otxt", "-of", out_prefix]
    subprocess.run(cmd, check=True)
    with open(out_prefix + ".txt","r") as f:
        return f.read().strip()

def ollama_chat(prompt, model="qwen2:1.5b"):
    proc = subprocess.Popen(["ollama","run",model], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    out,_ = proc.communicate(prompt)
    return out.strip()

if __name__ == "__main__":
    wav = record(4)
    user_text = transcribe(wav)
    print(f"\n📝 Transcript: {user_text}\n")
    prompt = f"You are MurmurX, a concise, helpful local voice AI. User said: '{user_text}'. Reply briefly."
    reply = ollama_chat(prompt)
    print(f"🤖 MurmurX: {reply}\n")
