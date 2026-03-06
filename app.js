// ========== DOM Elements ==========
const micBtn = document.getElementById("mic-btn");
const micLabel = document.getElementById("mic-label");
const micIcon = micBtn.querySelector(".mic-icon");
const stopIcon = micBtn.querySelector(".stop-icon");
const recognitionOutput = document.getElementById("recognition-output");
const translationOutput = document.getElementById("translation-output");
const inputLangSelect = document.getElementById("input-lang");
const outputLangSelect = document.getElementById("output-lang");
const copyRecognitionBtn = document.getElementById("copy-recognition");
const copyTranslationBtn = document.getElementById("copy-translation");
const unsupportedBanner = document.getElementById("unsupported-banner");
const shortcutHint = document.getElementById("shortcut-hint");

// ========== State ==========
let isRecording = false;
let recognition = null;
let finalTranscript = "";
let accumulatedTranscript = ""; // persists across auto-restarts
let translateTimer = null;
let micPermissionGranted = false;

// ========== Browser Support Check ==========
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  unsupportedBanner.classList.remove("hidden");
  micBtn.disabled = true;
  micBtn.style.opacity = "0.4";
  micBtn.style.cursor = "not-allowed";
}

// ========== Microphone Permission ==========
async function ensureMicPermission() {
  if (micPermissionGranted) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately — we just needed the permission
    stream.getTracks().forEach((track) => track.stop());
    micPermissionGranted = true;
    return true;
  } catch (err) {
    console.error("Microphone permission denied:", err);
    micLabel.textContent = "マイクの権限を許可してください";
    micLabel.classList.add("error");
    return false;
  }
}

// ========== Speech Recognition Setup ==========
function createRecognition() {
  const rec = new SpeechRecognition();
  rec.lang = inputLangSelect.value;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    console.log("Speech recognition started");
  };

  rec.onresult = (event) => {
    let interim = "";
    let sessionFinal = "";

    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        sessionFinal += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }

    // Combine accumulated (from previous auto-restart sessions) + current session
    finalTranscript = accumulatedTranscript + sessionFinal;

    // Update UI
    recognitionOutput.innerHTML = "";
    if (finalTranscript) {
      const finalSpan = document.createElement("span");
      finalSpan.textContent = finalTranscript;
      recognitionOutput.appendChild(finalSpan);
    }
    if (interim) {
      const interimSpan = document.createElement("span");
      interimSpan.className = "interim";
      interimSpan.textContent = interim;
      recognitionOutput.appendChild(interimSpan);
    }
    if (!finalTranscript && !interim) {
      showPlaceholder(recognitionOutput, "ここに認識結果が表示されます...");
    }

    // Debounced translation
    scheduleTranslation(finalTranscript + interim);
  };

  rec.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    if (event.error === "not-allowed") {
      micLabel.textContent = "マイクの権限を許可してください";
      micLabel.classList.add("error");
      stopRecording();
    } else if (event.error === "no-speech") {
      // No speech detected — this is not fatal, just continue
      console.log("No speech detected, continuing...");
    } else if (event.error !== "aborted") {
      stopRecording();
    }
  };

  rec.onend = () => {
    console.log("Speech recognition ended, isRecording:", isRecording);
    // Auto-restart if still in recording mode (handles Chrome's ~60s cutoff)
    if (isRecording) {
      // Save final transcript from this session before restart
      accumulatedTranscript = finalTranscript;
      try {
        recognition = createRecognition();
        recognition.start();
      } catch (e) {
        console.error("Failed to restart recognition:", e);
        stopRecording();
      }
    }
  };

  return rec;
}

