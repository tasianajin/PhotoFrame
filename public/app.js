// ---- Configuration -------------------------------------------------------
// Replace assets/frame.png with your own PNG (transparent where the photo
// should show through). The output image has the same size as the frame.
const FRAME_SRC = "assets/frame.png";
const DOWNLOAD_NAME = "framed-photo.jpg";
// --------------------------------------------------------------------------

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("stage");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const controls = document.getElementById("controls");
const zoomInput = document.getElementById("zoom");
const changeBtn = document.getElementById("changeBtn");
const downloadBtn = document.getElementById("downloadBtn");

let frame = null;
let photo = null;

// Photo placement in canvas pixels: scale relative to "cover" fit, and the
// position of the photo's center.
const view = { zoom: 1, cx: 0, cy: 0 };

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function coverScale() {
  return Math.max(canvas.width / photo.width, canvas.height / photo.height);
}

// Keep the photo covering the whole canvas so no empty gaps appear.
function clampPosition() {
  const s = coverScale() * view.zoom;
  const halfW = (photo.width * s) / 2;
  const halfH = (photo.height * s) / 2;
  view.cx = Math.min(halfW, Math.max(canvas.width - halfW, view.cx));
  view.cy = Math.min(halfH, Math.max(canvas.height - halfH, view.cy));
}

function draw() {
  if (typeof result !== "undefined") result.hidden = true; // image is now stale
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (photo) {
    const s = coverScale() * view.zoom;
    const w = photo.width * s;
    const h = photo.height * s;
    ctx.drawImage(photo, view.cx - w / 2, view.cy - h / 2, w, h);
  }
  if (frame) ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
}

async function setPhoto(file) {
  if (!file || !file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    photo = await loadImage(url);
  } catch {
    alert("Sorry, that image couldn't be opened. Try a JPG or PNG.");
    return;
  } finally {
    URL.revokeObjectURL(url);
  }
  view.zoom = 1;
  view.cx = canvas.width / 2;
  view.cy = canvas.height / 2;
  zoomInput.value = "1";
  dropzone.hidden = true;
  controls.hidden = false;
  draw();
}

// ---- File picking & drag-and-drop ----------------------------------------
fileInput.addEventListener("change", () => {
  setPhoto(fileInput.files[0]);
  fileInput.value = ""; // allow re-selecting the same file
});
changeBtn.addEventListener("click", () => fileInput.click());

["dragenter", "dragover"].forEach((type) =>
  stage.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.add("over");
  })
);
["dragleave", "drop"].forEach((type) =>
  stage.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.remove("over");
  })
);
stage.addEventListener("drop", (e) => setPhoto(e.dataTransfer.files[0]));

// ---- Zoom ------------------------------------------------------------------
function setZoom(z) {
  view.zoom = Math.min(4, Math.max(1, z));
  zoomInput.value = String(view.zoom);
  clampPosition();
  draw();
}
zoomInput.addEventListener("input", () => setZoom(parseFloat(zoomInput.value)));
canvas.addEventListener(
  "wheel",
  (e) => {
    if (!photo) return;
    e.preventDefault();
    setZoom(view.zoom * Math.exp(-e.deltaY * 0.001));
  },
  { passive: false }
);

// ---- Drag to move, pinch to zoom (mouse + touch via pointer events) -------
const pointers = new Map();
let pinchStart = null;

// Convert on-screen movement to canvas pixels (canvas is CSS-scaled).
function toCanvasUnits() {
  return canvas.width / canvas.getBoundingClientRect().width;
}

canvas.addEventListener("pointerdown", (e) => {
  if (!photo) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.classList.add("dragging");
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
  }
});

canvas.addEventListener("pointermove", (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const cur = { x: e.clientX, y: e.clientY };
  pointers.set(e.pointerId, cur);

  if (pointers.size === 2 && pinchStart) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    setZoom(pinchStart.zoom * (dist / pinchStart.dist));
  } else if (pointers.size === 1) {
    const k = toCanvasUnits();
    view.cx += (cur.x - prev.x) * k;
    view.cy += (cur.y - prev.y) * k;
    clampPosition();
    draw();
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = null;
  if (pointers.size === 0) canvas.classList.remove("dragging");
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

// ---- Download ----------------------------------------------------------------
const ua = navigator.userAgent;
const isIOS =
  /iPad|iPhone|iPod/.test(ua) ||
  (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // iPadOS
// Facebook / Messenger / Instagram in-app browsers can't download files.
const isInAppBrowser = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram/i.test(ua);

const result = document.getElementById("result");
const resultImg = document.getElementById("resultImg");
const resultHint = document.getElementById("resultHint");

// JPEG keeps the file small (the frame has no transparent edges).
function renderJpeg() {
  return canvas.toDataURL("image/jpeg", 0.92);
}

function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(",");
  const bytes = atob(body);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: head.slice(5, head.indexOf(";")) });
}

// Always show the finished photo too, so it can be saved by long-press if
// the browser ignores the download.
function showResult(dataUrl, hint) {
  resultImg.src = dataUrl;
  resultHint.innerHTML = hint;
  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

const LONG_PRESS_HINT =
  "Press and hold the photo, then choose <strong>Download image</strong> or <strong>Save image</strong>.";

downloadBtn.addEventListener("click", async () => {
  const dataUrl = renderJpeg();

  if (isInAppBrowser) {
    showResult(dataUrl, LONG_PRESS_HINT +
      " Or open this page in Chrome or Safari (tap ⋮ → Open in browser) to download it directly.");
    return;
  }

  const blob = dataUrlToBlob(dataUrl);

  // On iPhone/iPad the share sheet's "Save Image" puts the photo in Photos.
  if (isIOS) {
    const file = new File([blob], DOWNLOAD_NAME, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if (err.name === "AbortError") return; // user closed the share sheet
      }
    }
  }

  // Everywhere else: start the download right away, inside the tap.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = DOWNLOAD_NAME;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);

  showResult(dataUrl,
    "Download started — check your <strong>Downloads</strong> or <strong>Gallery</strong>. " +
    "If nothing downloaded: " + LONG_PRESS_HINT);
});

// ---- Init ------------------------------------------------------------------
loadImage(FRAME_SRC)
  .then((img) => {
    frame = img;
    canvas.width = frame.naturalWidth;
    canvas.height = frame.naturalHeight;
    stage.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
    draw();
  })
  .catch(() => {
    dropzone.textContent = `Frame image not found at "${FRAME_SRC}".`;
  });
