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
let activeMicStream = null; // Track active mic stream for clean release

// ========== Platform / OS Detection ==========
const ua = navigator.userAgent;
const isElectron = ua.includes("Electron");
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const isMobile = isIOS || isAndroid || ("ontouchstart" in window && window.innerWidth < 768);
const isMac = !isMobile && /Mac/.test(navigator.platform);
const isPWAStandalone = window.matchMedia("(display-mode: standalone)").matches
  || window.navigator.standalone === true;

const platform = (() => {
  if (isElectron) return "electron";
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  if (isMac) return "mac";
  return "windows";
})();

// Platform-specific labels
const labels = (() => {
  switch (platform) {
    case "ios":
    case "android":
      return {
        tapStart: "タップして録音開始",
        tapStop: "録音中... タップして停止",
        shortcutHTML: "",
      };
    case "mac":
      return {
        tapStart: "クリックで録音開始",
        tapStop: "録音中... クリックで停止",
        shortcutHTML:
          '<kbd>Space</kbd> でも録音の開始 / 停止が可能',
      };
    case "electron":
      return {
        tapStart: "クリックで録音開始",
        tapStop: "録音中... クリックで停止",
        shortcutHTML: "",
      };
    default:
      return {
        tapStart: "クリックで録音開始",
        tapStop: "録音中... クリックで停止",
        shortcutHTML:
          '<kbd>Space</kbd> でも録音の開始 / 停止が可能',
      };
  }
})();

// Apply platform-specific UI on load
micLabel.textContent = labels.tapStart;
if (shortcutHint) {
  if (labels.shortcutHTML) {
    shortcutHint.innerHTML = labels.shortcutHTML;
    shortcutHint.style.display = "";  // show (was hidden by default in HTML)
  }
  // Otherwise stays display:none (default in HTML) — no shortcuts on mobile
}

document.body.classList.add("platform-" + platform);
if (isMobile) document.body.classList.add("is-mobile");

// ========== Constants ==========
const HISTORY_KEY = "voiceInputHistory";
const HISTORY_TTL = 60 * 60 * 1000;
const MIC_PERM_KEY = "voiceInputMicGranted";
const AUTO_COPY_KEY = "voiceInputAutoCopy";

// ========== Browser Support Check ==========
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  unsupportedBanner.classList.remove("hidden");
  if (isIOS) {
    unsupportedBanner.textContent =
      "このiOSバージョンでは音声認識が利用できません。iOS 14.5以上 + Safari、またはAndroid Chromeをお使いください。";
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
      // permissions.query not supported (e.g. iOS Safari)
      // On iOS, we skip the check and rely on getUserMedia at recording time
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
// iOS-specific: track restart attempts to prevent infinite loops
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 5;
let restartDelay = 300; // ms — iOS needs a gap before restarting

function createRecognition() {
  const rec = new SpeechRecognition();
  rec.lang = inputLangSelect.value;
  // iOS: continuous mode is unreliable; use single-utterance mode and restart
  // Android: also more stable in non-continuous mode
  rec.continuous = !(isMobile || isIOS);
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    console.log("[recognition] started");
    restartAttempts = 0; // reset on successful start
  };

  rec.onaudiostart = () => {
    console.log("[recognition] audio started — mic is active");
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
    console.error("[recognition] error:", event.error);
    if (event.error === "not-allowed") {
      micLabel.textContent = "マイクの権限を許可してください";
      micLabel.classList.add("error");
      stopRecording();
    } else if (event.error === "no-speech") {
      // Not fatal — will restart via onend if still recording
      console.log("[recognition] no speech detected");
    } else if (event.error === "network") {
      // iOS PWA sometimes throws network errors; retry
      console.log("[recognition] network error — will retry");
    } else if (event.error === "audio-capture") {
      // Mic might be temporarily unavailable on iOS
      console.log("[recognition] audio-capture error — will retry");
    } else if (event.error !== "aborted") {
      stopRecording();
    }
  };

  rec.onend = () => {
    console.log("[recognition] ended, isRecording:", isRecording);
    if (!isRecording) return;

    accumulatedTranscript = finalTranscript;
    restartAttempts++;

    if (restartAttempts > MAX_RESTART_ATTEMPTS) {
      console.warn("[recognition] max restart attempts reached, stopping");
      stopRecording();
      micLabel.textContent = "接続が切れました。再度タップしてください。";
      return;
    }

    // iOS needs a delay before restarting — without it, start() silently fails
    const delay = isIOS ? Math.min(restartDelay * restartAttempts, 2000) : 100;
    setTimeout(() => {
      if (!isRecording) return; // might have been stopped during delay
      try {
        recognition = createRecognition();
        recognition.start();
      } catch (e) {
        console.error("[recognition] failed to restart:", e);
        stopRecording();
      }
    }, delay);
  };

  return rec;
}

// ========== Recording Controls ==========
let toggleLock = false;

