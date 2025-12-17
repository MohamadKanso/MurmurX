import subprocess

def speak(text: str):
    if not text: return
    try:
        subprocess.run(["say", text], check=False)
    except Exception:
        pass
