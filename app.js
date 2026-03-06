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
const vadIndicator = document.getElementById("vad-indicator");
const vadBar = document.getElementById("vad-bar");
const modelLoading = document.getElementById("model-loading");
const modelLoadingText = document.getElementById("model-loading-text");
const modelLoadingBar = document.getElementById("model-loading-bar");
const modelLoadingDetail = document.getElementById("model-loading-detail");

// ========== State ==========
let isRecording = false;
let recognition = null;
let finalTranscript = "";
let accumulatedTranscript = "";
let lastInterimText = ""; // Track interim text as fallback for mobile
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
const WHISPER_MODEL = "Xenova/whisper-tiny";
const TRANSFORMERS_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1";

// ========== STT Mode Detection ==========
// Try Web Speech API first on ALL platforms (including iOS PWA).
// Only fall back to Whisper WASM when SpeechRecognition is truly unavailable.
// Previous approach forced Whisper for iOS PWA standalone, but the 40MB+ model
// download frequently fails due to CSP/network/WKWebView restrictions.
// Web Speech API works on iOS 17+ even in standalone mode.
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let useWhisperSTT = !SpeechRecognition;

if (!SpeechRecognition && !useWhisperSTT) {
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

// ========== Security: Input Sanitization ==========
/**
 * Sanitize text output to prevent XSS. Uses textContent (safe) for
 * rendering, but this function can be used for extra validation of
 * data from external sources (Whisper output, translation API).
 */
function sanitizeText(text) {
  if (typeof text !== "string") return "";
  // Remove control characters except newlines and tabs
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// ========== Whisper WASM STT ==========
let whisperPipeline = null;
let whisperLoading = false;
let whisperMediaRecorder = null;
let whisperAudioChunks = [];
let whisperVAD = null; // VAD state object

/**
 * Lazy-load Transformers.js and initialize Whisper pipeline.
 * Shows progress overlay during model download.
 */
async function initWhisper() {
  if (whisperPipeline) return whisperPipeline;
  if (whisperLoading) return null; // prevent double init

  whisperLoading = true;
  showModelLoading("音声認識モデルを準備中...");

  try {
    const { pipeline, env } = await import(TRANSFORMERS_CDN);

    // Security: disable local model loading, only use verified remote models
    env.allowLocalModels = false;

    updateModelLoading("モデルをダウンロード中...", 0);

    whisperPipeline = await pipeline(
      "automatic-speech-recognition",
      WHISPER_MODEL,
      {
        dtype: "q8", // quantized for smaller size + faster inference
        progress_callback: (progress) => {
          if (progress.status === "download" || progress.status === "progress") {
            const pct = progress.progress ? Math.round(progress.progress) : 0;
            const file = progress.file || "";
            updateModelLoading(
              "モデルをダウンロード中...",
              pct,
              file ? `${file} (${pct}%)` : `${pct}%`
            );
          } else if (progress.status === "ready") {
            updateModelLoading("準備完了", 100);
          }
        },
      }
    );

    hideModelLoading();
    whisperLoading = false;
    return whisperPipeline;
  } catch (err) {
    console.error("[whisper] initialization failed:", err);
    hideModelLoading();
    whisperLoading = false;
    showToast("モデルの読み込みに失敗しました");
    return null;
  }
}

/**
 * Convert audio blob to Float32Array at 16kHz mono for Whisper.
 */
async function audioToFloat32(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();

  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    // Resample to 16kHz mono using OfflineAudioContext
    const targetSampleRate = 16000;
    const numSamples = Math.ceil(decoded.duration * targetSampleRate);
    const offlineCtx = new OfflineAudioContext(1, numSamples, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start();
    const resampled = await offlineCtx.startRendering();
    return resampled.getChannelData(0);
  } finally {
    audioCtx.close();
  }
}

/**
 * Transcribe audio blob using Whisper WASM.
 */
async function transcribeWithWhisper(audioBlob) {
  const transcriber = await initWhisper();
  if (!transcriber) return "";

  recognitionOutput.innerHTML =
    '<span class="placeholder">音声を処理中...</span>';

  try {
    const audioData = await audioToFloat32(audioBlob);

    // Skip if audio is too short (< 0.5 seconds)
    if (audioData.length < 8000) {
      console.log("[whisper] audio too short, skipping");
      return "";
    }

    const langCode = inputLangSelect.value.split("-")[0];
    const result = await transcriber(audioData, {
      language: langCode,
      task: "transcribe",
    });

    return sanitizeText(result.text || "");
  } catch (err) {
    console.error("[whisper] transcription error:", err);
    showToast("音声認識に失敗しました");
    return "";
  }
}

// ========== Model Loading UI ==========
function showModelLoading(text) {
  modelLoadingText.textContent = text;
  modelLoadingBar.style.width = "0%";
  modelLoadingDetail.textContent = "";
  modelLoading.classList.remove("hidden");
}

function updateModelLoading(text, percent, detail) {
  modelLoadingText.textContent = text;
  modelLoadingBar.style.width = percent + "%";
  if (detail) modelLoadingDetail.textContent = detail;
}

function hideModelLoading() {
  modelLoading.classList.add("hidden");
}

// ========== VAD (Voice Activity Detection) ==========
/**
 * Create and start VAD monitoring on a media stream.
 * Returns a VAD control object with stop() method.
 */
function createVAD(stream, options = {}) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.8;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const threshold = options.threshold || 15;
  const silenceTimeout = options.silenceTimeout || 2000;
  const onSpeechStart = options.onSpeechStart || (() => {});
  const onSpeechEnd = options.onSpeechEnd || (() => {});
  const onLevel = options.onLevel || (() => {});

  let isSpeaking = false;
  let speechDetected = false; // has speech been detected at all
  let silenceTimer = null;
  let running = true;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function monitor() {
    if (!running) return;

    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS energy level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    // Normalize to 0-100 for UI
    const level = Math.min(100, Math.round(rms / 1.28));
    onLevel(level);

    if (rms > threshold) {
      if (!isSpeaking) {
        isSpeaking = true;
        speechDetected = true;
        onSpeechStart();
      }
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (!running) return;
        isSpeaking = false;
        onSpeechEnd();
      }, silenceTimeout);
    }

    requestAnimationFrame(monitor);
  }

  monitor();

  return {
    stop() {
      running = false;
      clearTimeout(silenceTimer);
      try { source.disconnect(); } catch (e) { /* ignore */ }
      audioContext.close().catch(() => {});
    },
    get speechDetected() { return speechDetected; },
    get isSpeaking() { return isSpeaking; },
  };
}

