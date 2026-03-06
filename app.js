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
const shortcutHint = document.getElementById("shortcut-hint");

// ========== State ==========
let isRecording = false;
let recognition = null;
let finalTranscript = "";
let accumulatedTranscript = "";
let translateTimer = null;
let micPermissionGranted = false;

// ========== Platform / OS Detection ==========
const ua = navigator.userAgent;
const isElectron = ua.includes("Electron");
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const isMobile = isIOS || isAndroid || ("ontouchstart" in window && window.innerWidth < 768);
const isMac = !isMobile && /Mac/.test(navigator.platform);
// isWindows/Linux = desktop but not Mac

const platform = (() => {
  if (isElectron) return "electron";
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  if (isMac) return "mac";
  return "windows"; // default desktop
})();

// Platform-specific labels
const labels = (() => {
  switch (platform) {
    case "ios":
    case "android":
      return {
        tapStart: "タップして録音開始",
        tapStop: "録音中... タップして停止",
        shortcutHTML: "", // no keyboard shortcuts on mobile
      };
    case "mac":
      return {
        tapStart: "クリック or ⌥R で録音開始",
        tapStop: "録音中... クリック or ⌥R で停止",
        shortcutHTML:
          '<kbd>⌥</kbd><kbd>R</kbd> 録音 &nbsp;|&nbsp; <kbd>⌥</kbd><kbd>C</kbd> コピー &nbsp;|&nbsp; <kbd>Space</kbd> でも操作可',
      };
    case "electron":
      return {
        tapStart: "クリック or Alt+R で録音開始",
        tapStop: "録音中... クリック or Alt+R で停止",
        shortcutHTML:
          '<kbd>Alt</kbd>+<kbd>R</kbd> 録音（グローバル） &nbsp;|&nbsp; <kbd>Alt</kbd>+<kbd>C</kbd> コピー',
      };
    default: // windows / linux
      return {
        tapStart: "クリック or Alt+R で録音開始",
        tapStop: "録音中... クリック or Alt+R で停止",
        shortcutHTML:
          '<kbd>Alt</kbd>+<kbd>R</kbd> 録音 &nbsp;|&nbsp; <kbd>Alt</kbd>+<kbd>C</kbd> コピー &nbsp;|&nbsp; <kbd>Space</kbd> でも操作可',
      };
  }
})();

// Apply platform-specific UI on load
micLabel.textContent = labels.tapStart;
if (shortcutHint) {
  if (labels.shortcutHTML) {
    shortcutHint.innerHTML = labels.shortcutHTML;
  } else {
    shortcutHint.style.display = "none";
  }
}

// Add platform class to body for CSS hooks
document.body.classList.add("platform-" + platform);
if (isMobile) document.body.classList.add("is-mobile");

// ========== Constants ==========
const HISTORY_KEY = "voiceInputHistory";
const HISTORY_TTL = 60 * 60 * 1000; // 1 hour
const MIC_PERM_KEY = "voiceInputMicGranted";
const AUTO_COPY_KEY = "voiceInputAutoCopy";

// ========== Browser Support Check ==========
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  unsupportedBanner.classList.remove("hidden");
  // iOS-specific message
  if (isIOS) {
    unsupportedBanner.textContent =
      "iOSのSafariでは音声認識APIが制限されています。Androidまたはデスクトップ版Chromeをお使いください。";
  }
  micBtn.disabled = true;
  micBtn.style.opacity = "0.4";
  micBtn.style.cursor = "not-allowed";
}

// ========== Restore Settings ==========
if (localStorage.getItem(AUTO_COPY_KEY) === "true") {
  autoCopyToggle.checked = true;
}
autoCopyToggle.addEventListener("change", () => {
  localStorage.setItem(AUTO_COPY_KEY, autoCopyToggle.checked);
});

// ========== Microphone Permission ==========
(async function initMicPermission() {
  if (isElectron) {
    micPermissionGranted = true;
    return;
  }
  if (localStorage.getItem(MIC_PERM_KEY) === "true") {
    try {
      const result = await navigator.permissions.query({ name: "microphone" });
      if (result.state === "granted") {
        micPermissionGranted = true;
      }
    } catch (e) {
      // permissions.query not supported (e.g. iOS) — will ask on first use
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
  // On mobile: non-continuous mode is more reliable
  rec.continuous = !isMobile;
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

    scheduleTranslation(finalTranscript + interim);
  };

  rec.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    if (event.error === "not-allowed") {
      micLabel.textContent = "マイクの権限を許可してください";
      micLabel.classList.add("error");
      stopRecording();
    } else if (event.error === "no-speech") {
      // Not fatal on desktop; on mobile, restart
      if (isMobile && isRecording) {
        accumulatedTranscript = finalTranscript;
        restartRecognition();
      }
    } else if (event.error !== "aborted") {
      stopRecording();
    }
  };

  rec.onend = () => {
    if (isRecording) {
      accumulatedTranscript = finalTranscript;
      restartRecognition();
    }
  };

  return rec;
}

function restartRecognition() {
  try {
    recognition = createRecognition();
    recognition.start();
  } catch (e) {
    console.error("Failed to restart recognition:", e);
    stopRecording();
  }
}

// ========== Recording Controls ==========
let toggleLock = false; // Prevent double-fire from touch+click

async function toggleRecording() {
  if (toggleLock) return;
  if (!SpeechRecognition) return;

  // Lock for 400ms to prevent touch+click double-fire
  toggleLock = true;
  setTimeout(() => { toggleLock = false; }, 400);

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
    micLabel.textContent = labels.tapStop;
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
  micLabel.textContent = labels.tapStart;
  micLabel.classList.remove("recording");
  micLabel.classList.remove("error");

  if (finalTranscript.trim()) {
    translateText(finalTranscript, true);
    if (autoCopyToggle.checked) {
      autoCopyToClipboard(finalTranscript);
    }
  }
}

// ========== Click & Touch — single handler with debounce ==========
micBtn.addEventListener("click", (e) => {
  e.preventDefault();
  toggleRecording();
});

// On touch devices: use touchend and prevent the subsequent click
micBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  // toggleLock inside toggleRecording() prevents double-fire
  toggleRecording();
});

// ========== Global Keyboard Shortcuts ==========
// Only register on devices with keyboards
if (!isMobile) {
  document.addEventListener("keydown", (event) => {
    // Alt+R (Win/Linux) / ⌥R (Mac): toggle recording
    if (event.altKey && !event.ctrlKey && !event.shiftKey && event.code === "KeyR") {
      event.preventDefault();
      event.stopPropagation();
      toggleRecording();
      return;
    }

    // Alt+C / ⌥C: copy latest result
    if (event.altKey && !event.ctrlKey && !event.shiftKey && event.code === "KeyC") {
      event.preventDefault();
      event.stopPropagation();
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
}

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

renderHistory();

setInterval(() => {
  const items = getHistory();
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
