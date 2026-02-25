/********************************************************************
 * report.js (CLEAN FINAL v2)
 * - ONE scaling system (fit stage into viewport, centered)
 * - Fade-in safe (never blank on mobile)
 * - Data source priority:
 *    1) URL params (phone via QR)
 *    2) sessionStorage (kiosk flow)
 * - Shot priority:
 *    1) URL param "shot" (Firebase URL)
 *    2) sessionStorage "r_shot_url"
 *    3) legacy sessionStorage "r_shot" (dataURL)
 ********************************************************************/

// ===== helpers =====
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function safeGet(k, fallback = "") {
  try {
    const v = sessionStorage.getItem(k);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}
const urlParams = new URLSearchParams(location.search);
function getParamOrStorage(paramKey, storageKey, fallback = "") {
  // URL param has priority (phone)
  const p = urlParams.get(paramKey);
  if (p != null && p !== "") return p;
  // else fallback to kiosk sessionStorage
  return safeGet(storageKey, fallback);
}

// ===== fade-in safe =====
requestAnimationFrame(() => {
  document.body.classList.add("is-ready");
  document.body.style.opacity = "1";
});

// ===== DOM =====
const shotEl = document.getElementById("reportShot");
const serialEl = document.getElementById("serialText");

const engEl = document.getElementById("reportEng"); // eng-box
const descEl = document.getElementById("reportDesc"); // desc-box

const timeEl = document.getElementById("reportTime");
const pctEl = document.getElementById("reportPct");

const actIconEl = document.getElementById("reportActionIcon");
const actCountEl = document.getElementById("reportActionCount");

const pillDateEl = document.getElementById("pillDate");
const pillTimeEl = document.getElementById("pillTime");

const gifSlotEl = document.getElementById("gifSlot");

const shape01El = document.getElementById("shape01");
const shape02El = document.getElementById("shape02");
const shape03El = document.getElementById("shape03");

// ✅ 統一路徑（不要用 ../）
const ACTION_ICON = {
  neck: "./assets/img/neck_icon.png",
  arms: "./assets/img/hand_icon.png",
  legs: "./assets/img/foot_icon.png",
};

// ===== read values (URL first, then storage) =====
// NOTE: ui.js 產出的 share 參數鍵名是：level, mmss, waitingPct, actionType, actionCount, engagementLabel, shot
// 但你舊版 report.js 也可能吃：pct, action, count, eng
// 這裡做「雙鍵相容」。

const level = clamp(
  Number(getParamOrStorage("level", "r_level", "0")) || 0,
  0,
  4,
);

const engagementLabel =
  getParamOrStorage("engagementLabel", "r_engagementLabel", "") ||
  getParamOrStorage("eng", "r_engagementLabel", "01 None Engagement");

function decodeDeep(s) {
  let out = String(s ?? "");
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch {
      break;
    }
  }
  return out;
}

const mmssRaw = getParamOrStorage("mmss", "r_mmss", "00:00");
const mmss = decodeDeep(mmssRaw);

if (timeEl) timeEl.textContent = mmss;

const actionType =
  getParamOrStorage("actionType", "r_actionType", "") ||
  getParamOrStorage("action", "r_actionType", "neck");

const actionCount =
  Number(
    getParamOrStorage("actionCount", "r_actionCount", "") ||
      getParamOrStorage("count", "r_actionCount", "0"),
  ) || 0;

const waitingPct =
  Number(
    getParamOrStorage("waitingPct", "r_waitingPct", "") ||
      getParamOrStorage("pct", "r_waitingPct", "0"),
  ) || 0;

const serial = getParamOrStorage("serial", "r_serial", "00000001");

const shape01 = getParamOrStorage("s1", "r_shape01", "");
const shape02 = getParamOrStorage("s2", "r_shape02", "");
const shape03 = getParamOrStorage("s3", "r_shape03", "");

// ✅ Shot priority: URL shot > session r_shot_url > legacy r_shot
const shot =
  urlParams.get("shot") || safeGet("r_shot_url", "") || safeGet("r_shot", "");

// ===== Engagement label parse =====
function parseEngLabel(str) {
  const m = String(str)
    .trim()
    .match(/^(\d{2})\s+(.*)$/);
  if (!m) return { no: "01", text: String(str).trim() || "None Engagement" };
  return { no: m[1], text: m[2] };
}
const engParsed = parseEngLabel(engagementLabel);

// ===== copy decks =====
const ENG_TEXT_BY_LEVEL = [
  { zh: "穩定等待", en: "None Engagement" },
  { zh: "低度參與", en: "Low Engagement" },
  { zh: "中度參與", en: "Med Engagement" },
  { zh: "高度參與", en: "High Engagement" },
  { zh: "極限參與", en: "Max Engagement" },
];

const DESC_BY_LEVEL_2LINES = [
  { top: "行為反應進入低警覺狀態", bottom: "Behavioral response: low arousal" },
  {
    top: "行為反應進入輕度參與狀態",
    bottom: "Behavioral response: light engage",
  },
  {
    top: "行為反應進入中度參與狀態",
    bottom: "Behavioral response: mid engage",
  },
  {
    top: "行為反應進入高度參與狀態",
    bottom: "Behavioral response: high engage",
  },
  {
    top: "行為反應進入極限參與狀態",
    bottom: "Behavioral response: max engage",
  },
];

// ===== bind UI =====

