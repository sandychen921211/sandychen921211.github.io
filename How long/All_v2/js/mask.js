/********************************************************************
 * mask.js (CLEAN)
 * - MediaPipe SelfieSegmentation
 * - Tint ONLY the person with color based on level (0..4)
 * - Reads: window.currentEngagementLevel (set by ui.js)
 * - Public:
 *   window.startMaskLoopWhenReady()
 ********************************************************************/

(() => {
  if (window.__MASK_JS_LOADED__) return;
  window.__MASK_JS_LOADED__ = true;

  const canvas = document.getElementById("maskCanvas");
  if (!canvas) {
    console.warn("[mask.js] #maskCanvas not found");
    return;
  }
  const ctx = canvas.getContext("2d");

  function getVideo() {
    return window.video || document.getElementById("video");
  }

  const COLORS = [
    "#A48A70", // NONE (level 0)
    "#4D4D4D", // LOW  (level 1)
    "#AFAFAF", // MED  (level 2)
    "#F4F4F4", // HIGH (level 3)
    "#E4FF1C", // MAX  (level 4)
  ];

  // init model
  const SEG_VER = "0.1";
  const seg = new window.SelfieSegmentation({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${SEG_VER}/${file}`,
  });

  seg.setOptions({
    modelSelection: 1, // generally stable for portrait/landscape
  });

  function syncSize() {
    const v = getVideo();
    if (!v || !v.videoWidth) return false;

    if (canvas.width !== v.videoWidth || canvas.height !== v.videoHeight) {
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
    }
    return true;
  }

  seg.onResults((res) => {
    if (!syncSize()) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const level = Math.max(
      0,
      Math.min(4, Number(window.currentEngagementLevel || 0))
    );
    const color = COLORS[level];

    // draw mask
    ctx.save();
    ctx.drawImage(res.segmentationMask, 0, 0, canvas.width, canvas.height);

    // tint only where mask is present
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  });

  async function loop() {
    const v = getVideo();
    if (!v || !v.videoWidth) {
      requestAnimationFrame(loop);
      return;
    }
    try {
      await seg.send({ image: v });
    } catch (e) {}
    requestAnimationFrame(loop);
  }

  window.startMaskLoopWhenReady = () => requestAnimationFrame(loop);
})();
