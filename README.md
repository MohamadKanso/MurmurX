# MurmurX

**MurmurX is a small voice assistant that runs on your own computer.**

You speak. MurmurX turns your voice into text, asks a local AI model for an
answer, and reads the answer back to you.

No MurmurX account is needed. The desktop app does not send your conversation
to an app server.

## Try it now

**[Open the live MurmurX voice lab →](https://mohamadkanso.github.io/MurmurX/)**

The live website gives you two choices:

1. **Real Qwen Lite** — loads Qwen 2.5 0.5B into a compatible browser and runs
   the model on your device with WebGPU.
2. **Guided preview** — opens immediately and demonstrates the voice interface
   with clearly labelled example replies. It does not pretend to be an AI model.

The website uses the smaller 0.5B Qwen model because it can run on more laptops.
The full desktop project uses Qwen 2.5 3B.

For voice input, tap the microphone once to start listening. Speak for as long
as you need, including pauses, then tap it again to stop and send the transcript.

> Browser microphone transcription may use your browser provider's speech
> service. Typed messages and Qwen Lite inference stay in the browser tab.

## What MurmurX does

MurmurX has four simple steps:

| Step | What happens | Tool used by the desktop app |
| --- | --- | --- |
| 1. Listen | Records your microphone and stops after you become quiet | PyAudio + WebRTC VAD |
| 2. Transcribe | Changes the recorded sound into text | Whisper.cpp `small.en` |
| 3. Think | Creates a short, helpful reply | Qwen 2.5 3B through Ollama |
| 4. Speak | Reads the reply out loud | macOS `say` command |

The loop then starts again, so you can continue the conversation.

## Why it exists

Many voice assistants depend on a company server. Your sound, transcript, and
question may leave your device before you receive an answer.

MurmurX explores a different idea: keep the important work close to the user.
The full desktop pipeline runs its speech recognition and language model on the
same computer that records the audio.

This makes the system useful for learning about:

- offline speech recognition;
- local language models;
- voice activity detection;
- short conversation memory;
- text-to-speech; and
- privacy-first AI design.

## Desktop setup for beginners

These instructions are for macOS. An Apple Silicon Mac is recommended.

### 1. Install the system tools

Install [Homebrew](https://brew.sh/) first if you do not already have it. Then
run:

```bash
brew install python@3.11 portaudio ffmpeg whisper-cpp ollama
```

What each tool does:

- `python@3.11` runs the MurmurX code;
- `portaudio` lets Python use your microphone;
- `ffmpeg` converts recordings into the format Whisper expects;
- `whisper-cpp` turns speech into text locally; and
- `ollama` runs Qwen locally.

### 2. Download this project

```bash
git clone https://github.com/MohamadKanso/MurmurX.git
cd MurmurX
```

### 3. Create a clean Python environment

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

The environment keeps MurmurX packages separate from your other Python work.

### 4. Download the Whisper model

The model is large, so it is not stored in this Git repository.

```bash
mkdir -p whisper.cpp/models
curl -L \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin \
  -o whisper.cpp/models/ggml-small.en.bin
```

The `small.en` model is roughly 466 MB on disk. It is English-only and uses
about 852 MB of memory while running.

### 5. Download the local Qwen model

Start Ollama in one terminal:

```bash
ollama serve
```

Open a second terminal, return to the MurmurX folder, and run:

```bash
ollama pull qwen2.5:3b-instruct
```

You only need to download the model once.

### 6. Start MurmurX

With the Python environment active:

```bash
python -m app.murmurx
```

MurmurX will show:

```text
Speak to MurmurX (auto-stop on silence)
```

Speak normally. After about 600 milliseconds of silence, MurmurX stops
recording, creates the transcript, asks Qwen, and reads the reply aloud.

Press Enter to speak again. Type `q` to quit.

## Example conversation

```text
You: Explain RAG in simple English.

MurmurX: RAG lets an AI look up useful information before it answers. It is
like giving the model the right notes before asking the question.
```

The system instruction asks MurmurX to use no more than two sentences unless
you ask for more detail.

## How conversation memory works

MurmurX keeps the latest three question-and-answer pairs in memory while the
program is open.

This gives the model enough context for short follow-up questions without
building a large permanent conversation history. The current code does not save
that history to a database.

## Project files

```text
app/
  audio_io.py       records 16 kHz microphone audio until silence
  murmurx_stt.py    sends a temporary WAV file to Whisper.cpp
  llm.py            sends the prompt and short history to local Qwen
  tts.py            reads the answer with the macOS system voice
  murmurx.py        connects the four steps into one loop

docs/
  index.html        live browser demo
  styles.css        demo design and responsive layout
  app.js            microphone, WebLLM, Qwen Lite, and spoken replies
```

## Privacy: what stays local?

### Full desktop app

- Microphone recording: local
- Whisper transcription: local
- Qwen 2.5 3B inference: local through Ollama
- Spoken reply: local through macOS
- Conversation database: none

### Browser demo

- Typed message: remains in the tab
- Qwen Lite inference: local after model files are downloaded
- Spoken reply: generated by the browser
- Microphone transcription: depends on the browser and may use its provider
- Guided preview: uses transparent example logic, not an AI model

## Troubleshooting

### `PyAudio` will not install

Make sure PortAudio is installed first:

```bash
brew install portaudio
python -m pip install pyaudio
```

### `whisper.cpp CLI not found`

Check the Homebrew command:

```bash
which whisper-cli
which whisper-cpp
```

If neither command appears, reinstall it:

```bash
brew reinstall whisper-cpp
```

### `ggml-small.en.bin` is missing

The file must be here:

```text
MurmurX/whisper.cpp/models/ggml-small.en.bin
```

Run step 4 again if it is missing or has a size of zero bytes.

### `ollama: command not found`

Install Ollama and confirm it works:

```bash
brew install ollama
ollama --version
```

### Qwen is not available

List the downloaded models:

```bash
ollama list
```

If `qwen2.5:3b-instruct` is not shown, download it again:

```bash
ollama pull qwen2.5:3b-instruct
```

### The microphone is silent

Open **System Settings → Privacy & Security → Microphone** and allow your
terminal application to use the microphone.

## Current limits

- The desktop text-to-speech code currently targets macOS.
- The included Whisper model is English-only.
- The program handles one person speaking at a time.
- The current conversation history disappears when the program closes.
- The browser's real Qwen mode needs a recent WebGPU-compatible laptop.

## Technology

- Python
- PyAudio
- WebRTC VAD
- Whisper.cpp
- FFmpeg
- Ollama
- Qwen 2.5
- WebLLM for the browser demo
- Browser Speech APIs

## License and use

This repository is an educational local-AI project. Review the licenses of
Whisper.cpp, Qwen, Ollama, WebLLM, and any downloaded model files before using
the system in another product.
