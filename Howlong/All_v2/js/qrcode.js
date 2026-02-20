document.addEventListener("DOMContentLoaded", () => {
  const qrBox = document.getElementById("qrcode");
  if (!qrBox || !window.QRCode) return;

  const saved = sessionStorage.getItem("qr_report_url");
  if (!saved) {
    qrBox.textContent = "No report data.";
    return;
  }

  const origin = window.location.origin;
  const basePath = window.location.pathname.replace(/\/[^/]*$/, "/");
  const fullURL = origin + basePath + saved;

  qrBox.innerHTML = "";
  new QRCode(qrBox, {
    text: fullURL,
    width: 260,
    height: 260,
    correctLevel: QRCode.CorrectLevel.H,
  });

  console.log("QR target =>", fullURL);
});
