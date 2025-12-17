import subprocess, shutil

MODEL = "qwen2.5:3b-instruct"   # pull this first, this is the QWEN model 3b (runs on mad m1 pro)
# This is the customisation the model has
SYS = ("You are MurmurX: concise, helpful, no fluff. "
       "Return ≤2 sentences unless asked otherwise. If unsure, ask 1 clarifying question.")

def ensure_ollama_running():
    # if port is busy assume running; otherwise let user run service
    return shutil.which("ollama") is not None

def chat(user: str, history: list[tuple[str,str]]):
    prompt = f"<|system|>\n{SYS}\n"
    for u,a in history[-3:]:
        prompt += f"<|user|>\n{u}\n<|assistant|>\n{a}\n"
    prompt += f"<|user|>\n{user}\n<|assistant|>\n"
    p = subprocess.Popen(["ollama","run",MODEL],
                         stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    out,_ = p.communicate(prompt)
    return (out or "").strip()
 