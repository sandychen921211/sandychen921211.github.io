import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

// ✅ 用你 Firebase Console 給的設定（保持一致版本 12.9.0）
const firebaseConfig = {
  apiKey: "AIzaSyBf0qJjB4fAcN4ThoSeTsqpXheIesPmqHE",
  authDomain: "howlong-d2047.firebaseapp.com",
  projectId: "howlong-d2047",
  // ⚠️ 這個很重要：通常應該是 xxx.appspot.com
  // 如果你 console 給的是 firebasestorage.app，請回 firebase 設定頁再複製一次確認
  storageBucket: "howlong-d2047.appspot.com",
  messagingSenderId: "624045872057",
  appId: "1:624045872057:web:16c95f5a0d4b52179ddc68",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// dataURL -> Blob
function dataURLToBlob(dataURL) {
  const [header, base64] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// 上傳並回傳公開圖片 URL
export async function uploadShot(dataURL) {
  const blob = dataURLToBlob(dataURL);
  const id = crypto.randomUUID();
  const path = `reports/${id}.jpg`;

  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
  return await getDownloadURL(fileRef);
}

// 讓 ui.js 可以 window.uploadShot(...) 呼叫
window.uploadShot = uploadShot;
