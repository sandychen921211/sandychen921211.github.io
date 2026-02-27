/********************************************************************
 * pose.js (CLEAN + PUBLIC START) — REPLACEMENT v0.6
 * - Writes flags (filtered):
 *   window.touchHeadOrNeck / window.crossArms / window.crossedLegs
 * - Adds single dominant state + anchor for blob:
 *   window.poseState  = "none" | "neck" | "arms" | "legs"
 *   window.poseAnchor = {x,y} normalized (0..1) or null
 * - Fixes:
 *   1) Hands motion mis-labeled as NECK (tighter neck logic + priority)
 *   2) Arms/Legs detection more robust (opposite-shoulder test, hip-scale)
 *   3) Blob label/location mismatch (single dominant state + stable anchors)
 * - Public:
 *   window.startPoseLoopWhenReady()
 ********************************************************************/

(() => {
  if (window.__POSE_JS_LOADED__) return;
  window.__POSE_JS_LOADED__ = true;

  // filtered flags (public)
  window.touchHeadOrNeck = false;
  window.crossArms = false;
  window.crossedLegs = false;

  // dominant state + anchor (public) for your blob UI
  window.poseState = "none"; // "neck" | "arms" | "legs" | "none"
  window.poseAnchor = null; // {x,y} normalized 0..1

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

  // temporal filter (reduces flicker)
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

  // keep last good anchors so blob doesn't jump to null during filter transitions
  const lastAnchors = {
    neck: null,
    arms: null,
    legs: null,
  };

  pose.onResults((res) => {
    const lm = res.poseLandmarks;

    // hard reset if no landmarks
    if (!lm || lm.length < 33) {
      window.touchHeadOrNeck = false;
      window.crossArms = false;
      window.crossedLegs = false;
      window.poseState = "none";
      window.poseAnchor = null;
      return;
    }

    // landmarks
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
      // feed filters "false"
      applyFilter(false, "touchHeadOrNeck", "neckOn", "neckOff");
      applyFilter(false, "crossArms", "armsOn", "armsOff");
      applyFilter(false, "crossedLegs", "legsOn", "legsOff");

      window.poseState = "none";
      window.poseAnchor = null;
      return;
    }

    const wristL_OK = vis(L_WRI);
    const wristR_OK = vis(R_WRI);
    const elbowOK = vis(L_ELB) && vis(R_ELB);
    const kneeOK = vis(L_KNE) && vis(R_KNE);
    const ankleOK = vis(L_ANK) && vis(R_ANK);

    // scale refs (normalized space)
    const shoulderW = Math.abs(L_SHO.x - R_SHO.x);
    const hipW = Math.abs(L_HIP.x - R_HIP.x);

    const neck = mid(L_SHO, R_SHO);
    const hipMid = mid(L_HIP, R_HIP);

    const torsoH = Math.max(0.12, Math.abs(hipMid.y - neck.y));
    const chestY = neck.y + torsoH * 0.35;

    // -----------------------------
    // RAW DETECTION (this frame)
    // -----------------------------

    // 1) touch neck/head (tighter — prevents hands-at-chest becoming "NECK")
    let rawNeck = false;
    let neckAnchor = null;

    if ((wristL_OK || wristR_OK) && vis(NOSE, 0.4)) {
      // distance threshold: torso-based, smaller cap
      const th = Math.max(0.045, Math.min(0.1, torsoH * 0.55));

      // must be near neck vertical band
      const neckBand = torsoH * 0.3;
      const inNeckYBand = (w) => Math.abs(w.y - neck.y) < neckBand;

      // must be above an upper gate (higher than chest)
      const yGate = neck.y + torsoH * 0.18;

      const L_ok =
        wristL_OK &&
        L_WRI.y < yGate &&
        inNeckYBand(L_WRI) &&
        (dist(L_WRI, neck) < th || dist(L_WRI, NOSE) < th);

      const R_ok =
        wristR_OK &&
        R_WRI.y < yGate &&
        inNeckYBand(R_WRI) &&
        (dist(R_WRI, neck) < th || dist(R_WRI, NOSE) < th);

      rawNeck = L_ok || R_ok;

      if (rawNeck) {
        // anchor = closest wrist to neck if available, else neck
        if (L_ok && R_ok) {
          neckAnchor = dist(L_WRI, neck) <= dist(R_WRI, neck) ? L_WRI : R_WRI;
        } else if (L_ok) {
          neckAnchor = L_WRI;
        } else if (R_ok) {
          neckAnchor = R_WRI;
        } else {
          neckAnchor = neck;
        }
      }
    }

    // 2) cross arms (more robust)
    let rawArms = false;
    let armsAnchor = null;

    if (wristL_OK && wristR_OK && elbowOK) {
      const scaleW = Math.max(0.1, hipW, shoulderW);

      const wristBand = torsoH * 0.28;
      const elbowBand = torsoH * 0.38;

      const wristsNearChest =
        Math.abs(L_WRI.y - chestY) < wristBand &&
        Math.abs(R_WRI.y - chestY) < wristBand;

      const elbowsNearChest =
        Math.abs(L_ELB.y - chestY) < elbowBand &&
        Math.abs(R_ELB.y - chestY) < elbowBand;

      // Each wrist should be closer to opposite shoulder than its own
      const L_to_RSH = dist(L_WRI, R_SHO);
      const L_to_LSH = dist(L_WRI, L_SHO);
      const R_to_LSH = dist(R_WRI, L_SHO);
      const R_to_RSH = dist(R_WRI, R_SHO);

      const wristsOnOppositeSides = L_to_RSH + R_to_LSH < L_to_LSH + R_to_RSH;

      const wristsClose = dist(L_WRI, R_WRI) < Math.max(0.1, scaleW * 0.75);
      const elbowsClose = dist(L_ELB, R_ELB) < Math.max(0.12, scaleW * 0.95);

      rawArms =
        wristsNearChest &&
        elbowsNearChest &&
        wristsOnOppositeSides &&
        wristsClose &&
        elbowsClose;

      if (rawArms) {
        armsAnchor = mid(L_WRI, R_WRI);
      }
    }

    // 3) cross legs (more stable)
    let rawLegs = false;
    let legsAnchor = null;

    if (kneeOK && ankleOK) {
      const scaleW = Math.max(0.1, hipW, shoulderW);

      const anklesClose = dist(L_ANK, R_ANK) < Math.max(0.06, scaleW * 0.55);
      const kneesClose = dist(L_KNE, R_KNE) < Math.max(0.08, scaleW * 0.75);

      const ankleOrder = L_ANK.x > R_ANK.x;
      const kneeOrder = L_KNE.x > R_KNE.x;
      const orderFlip = ankleOrder !== kneeOrder;

      const anklesLevel = Math.abs(L_ANK.y - R_ANK.y) < 0.1;
      const kneesLevel = Math.abs(L_KNE.y - R_KNE.y) < 0.1;

      const anatomyOK = L_ANK.y > L_KNE.y && R_ANK.y > R_KNE.y;

      rawLegs =
        anklesClose &&
        kneesClose &&
        (orderFlip || anklesClose) &&
        anklesLevel &&
        kneesLevel &&
        anatomyOK;

      if (rawLegs) {
        legsAnchor = mid(L_ANK, R_ANK);
      }
    }

    // -----------------------------
    // CHOOSE ONE RAW "candidate" STATE (prevents wrong word)
    // Priority: ARMS > NECK > LEGS
    // -----------------------------
    let candidateState = "none";
    if (rawArms) candidateState = "arms";
    else if (rawNeck) candidateState = "neck";
    else if (rawLegs) candidateState = "legs";

    // Feed filters ONLY for the chosen state (others treated as false)
    applyFilter(
      candidateState === "neck",
      "touchHeadOrNeck",
      "neckOn",
      "neckOff",
    );
    applyFilter(candidateState === "arms", "crossArms", "armsOn", "armsOff");
    applyFilter(candidateState === "legs", "crossedLegs", "legsOn", "legsOff");

    // Update last anchors when RAW is true (so we always have a position)
    if (rawNeck && neckAnchor) lastAnchors.neck = neckAnchor;
    if (rawArms && armsAnchor) lastAnchors.arms = armsAnchor;
    if (rawLegs && legsAnchor) lastAnchors.legs = legsAnchor;

    // -----------------------------
    // FINAL STATE (FILTERED flags) + anchor
    // This makes UI stable: label + position match filtered decision.
    // -----------------------------
    let finalState = "none";
    let finalAnchor = null;

    if (window.crossArms) {
      finalState = "arms";
      finalAnchor = lastAnchors.arms || armsAnchor || mid(L_WRI, R_WRI);
    } else if (window.touchHeadOrNeck) {
      finalState = "neck";
      finalAnchor = lastAnchors.neck || neckAnchor || neck;
    } else if (window.crossedLegs) {
      finalState = "legs";
      finalAnchor = lastAnchors.legs || legsAnchor || mid(L_ANK, R_ANK);
    }

    window.poseState = finalState;
    window.poseAnchor = finalAnchor;
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