// ========== Recording Controls ==========
async function toggleRecording() {
  if (!SpeechRecognition) return;
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  // Request mic permission first
  const hasPermission = await ensureMicPermission();
  if (!hasPermission) return;

  finalTranscript = "";
  accumulatedTranscript = "";

  try {
    recognition = createRecognition();
    recognition.start();
    isRecording = true;

    micBtn.classList.add("recording");
    micIcon.classList.add("hidden");
    stopIcon.classList.remove("hidden");
    micLabel.textContent = "録音中... タップ or Ctrl+Shift+S で停止";
    micLabel.classList.add("recording");
    micLabel.classList.remove("error");
    recognitionOutput.innerHTML =
      '<span class="placeholder">聞き取り中...</span>';
  } catch (err) {
    console.error("Failed to start recognition:", err);
    micLabel.textContent = "録音開始に失敗しました。再度お試しください。";
    micLabel.classList.add("error");
    isRecording = false;
  }
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {
      // ignore
    }
    recognition = null;
  }

  micBtn.classList.remove("recording");
  micIcon.classList.remove("hidden");
  stopIcon.classList.add("hidden");
  micLabel.textContent = "タップ or Ctrl+Shift+S で録音開始";
  micLabel.classList.remove("recording");
  micLabel.classList.remove("error");

  // Final translation with confirmed text
  if (finalTranscript.trim()) {
    translateText(finalTranscript);
  }
}

// ========== Click & Touch Handlers ==========
micBtn.addEventListener("click", (e) => {
  e.preventDefault();
  toggleRecording();
});

// Prevent double-fire on touch devices
micBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  toggleRecording();
});

// ========== Global Keyboard Shortcut ==========
// Ctrl+Shift+S — works regardless of focus, even in select/input
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.code === "KeyS") {
    event.preventDefault();
    event.stopPropagation();
    toggleRecording();
    return;
  }

  // Space bar fallback (only when not focused on form controls)
  if (
    event.code === "Space" &&
    !["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(event.target.tagName)
  ) {
    event.preventDefault();
    toggleRecording();
  }
});

// ========== Translation ==========
function scheduleTranslation(text) {
  clearTimeout(translateTimer);
  if (!text.trim()) return;
  translateTimer = setTimeout(() => translateText(text), 500);
}

async function translateText(text) {
  if (!text.trim()) return;

  const sourceLang = inputLangSelect.value.split("-")[0]; // "ja-JP" -> "ja"
  const targetLang = outputLangSelect.value;

  // Skip if source and target are the same
  if (sourceLang === targetLang) {
    translationOutput.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = text;
    translationOutput.appendChild(span);
    return;
  }

  translationOutput.innerHTML =
    '<span class="placeholder">翻訳中...</span>';

  try {
    const url =
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData) {
      translationOutput.innerHTML = "";
      const span = document.createElement("span");
      span.textContent = data.responseData.translatedText;
      translationOutput.appendChild(span);
    } else {
      translationOutput.innerHTML =
        '<span class="placeholder">翻訳に失敗しました。もう一度お試しください。</span>';
    }
  } catch (error) {
    console.error("Translation error:", error);
    translationOutput.innerHTML =
      '<span class="placeholder">翻訳エラー: ネットワークを確認してください。</span>';
  }
}

// ========== Copy to Clipboard ==========
function copyToClipboard(element, btn) {
  const text = element.textContent.trim();
  if (!text || element.querySelector(".placeholder")) return;

  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add("copied");
    btn.querySelector("span").textContent = "コピー完了";
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.querySelector("span").textContent = "コピー";
    }, 1500);
  });
}

copyRecognitionBtn.addEventListener("click", () => {
  copyToClipboard(recognitionOutput, copyRecognitionBtn);
});

copyTranslationBtn.addEventListener("click", () => {
  copyToClipboard(translationOutput, copyTranslationBtn);
});

// ========== Language Change Handlers ==========
inputLangSelect.addEventListener("change", () => {
  if (isRecording) {
    stopRecording();
    startRecording();
  }
});

outputLangSelect.addEventListener("change", () => {
  const currentText = recognitionOutput.textContent.trim();
  if (currentText && !recognitionOutput.querySelector(".placeholder")) {
    translateText(currentText);
  }
});

// ========== Utility ==========
function showPlaceholder(element, text) {
  element.innerHTML = "";
  const span = document.createElement("span");
  span.className = "placeholder";
  span.textContent = text;
  element.appendChild(span);
}