async function toggleRecording() {
  if (toggleLock) return;
  if (!SpeechRecognition) return;

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

  // Release any leftover mic stream from previous session
  releaseMicStream();

  // iOS: forcefully re-acquire mic stream before each session.
  // Without this, 2nd+ recordings silently fail because iOS WebKit
  // releases the audio session after the previous recognition ends.
  if (isIOS) {
    try {
      activeMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.warn("[iOS] mic re-acquire failed:", e);
    }
    // Small delay to let iOS init audio session
    await new Promise((r) => setTimeout(r, 300));
  }

  finalTranscript = "";
  accumulatedTranscript = "";
  restartAttempts = 0;

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
    console.error("[recognition] failed to start:", err);
    micLabel.textContent = "録音開始に失敗しました。再度お試しください。";
    micLabel.classList.add("error");
    isRecording = false;
  }
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    try { recognition.abort(); } catch (e) { /* ignore */ }
    recognition = null;
  }
  // Explicitly release mic stream so iOS stops showing the mic indicator
  releaseMicStream();

  micBtn.classList.remove("recording");
  micIcon.classList.remove("hidden");
  stopIcon.classList.add("hidden");
  micLabel.textContent = labels.tapStart;
  micLabel.classList.remove("recording");
  micLabel.classList.remove("error");

  if (finalTranscript.trim()) {
    // iOS: copy the CURRENTLY DISPLAYED translation synchronously, within
    // the user's tap gesture context. This is the only reliable way to
    // auto-copy on iOS — clipboard APIs fail after any async operation.
    // The real-time translation (from scheduleTranslation during recording)
    // is already showing the translated text.
    let copiedInGesture = false;
    if (isIOS && autoCopyToggle.checked) {
      const displayedTranslation = getTextContent(translationOutput);
      if (displayedTranslation) {
        fallbackCopy(displayedTranslation);
        copiedInGesture = true;
      }
    }

    translateText(finalTranscript, true, copiedInGesture);
  }
}

/** Release active mic stream tracks to free the microphone hardware */
function releaseMicStream() {
  if (activeMicStream) {
    activeMicStream.getTracks().forEach((track) => track.stop());
    activeMicStream = null;
  }
}

// ========== Click & Touch ==========
micBtn.addEventListener("click", (e) => {
  e.preventDefault();
  toggleRecording();
});

micBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  toggleRecording();
});

// ========== Global Keyboard Shortcuts ==========
if (!isMobile) {
  document.addEventListener("keydown", (event) => {
    if (
      event.code === "Space" &&
      !event.altKey && !event.ctrlKey && !event.shiftKey &&
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

async function translateText(text, saveToHistory, alreadyCopied) {
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
      if (autoCopyToggle.checked && !alreadyCopied) {
        writeToClipboard(text);
      }
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

      if (saveToHistory && autoCopyToggle.checked && !alreadyCopied) {
        // Desktop: clipboard works fine after async
        // iOS: already copied in stopRecording gesture context
        writeToClipboard(translated);
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

// ========== Clipboard — cross-platform with iOS fallback ==========

/**
 * Write text to clipboard. Uses Clipboard API with fallback to
 * execCommand('copy') for iOS Safari and older browsers where
 * the async Clipboard API fails outside user-gesture context.
 */
function writeToClipboard(text) {
  if (!text || !text.trim()) return Promise.resolve(false);

  // Try modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => {
      showToast("クリップボードにコピーしました");
      return true;
    }).catch(() => {
      // Clipboard API failed (iOS standalone, non-gesture context, etc.)
      return fallbackCopy(text);
    });
  }

  return fallbackCopy(text);
}

/**
 * Fallback: create a temporary textarea, select it, and execCommand('copy').
 * This works on iOS Safari where Clipboard API can be blocked.
 */
function fallbackCopy(text) {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // Prevent scroll jump and keep it invisible
    textarea.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
    document.body.appendChild(textarea);

    if (isIOS) {
      // iOS requires specific range selection
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      textarea.setSelectionRange(0, text.length);
    } else {
      textarea.select();
    }

    const success = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (success) {
      showToast("クリップボードにコピーしました");
    } else {
      showToast("コピーに失敗しました");
    }
    return Promise.resolve(success);
  } catch (e) {
    console.error("Fallback copy failed:", e);
    showToast("コピーに失敗しました");
    return Promise.resolve(false);
  }
}

function copyToClipboard(element, btn) {
  const text = element.textContent.trim();
  if (!text || element.querySelector(".placeholder")) return;

  writeToClipboard(text).then((success) => {
    if (success !== false) {
      btn.classList.add("copied");
      btn.querySelector("span").textContent = "コピー完了";
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.querySelector("span").textContent = "コピー";
      }, 1500);
    }
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
      writeToClipboard(item.translated);
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

// ========== iOS PWA: Recover from app switch ==========
// When user switches to another app and comes back, iOS kills the audio session
// and SpeechRecognition silently dies. We detect this via visibilitychange and
// cleanly stop + show a "tap to restart" message so the user knows to tap again.
// We also re-acquire the mic proactively so the next tap works immediately.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (isRecording) {
      // Recognition is likely dead after iOS background — stop cleanly
      console.log("[visibility] page became visible while recording — resetting");
      isRecording = false;
      if (recognition) {
        try { recognition.abort(); } catch (e) { /* ignore */ }
        recognition = null;
      }
      releaseMicStream();
      micBtn.classList.remove("recording");
      micIcon.classList.remove("hidden");
      stopIcon.classList.add("hidden");
      micLabel.classList.remove("recording");
      micLabel.textContent = "アプリに戻りました。タップして再開";
    }

    // Proactively re-acquire mic so next recording starts smoothly
    if (isIOS) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => stream.getTracks().forEach((t) => t.stop()))
        .catch(() => {});
    }
  } else {
    // Going to background — stop recording to release resources
    if (isRecording) {
      console.log("[visibility] page hidden while recording — stopping");
      stopRecording();
    }
  }
});

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

// ========== Expose for E2E Testing ==========
// Only used by test.html iframe; no effect in production
window.writeToClipboard = writeToClipboard;
window.fallbackCopy = fallbackCopy;
window.showToast = showToast;
window.getHistory = getHistory;
window.addHistory = addHistory;
window.renderHistory = renderHistory;
window.toggleRecording = toggleRecording;
