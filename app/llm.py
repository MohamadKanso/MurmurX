import shutil
import subprocess

MODEL = "qwen2.5:3b-instruct"
SYS = (
    "You are MurmurX: concise, helpful, no fluff. "
    "Return ≤2 sentences unless asked otherwise. If unsure, ask 1 clarifying question."
)


def ensure_ollama_running() -> None:
    """Raise a beginner-friendly error when Ollama is not installed."""
    if shutil.which("ollama") is None:
        raise RuntimeError(
            "Ollama was not found. Install it with 'brew install ollama', "
            "then run 'ollama serve' and 'ollama pull qwen2.5:3b-instruct'."
        )


def chat(user: str, history: list[tuple[str, str]]) -> str:
    ensure_ollama_running()
    prompt = f"<|system|>\n{SYS}\n"
    for u,a in history[-3:]:
        prompt += f"<|user|>\n{u}\n<|assistant|>\n{a}\n"
    prompt += f"<|user|>\n{user}\n<|assistant|>\n"
    p = subprocess.Popen(
        ["ollama", "run", MODEL],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    out, error = p.communicate(prompt)
    if p.returncode:
        raise RuntimeError((error or "Ollama could not run the Qwen model.").strip())
    return (out or "").strip()
