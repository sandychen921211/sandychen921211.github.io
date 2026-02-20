document.addEventListener("DOMContentLoaded", () => {
  const qrBox = document.getElementById("qrcode");
  if (!qrBox || !window.QRCode) return;

  const qs = new URLSearchParams(location.search);

  // ✅ 1) 優先用 report.html 帶來的 share
  let share = qs.get("share");
  if (share) {
    share = decodeURIComponent(share);
  }

  // ✅ 2) fallback：同一個 tab 流程才會有 sessionStorage
  if (!share) {
    share = sessionStorage.getItem("qr_report_url");
  }

  if (!share) {
    qrBox.textContent = "No report data.";
    return;
  }

  // share 可能是 "report.html?src=qr&..."
  // 組成完整 URL
  const origin = window.location.origin;
  const basePath = window.location.pathname.replace(/\/[^/]*$/, "/");
  const fullURL = origin + basePath + share;

  qrBox.innerHTML = "";
  new QRCode(qrBox, {
    text: fullURL,
    width: 260,
    height: 260,
    correctLevel: QRCode.CorrectLevel.H,
  });

  console.log("QR target =>", fullURL);
});