/**
 * Show/hide VAD level indicator and update bar width.
 */
function updateVADLevel(level) {
  if (vadBar) vadBar.style.width = level + "%";
}

function showVADIndicator() {
  if (vadIndicator) vadIndicator.classList.remove("hidden");
}

function hideVADIndicator() {
  if (vadIndicator) vadIndicator.classList.add("hidden");
  if (vadBar) vadBar.style.width = "0%";
}

// ========== Speech Recognition Setup (Web Speech API path) ==========
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
    // Guard: ignore results after recording has stopped.
    // recognition.abort()/stop() can cause late onresult events
    // that would overwrite the display set up by stopWebSpeechRecording().
    if (!isRecording) return;

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

    // Track interim text so we can use it as fallback when stopping
    if (interim) lastInterimText = interim;

    recognitionOutput.innerHTML = "";
    if (finalTranscript) {
      const finalSpan = document.createElement("span");
      finalSpan.textContent = sanitizeText(finalTranscript);
      recognitionOutput.appendChild(finalSpan);
    }
    if (interim) {
      const interimSpan = document.createElement("span");
      interimSpan.className = "interim";
      interimSpan.textContent = sanitizeText(interim);
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
      console.warn("[recognition] max restart attempts reached");
      // On iOS PWA: Web Speech API silently fails. Switch to Whisper as fallback.
      if (isIOS && isPWAStandalone && !useWhisperSTT) {
        console.log("[recognition] switching to Whisper fallback for iOS PWA");
        useWhisperSTT = true;
        isRecording = false;
        recognition = null;
        resetMicUI();
        micLabel.textContent = "音声認識を切替中... もう一度タップしてください";
        return;
      }
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

  if (useWhisperSTT) {
    await startWhisperRecording();
  } else {
    await startWebSpeechRecording();
  }
}

