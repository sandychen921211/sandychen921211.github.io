document.addEventListener("DOMContentLoaded", () => {
  const qrBox = document.getElementById("qrcode");

  if (!window.QRCode || !qrBox) {
    console.error("QRCode library not loaded or #qrcode missing");
    return;
  }

  // ✅ 用當前頁面作為基準，穩定支援 GitHub Pages 的 /repo-name/
  const reportUrl = new URL("./report.html", window.location.href).toString();

  qrBox.innerHTML = "";
  new QRCode(qrBox, {
    text: reportUrl,
    width: 260,
    height: 260,
    correctLevel: QRCode.CorrectLevel.H,
  });

  console.log("QR target:", reportUrl);
});
