/********************************************************************
 * pose.js (CLEAN + PUBLIC START)
 * - Writes flags:
 *   window.touchHeadOrNeck / window.crossArms / window.crossedLegs
 * - Public:
 *   window.startPoseLoopWhenReady()
 ********************************************************************/

(() => {
  if (window.__POSE_JS_LOADED__) return;
  window.__POSE_JS_LOADED__ = true;

  window.touchHeadOrNeck = false;
  window.crossArms = false;
  window.crossedLegs = false;

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }
  function mid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  function vis(p, min = 0.55) {
    return p && (p.visibility ?? 1) >= min;
  }
  function getVideo() {
    return window.video || document.getElementById("video");
  }

  const POSE_VER = "0.5";
  const pose = new window.Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${POSE_VER}/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });

  // temporal filter
  const FILTER = { onFrames: 4, offFrames: 7 };
  const counters = {
    neckOn: 0,
    neckOff: 0,
    armsOn: 0,
    armsOff: 0,
    legsOn: 0,
    legsOff: 0,
  };

  function applyFilter(raw, flagName, onKey, offKey) {
    if (raw) {
      counters[onKey] += 1;
      counters[offKey] = 0;
      if (counters[onKey] >= FILTER.onFrames) window[flagName] = true;
    } else {
      counters[offKey] += 1;
      counters[onKey] = 0;
      if (counters[offKey] >= FILTER.offFrames) window[flagName] = false;
    }
  }

  pose.onResults((res) => {
    const lm = res.poseLandmarks;
    if (!lm || lm.length < 33) {
      window.touchHeadOrNeck = false;
      window.crossArms = false;
      window.crossedLegs = false;
      return;
    }

    const NOSE = lm[0];
    const L_SHO = lm[11],
      R_SHO = lm[12];
    const L_ELB = lm[13],
      R_ELB = lm[14];
    const L_WRI = lm[15],
      R_WRI = lm[16];
    const L_HIP = lm[23],
      R_HIP = lm[24];
    const L_KNE = lm[25],
      R_KNE = lm[26];
    const L_ANK = lm[27],
      R_ANK = lm[28];

    const shoulderOK = vis(L_SHO) && vis(R_SHO);
    const hipOK = vis(L_HIP) && vis(R_HIP);
    if (!shoulderOK || !hipOK) {
      applyFilter(false, "touchHeadOrNeck", "neckOn", "neckOff");
      applyFilter(false, "crossArms", "armsOn", "armsOff");
      applyFilter(false, "crossedLegs", "legsOn", "legsOff");
      return;
    }

    const wristL_OK = vis(L_WRI);
    const wristR_OK = vis(R_WRI);
    const elbowOK = vis(L_ELB) && vis(R_ELB);

    const kneeOK = vis(L_KNE) && vis(R_KNE);
    const ankleOK = vis(L_ANK) && vis(R_ANK);

    // scale refs
    const shoulderW = Math.abs(L_SHO.x - R_SHO.x);
    const neck = mid(L_SHO, R_SHO);
    const hipMid = mid(L_HIP, R_HIP);
    const torsoH = Math.max(0.12, Math.abs(hipMid.y - neck.y));
    const chestY = neck.y + torsoH * 0.35;

    // 1) touch neck/head (looser, single hand allowed)
    let rawNeck = false;
    if ((wristL_OK || wristR_OK) && vis(NOSE, 0.4)) {
      const th = Math.max(0.07, Math.min(0.18, shoulderW * 1.15));
      const yGate = chestY; // must be above chest

      const L_ok =
        wristL_OK &&
        L_WRI.y < yGate &&
        (dist(L_WRI, neck) < th || dist(L_WRI, NOSE) < th);

      const R_ok =
        wristR_OK &&
        R_WRI.y < yGate &&
        (dist(R_WRI, neck) < th || dist(R_WRI, NOSE) < th);

      rawNeck = L_ok || R_ok;
    }

    // 2) cross arms (tight, reduce false positives)
    let rawArms = false;
    if (wristL_OK && wristR_OK && elbowOK) {
      const wristBand = torsoH * 0.3;
      const elbowBand = torsoH * 0.4;

      const wristsNearChest =
        Math.abs(L_WRI.y - chestY) < wristBand &&
        Math.abs(R_WRI.y - chestY) < wristBand;

      const elbowsNearChest =
        Math.abs(L_ELB.y - chestY) < elbowBand &&
        Math.abs(R_ELB.y - chestY) < elbowBand;

      const wristsClose = dist(L_WRI, R_WRI) < Math.max(0.1, shoulderW * 0.9);

      const crossAmount = (L_WRI.x - R_WRI.x) * (L_SHO.x - R_SHO.x);
      const wristsCross = crossAmount < 0;

      rawArms =
        wristsCross && wristsNearChest && elbowsNearChest && wristsClose;
    }

    // 3) cross legs (looser)
    let rawLegs = false;
    if (kneeOK && ankleOK) {
      const anklesClose = dist(L_ANK, R_ANK) < Math.max(0.08, shoulderW * 0.85);
      const kneesClose = dist(L_KNE, R_KNE) < Math.max(0.1, shoulderW * 1.1);

      const ankleOrder = L_ANK.x > R_ANK.x;
      const kneeOrder = L_KNE.x > R_KNE.x;
      const crossedX = ankleOrder !== kneeOrder || anklesClose;

      const yDiffOK = Math.abs(L_ANK.y - R_ANK.y) < 0.12;

      rawLegs = anklesClose && kneesClose && crossedX && yDiffOK;
    }

    applyFilter(rawNeck, "touchHeadOrNeck", "neckOn", "neckOff");
    applyFilter(rawArms, "crossArms", "armsOn", "armsOff");
    applyFilter(rawLegs, "crossedLegs", "legsOn", "legsOff");
  });

  async function poseLoop() {
    const v = getVideo();
    if (!v || !v.videoWidth) {
      requestAnimationFrame(poseLoop);
      return;
    }
    try {
      await pose.send({ image: v });
    } catch (e) {}
    requestAnimationFrame(poseLoop);
  }

  // ✅ public start
  window.startPoseLoopWhenReady = () => requestAnimationFrame(poseLoop);
})();