/**
 * Start recording using Web Speech API (default path for browsers with support).
 */
async function startWebSpeechRecording() {
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
  lastInterimText = "";
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

/**
 * Start recording using Whisper WASM (for iOS PWA standalone and fallback).
 * Captures audio via MediaRecorder and uses VAD for UX.
 */
async function startWhisperRecording() {
  try {
    activeMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    console.error("[whisper] mic acquisition failed:", e);
    micLabel.textContent = "マイクの権限を許可してください";
    micLabel.classList.add("error");
    return;
  }

  // Small delay for iOS audio session initialization
  if (isIOS) {
    await new Promise((r) => setTimeout(r, 300));
  }

  finalTranscript = "";
  accumulatedTranscript = "";
  whisperAudioChunks = [];

  // Determine supported MIME type
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";

  try {
    whisperMediaRecorder = new MediaRecorder(activeMicStream, { mimeType });
  } catch (e) {
    // Fallback: let browser choose
    whisperMediaRecorder = new MediaRecorder(activeMicStream);
  }

  whisperMediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) whisperAudioChunks.push(e.data);
  };

  whisperMediaRecorder.start(1000); // collect chunks every second
  isRecording = true;

  // Start VAD for visual feedback and auto-stop
  whisperVAD = createVAD(activeMicStream, {
    threshold: 15,
    silenceTimeout: 2000,
    onSpeechStart: () => {
      console.log("[VAD] speech started");
      micBtn.classList.add("vad-active");
    },
    onSpeechEnd: () => {
      console.log("[VAD] speech ended (silence detected)");
      micBtn.classList.remove("vad-active");
      // Auto-stop after silence only if speech was detected
      if (isRecording && whisperVAD && whisperVAD.speechDetected) {
        stopRecording();
      }
    },
    onLevel: updateVADLevel,
  });

  showVADIndicator();
  micBtn.classList.add("recording");
  micIcon.classList.add("hidden");
  stopIcon.classList.remove("hidden");
  micLabel.textContent = labels.tapStop;
  micLabel.classList.add("recording");
  micLabel.classList.remove("error");
  recognitionOutput.innerHTML =
    '<span class="placeholder">聞き取り中... 話し終わると自動停止します</span>';
}

function stopRecording() {
  const wasRecording = isRecording;
  isRecording = false;

  if (useWhisperSTT && wasRecording) {
    stopWhisperRecording();
  } else {
    stopWebSpeechRecording();
  }
}

function stopWebSpeechRecording() {
  // 1. Cancel any pending scheduled translation from interim results.
  //    Without this, a stale scheduleTranslation() timer could fire AFTER
  //    we start the final translation, causing double translation + display flicker.
  clearTimeout(translateTimer);

  // 2. Collect the best available text BEFORE stopping recognition.
  //    On mobile (non-continuous mode), interim results may not have been
  //    finalized yet. We capture the displayed text as a robust fallback.
  let bestText = finalTranscript.trim();
  if (!bestText && lastInterimText) {
    bestText = lastInterimText.trim();
  }
  if (!bestText) {
    // Last resort: grab whatever text is currently shown in the output
    bestText = getTextContent(recognitionOutput);
  }

  // 3. Detach ALL event handlers BEFORE aborting to prevent post-abort
  //    onresult/onend from overwriting the display or re-triggering translation.
  //    This is critical: abort()/stop() can cause late events to fire.
  if (recognition) {
    recognition.onresult = null;
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onstart = null;
    recognition.onaudiostart = null;
    try { recognition.abort(); } catch (e) { /* ignore */ }
    recognition = null;
  }
  // Explicitly release mic stream so iOS stops showing the mic indicator
  releaseMicStream();

  resetMicUI();

  if (bestText) {
    // Ensure the recognized text is displayed in the output area
    finalTranscript = bestText;
    recognitionOutput.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = sanitizeText(bestText);
    recognitionOutput.appendChild(span);

    // Mobile (all platforms): reserve clipboard slot NOW in gesture context.
    // On iOS, clipboard.write() must be called synchronously in gesture.
    // On Android, clipboard.writeText() may also expire after async delay.
    let pendingCopy = null;
    if (isMobile && autoCopyToggle.checked) {
      pendingCopy = initMobileClipboardWrite();
    }

    translateText(bestText, true, pendingCopy);
  } else {
    showPlaceholder(recognitionOutput, "音声を認識できませんでした。もう一度お試しください。");
  }
}

