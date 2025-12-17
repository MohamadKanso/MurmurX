import pyaudio, webrtcvad, time

RATE=16000; CH=1; CHUNK=160   # 10 ms chunks
VAD = webrtcvad.Vad(2)        # 0..3 (3 = most aggressive)

def record_until_silence(max_secs=12, silence_ms=600) -> bytes:
    pa = pyaudio.PyAudio()
    stream = pa.open(format=pyaudio.paInt16, channels=CH, rate=RATE,
                     input=True, frames_per_buffer=CHUNK)
    data = bytearray()
    start = time.time()
    silence_chunks, need = 0, silence_ms // 10
    try:
        while True:
            buf = stream.read(CHUNK, exception_on_overflow=False)
            data.extend(buf)
            speech = VAD.is_speech(buf, RATE)
            silence_chunks = 0 if speech else (silence_chunks + 1)
            if silence_chunks >= need: break
            if (time.time() - start) > max_secs: break
    finally:
        stream.stop_stream(); stream.close(); pa.terminate()
    return bytes(data)
