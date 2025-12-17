from app.audio_io import record_until_silence
from app.murmurx_stt import transcribe_pcm16
from app.tts import speak
from app.llm import chat

HIST: list[tuple[str,str]] = []

def run_once():
    print("🎤 Speak to MurmurX (auto-stop on silence)")
    pcm = record_until_silence()
    text = transcribe_pcm16(pcm)
    
    # Need to make the LLM wait and listen for x amount of time before moving on and saying '…no speech detected.'
    if not text:
        print("…no speech detected."); return
    print(f"📝 {text}")
    reply = chat(text, HIST)
    HIST.append((text, reply))
    print(f"🤖 {reply}")
    speak(reply)

if __name__ == "__main__":
    try:
        while True:
            run_once()
            ans = input("↩︎ Enter = speak again | q = quit: ").strip().lower()
            if ans == "q":
                break
    except KeyboardInterrupt:
        print("\nInterrupted. Exiting cleanly.")