/**
 * Stop Whisper recording, process audio, and display results.
 */
function stopWhisperRecording() {
  // Stop VAD
  if (whisperVAD) {
    whisperVAD.stop();
    whisperVAD = null;
  }
  hideVADIndicator();

  // Mobile: reserve clipboard slot in gesture context before async processing
  let pendingCopy = null;
  if (isMobile && autoCopyToggle.checked) {
    pendingCopy = initMobileClipboardWrite();
  }

  resetMicUI();

  if (!whisperMediaRecorder || whisperMediaRecorder.state === "inactive") {
    releaseMicStream();
    return;
  }

  // Stop MediaRecorder and process audio
  whisperMediaRecorder.onstop = async () => {
    releaseMicStream();

    if (whisperAudioChunks.length === 0) {
      showPlaceholder(recognitionOutput, "音声が検出されませんでした");
      if (pendingCopy) pendingCopy("");
      return;
    }

    const mimeType = whisperMediaRecorder.mimeType || "audio/webm";
    const audioBlob = new Blob(whisperAudioChunks, { type: mimeType });
    whisperAudioChunks = [];

    recognitionOutput.innerHTML =
      '<span class="placeholder">音声を処理中...</span>';

    const text = await transcribeWithWhisper(audioBlob);

    if (text && text.trim()) {
      finalTranscript = text.trim();
      recognitionOutput.innerHTML = "";
      const span = document.createElement("span");
      span.textContent = sanitizeText(finalTranscript);
      recognitionOutput.appendChild(span);

      translateText(finalTranscript, true, pendingCopy);
    } else {
      showPlaceholder(recognitionOutput, "音声を認識できませんでした。もう一度お試しください。");
      if (pendingCopy) pendingCopy("");
    }
  };

  whisperMediaRecorder.stop();
}

/**
 * Reset mic button and label to idle state.
 */
function resetMicUI() {
  micBtn.classList.remove("recording");
  micBtn.classList.remove("vad-active");
  micIcon.classList.remove("hidden");
  stopIcon.classList.add("hidden");
  micLabel.textContent = labels.tapStart;
  micLabel.classList.remove("recording");
  micLabel.classList.remove("error");
}

/**
 * Mobile: reserve a clipboard write slot within the current user gesture context.
 * On mobile browsers, clipboard access requires a recent user gesture.
 * After an async operation (translation API), the gesture context expires.
 *
 * Returns a resolver function that, when called with text, fills the clipboard.
 * Uses ClipboardItem with Promise<Blob> (Safari 16.4+ / Chrome 76+).
 * Falls back to a deferred copy approach for older browsers.
 */
function initMobileClipboardWrite() {
  // ClipboardItem with Promise<Blob>: reserve the slot synchronously,
  // fill the content asynchronously when translation completes.
  if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
    let resolver;
    const contentPromise = new Promise((resolve) => {
      resolver = resolve;
      // Safety timeout: if translation takes >6s, use whatever is displayed
      setTimeout(() => {
        const displayed = getTextContent(translationOutput);
        resolve(displayed || "");
      }, 6000);
    });

    try {
      const blobPromise = contentPromise.then(
        (text) => new Blob([text || " "], { type: "text/plain" })
      );
      const item = new ClipboardItem({ "text/plain": blobPromise });
      navigator.clipboard.write([item])
        .then(() => showToast("翻訳結果をコピーしました"))
        .catch((err) => {
          console.warn("[clipboard] write failed:", err);
          // Last resort: try fallbackCopy with whatever is currently displayed
          const displayed = getTextContent(translationOutput);
          if (displayed) {
            fallbackCopy(displayed);
          } else {
            showToast("コピーに失敗しました");
          }
        });
      return resolver;
    } catch (e) {
      console.warn("[clipboard] ClipboardItem creation failed:", e);
    }
  }

  // Fallback for browsers without ClipboardItem Promise support:
  // Return a deferred copy function that will be called after translation.
  // This may fail on iOS (gesture expired) but works on some Android browsers.
  return function deferredCopy(text) {
    if (text && text.trim()) {
      writeToClipboard(text);
    }
  };
}

