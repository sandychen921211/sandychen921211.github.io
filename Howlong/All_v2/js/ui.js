/********************************************************************
 * ui.js (CLEAN)
 * - Auto scale 1080x1920
 * - Start webcam
 * - Start loops: pose / mask / blob (when ready)
 * - Action trigger:
 *   "一次動作" = 一個 blob burst 完整結束後才算一次
 *   -> onBlobCycleComplete(type) 才：
 *      1) totalCycles +1
 *      2) bar/gear/engagement 更新 (每 5 次升一階，最多 5 階)
 *      3) 該動作計數 +1 (max 99)
 *      4) Waiting Index % +3 (max 99)
 ********************************************************************/

// ===== 1) Fit-to-screen scale =====
function resizeApp() {
  const app = document.getElementById("app");
  const designW = 1080;
  const designH = 1920;

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  const scale = Math.min(screenW / designW, screenH / designH);
  app.style.transform = `translate(0px, 0px) scale(${scale})`;
}
window.addEventListener("resize", resizeApp);
resizeApp();

// ===== DOM =====
const stage = document.getElementById("app");
const videoEl = document.getElementById("video");

const timeText = document.getElementById("timeText");
const pctText = document.getElementById("pctText");

const engagementWheelEl = document.getElementById("engagementWheel");

const actionIconEl = document.getElementById("actionIcon");
const actionCountEl = document.getElementById("actionCount");

const ACTION_ICON = {
  neck: "./assets/img/neck_icon.png",
  arms: "./assets/img/hand_icon.png",
  legs: "./assets/img/foot_icon.png",
};

window.video = videoEl; // shared by pose/mask/blob

// ===== State =====
let startAt = Date.now();

let totalCycles = 0; // completed burst count
let lastTriggeredType = null;

// ===== MAX Engagement extra-cycle control =====
let maxEnteredAtCycles = null; // 第一次到 level 4 時的 totalCycles
const MAX_EXTRA_REQUIRED = 5; // MAX 後還要再完成 5 次 blob cycle

// allow only one active burst at a time in UI logic (blob can overlap visually if you choose)
// we'll keep queue single to avoid accidental multi-count
let queuedType = null;

const actionCounts = { neck: 0, arms: 0, legs: 0 };
let currentActionType = "neck";

let pct = 0;
const PCT_STEP = 3;
const PCT_MAX = 99;

const ENG_STEP_PX = 29; // must match CSS --engStep
const GEAR_STEP_PX = 80; // tune here

function pad2(n) {
  return String(n).padStart(2, "0");
}
function clamp99(n) {
  return Math.max(0, Math.min(99, n));
}

// 0..4
function getLevelByCycles(cycles) {
  return Math.max(0, Math.min(4, Math.floor(cycles / 5)));
}

function levelToFill(level) {
  return `${(level / 4) * 100}%`;
}

