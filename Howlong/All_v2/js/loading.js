/********************************************************************
 * loading.js
 * - Auto scale 1080x1920
 * - Right mins: 6 rows with per-row random range (continuous roll)
 * - Left mins: 4 rows toggling between two numbers (roll style)
 * - Symbol zones: PNG single symbol pop/jump (random, infinite)
 ********************************************************************/

/* ===== 1) Scale to screen ===== */
function resizeStage() {
  const app = document.getElementById("loadingApp");
  const designW = 1080;
  const designH = 1920;
  const scale = Math.min(
    window.innerWidth / designW,
    window.innerHeight / designH,
  );
  app.style.transform = `translate(0px, 0px) scale(${scale})`;
}
window.addEventListener("resize", resizeStage);
resizeStage();

/* ===== Utils ===== */
function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
function padN(n, width) {
  const s = String(n);
  return s.padStart(width, "0");
}

/* ===== Slot digit renderer =====
   目標：digits span 裡面建立「slot 欄位」
*/
function buildSlotDigits(containerEl, initialStr) {
  containerEl.innerHTML = ""; // reset
  const slot = document.createElement("span");
  slot.className = "slot";

  // 每一位建立一個 column（僅放 0..9）
  for (const ch of initialStr) {
    const col = document.createElement("span");
    col.className = "slot-col";

    const strip = document.createElement("div");
    strip.className = "slot-strip";

    // 0..9
    for (let d = 0; d <= 9; d++) {
      const cell = document.createElement("div");
      cell.textContent = d;
      strip.appendChild(cell);
    }

    // 初始位置
    const digit = Number(ch);
    strip.style.transform = `translateY(${-digit * getLinePx()}px)`;

    col.appendChild(strip);
    slot.appendChild(col);
  }

  containerEl.appendChild(slot);
}

/* 取得 CSS line height px（與 --mins-line 同步） */
function getLinePx() {
  const root = getComputedStyle(document.documentElement);
  const v = root.getPropertyValue("--mins-line").trim();
  // v like "54px"
  return Number(v.replace("px", "")) || 54;
}

/* 更新 slot 到某個數字字串（帶動畫） */
function animateTo(containerEl, nextStr, duration = 420) {
  // 若長度不同（例如 2 位 -> 3 位），重建
  const slot = containerEl.querySelector(".slot");
  const cols = slot ? slot.querySelectorAll(".slot-col") : null;

  if (!slot || !cols || cols.length !== nextStr.length) {
    buildSlotDigits(containerEl, nextStr);
    return;
  }

  const linePx = getLinePx();

  for (let i = 0; i < nextStr.length; i++) {
    const col = cols[i];
    const strip = col.querySelector(".slot-strip");
    const digit = Number(nextStr[i]);

    // 用 transition 做滾輪感（ease-in-out）
    strip.style.transition = `transform ${duration}ms cubic-bezier(.2,.8,.2,1)`;
    strip.style.transform = `translateY(${-digit * linePx}px)`;

    // 解除 transition，避免累積（可選）
    setTimeout(() => {
      strip.style.transition = "";
    }, duration + 20);
  }
}

/* ===== Row controllers ===== */
function initRow(rowEl) {
  const digitsEl = rowEl.querySelector(".digits");

  const mode = rowEl.dataset.mode;

  if (mode === "range") {
    const min = Number(rowEl.dataset.min);
    const max = Number(rowEl.dataset.max);
    const pad = rowEl.dataset.pad; // "2" | "3" | "auto"

    // 初始值
    const initial = randInt(min, max);
    const initialStr = formatByRule(initial, pad);

    buildSlotDigits(digitsEl, initialStr);

    // 持續更新：每 0.7~1.4s 滾一次
    setInterval(
      () => {
        const v = randInt(min, max);
        const s = formatByRule(v, pad);
        animateTo(digitsEl, s, 420);
      },
      randInt(700, 1400),
    );
  }

  if (mode === "toggle") {
    const a = Number(rowEl.dataset.a);
    const b = Number(rowEl.dataset.b);
    const pad = Number(rowEl.dataset.pad || "1");

    let state = true;
    const initialStr = padN(a, pad);
    buildSlotDigits(digitsEl, initialStr);

    // 交互：每 0.9~1.6s 互換一次（滾輪）
    setInterval(
      () => {
        state = !state;
        const v = state ? a : b;
        animateTo(digitsEl, padN(v, pad), 420);
      },
      randInt(900, 1600),
    );
  }
}

/* pad 規則：
   - pad="2" => 兩位 00~99
   - pad="3" => 三位 000~999
   - pad="auto" => 60~120：兩位~三位，依數字自動長度（60-99 => 2，100-120 => 3）
*/
function formatByRule(n, padRule) {
  if (padRule === "2") return padN(n, 2);
  if (padRule === "3") return padN(n, 3);
  // auto
  if (n >= 100) return padN(n, 3);
  return padN(n, 2);
}

/* Init mins blocks */
document.querySelectorAll(".mins-row").forEach(initRow);

/**
 * 建立固定排數/每排格數，並讓每格原地輪轉符號（永不空白）
 * @param {HTMLElement} box
 * @param {number[]} rowCounts 例如 [23,19,5,6,18,24]
 * @param {Object} opt
 */
function startSymbolRotate(box, rowCounts, opt = {}) {
  if (!box) return;

  const cfg = {
    minHold: 1200,
    maxHold: 1500,
    stagger: 600, // 每格起始錯開，讓整排看起來更「系統在跑」
    ...opt,
  };

  // 清空容器，重建固定格子
  box.innerHTML = "";

  /** @type {HTMLSpanElement[]} */
  const cells = [];

  rowCounts.forEach((count, rowIdx) => {
    for (let i = 0; i < count; i++) {
      const cell = document.createElement("span");
      cell.className = "glyph-cell";

      const init = pickSymbol(null);
      cell.textContent = init;
      cell.dataset.prev = init;

      box.appendChild(cell);
      cells.push(cell);
    }
    // 換行（最後一行不要加）
    if (rowIdx !== rowCounts.length - 1) {
      box.appendChild(document.createElement("br"));
    }
  });

  // 每格自己的輪轉計時器
  cells.forEach((cell) => {
    const loop = () => {
      const prev = cell.dataset.prev || "";
      const next = pickSymbol(prev);

      cell.textContent = next;
      cell.dataset.prev = next;

      const hold = cfg.minHold + Math.random() * (cfg.maxHold - cfg.minHold);
      setTimeout(loop, hold);
    };

    // 起始錯開（避免一瞬間整排同時變）
    const startDelay = Math.random() * cfg.stagger;
    setTimeout(loop, startDelay);
  });
}

/* ===== Apply to your two green boxes (match your spec) ===== */

startSymbolRotate(
  document.getElementById("glyphBoxBottomRight"),
  [16, 7, 0, 3],
);

// ===== 10 秒後跳到 report.html（含 ease in/out）=====
const REPORT_PAGE_URL = "./report.html";
const REPORT_DELAY_MS = 10 * 2000;

let loadingHasNav = false;

function fadeAndGo(url) {
  if (loadingHasNav) return;
  loadingHasNav = true;

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "#fff";
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "none";
  overlay.style.transition = "opacity 520ms cubic-bezier(.2,.8,.2,1)";
  overlay.style.zIndex = "99999";
  document.body.appendChild(overlay);

  requestAnimationFrame(() => (overlay.style.opacity = "1"));

  setTimeout(() => {
    window.location.href = url;
  }, 540);
}

setTimeout(() => fadeAndGo(REPORT_PAGE_URL), REPORT_DELAY_MS);
