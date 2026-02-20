/********************************************************************
 * blob.js (EASE + BURSTS + OVERLAP)
 * - multiple bursts can overlap
 * - color fixed per blob at spawn
 * - smoothstep alpha for ease in/out
 * - burst spawns multiple blobs over time
 ********************************************************************/

(() => {
  if (window.__BLOB_JS_LOADED__) return;
  window.__BLOB_JS_LOADED__ = true;

  const canvasEl = document.getElementById("blobCanvas");
  if (!canvasEl) return;

  const ctx = canvasEl.getContext("2d");
  const bufferCanvas = document.createElement("canvas");
  const bctx = bufferCanvas.getContext("2d", { willReadFrequently: true });

  // ===== CONFIG =====
  const OFFSET_X = -30;
  const OFFSET_Y = 30;

  // easing timeline
  const FADE_IN = 140; // ms
  const HOLD = 520; // ms
  const FADE_OUT = 520; // ms
  const TOTAL = FADE_IN + HOLD + FADE_OUT;

  // burst behavior
  const BURST_BLOBS = 8; // 一次觸發總共生幾顆
  const BURST_INTERVAL = 70; // 每幾 ms 生一顆（連續跑出感）
  const MAX_ACTIVE_BLOBS = 28;

  const SIZE_FACTOR = 0.12;
  const MOVE = 0.35; // 小範圍漂移（更柔）
  const DRIFT_LIMIT = 26; // 漂移限制（避免飄太遠）
  const LINK_DIST = 170;

  // 4:5
  const AR_W = 6,
    AR_H = 3;

  const LABELS = {
    neck: "- ( NECK ) -",
    arms: "- ( HANDS ) -",
    legs: "- ( LEGS ) -",
  };

  const BLOB_COLORS = {
    1: ["#A48A70"],
    2: ["#4D4D4D"],
    3: ["#AFAFAF"],
    4: ["#F4F4F4"],
    5: ["#E4FF1C"],
  };

  const TEXT_COLORS = {
    1: "#ffffff",
    2: "#ffffff",
    3: "#ffffff",
    4: "#ffffff",
    5: "#ffffff",
  };

  // ===== STATE =====
  let blobs = []; // all blobs across bursts
  let bursts = []; // each burst counts as "one action" after fully finished

  function getVideo() {
    return window.video || document.getElementById("video");
  }

  function syncSize() {
    const v = getVideo();
    if (!v || !v.videoWidth) return false;
    if (canvasEl.width !== v.videoWidth || canvasEl.height !== v.videoHeight) {
      canvasEl.width = v.videoWidth;
      canvasEl.height = v.videoHeight;
      bufferCanvas.width = v.videoWidth;
      bufferCanvas.height = v.videoHeight;
    }
    return true;
  }

  // 0~4 => 1, 5~9 => 2 ...
  function getColorLevel() {
    const count = Number(window.glitchScore || 0);
    return Math.max(1, Math.min(5, Math.floor(count / 5) + 1));
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function smoothstep(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function alphaByAge(age) {
    if (age < 0) return 0;

    if (age < FADE_IN) {
      return smoothstep(age / FADE_IN);
    }
    if (age < FADE_IN + HOLD) {
      return 1;
    }
    const outAge = age - (FADE_IN + HOLD);
    return 1 - smoothstep(outAge / FADE_OUT);
  }

  function spawnOne(burstId, type, ax, ay) {
    if (blobs.length > MAX_ACTIVE_BLOBS)
      blobs.splice(0, blobs.length - MAX_ACTIVE_BLOBS);

    const base = Math.min(canvasEl.width, canvasEl.height) * SIZE_FACTOR;
    const h = base * (0.9 + Math.random() * 0.5);
    const w = (h * AR_W) / AR_H;

    const level = getColorLevel();
    const colors = BLOB_COLORS[level];
    const col = colors[(Math.random() * colors.length) | 0]; // fixed color
    const textColor = TEXT_COLORS[level];

    const ang = Math.random() * Math.PI * 2;
    const dist = Math.random() * 45; // 更小範圍
    let xOff = Math.cos(ang) * dist;
    let yOff = Math.sin(ang) * dist;

    blobs.push({
      id: crypto.randomUUID(),
      burstId,
      type,
      label: LABELS[type] || LABELS.neck,
      ax,
      ay,
      xOff,
      yOff,
      w,
      h,
      vx: (Math.random() - 0.5) * MOVE * 2,
      vy: (Math.random() - 0.5) * MOVE * 2,
      born: Date.now(),
      col,
      textColor,
    });
  }

  function cleanup() {
    const now = Date.now();
    blobs = blobs.filter((b) => now - b.born < TOTAL);

    // burst 完成：此 burstId 的 blobs 全部清掉後，才算一次
    bursts = bursts.filter((burst) => {
      const alive = blobs.some((b) => b.burstId === burst.id);
      const timeUp = now - burst.startedAt >= TOTAL + 80; // buffer
      if (!alive && timeUp && !burst.done) {
        burst.done = true;
        window.onBlobCycleComplete?.(burst.type);
        return false;
      }
      return true;
    });
  }

  function draw() {
    const v = getVideo();
    if (!v || !v.videoWidth) return;
    if (!syncSize()) return;

    // draw video to buffer then grayscale (避免閃爍：保留一致處理)
    bctx.drawImage(v, 0, 0, bufferCanvas.width, bufferCanvas.height);
    const img = bctx.getImageData(
      0,
      0,
      bufferCanvas.width,
      bufferCanvas.height
    );
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      d[i] = d[i + 1] = d[i + 2] = gray;
    }
    bctx.putImageData(img, 0, 0);

    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    const now = Date.now();

    // draw blobs
    for (const b of blobs) {
      const age = now - b.born;
      const a = alphaByAge(age);
      if (a <= 0) continue;

      // drift (small range + clamp)
      b.xOff = clamp(b.xOff + b.vx, -DRIFT_LIMIT, DRIFT_LIMIT);
      b.yOff = clamp(b.yOff + b.vy, -DRIFT_LIMIT, DRIFT_LIMIT);

      const x = clamp(b.ax + b.xOff + OFFSET_X, 0, canvasEl.width - b.w);
      const y = clamp(b.ay + b.yOff + OFFSET_Y, 0, canvasEl.height - b.h);

      const c = b.col.slice(1);
      const rr = parseInt(c.slice(0, 2), 16);
      const gg = parseInt(c.slice(2, 4), 16);
      const bb = parseInt(c.slice(4, 6), 16);

      ctx.save();
      ctx.globalAlpha = a;

      // glow (更柔和)
      ctx.fillStyle = `rgba(${rr},${gg},${bb},0.12)`;
      ctx.fillRect(x - 8, y - 8, b.w + 16, b.h + 16);

      // video patch
      const sx = Math.max(0, b.ax - b.w / 2);
      const sy = Math.max(0, b.ay - b.h / 2);
      const sw = Math.min(b.w, bufferCanvas.width - sx);
      const sh = Math.min(b.h, bufferCanvas.height - sy);

      if (sw > 0 && sh > 0) {
        ctx.save();
        ctx.translate(x + b.w / 2, y + b.h / 2);
        ctx.scale(-1, 1);
        ctx.drawImage(
          bufferCanvas,
          sx,
          sy,
          sw,
          sh,
          -b.w / 2,
          -b.h / 2,
          b.w,
          b.h
        );
        ctx.restore();
      }

      // border (固定色)
      ctx.strokeStyle = b.col;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, b.w, b.h);

      // label
      const fontSize = 12;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textBaseline = "bottom";
      ctx.textAlign = "right";
      const pad = 4;
      const tw = ctx.measureText(b.label).width;

      ctx.fillStyle = `rgba(${rr},${gg},${bb},1)`;
      ctx.fillRect(
        x + b.w - tw - pad * 2,
        y + b.h - fontSize - pad * 2,
        tw + pad * 2,
        fontSize + pad * 2
      );

      ctx.fillStyle = b.textColor;
      ctx.fillText(b.label, x + b.w - pad, y + b.h - pad);

      ctx.restore();
    }

    // links (同 burst 內才連，顏色取 blob 本身色，避免跳色)
    for (let i = 0; i < blobs.length; i++) {
      for (let j = i + 1; j < blobs.length; j++) {
        const a = blobs[i],
          b = blobs[j];
        if (a.burstId !== b.burstId) continue;

        const ax = a.ax + a.xOff + OFFSET_X;
        const ay = a.ay + a.yOff + OFFSET_Y;
        const bx = b.ax + b.xOff + OFFSET_X;
        const by = b.ay + b.yOff + OFFSET_Y;

        const dist = Math.hypot(ax - bx, ay - by);
        if (dist < LINK_DIST) {
          ctx.save();
          ctx.globalAlpha = 0.65;
          ctx.strokeStyle = a.col;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // ===== BURST API =====
  function startBurst(type) {
    if (!["neck", "arms", "legs"].includes(type)) type = "neck";

    const id = crypto.randomUUID();
    const startedAt = Date.now();

    // anchor 偏右中
    const ax = Math.round(canvasEl.width * 0.64);
    const ay = Math.round(canvasEl.height * 0.55);

    bursts.push({
      id,
      type,
      startedAt,
      spawned: 0,
      nextSpawnAt: startedAt,
      done: false,
      ax,
      ay,
    });
  }

  function spawnManager() {
    const now = Date.now();
    for (const burst of bursts) {
      while (burst.spawned < BURST_BLOBS && now >= burst.nextSpawnAt) {
        spawnOne(
          burst.id,
          burst.type,
          burst.ax + (Math.random() - 0.5) * 70,
          burst.ay + (Math.random() - 0.5) * 70
        );
        burst.spawned += 1;
        burst.nextSpawnAt += BURST_INTERVAL;
      }
    }
  }

  function loop() {
    spawnManager();
    cleanup();
    draw();
    requestAnimationFrame(loop);
  }

  window.startBlobLoopWhenReady = () => {
    const v = getVideo();
    if (!v || !v.videoWidth) {
      requestAnimationFrame(window.startBlobLoopWhenReady);
      return;
    }
    syncSize();
    requestAnimationFrame(loop);
  };

  // 允許重疊：每次 trigger 都開一個新的 burst
  window.triggerBlobCycle = (type) => {
    if (!syncSize()) return;
    startBurst(type);
  };

  // 只要 burst 存在，就算 active（給 ui.js 判斷是否需要排隊/或你要改成允許連續觸發）
  window.isBlobCycleActive = () => bursts.length > 0;
})();
