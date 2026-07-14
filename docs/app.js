const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const SYSTEM_PROMPT = "You are MurmurX: concise, helpful, no fluff. Return at most two sentences unless asked otherwise. If unsure, ask one clarifying question.";

const state = {
  mode: "idle",
  engine: null,
  history: [],
  busy: false,
  recognition: null,
};

const els = {
  shell: document.querySelector(".demo-shell"),
  engineBadge: document.querySelector("#engine-badge"),
  engineStatus: document.querySelector("#engine-status"),
  progress: document.querySelector("#load-progress"),
  loadModel: document.querySelector("#load-model"),
  guidedMode: document.querySelector("#guided-mode"),
  sessionMode: document.querySelector("#session-mode"),
  messages: document.querySelector("#messages"),
  input: document.querySelector("#message-input"),
  send: document.querySelector("#send-button"),
  mic: document.querySelector("#mic-button"),
  micLabel: document.querySelector("#mic-label"),
  voiceOutput: document.querySelector("#voice-output"),
  browserNote: document.querySelector("#browser-note"),
  stages: [...document.querySelectorAll("[data-stage]")],
  samples: [...document.querySelectorAll(".sample-prompts button")],
};

function setEngineMode(mode) {
  state.mode = mode;
  els.shell.dataset.engine = mode;
  const ready = mode === "qwen" || mode === "guided";
  els.input.disabled = !ready;
  els.send.disabled = !ready;
  els.mic.disabled = !ready || !state.recognition;
  els.input.placeholder = ready ? "Ask MurmurX anything…" : "Choose an engine, then ask MurmurX anything…";
  els.micLabel.textContent = !state.recognition
    ? "Speech input unavailable — type below"
    : ready
      ? "Tap, speak, then pause"
      : "Choose an engine first";
}

function setStage(stage) {
  els.stages.forEach((item) => item.classList.toggle("active", item.dataset.stage === stage));
}

function appendMessage(role, text = "", label = "") {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  if (state.mode === "guided" && role === "assistant") article.classList.add("guided");
  const meta = document.createElement("span");
  meta.textContent = label || (role === "user" ? "YOU / TRANSCRIPT" : state.mode === "qwen" ? "MURMURX / QWEN LITE" : "MURMURX / GUIDED PREVIEW");
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  article.append(meta, paragraph);
  els.messages.append(article);
  els.messages.scrollTop = els.messages.scrollHeight;
  return { article, paragraph };
}

function guidedReply(prompt) {
  const text = prompt.toLowerCase();
  if (text.includes("rag")) {
    return "RAG lets an AI look up useful information before it answers. It is like giving the model the right notes before asking the question.";
  }
  if (text.includes("morning") || text.includes("focus") || text.includes("plan")) {
    return "Pick one important outcome, protect a 60-minute focus block, then handle messages after it. Keep the plan small enough to finish.";
  }
  if (text.includes("private") || text.includes("privacy") || text.includes("local")) {
    return "Private AI keeps audio, prompts, and model work on your own device whenever possible. MurmurX is designed around that local loop.";
  }
  if (text.includes("hello") || text.includes("hi ") || text === "hi") {
    return "Hello — this is MurmurX's guided preview. Load Qwen Lite above when you want a real on-device model response.";
  }
  return "The guided preview can demonstrate the voice loop, but it does not pretend to be an AI model. Load Qwen Lite above for a real generated answer to that question.";
}

async function loadQwen() {
  if (state.busy || state.engine) return;
  if (!navigator.gpu) {
    els.engineBadge.textContent = "WEBGPU REQUIRED";
    els.engineStatus.textContent = "This browser cannot expose WebGPU to the model. Use a recent desktop Chrome, or open the guided preview now.";
    return;
  }
  state.busy = true;
  els.loadModel.disabled = true;
  els.engineBadge.textContent = "LOADING";
  els.engineStatus.textContent = "Loading the WebLLM runtime…";
  els.progress.style.width = "2%";
  setStage("reason");
  try {
    const { CreateMLCEngine } = await import("https://esm.run/@mlc-ai/web-llm@0.2.83");
    state.engine = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report) => {
        const value = Number.isFinite(report.progress) ? Math.round(report.progress * 100) : 4;
        els.progress.style.width = `${Math.max(2, value)}%`;
        els.engineStatus.textContent = report.text || `Preparing Qwen Lite… ${value}%`;
      },
    });
    els.progress.style.width = "100%";
    els.engineBadge.textContent = "QWEN READY";
    els.engineStatus.textContent = "Qwen Lite is loaded and cached by this browser. Your prompts and generated replies now stay on this device.";
    els.sessionMode.textContent = "REAL QWEN LITE / ON-DEVICE";
    els.loadModel.querySelector("span").textContent = "QWEN LITE READY";
    els.loadModel.querySelector("b").textContent = "Model loaded on this device";
    setEngineMode("qwen");
    setStage(null);
    appendMessage("assistant", "Qwen Lite is ready. Ask a short question by typing or using the microphone.", "SYSTEM / MODEL READY");
    els.input.focus();
  } catch (error) {
    state.engine = null;
    els.progress.style.width = "0";
    els.engineBadge.textContent = "LOAD FAILED";
    els.engineStatus.textContent = `Qwen Lite could not start: ${error.message}. The instant guided preview is still available.`;
    els.loadModel.disabled = false;
    setStage(null);
  } finally {
    state.busy = false;
  }
}

