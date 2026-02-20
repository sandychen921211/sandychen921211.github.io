document.addEventListener("DOMContentLoaded", () => {
  const qrBox = document.getElementById("qrcode");
  if (!qrBox || !window.QRCode) {
    console.error("QRCode lib not loaded or #qrcode missing");
    return;
  }

  /**
   * ✅ 強制指向 report.html（不要用 window.location.href 當 base）
   * 這樣不管你現在在哪個頁面開 qrcode.html，都會生成正確的 report 連結
   */
  const origin = window.location.origin; // https://sandychen921211.github.io
  const basePath = window.location.pathname.replace(/\/[^/]*$/, "/"); // 目前資料夾路徑
  const reportUrl = `${origin}${basePath}report.html?src=qr`;

  qrBox.innerHTML = "";
  new QRCode(qrBox, {
    text: reportUrl,
    width: 260,
    height: 260,
    correctLevel: QRCode.CorrectLevel.H,
  });

  console.log("QR target =>", reportUrl);
});