// --- Engagement box ---
if (engEl) {
  const t = ENG_TEXT_BY_LEVEL[level] || ENG_TEXT_BY_LEVEL[0];

  let noEl = engEl.querySelector(".eng-no");
  let chEl = engEl.querySelector(".ch-word");
  let enEl = engEl.querySelector(".eng-word");

  if (!noEl || !chEl || !enEl) {
    engEl.innerHTML = `
      <div class="eng-no"></div>
      <div class="ch-word"></div>
      <div class="eng-word"></div>
    `;
    noEl = engEl.querySelector(".eng-no");
    chEl = engEl.querySelector(".ch-word");
    enEl = engEl.querySelector(".eng-word");
  }

  if (noEl) noEl.textContent = engParsed.no || pad2(level + 1);
  if (chEl) chEl.textContent = t.zh;
  if (enEl) enEl.textContent = t.en;
}

// --- Purple desc ---
if (descEl) {
  const d = DESC_BY_LEVEL_2LINES[level] || DESC_BY_LEVEL_2LINES[0];

  let topLine = descEl.querySelector(".desc-top");
  let bottomLine = descEl.querySelector(".desc-bottom");

  if (!topLine || !bottomLine) {
    descEl.innerHTML = `
      <div class="desc-line desc-top"></div>
      <div class="desc-line desc-bottom"></div>
    `;
    topLine = descEl.querySelector(".desc-top");
    bottomLine = descEl.querySelector(".desc-bottom");
  }

  if (topLine) topLine.textContent = d.top;
  if (bottomLine) bottomLine.textContent = d.bottom;
}

// --- Cards ---
if (timeEl) timeEl.textContent = mmss;
if (pctEl) pctEl.textContent = `${clamp(waitingPct, 0, 99)}%`;

if (actIconEl) actIconEl.src = ACTION_ICON[actionType] || ACTION_ICON.neck;
if (actCountEl) actCountEl.textContent = String(actionCount).padStart(2, "0");

// --- Shot (核心：確保不是 display:none) ---
if (shotEl) {
  if (shot) {
    shotEl.src = shot;
    shotEl.style.display = "block"; // ✅ 強制顯示
    shotEl.style.opacity = "1";
  } else {
    shotEl.style.display = "none";
    shotEl.style.opacity = "0";
    console.warn("[SHOT] missing (no URL shot, no session r_shot_url/r_shot)");
  }
}

// --- Serial ---
if (serialEl) serialEl.textContent = serial;

// --- Shape grid ---
function setShape(el, dataUrl) {
  if (!el) return;
  if (!dataUrl) {
    el.style.opacity = "0";
    return;
  }
  el.style.opacity = "1";
  let img = el.querySelector("img");
  if (!img) {
    img = document.createElement("img");
    el.appendChild(img);
  }
  img.src = dataUrl;
  img.alt = "shape";
}
setShape(shape01El, shape01);
setShape(shape02El, shape02);
setShape(shape03El, shape03);

// --- GIF slot ---
if (gifSlotEl) {
  const imgs = Array.from(gifSlotEl.querySelectorAll("img"));
  if (imgs.length) {
    const idx =
      actionType === "neck"
        ? 0
        : actionType === "arms"
          ? 1
          : actionType === "legs"
            ? 2
            : 0;

    imgs.forEach((img, i) => {
      img.style.display = i === idx ? "block" : "none";
    });
  }
}

// ===== Top pills: date/time from system =====
function monthAbbr(m) {
  return (
    [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ][m] || "JAN"
  );
}
function formatPillDate(d) {
  const mon = monthAbbr(d.getMonth());
  const day = pad2(d.getDate());
  const year = d.getFullYear();
  return `- ( ${mon} / ${day} / ${year} ) -`;
}
function formatPillTime(d) {
  let h = d.getHours();
  const m = pad2(d.getMinutes());
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `- ( ${pad2(h)}:${m} ${ampm} ) -`;
}
function updatePills() {
  const now = new Date();
  if (pillDateEl) pillDateEl.textContent = formatPillDate(now);
  if (pillTimeEl) pillTimeEl.textContent = formatPillTime(now);
}
updatePills();
setInterval(updatePills, 30 * 1000);

// ===== ONE scaling system (center-fit) =====
(function fitReportStage() {
  const stage = document.getElementById("reportApp");
  const viewport = document.getElementById("viewport");
  if (!stage || !viewport) return;

  const DESIGN_W = 1080;
  const DESIGN_H = 1920;

  function applyScale() {
    const vw = window.visualViewport?.width ?? viewport.clientWidth;
    const vh = window.visualViewport?.height ?? viewport.clientHeight;

    const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H);

    const left = (vw - DESIGN_W * scale) / 2;
    const top = (vh - DESIGN_H * scale) / 2;

    stage.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
    stage.style.transformOrigin = "top left";
  }

  applyScale();
  window.addEventListener("resize", applyScale);
  window.addEventListener("orientationchange", applyScale);
  window.visualViewport?.addEventListener("resize", applyScale);
})();

// ===== OPTIONAL: store share URL for qrcode.html (kiosk only) =====
try {
  // 只有 kiosk 流程才需要寫 qr_report_url
  // 手機掃 QR 進來 (src=qr) 不需要、也不應覆蓋
  const isQR = urlParams.get("src") === "qr";
  if (!isQR) {
    const params = new URLSearchParams();
    params.set("src", "qr");
    params.set("level", String(level));
    params.set("engagementLabel", String(engagementLabel));
    params.set("mmss", String(mmss));
    params.set("actionType", String(actionType));
    params.set("actionCount", String(actionCount));
    params.set("waitingPct", String(waitingPct));

    // ✅ 只允許 Firebase/https URL，不允許 data:image...
    const shotUrlOnly = (
      urlParams.get("shot") ||
      safeGet("r_shot_url", "") ||
      ""
    ).trim();

    if (/^https?:\/\//i.test(shotUrlOnly)) {
      params.set("shot", shotUrlOnly);
    }

    sessionStorage.setItem("qr_report_url", `report.html?${params.toString()}`);
  }
} catch (e) {
  console.warn("Cannot write qr_report_url to sessionStorage", e);
}
