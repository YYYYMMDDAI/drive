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

// ========== State ==========
let isRecording = false;
let recognition = null;
let finalTranscript = "";
let translateTimer = null;

// ========== Browser Support Check ==========
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  unsupportedBanner.classList.remove("hidden");
  micBtn.disabled = true;
  micBtn.style.opacity = "0.4";
  micBtn.style.cursor = "not-allowed";
}

// ========== Speech Recognition Setup ==========
function createRecognition() {
  const rec = new SpeechRecognition();
  rec.lang = inputLangSelect.value;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    let interim = "";
    finalTranscript = "";

    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }

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
    }
    // Recover from non-fatal errors
    if (event.error !== "aborted" && event.error !== "not-allowed") {
      stopRecording();
    }
  };

  rec.onend = () => {
    // Auto-restart if still in recording mode (handles Chrome's ~60s cutoff)
    if (isRecording) {
      try {
        recognition = createRecognition();
        recognition.start();
      } catch (e) {
        stopRecording();
      }
    }
  };

  return rec;
}

// ========== Recording Controls ==========
function startRecording() {
  finalTranscript = "";
  recognition = createRecognition();
  recognition.start();
  isRecording = true;

  micBtn.classList.add("recording");
  micIcon.classList.add("hidden");
  stopIcon.classList.remove("hidden");
  micLabel.textContent = "録音中... タップして停止";
  micLabel.classList.add("recording");
  recognitionOutput.innerHTML =
    '<span class="placeholder">聞き取り中...</span>';
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    recognition.stop();
    recognition = null;
  }

  micBtn.classList.remove("recording");
  micIcon.classList.remove("hidden");
  stopIcon.classList.add("hidden");
  micLabel.textContent = "タップして録音開始";
  micLabel.classList.remove("recording");

  // Final translation with confirmed text
  if (finalTranscript.trim()) {
    translateText(finalTranscript);
  }
}

micBtn.addEventListener("click", () => {
  if (!SpeechRecognition) return;
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
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
  // If recording, restart with new language
  if (isRecording) {
    stopRecording();
    startRecording();
  }
});

outputLangSelect.addEventListener("change", () => {
  // Re-translate current text with new target language
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

// ========== Keyboard Shortcut ==========
document.addEventListener("keydown", (event) => {
  // Space bar to toggle recording (when not focused on input)
  if (
    event.code === "Space" &&
    event.target === document.body
  ) {
    event.preventDefault();
    micBtn.click();
  }
});
