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
const autoCopyToggle = document.getElementById("auto-copy-toggle");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");
const toast = document.getElementById("toast");

// ========== State ==========
let isRecording = false;
let recognition = null;
let finalTranscript = "";
let accumulatedTranscript = "";
let translateTimer = null;
let micPermissionGranted = false;

// ========== Constants ==========
const HISTORY_KEY = "voiceInputHistory";
const HISTORY_TTL = 60 * 60 * 1000; // 1 hour in ms
const MIC_PERM_KEY = "voiceInputMicGranted";
const AUTO_COPY_KEY = "voiceInputAutoCopy";

// ========== Browser Support Check ==========
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  unsupportedBanner.classList.remove("hidden");
  micBtn.disabled = true;
  micBtn.style.opacity = "0.4";
  micBtn.style.cursor = "not-allowed";
}

// ========== Restore Settings ==========
// Auto-copy toggle
if (localStorage.getItem(AUTO_COPY_KEY) === "true") {
  autoCopyToggle.checked = true;
}
autoCopyToggle.addEventListener("change", () => {
  localStorage.setItem(AUTO_COPY_KEY, autoCopyToggle.checked);
});

// ========== Microphone Permission ==========
// Check if previously granted and auto-request
(async function initMicPermission() {
  if (localStorage.getItem(MIC_PERM_KEY) === "true") {
    // Previously granted — try to silently confirm
    try {
      const result = await navigator.permissions.query({ name: "microphone" });
      if (result.state === "granted") {
        micPermissionGranted = true;
      }
    } catch (e) {
      // permissions.query not supported — will ask on first use
    }
  }
})();

async function ensureMicPermission() {
  if (micPermissionGranted) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    micPermissionGranted = true;
    localStorage.setItem(MIC_PERM_KEY, "true");
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
      console.log("No speech detected, continuing...");
    } else if (event.error !== "aborted") {
      stopRecording();
    }
  };

  rec.onend = () => {
    if (isRecording) {
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
    micLabel.textContent = "録音中... タップ or Alt+R で停止";
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
  micLabel.textContent = "タップ or Alt+R で録音開始";
  micLabel.classList.remove("recording");
  micLabel.classList.remove("error");

  // Final translation & auto-copy
  if (finalTranscript.trim()) {
    translateText(finalTranscript, true); // true = save to history
    if (autoCopyToggle.checked) {
      autoCopyToClipboard(finalTranscript);
    }
  }
}

// ========== Click & Touch Handlers ==========
micBtn.addEventListener("click", (e) => {
  e.preventDefault();
  toggleRecording();
});

micBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  toggleRecording();
});

// ========== Global Keyboard Shortcuts ==========
// Alt+R — toggle recording (no conflict with browser shortcuts)
// Alt+C — copy latest translation/recognition to clipboard
// Space  — toggle recording (when not in form control)
document.addEventListener("keydown", (event) => {
  // Alt+R: toggle recording
  if (event.altKey && !event.ctrlKey && !event.shiftKey && event.code === "KeyR") {
    event.preventDefault();
    event.stopPropagation();
    toggleRecording();
    return;
  }

  // Alt+C: copy latest result to clipboard
  if (event.altKey && !event.ctrlKey && !event.shiftKey && event.code === "KeyC") {
    event.preventDefault();
    event.stopPropagation();
    // Prefer translation, fallback to recognition
    const transText = getTextContent(translationOutput);
    const recogText = getTextContent(recognitionOutput);
    const textToCopy = transText || recogText;
    if (textToCopy) {
      autoCopyToClipboard(textToCopy);
    }
    return;
  }

  // Space bar (when not in form controls)
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
  translateTimer = setTimeout(() => translateText(text, false), 500);
}

async function translateText(text, saveToHistory) {
  if (!text.trim()) return;

  const sourceLang = inputLangSelect.value.split("-")[0];
  const targetLang = outputLangSelect.value;

  if (sourceLang === targetLang) {
    translationOutput.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = text;
    translationOutput.appendChild(span);
    if (saveToHistory) {
      addHistory(text, text, inputLangSelect.value, outputLangSelect.value);
    }
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
      const translated = data.responseData.translatedText;
      translationOutput.innerHTML = "";
      const span = document.createElement("span");
      span.textContent = translated;
      translationOutput.appendChild(span);

      if (saveToHistory) {
        addHistory(text, translated, inputLangSelect.value, outputLangSelect.value);
      }

      // Auto-copy translation if enabled
      if (saveToHistory && autoCopyToggle.checked) {
        autoCopyToClipboard(translated);
      }
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

function autoCopyToClipboard(text) {
  if (!text.trim()) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast("クリップボードにコピーしました");
  });
}

function getTextContent(element) {
  if (element.querySelector(".placeholder")) return "";
  return element.textContent.trim();
}

copyRecognitionBtn.addEventListener("click", () => {
  copyToClipboard(recognitionOutput, copyRecognitionBtn);
});

copyTranslationBtn.addEventListener("click", () => {
  copyToClipboard(translationOutput, copyTranslationBtn);
});

// ========== Toast Notification ==========
let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 1500);
}

// ========== History (localStorage, 1-hour TTL) ==========
function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    const now = Date.now();
    // Filter out expired entries
    return items.filter((item) => now - item.timestamp < HISTORY_TTL);
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

function addHistory(original, translated, inputLang, outputLang) {
  const items = getHistory();
  items.unshift({
    original,
    translated,
    inputLang,
    outputLang,
    timestamp: Date.now(),
  });
  // Keep max 50 items
  if (items.length > 50) items.length = 50;
  saveHistory(items);
  renderHistory();
}

function renderHistory() {
  const items = getHistory();
  historyList.innerHTML = "";

  if (items.length === 0) {
    const span = document.createElement("span");
    span.className = "placeholder";
    span.textContent = "まだ履歴がありません";
    historyList.appendChild(span);
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";

    const time = new Date(item.timestamp);
    const timeStr = time.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });

    div.innerHTML = "";
    const timeEl = document.createElement("div");
    timeEl.className = "history-item-time";
    timeEl.textContent = timeStr;
    div.appendChild(timeEl);

    const origEl = document.createElement("div");
    origEl.className = "history-item-original";
    origEl.textContent = item.original;
    div.appendChild(origEl);

    const transEl = document.createElement("div");
    transEl.className = "history-item-translated";
    transEl.textContent = item.translated;
    div.appendChild(transEl);

    const langsEl = document.createElement("div");
    langsEl.className = "history-item-langs";
    langsEl.textContent = `${item.inputLang} → ${item.outputLang}`;
    div.appendChild(langsEl);

    // Click to copy translation
    div.addEventListener("click", () => {
      autoCopyToClipboard(item.translated);
    });

    historyList.appendChild(div);
  });
}

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

// Render on load
renderHistory();

// Periodic cleanup (every 5 min, remove expired)
setInterval(() => {
  const items = getHistory(); // getHistory already filters expired
  saveHistory(items);
  renderHistory();
}, 5 * 60 * 1000);

// ========== Language Change Handlers ==========
inputLangSelect.addEventListener("change", () => {
  if (isRecording) {
    stopRecording();
    startRecording();
  }
});

outputLangSelect.addEventListener("change", () => {
  const currentText = getTextContent(recognitionOutput);
  if (currentText) {
    translateText(currentText, false);
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
