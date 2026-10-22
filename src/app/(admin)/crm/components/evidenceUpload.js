// Shared helpers for uploading evidence photos / videos (same /file/upload endpoint as the profile picture).
export const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
export const MAX_IMAGE_MB = 15;
export const MAX_VIDEO_MB = 100;
// same address fix as the profile picture page (storage host -> public host). Empty it if you do not need it.
export const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"];

const pad = (n) => String(n).padStart(2, "0");
const stampOf = (d = new Date()) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

// new name: JOB-00014_BDV7757_20261012-093105_1.jpg  (job no + vehicle no + date/time + running number)
export const newFileName = (job, file, n) => {
  const fromName = (file.name.split(".").pop() || "").toLowerCase();
  const ext = EXT[file.type] || (/^[a-z0-9]{2,5}$/.test(fromName) ? fromName : file.type.startsWith("video/") ? "mp4" : "jpg");
  const safe = (v) => String(v || "").replace(/[^A-Za-z0-9-]+/g, "").toUpperCase();
  return `${safe(job.jobNo)}_${safe(job.regNo)}_${stampOf()}_${n}.${ext}`;
};

// check one picked file -> "" (fine) or the reason it is rejected
export const checkPicked = (file) => {
  const isVideo = file.type.startsWith("video/");
  if (!isVideo && !file.type.startsWith("image/")) return `${file.name}: only images and videos`;
  const maxMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  return file.size > maxMb * 1024 * 1024 ? `${file.name}: larger than ${maxMb}MB` : "";
};

// uploads the (renamed) file to the file storage and returns its public address
export async function uploadToStorage(file, name) {
  const renamed = new File([file], name, { type: file.type, lastModified: Date.now() });
  const fd = new FormData();
  fd.append("file", renamed);
  const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
  const up = await res.json().catch(() => ({}));
  if (!res.ok || !up.fileUrl) throw new Error(up.message || `Upload failed (${res.status})`);
  return URL_FIX[0] ? up.fileUrl.replace(URL_FIX[0], URL_FIX[1]) : up.fileUrl;
}