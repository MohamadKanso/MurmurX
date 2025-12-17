import sounddevice as sd, numpy as np, wavio, os
os.makedirs("results", exist_ok=True)
SR=16000; SECS=3
print("Recording 3s…")
audio = sd.rec(int(SECS*SR), samplerate=SR, channels=1, dtype='float32')
sd.wait()
wavio.write("results/mic_test.wav", audio, SR, sampwidth=2)
print("Saved results/mic_test.wav")
print("Playback…")
sd.play(audio, SR); sd.wait()
print("Done.")
