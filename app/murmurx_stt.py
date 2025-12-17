import subprocess, tempfile, os, wave, shutil

# Candidate binaries (order matters)
CANDIDATES = [
    # Homebrew install
    "/opt/homebrew/bin/whisper-cpp",
    "/usr/local/bin/whisper-cpp",
    # Local repo builds
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "whisper.cpp", "build", "bin", "whisper-cli")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "whisper.cpp", "build", "bin", "main")),
]

def _find_bin():
    for p in CANDIDATES:
        if p and os.path.exists(p) and os.access(p, os.X_OK):
            return p
    # last resort: PATH lookup
    p = shutil.which("whisper-cpp") or shutil.which("whisper-cli") or shutil.which("whisper")
    if p:
        return p
    raise FileNotFoundError(
        "whisper.cpp CLI not found.\n"
        "Tried:\n- " + "\n- ".join(CANDIDATES) + "\n"
        "Fix: brew install whisper-cpp  (or build in ~/Documents/whisper.cpp with `make -j`)."
    )

WHISPER_BIN = _find_bin()
WHISPER_MODEL = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "whisper.cpp", "models", "ggml-small.en.bin"))

def transcribe_pcm16(audio_pcm16: bytes, sr=16000) -> str:
    # write PCM16 bytes to a temp WAV, normalize with ffmpeg, run whisper.cpp, read .txt
    with tempfile.TemporaryDirectory() as td:
        raw_wav = os.path.join(td, "in.wav")
        with wave.open(raw_wav, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(audio_pcm16)

        norm_wav = os.path.join(td, "in_16k.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw_wav, "-ac", "1", "-ar", "16000", norm_wav], check=True)

        out_prefix = os.path.join(td, "out")
        cmd = [WHISPER_BIN, "-m", WHISPER_MODEL, "-f", norm_wav, "-otxt", "-of", out_prefix]
        subprocess.run(cmd, check=True)

        with open(out_prefix + ".txt", "r") as f:
            return f.read().strip()
