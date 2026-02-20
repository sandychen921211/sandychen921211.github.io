document.addEventListener("DOMContentLoaded", () => {
  const qrBox = document.getElementById("qrcode");
  if (!window.QRCode || !qrBox) return;

  // ✅ 讓手機打開 report 時帶參數 src=qr
  const reportUrl = new URL("./report.html", window.location.href);
  reportUrl.searchParams.set("src", "qr");

  qrBox.innerHTML = "";
  new QRCode(qrBox, {
    text: reportUrl.toString(),
    width: 260,
    height: 260,
    correctLevel: QRCode.CorrectLevel.H,
  });
});