function openGuidedMode() {
  if (state.busy) return;
  speechSynthesis.cancel();
  els.engineBadge.textContent = "GUIDED MODE";
  els.engineStatus.textContent = "The instant preview is active. It demonstrates listening, transcription, and spoken output with clearly labelled example responses—not an AI model.";
  els.progress.style.width = "0";
  els.sessionMode.textContent = "GUIDED PREVIEW / NO MODEL";
  setEngineMode("guided");
  setStage(null);
  appendMessage("assistant", "Guided preview ready. Ask one of the sample questions, or load Qwen Lite for real model generation.");
  els.input.focus();
}

async function qwenReply(prompt, target) {
  const recent = state.history.slice(-6);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...recent,
    { role: "user", content: prompt },
  ];
  const chunks = await state.engine.chat.completions.create({
    messages,
    temperature: 0.45,
    max_tokens: 110,
    stream: true,
  });
  let reply = "";
  for await (const chunk of chunks) {
    reply += chunk.choices[0]?.delta?.content || "";
    target.textContent = reply;
    els.messages.scrollTop = els.messages.scrollHeight;
  }
  return reply.trim();
}

function speak(text) {
  if (!els.voiceOutput.checked || !text || !("speechSynthesis" in window)) {
    setStage(null);
    return;
  }
  setStage("speak");
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  utterance.pitch = 1;
  utterance.onend = () => setStage(null);
  utterance.onerror = () => setStage(null);
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

async function sendMessage() {
  const prompt = els.input.value.trim();
  if (!prompt || state.busy || (state.mode === "qwen" && !state.engine)) return;
  state.busy = true;
  els.send.disabled = true;
  els.mic.disabled = true;
  els.input.value = "";
  appendMessage("user", prompt);
  setStage("reason");
  const assistant = appendMessage("assistant", "", state.mode === "qwen" ? "MURMURX / QWEN LITE" : "MURMURX / GUIDED PREVIEW");
  assistant.article.classList.add("thinking");
  let reply = "";
  try {
    if (state.mode === "qwen") {
      reply = await qwenReply(prompt, assistant.paragraph);
      state.history.push({ role: "user", content: prompt }, { role: "assistant", content: reply });
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 420));
      reply = guidedReply(prompt);
      assistant.paragraph.textContent = reply;
    }
  } catch (error) {
    reply = `The model stopped before it could answer: ${error.message}`;
    assistant.paragraph.textContent = reply;
  } finally {
    assistant.article.classList.remove("thinking");
    state.busy = false;
    els.send.disabled = false;
    els.mic.disabled = !state.recognition;
    els.input.focus();
    speak(reply);
  }
}

function setupSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    els.browserNote.textContent = "This browser does not provide speech recognition. You can still type, run Qwen Lite locally, and hear spoken replies.";
    return;
  }
  const recognition = new Recognition();
  recognition.lang = "en-GB";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    els.shell.classList.add("is-listening");
    els.micLabel.textContent = "Listening… pause when finished";
    setStage("listen");
  };
  recognition.onresult = (event) => {
    const transcript = [...event.results].map((result) => result[0].transcript).join(" ");
    els.input.value = transcript;
    setStage("transcribe");
    if (event.results[event.results.length - 1].isFinal) {
      window.setTimeout(sendMessage, 180);
    }
  };
  recognition.onerror = (event) => {
    els.micLabel.textContent = event.error === "not-allowed" ? "Microphone permission was denied" : `Speech input stopped: ${event.error}`;
    setStage(null);
  };
  recognition.onend = () => {
    els.shell.classList.remove("is-listening");
    if (!state.busy) {
      els.micLabel.textContent = "Tap, speak, then pause";
      setStage(null);
    }
  };
  state.recognition = recognition;
}

els.loadModel.addEventListener("click", loadQwen);
els.guidedMode.addEventListener("click", openGuidedMode);
els.send.addEventListener("click", sendMessage);
els.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});
els.mic.addEventListener("click", () => {
  if (!state.recognition || state.busy) return;
  speechSynthesis.cancel();
  try {
    state.recognition.start();
  } catch {
    state.recognition.stop();
  }
});
els.samples.forEach((button) => {
  button.addEventListener("click", () => {
    els.input.value = button.textContent;
    if (state.mode === "idle") {
      els.engineStatus.textContent = "Choose real Qwen Lite or the guided preview before sending a prompt.";
      document.querySelector(".engine-panel").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    sendMessage();
  });
});
els.voiceOutput.addEventListener("change", () => {
  if (!els.voiceOutput.checked) speechSynthesis.cancel();
});
window.addEventListener("beforeunload", () => speechSynthesis.cancel());

setupSpeechRecognition();
setEngineMode("idle");
if (!navigator.gpu) {
  els.engineStatus.textContent = "Real Qwen Lite needs WebGPU, which this browser does not expose. The guided preview works immediately, and typed input still demonstrates the full interface.";
}