function updateTime() {
  const t = Math.max(0, Date.now() - startAt);
  const totalSec = Math.floor(t / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (timeText) timeText.textContent = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function applyUI() {
  const level = getLevelByCycles(totalCycles);
  // ===== Auto navigation conditions =====
  // condition #2: pct == 99
  if (pct >= 99) {
    goNextPage("pct==99");
    return;
  }

  // engagement wheel
  if (engagementWheelEl) {
    stage.style.setProperty("--engY", `${level * ENG_STEP_PX}px`);
  }

  // bar + gear
  stage.style.setProperty("--anxFill", levelToFill(level));
  stage.style.setProperty("--gearStep", `${level * GEAR_STEP_PX}px`);

  // expose level for mask.js
  window.currentEngagementLevel = level;

  // action single
  if (actionIconEl) actionIconEl.src = ACTION_ICON[currentActionType];
  if (actionCountEl)
    actionCountEl.textContent = pad2(clamp99(actionCounts[currentActionType]));

  // waiting index
  if (pctText) pctText.textContent = `${pct}%`;

  // expose for blob color level
  window.glitchScore = totalCycles;
}

// ===== Triggering (edge -> request burst) =====
function requestCycle(type) {
  if (!["neck", "arms", "legs"].includes(type)) type = "neck";

  // if blob reports active, queue latest
  const active = window.isBlobCycleActive?.() === true;
  if (active) {
    queuedType = type;
    return;
  }

  lastTriggeredType = type;
  window.triggerBlobCycle?.(type);
}

window.onBlobCycleComplete = (type) => {
  const doneType = ["neck", "arms", "legs"].includes(type)
    ? type
    : lastTriggeredType || "neck";

  // 1) 完整 cycle +1
  totalCycles += 1;

  // 2) 該動作計數 + Waiting Index
  actionCounts[doneType] = clamp99(actionCounts[doneType] + 1);
  pct = Math.min(PCT_MAX, pct + PCT_STEP);
  currentActionType = doneType;

  // 3) 計算目前 engagement level
  const level = getLevelByCycles(totalCycles);

  // 4) 第一次進入 MAX → 記錄進入時的 cycles
  if (level >= 4) {
    if (maxEnteredAtCycles === null) {
      maxEnteredAtCycles = totalCycles;
    }
  } else {
    // 若中途掉回非 MAX（理論上不會，但保險）
    maxEnteredAtCycles = null;
  }

  // 5) UI 更新（⚠️ 這一步一定要在 queued cycle 前）
  applyUI();

  // 6) 若有排隊的動作，立刻啟動下一個 blob burst
  if (queuedType) {
    const next = queuedType;
    queuedType = null;
    lastTriggeredType = next;
    window.triggerBlobCycle?.(next);
  }

  // 7) 檢查是否要跳轉頁面（集中管理）
  checkAutoNavigation();
};

// ===== Detection polling (edge trigger) =====
let prevNeck = false;
let prevArms = false;
let prevLegs = false;

function pollDetections() {
  const neck = !!window.touchHeadOrNeck;
  const arms = !!window.crossArms;
  const legs = !!window.crossedLegs;

  if (neck && !prevNeck) requestCycle("neck");
  if (arms && !prevArms) requestCycle("arms");
  if (legs && !prevLegs) requestCycle("legs");

  prevNeck = neck;
  prevArms = arms;
  prevLegs = legs;

  requestAnimationFrame(pollDetections);
}

// ===== Main tick =====
function tick() {
  updateTime();

  // condition #1: time >= 7 mins
  const elapsed = Date.now() - startAt;
  if (elapsed >= TIME_LIMIT_MS) {
    goNextPage("time>=7min");
    return;
  }

  requestAnimationFrame(tick);
}

function checkAutoNavigation() {
  if (hasNavigated) return;

  // condition #1: time >= 7 mins
  const elapsed = Date.now() - startAt;
  if (elapsed >= TIME_LIMIT_MS) {
    goNextPage("time>=7min");
    return;
  }

  // condition #2: Waiting Index == 99%
  if (pct >= 99) {
    goNextPage("pct==99");
    return;
  }

  // condition #3: MAX + extra blob cycles
  const level = getLevelByCycles(totalCycles);
  if (level >= 4 && maxEnteredAtCycles !== null) {
    const extraCycles = totalCycles - maxEnteredAtCycles;
    if (extraCycles >= MAX_EXTRA_REQUIRED) {
      goNextPage(`MAX +${MAX_EXTRA_REQUIRED} cycles`);
      return;
    }
  }
}

// ===== Camera =====
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });

    videoEl.srcObject = stream;
    await videoEl.play();

    // start loops after camera ready
    window.startBlobLoopWhenReady?.();
    window.startPoseLoopWhenReady?.();
    window.startMaskLoopWhenReady?.();

    applyUI();
    requestAnimationFrame(tick);
    requestAnimationFrame(pollDetections);
  } catch (err) {
    console.error("[Camera Error]", err);
    alert(
      "無法啟用相機：請用 https 或 Live Server（localhost），並允許相機權限。",
    );
  }
}

startCamera();

// ===== Auto navigation settings =====
const NEXT_PAGE_URL = "./loading.html"; // 你可改路徑
const TIME_LIMIT_MS = 7 * 60 * 1000; // 7 minutes