// Keep backward compatibility alias
const initIOSClipboardWrite = initMobileClipboardWrite;

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
  // Only schedule live translation preview while actively recording.
  // After recording stops, translation is handled by stopWebSpeechRecording().
  if (!isRecording) return;
  translateTimer = setTimeout(() => translateText(text, false), 500);
}

/**
 * Translate text and optionally save to history / auto-copy.
 * @param {string} text - Text to translate
 * @param {boolean} saveToHistory - Whether to save the result to history
 * @param {Function|null} pendingCopy - Resolver from initMobileClipboardWrite().
 *   If provided, call it with the translated text to fulfill the pending clipboard write.
 *   If null, use writeToClipboard() directly (works on desktop after async).
 */
async function translateText(text, saveToHistory, pendingCopy) {
  if (!text.trim()) return;

  const sourceLang = inputLangSelect.value.split("-")[0];
  const targetLang = outputLangSelect.value;

  if (sourceLang === targetLang) {
    translationOutput.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = sanitizeText(text);
    translationOutput.appendChild(span);
    if (saveToHistory) {
      addHistory(text, text, inputLangSelect.value, outputLangSelect.value);
      if (autoCopyToggle.checked) {
        performAutoCopy(text, pendingCopy);
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
      const translated = sanitizeText(data.responseData.translatedText);
      translationOutput.innerHTML = "";
      const span = document.createElement("span");
      span.textContent = translated;
      translationOutput.appendChild(span);

      if (saveToHistory) {
        addHistory(text, translated, inputLangSelect.value, outputLangSelect.value);
      }

      if (saveToHistory && autoCopyToggle.checked) {
        performAutoCopy(translated, pendingCopy);
      }
    } else {
      translationOutput.innerHTML =
        '<span class="placeholder">翻訳に失敗しました。もう一度お試しください。</span>';
      // Resolve pending clipboard promise to prevent hang
      if (pendingCopy) pendingCopy("");
    }
  } catch (error) {
    console.error("Translation error:", error);
    translationOutput.innerHTML =
      '<span class="placeholder">翻訳エラー: ネットワークを確認してください。</span>';
    if (pendingCopy) pendingCopy("");
  }
}

/**
 * Perform auto-copy of translated text.
 * Uses the pre-reserved clipboard slot (mobile) or direct write (desktop).
 * @param {string} text - Text to copy
 * @param {Function|null} pendingCopy - Resolver from initMobileClipboardWrite()
 */
function performAutoCopy(text, pendingCopy) {
  if (!text || !text.trim()) {
    if (pendingCopy) pendingCopy("");
    return;
  }

  if (pendingCopy) {
    // Mobile: resolve the pre-reserved clipboard slot with translated text
    pendingCopy(text);
  } else {
    // Desktop: clipboard.writeText works fine outside gesture context
    writeToClipboard(text);
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
      showToast("翻訳結果をコピーしました");
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
      showToast("翻訳結果をコピーしました");
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
    original: sanitizeText(original),
    translated: sanitizeText(translated),
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
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
        try { recognition.abort(); } catch (e) { /* ignore */ }
        recognition = null;
      }
      if (whisperVAD) {
        whisperVAD.stop();
        whisperVAD = null;
      }
      hideVADIndicator();
      if (whisperMediaRecorder && whisperMediaRecorder.state !== "inactive") {
        try { whisperMediaRecorder.stop(); } catch (e) { /* ignore */ }
      }

      releaseMicStream();
      resetMicUI();
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

// ========== Service Worker Registration ==========
// Moved from inline script in index.html for CSP compliance
if ("serviceWorker" in navigator && !isElectron) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
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
window.useWhisperSTT = useWhisperSTT;
window.sanitizeText = sanitizeText;
