/********************************************************************
 * report.js (UPDATED - STRUCTURE READY)
 * - Scale stage to fit screen
 * - Fade-in
 * - Read sessionStorage from detector page
 * - Bind:
 *   (Blue) shot + serial
 *   (Orange) engagement (3 lines) + fixed labels (static in HTML)
 *   (Purple) description (2 lines) tied to engagement level
 *   (Green) cards values
 *   (Top) date/time from system clock
 *   (Shape) 01/02/03 grid (optional, if HTML exists)
 *   (GIF) show only one gif based on actionType (if gifSlot exists)
 ********************************************************************/

function resizeStage() {
  const app = document.getElementById("reportApp");
  const designW = 1080;
  const designH = 1920;
  const scale = Math.min(
    window.innerWidth / designW,
    window.innerHeight / designH,
  );
  if (app) app.style.transform = `translate(0px, 0px) scale(${scale})`;
}
window.addEventListener("resize", resizeStage);
resizeStage();

// fade-in
requestAnimationFrame(() => {
  document.body.classList.add("is-ready");
});

// ===== DOM =====
const shotEl = document.getElementById("reportShot");
const serialEl = document.getElementById("serialText");

const engEl = document.getElementById("reportEng"); // eng-box
const descEl = document.getElementById("reportDesc"); // desc-box (2 lines)

const timeEl = document.getElementById("reportTime");
const pctEl = document.getElementById("reportPct");

const actIconEl = document.getElementById("reportActionIcon");
const actCountEl = document.getElementById("reportActionCount");

const pillDateEl = document.getElementById("pillDate");
const pillTimeEl = document.getElementById("pillTime");

const gifSlotEl = document.getElementById("gifSlot");

// 可能存在：三格 shape grid（你若已在 HTML 加上這些 id，就會自動綁定）
const shape01El = document.getElementById("shape01");
const shape02El = document.getElementById("shape02");
const shape03El = document.getElementById("shape03");

const ACTION_ICON = {
  neck: "./assets/img/neck_icon.png",
  arms: "../assets/img/hand_icon.png",
  legs: "../assets/img/foot_icon.png",
};

// ===== storage helpers =====
function safeGet(k, fallback = "") {
  const v = sessionStorage.getItem(k);
  return v == null ? fallback : v;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function pad2(n) {
  return String(n).padStart(2, "0");
}

// ===== read saved values from page1 =====
const level = clamp(Number(safeGet("r_level", "0")) || 0, 0, 4);

// 例如 "01 None Engagement"
const engagementLabel = safeGet("r_engagementLabel", "01 None Engagement");

const mmss = safeGet("r_mmss", "00:00");
const actionType = safeGet("r_actionType", "neck");
const actionCount = Number(safeGet("r_actionCount", "0")) || 0;
const waitingPct = Number(safeGet("r_waitingPct", "0")) || 0;

const shot = safeGet("r_shot", "");

// （可選）你若在 detector 頁有存這些，report 就能顯示三格分析圖
// 例如存 base64：sessionStorage.setItem("r_shape01", dataUrl);
const shape01 = safeGet("r_shape01", "");
const shape02 = safeGet("r_shape02", "");
const shape03 = safeGet("r_shape03", "");

// ===== Engagement (3 lines) =====
// 把 "01 None Engagement" 拆成 number + label
function parseEngLabel(str) {
  // 預期： "01 None Engagement"
  const m = String(str)
    .trim()
    .match(/^(\d{2})\s+(.*)$/);
  if (!m) return { no: "01", text: String(str).trim() || "None Engagement" };
  return { no: m[1], text: m[2] };
}
const engParsed = parseEngLabel(engagementLabel);

// 你要的五階（中英文字，依 level 綁定）
// 這裡你可換成你設計稿的正式文案
const ENG_TEXT_BY_LEVEL = [
  { zh: "穩定等待", en: "None Engagement" },
  { zh: "低度參與", en: "Low Engagement" },
  { zh: "中度參與", en: "Med Engagement" },
  { zh: "高度參與", en: "High Engagement" },
  { zh: "極限參與", en: "Max Engagement" },
];

// ===== Purple description (2 lines) tied to engagement =====
// 上下兩行（你可改成你自己的文案）
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

// ===== apply bindings =====

// ---- Engagement box: 3 lines ----
if (engEl) {
  const t = ENG_TEXT_BY_LEVEL[level] || ENG_TEXT_BY_LEVEL[0];

  // 相容兩種寫法：
  // A) 你 HTML 已經是 <div class="eng-no">...</div><div class="ch-word">...</div><div class="eng-word">...</div>
  // B) 你還沒改 HTML -> 我直接塞 innerHTML 建立結構
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

  // number：以「綁定結果」為主；若你想強制跟 level 走，可改成 pad2(level+1)
  if (noEl) noEl.textContent = engParsed.no || pad2(level + 1);
  if (chEl) chEl.textContent = t.zh;
  if (enEl) enEl.textContent = t.en;
}

// ---- Purple desc: 2 lines ----
if (descEl) {
  const d = DESC_BY_LEVEL_2LINES[level] || DESC_BY_LEVEL_2LINES[0];

  let topLine = descEl.querySelector(".desc-top");
  let bottomLine = descEl.querySelector(".desc-bottom");

  // 若 HTML 還是一行文字，也能自動補成兩行
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

// ---- Green cards ----
if (timeEl) timeEl.textContent = mmss;
if (pctEl) pctEl.textContent = `${clamp(waitingPct, 0, 99)}%`;

if (actIconEl) actIconEl.src = ACTION_ICON[actionType] || ACTION_ICON.neck;
if (actCountEl) actCountEl.textContent = String(actionCount).padStart(2, "0");

// ---- Blue shot ----
if (shotEl) {
  if (shot) {
    shotEl.src = shot;
    shotEl.style.opacity = "1";
  } else {
    shotEl.style.opacity = "0";
  }
}

// ---- Blue serial ----
if (serialEl) {
  serialEl.textContent = safeGet("r_serial", "00000001");
}

// ---- Shape grid (optional) ----
// 你若 HTML 有 shape01/02/03 容器，這裡會塞圖；沒有就略過
function setShape(el, dataUrl) {
  if (!el) return;
  if (!dataUrl) {
    el.style.opacity = "0"; // 沒資料就不顯示
    return;
  }
  el.style.opacity = "1";
  // 如果你已經在 HTML 放 <img>，就用它；否則動態建立
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

// ---- GIF slot: show only one based on actionType ----
if (gifSlotEl) {
  const imgs = Array.from(gifSlotEl.querySelectorAll("img"));
  if (imgs.length) {
    // 對應你放的三張：act01/act02/act03
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

// ===== top pills: date/time from system =====
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

(function fitReportStage() {
  const stage = document.getElementById("reportApp");
  const viewport = document.getElementById("viewport");
  if (!stage || !viewport) return;

  // ✅ 這裡填你 report 設計稿的基準尺寸（很重要）
  // 例如你原本是用 1920x1080 或 1080x1920，就填那個
  const DESIGN_W = 1080;
  const DESIGN_H = 1920;

  function applyScale() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H);

    // 置中：先把 stage 原點拉到螢幕中央，再用 translate 把縮放後尺寸置中
    const scaledW = DESIGN_W * scale;
    const scaledH = DESIGN_H * scale;

    const left = (vw - scaledW) / 2;
    const top = (vh - scaledH) / 2;

    stage.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  }

  window.addEventListener("resize", applyScale);
  window.addEventListener("orientationchange", applyScale);
  applyScale();
})();
