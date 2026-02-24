document.addEventListener("DOMContentLoaded", () => {
  const qrBox = document.getElementById("qrcode");
  if (!qrBox) return;

  // 0) library check
  if (!window.QRCode) {
    qrBox.textContent = "QRCode library missing.";
    console.warn("[QR] window.QRCode missing");
    return;
  }

  // 1) 只用 sessionStorage（避免 URL 太長造成 431）
  let share = "";
  try {
    share = sessionStorage.getItem("qr_report_url") || "";
  } catch (e) {
    console.warn("[QR] sessionStorage unavailable", e);
  }

  if (!share) {
    qrBox.textContent = "No report data (qr_report_url missing).";
    console.warn("[QR] missing sessionStorage.qr_report_url");
    return;
  }

  // 2) share 可能是：
  //    A) 相對路徑：report.html?...
  //    B) 絕對網址：https://xxx/report.html?...
  //    都要支援
  let fullURL = share.trim();

  const isAbsolute = /^https?:\/\//i.test(fullURL);
  if (!isAbsolute) {
    const origin = window.location.origin;
    const basePath = window.location.pathname.replace(/\/[^/]*$/, "/");
    // 確保 share 沒有前導 ./ 或 /
    fullURL = fullURL.replace(/^\.\//, "").replace(/^\//, "");
    fullURL = origin + basePath + fullURL;
  }

  // 3) 避免 URL 裡有空白/中文導致 QR text 異常
  //    encodeURI 不會把 ? & = 亂編碼，適合整條 URL
  fullURL = encodeURI(fullURL);

  // 4) render QR
  if (fullURL.length > 1800) {
    qrBox.textContent =
      "QR too long. (shot URL missing / dataURL was included)";
    console.warn("[QR] url too long:", fullURL.length);
    return;
  }
  try {
    new QRCode(qrBox, {
      text: fullURL,
      width: 260,
      height: 260,
      correctLevel: QRCode.CorrectLevel.H,
    });
  } catch (e) {
    qrBox.textContent = "QR render failed.";
    console.error("[QR] render error", e);
    return;
  }
  qrBox.style.background = "#fff";
  qrBox.style.padding = "12px";
  console.log("[QR target] =>", fullURL);

  // 可選：把目標網址顯示在下方（debug 用）
  // const p = document.createElement("div");
  // p.style.marginTop = "12px";
  // p.style.fontSize = "12px";
  // p.style.wordBreak = "break-all";
  // p.textContent = fullURL;
  // qrBox.appendChild(p);
});
