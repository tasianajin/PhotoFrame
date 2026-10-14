// ---- Configuration -------------------------------------------------------
// Replace assets/frame.png with your own PNG (transparent where the photo
// should show through). The output image has the same size as the frame.
const FRAME_SRC = "assets/frame.png";
const DOWNLOAD_NAME = "framed-photo.png";
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
downloadBtn.addEventListener("click", () => {
  downloadBtn.disabled = true;
  canvas.toBlob(async (blob) => {
    downloadBtn.disabled = false;
    if (!blob) return alert("Sorry, the image couldn't be created.");

    const file = new File([blob], DOWNLOAD_NAME, { type: "image/png" });
    // On phones, the share sheet lets people "Save Image" straight to Photos.
    const isTouch = matchMedia("(pointer: coarse)").matches;
    if (isTouch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if (err.name === "AbortError") return; // user closed the share sheet
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = DOWNLOAD_NAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
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