let hasNavigated = false;
async function goNextPage(reason) {
  if (hasNavigated) return;
  hasNavigated = true;

  console.log("[NAVIGATE] -> next page, reason:", reason);

  // ===== helper: timeout wrapper =====
  const withTimeout = (promise, ms) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms),
      ),
    ]);

  // ===== 1) 存第一頁結果到 sessionStorage =====
  try {
    const level = getLevelByCycles(totalCycles);
    const LABELS = [
      "01 None Engagement",
      "02 Low Engagement",
      "03 Med Engagement",
      "04 High Engagement",
      "05 Max Engagement",
    ];

    const t = (timeText?.textContent || "00:00:00").split(":");
    const mmss =
      t.length >= 3 ? `${t[1]}:${t[2]}` : timeText?.textContent || "00:00";

    const actionType = currentActionType || "neck";
    const actionCount = clamp99(actionCounts[actionType] || 0);
    const waitingPct = Math.min(99, Number(pct || 0));

    sessionStorage.setItem("r_level", String(level));
    sessionStorage.setItem("r_engagementLabel", LABELS[level] || LABELS[0]);
    sessionStorage.setItem("r_mmss", mmss);
    sessionStorage.setItem("r_actionType", actionType);
    sessionStorage.setItem("r_actionCount", String(actionCount));
    sessionStorage.setItem("r_waitingPct", String(waitingPct));

    // ===== (E) 截圖：本機 dataURL +（可選）上傳 Firebase 拿 URL =====
    const shotDataURL = captureCompositeShot();

    // ✅ 1) 同裝置一定要有：report.html 直接吃 sessionStorage 的 dataURL
    if (shotDataURL) {
      sessionStorage.setItem("r_shot", shotDataURL);
    }

    let shotURL = "";

    // ✅ 2) 跨裝置才需要：上傳拿 URL（失敗也沒關係，至少本機還有 r_shot）
    if (shotDataURL && window.uploadShot) {
      try {
        shotURL = await withTimeout(window.uploadShot(shotDataURL), 8000); // 建議拉長一點
        console.log("[SHOT UPLOADED]", shotURL);
      } catch (e) {
        console.warn("[SHOT UPLOAD FAILED/TIMEOUT]", e);
      }
    }

    if (shotURL) sessionStorage.setItem("r_shot_url", shotURL);

    // ✅ 3) QR share URL：有 URL 就帶 URL，沒有就不帶（手機端就不顯示）
    const params = new URLSearchParams();
    params.set("src", "qr");
    params.set("level", String(level));
    params.set("engagementLabel", LABELS[level] || LABELS[0]);
    params.set("mmss", mmss);
    params.set("actionType", actionType);
    params.set("actionCount", String(actionCount));
    params.set("waitingPct", String(waitingPct));
    if (shotURL) params.set("shot", shotURL);

    const share = `report.html?${params.toString()}`;
    sessionStorage.setItem("qr_report_url", share);
    console.log("[QR SHARE]", share);
  } catch (e) {
    console.warn("[REPORT SAVE FAILED]", e);
  }

  // ===== 2) ease-out 後跳頁（保留你原本行為）=====
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "#fff";
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "none";
  overlay.style.transition = "opacity 520ms cubic-bezier(.2,.8,.2,1)";
  overlay.style.zIndex = "99999";
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
  });

  setTimeout(() => {
    window.location.href = NEXT_PAGE_URL;
  }, 540);
}
// ===== 合成截圖工具（放在 ui.js 任何位置，只要在 goNextPage 能呼叫到）=====

function captureCompositeShot() {
  const v = window.video || document.getElementById("video");
  if (!v || !v.videoWidth) return null;

  const blobC = document.getElementById("blobCanvas");
  const maskC = document.getElementById("maskCanvas");

  const w = v.videoWidth;
  const h = v.videoHeight;

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");

  // 1) 先畫 video（因你畫面是鏡像，這裡也鏡像，保持一致）
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(v, 0, 0, w, h);
  ctx.restore();

  // 2) 疊 mask（如果存在）
  if (maskC && maskC.width) {
    // 你的 CSS 用 mix-blend-mode:multiply；canvas 這裡用 globalCompositeOperation 模擬
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(maskC, 0, 0, w, h);
    ctx.restore();
  }

  // 3) 疊 blob
  if (blobC && blobC.width) {
    ctx.drawImage(blobC, 0, 0, w, h);
  }

  // 存成 jpg
  return c.toDataURL("image/jpeg", 0.88);
}
