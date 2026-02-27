// ==========================
// Elements
// ==========================
const headerInput = document.getElementById("headerInput");
const footerInput = document.getElementById("footerInput");
const photosInput = document.getElementById("photosInput");
const exportBtn  = document.getElementById("exportBtn");
const statusEl    = document.getElementById("status");
const formatSelect= document.getElementById("formatSelect");
const zipToggle   = document.getElementById("zipToggle");
const previewCanvas = document.getElementById("previewCanvas");
const barEl = document.getElementById("bar");

const headerThumb = document.getElementById("headerThumb");
const footerThumb = document.getElementById("footerThumb");
const headerEmpty = document.getElementById("headerEmpty");
const footerEmpty = document.getElementById("footerEmpty");

const clearHeaderBtn = document.getElementById("clearHeaderBtn");
const clearFooterBtn = document.getElementById("clearFooterBtn");

const headerDrop = document.getElementById("headerDrop");
const footerDrop = document.getElementById("footerDrop");
const photosDrop = document.getElementById("photosDrop");

const quality = document.getElementById("quality");
const qualityVal = document.getElementById("qualityVal");

const outHeightInput = document.getElementById("outHeight");
const blurFillToggle = document.getElementById("blurFillToggle");

const photoListEl = document.getElementById("photoList");
const emptyListEl = document.getElementById("emptyList");
const countInfoEl = document.getElementById("countInfo");

// Modal / Editor
const editModal = document.getElementById("editModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const editCanvas = document.getElementById("editCanvas");
const editTitle = document.getElementById("editTitle");
const editSub = document.getElementById("editSub");

const zoomRange = document.getElementById("zoomRange");
const zoomVal = document.getElementById("zoomVal");
const rotLeftBtn = document.getElementById("rotLeftBtn");
const rotRightBtn = document.getElementById("rotRightBtn");
const rotVal = document.getElementById("rotVal");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// Light adjust controls (need exist in HTML)
const autoAdjustBtn = document.getElementById("autoAdjustBtn");
const clearAdjustBtn = document.getElementById("clearAdjustBtn");
const brightRange = document.getElementById("brightRange");
const brightVal = document.getElementById("brightVal");
const shadowRange = document.getElementById("shadowRange");
const shadowVal = document.getElementById("shadowVal");

// ===== WATERMARK controls (optional) =====
const wmEnable = document.getElementById("wmEnable");
const wmText = document.getElementById("wmText");
const wmSize = document.getElementById("wmSize");
const wmOpacity = document.getElementById("wmOpacity");
const wmPos = document.getElementById("wmPos");
const wmRotate = document.getElementById("wmRotate");
const wmMargin = document.getElementById("wmMargin");
const wmSizeVal = document.getElementById("wmSizeVal");
const wmOpacityVal = document.getElementById("wmOpacityVal");
const wmRotateVal = document.getElementById("wmRotateVal");
const wmMarginVal = document.getElementById("wmMarginVal");
const wmFont = document.getElementById("wmFont");
const wmWeight = document.getElementById("wmWeight");
const wmBold = document.getElementById("wmBold");
const wmShadow = document.getElementById("wmShadow");
const wmStroke = document.getElementById("wmStroke");
const wmStrokeW = document.getElementById("wmStrokeW");
const wmStrokeWVal = document.getElementById("wmStrokeWVal");

const wmGradient = document.getElementById("wmGradient");
const wmGradType = document.getElementById("wmGradType");
const wmGradA = document.getElementById("wmGradA");
const wmGradB = document.getElementById("wmGradB");



const OUT_W = 1080;

const DEFAULT_HEADER_FILE = "header001.png";
const DEFAULT_FOOTER_FILE = "footer001.png";

let headerImg = null;
let footerImg = null;

// photos state
let photoItems = []; // {id, file, url, img}
let currentIndex = -1;

// edits map: id -> { baseScale, zoom, offsetX, offsetY, rotDeg, brightness, shadows, _saved, _photoId }
const edits = new Map();

// Draft state (editor modal)
let draftEdit = null;
let draftPhotoId = null;

// ==========================
// Helpers
// ==========================
function setStatus(msg) { statusEl.textContent = msg; }
function setProgress(pct){ barEl.style.width = `${pct}%`; }

quality?.addEventListener("input", () => {
  qualityVal.textContent = quality.value;
});

function makeFileId(file){
  return `${file.name}__${file.size}__${file.lastModified}`;
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function setThumb(imgEl, emptyEl, file){
  imgEl.src = URL.createObjectURL(file);
  imgEl.style.display = "block";
  emptyEl.style.display = "none";
}

// ==========================
// WATERMARK state + persistence
// ==========================
const wmState = {
  enabled: false,
  text: "Aonic Agriculture",
  size: 36,
  opacity: 0.18,   // 0..1
  pos: "br",       // br bl tr tl center tile
  rotate: -20,     // deg
  margin: 20,      // px
  font: "Gilroy",
  weight: 400,
  bold: false,
  
  shadow: true,
  
  stroke: true,
  strokeW: 3,
  
  gradient: false,
  gradType: "lr",
  gradA: "#ffffff",
  gradB: "#7c3aed",
};

function loadWatermarkFromStorage(){
  try {
    const raw = localStorage.getItem("watermark_state");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      Object.assign(wmState, parsed);
      // guard
      wmState.opacity = Math.max(0, Math.min(1, Number(wmState.opacity ?? 0.18)));
      wmState.size = Number(wmState.size ?? 36);
      wmState.rotate = Number(wmState.rotate ?? -20);
      wmState.margin = Number(wmState.margin ?? 20);
      wmState.enabled = !!wmState.enabled;
      wmState.text = String(wmState.text ?? "Aonic Agriculture");
      wmState.pos = String(wmState.pos ?? "br");
    }
  } catch (e) {
    console.warn("watermark_state parse fail", e);
  }
}

function saveWatermarkToStorage(){
  try {
    localStorage.setItem("watermark_state", JSON.stringify(wmState));
  } catch (e) {
    console.warn("watermark_state save fail", e);
  }
}

function syncWmUIFromState(){
  wmEnable && (wmEnable.checked = !!wmState.enabled);
  wmText && (wmText.value = wmState.text || "");
  wmSize && (wmSize.value = String(wmState.size || 36));
  wmOpacity && (wmOpacity.value = String(Math.round((wmState.opacity ?? 0.18) * 100)));
  wmPos && (wmPos.value = wmState.pos || "br");
  wmRotate && (wmRotate.value = String(wmState.rotate ?? -20));
  wmMargin && (wmMargin.value = String(wmState.margin ?? 20));
  wmSizeVal && (wmSizeVal.textContent = String(wmState.size || 36));
  wmOpacityVal && (wmOpacityVal.textContent = `${Math.round((wmState.opacity ?? 0.18) * 100)}%`);
  wmRotateVal && (wmRotateVal.textContent = `${wmState.rotate ?? -20}°`);
  wmMarginVal && (wmMarginVal.textContent = String(wmState.margin ?? 20));
  wmFont && (wmFont.value = wmState.font || "Gilroy");
  wmWeight && (wmWeight.value = String(wmState.weight ?? 400));
  wmBold && (wmBold.checked = !!wmState.bold);
  
  wmShadow && (wmShadow.checked = !!wmState.shadow);
  
  wmStroke && (wmStroke.checked = !!wmState.stroke);
  wmStrokeW && (wmStrokeW.value = String(wmState.strokeW ?? 3));
  wmStrokeWVal && (wmStrokeWVal.textContent = String(wmState.strokeW ?? 3));
  
  wmGradient && (wmGradient.checked = !!wmState.gradient);
  wmGradType && (wmGradType.value = wmState.gradType || "lr");
  wmGradA && (wmGradA.value = wmState.gradA || "#ffffff");
  wmGradB && (wmGradB.value = wmState.gradB || "#7c3aed");
}

function syncWmStateFromUI(){
  if (wmEnable) wmState.enabled = !!wmEnable.checked;
  if (wmText) wmState.text = (wmText.value || "").trim();
  if (wmSize) wmState.size = Number(wmSize.value || 36);
  if (wmOpacity) wmState.opacity = Number(wmOpacity.value || 18) / 100;
  if (wmPos) wmState.pos = wmPos.value || "br";
  if (wmRotate) wmState.rotate = Number(wmRotate.value || -20);
  if (wmMargin) wmState.margin = Number(wmMargin.value || 20);
  if (wmFont) wmState.font = wmFont.value || "Gilroy";
  if (wmWeight) wmState.weight = Number(wmWeight.value || 400);
  if (wmBold) wmState.bold = !!wmBold.checked;
  
  if (wmShadow) wmState.shadow = !!wmShadow.checked;
  
  if (wmStroke) wmState.stroke = !!wmStroke.checked;
  if (wmStrokeW) wmState.strokeW = Number(wmStrokeW.value || 3);
  wmStrokeWVal && (wmStrokeWVal.textContent = String(wmState.strokeW));
  
  if (wmGradient) wmState.gradient = !!wmGradient.checked;
  if (wmGradType) wmState.gradType = wmGradType.value || "lr";
  if (wmGradA) wmState.gradA = wmGradA.value || "#ffffff";
  if (wmGradB) wmState.gradB = wmGradB.value || "#7c3aed";
  
  
  
  
    wmSizeVal && (wmSizeVal.textContent = String(wmState.size));
wmOpacityVal && (wmOpacityVal.textContent = `${Math.round(wmState.opacity * 100)}%`);
wmRotateVal && (wmRotateVal.textContent = `${wmState.rotate}°`);
wmMarginVal && (wmMarginVal.textContent = String(wmState.margin));

  saveWatermarkToStorage();
  requestRender();
  

}

function bindWatermarkEvents(){
  const els = [wmEnable, wmText, wmSize, wmOpacity, wmPos, wmRotate, wmMargin,
  wmFont, wmWeight, wmBold,
  wmShadow,
  wmStroke, wmStrokeW,
  wmGradient, wmGradType, wmGradA, wmGradB];
  els.forEach(el => {
    el?.addEventListener("input", syncWmStateFromUI);
    el?.addEventListener("change", syncWmStateFromUI);
  });
}





// ==========================
// Watermark Renderer (TEXT)
// ==========================
// Expects wm object shape (example):
// {
//   enabled:true,
//   text:"Aonic Agriculture",
//   size:36,
//   opacity:0.18,        // 0..1
//   pos:"br",            // br|bl|tr|tl|center|tile
//   rotate:-20,          // deg
//   margin:20,           // px
//   font:"Inter",
//   weight:400,          // 300..800
//   bold:false,          // boolean (override weight to 800)
//   shadow:true,         // boolean
//   stroke:true,         // boolean
//   strokeW:3,           // px
//   gradient:false,      // boolean
//   gradType:"lr",       // lr|diag
//   gradA:"#ffffff",
//   gradB:"#7c3aed"
// }

function drawTextWatermark(ctx, W, H, wm) {
  if (!wm || !wm.enabled) return;

  const text = (wm.text ?? "").trim();
  if (!text) return;

  const size = Math.max(10, Number(wm.size || 36));
  const opacity01 = Math.max(0, Math.min(1, Number(wm.opacity ?? 0.18)));
  const margin = Math.max(0, Number(wm.margin || 20));
  const pos = wm.pos || "br";
  const rotateDeg = Number(wm.rotate || 0);

  // ===== FONT (Cara A: Gilroy + weight, other fonts = normal) =====
  // NOTE: wm.weight boleh jadi "auto" (string) bila font bukan Gilroy
  const chosenFont = (wm.font || "Gilroy");
  const family = `${chosenFont}, Inter, Arial, sans-serif`;

  let weight = 400;
  if (wm.bold) {
    weight = 800;
  } else if (chosenFont === "Gilroy") {
    const wRaw = wm.weight;
    const wNum = Number(wRaw ?? 400);
    weight = Math.max(100, Math.min(900, isNaN(wNum) ? 400 : wNum));
  } else {
    // font lain: biar normal (tak pakai Thin/Light UI)
    weight = 400;
  }

  ctx.save();
  ctx.globalAlpha = opacity01;

  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // Shadow toggle
  if (wm.shadow) {
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = Math.max(2, Math.round(size * 0.18));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(1, Math.round(size * 0.10));
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Stroke toggle
  const strokeOn = !!wm.stroke;
  const strokeW = Math.max(0, Number(wm.strokeW ?? 3));
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = strokeOn ? strokeW : 0;
  ctx.strokeStyle = "rgba(0,0,0,.55)";

  // Fill: solid or gradient
  if (wm.gradient) {
    const a = wm.gradA || "#ffffff";
    const b = wm.gradB || "#7c3aed";
    const type = wm.gradType || "lr";

    let g;
    if (type === "diag") g = ctx.createLinearGradient(0, 0, W, H);
    else g = ctx.createLinearGradient(0, 0, W, 0);

    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = "rgba(255,255,255,.95)";
  }

  // Helper: draw centered text at (x,y) with rotation
  function drawAt(x, y) {
    ctx.save();
    ctx.translate(x, y);
    if (rotateDeg) ctx.rotate((rotateDeg * Math.PI) / 180);

    const m = ctx.measureText(text);
    const w = m.width;
    const ascent = m.actualBoundingBoxAscent || size * 0.8;
    const descent = m.actualBoundingBoxDescent || size * 0.2;
    const h = ascent + descent;

    const dx = -w / 2;
    const dy = h / 2 - descent; // baseline offset

    if (strokeOn && strokeW > 0) ctx.strokeText(text, dx, dy);
    ctx.fillText(text, dx, dy);

    ctx.restore();
  }

  // Measure for position anchors
  const mt = ctx.measureText(text);
  const textW = mt.width;
  const ascent = mt.actualBoundingBoxAscent || size * 0.8;
  const descent = mt.actualBoundingBoxDescent || size * 0.2;
  const textH = ascent + descent;

  let x = W / 2;
  let y = H / 2;

  if (pos === "br") {
    x = W - margin - textW / 2;
    y = H - margin - textH / 2;
  } else if (pos === "bl") {
    x = margin + textW / 2;
    y = H - margin - textH / 2;
  } else if (pos === "tr") {
    x = W - margin - textW / 2;
    y = margin + textH / 2;
  } else if (pos === "tl") {
    x = margin + textW / 2;
    y = margin + textH / 2;
  } else if (pos === "center") {
    x = W / 2;
    y = H / 2;
  }

  if (pos === "tile") {
    const stepX = Math.max(140, Math.round(textW + size * 2.2));
    const stepY = Math.max(90, Math.round(textH + size * 1.6));

    for (let yy = -H; yy < H * 2; yy += stepY) {
      for (let xx = -W; xx < W * 2; xx += stepX) {
        drawAt(xx + stepX / 2, yy + stepY / 2);
      }
    }
  } else {
    drawAt(x, y);
  }

  ctx.restore();
}



















// requestRender helper (safe)
function requestRender(){
  // if editor open -> redraw editor too
  if (editModal?.classList.contains("show")) {
    redrawEditor();
  }
  refreshPreview();
}

// ====== LOCAL STORAGE (overlays only) ======
function saveOverlay(type, file){
  const reader = new FileReader();
  reader.onload = function(e){
    localStorage.setItem(`overlay_${type}`, e.target.result);
  };
  reader.readAsDataURL(file);
}
function loadOverlayFromStorage(type){
  const data = localStorage.getItem(`overlay_${type}`);
  if(!data) return;

  const img = new Image();
  img.src = data;
  img.onload = () => {
    if(type === "header"){
      headerImg = img;
      headerThumb.src = data;
      headerThumb.style.display = "block";
      headerEmpty.style.display = "none";
      refreshPreview();
    }
    if(type === "footer"){
      footerImg = img;
      footerThumb.src = data;
      footerThumb.style.display = "block";
      footerEmpty.style.display = "none";
      refreshPreview();
    }
  };
}

async function loadDefaultOverlay(type, filename){
  try {
    // fetch -> blob -> dataURL (safe for canvas export)
    const res = await fetch(filename, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${filename}`);

    const blob = await res.blob();

    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });

    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      if (type === "header") {
        headerImg = img;
        headerThumb.src = dataUrl;
        headerThumb.style.display = "block";
        headerEmpty.style.display = "none";
        localStorage.setItem("overlay_header", dataUrl); // ✅ store default
      }

      if (type === "footer") {
        footerImg = img;
        footerThumb.src = dataUrl;
        footerThumb.style.display = "block";
        footerEmpty.style.display = "none";
        localStorage.setItem("overlay_footer", dataUrl); // ✅ store default
      }

      refreshPreview();
    };
  } catch (e) {
    console.error(e);
    setStatus(`Default overlay load failed: ${filename}`);
  }
}

async function loadOverlay(file, type) {
  const img = await fileToImage(file);

  if (type === "header") {
    headerImg = img;
    setThumb(headerThumb, headerEmpty, file);
    saveOverlay("header", file);
  }

  if (type === "footer") {
    footerImg = img;
    setThumb(footerThumb, footerEmpty, file);
    saveOverlay("footer", file);
  }

  refreshPreview();
}

headerInput?.addEventListener("change", async () => {
  const file = headerInput.files?.[0];
  if (!file) return;
  await loadOverlay(file, "header");
});

footerInput?.addEventListener("change", async () => {
  const file = footerInput.files?.[0];
  if (!file) return;
  await loadOverlay(file, "footer");
});

clearHeaderBtn?.addEventListener("click", () => {
  headerInput.value = "";
  localStorage.removeItem("overlay_header");

  // revert to default
  loadDefaultOverlay("header", DEFAULT_HEADER_FILE);

  setStatus("Header reset to default.");
});

clearFooterBtn?.addEventListener("click", () => {
  footerInput.value = "";
  localStorage.removeItem("overlay_footer");

  // revert to default
  loadDefaultOverlay("footer", DEFAULT_FOOTER_FILE);

  setStatus("Footer reset to default.");
});

// Drag & drop binder (FIX double picker on label)
function bindDrop(zoneEl, inputEl, onFile) {
  zoneEl.addEventListener("click", () => {
    // ✅ if it's a LABEL, browser already opens picker automatically
    if (zoneEl.tagName === "LABEL") return;
    inputEl.click();
  });

  ["dragenter","dragover"].forEach(ev => {
    zoneEl.addEventListener(ev, (e) => {
      e.preventDefault(); e.stopPropagation();
      zoneEl.classList.add("dragover");
    });
  });

  ["dragleave","drop"].forEach(ev => {
    zoneEl.addEventListener(ev, (e) => {
      e.preventDefault(); e.stopPropagation();
      zoneEl.classList.remove("dragover");
    });
  });

  zoneEl.addEventListener("drop", async (e) => {
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    if (onFile) await onFile(files);
  });
}

bindDrop(headerDrop, headerInput, async (files) => {
  await loadOverlay(files[0], "header");
});
bindDrop(footerDrop, footerInput, async (files) => {
  await loadOverlay(files[0], "footer");
});
bindDrop(photosDrop, photosInput, async (files) => {
  const imgs = files.filter(f => f.type.startsWith("image/"));
  await loadPhotos(imgs);
});

photosInput?.addEventListener("change", async () => {
  const files = Array.from(photosInput.files || []).filter(f => f.type.startsWith("image/"));
  await loadPhotos(files);
});

outHeightInput?.addEventListener("input", () => refreshPreview());
blurFillToggle?.addEventListener("change", () => refreshPreview());
formatSelect?.addEventListener("change", () => refreshPreview());

// ==========================
// Fit math
// ==========================
function fitCover(srcW, srcH, dstW, dstH){
  const s = Math.max(dstW / srcW, dstH / srcH);
  const w = srcW * s, h = srcH * s;
  return { x:(dstW - w)/2, y:(dstH - h)/2, w, h, s };
}

// ==========================
// Safari blur fallback
// ==========================
function drawBlurCoverFallback(ctx, img, areaX, areaY, areaW, areaH, bg) {
  const temp = document.createElement("canvas");
  temp.width = areaW;
  temp.height = areaH;
  const t = temp.getContext("2d");
  t.imageSmoothingEnabled = true;

  t.drawImage(img, bg.x, bg.y, bg.w, bg.h);

  const small = document.createElement("canvas");
  const scale = 0.12;
  small.width = Math.max(1, Math.round(areaW * scale));
  small.height = Math.max(1, Math.round(areaH * scale));
  const s = small.getContext("2d");
  s.imageSmoothingEnabled = true;

  // pass 1
  s.clearRect(0, 0, small.width, small.height);
  s.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, small.width, small.height);
  t.clearRect(0, 0, temp.width, temp.height);
  t.drawImage(small, 0, 0, small.width, small.height, 0, 0, temp.width, temp.height);

  // pass 2
  s.clearRect(0, 0, small.width, small.height);
  s.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, small.width, small.height);
  t.clearRect(0, 0, temp.width, temp.height);
  t.drawImage(small, 0, 0, small.width, small.height, 0, 0, temp.width, temp.height);

  ctx.drawImage(temp, areaX, areaY);
}

// ==========================
// Light Adjust (Manual/Auto) + Cache
// ==========================
const processedCache = new Map(); // key: photoId|b|s -> canvas
function clamp255(v){ return v < 0 ? 0 : (v > 255 ? 255 : v); }

function getProcessedCanvas(img, photoId, _brightnessIgnored, shadows){
  const s = Number(shadows || 0);
  if (s <= 0) return null;

  const key = `${photoId}|s${s}`;
  if (processedCache.has(key)) return processedCache.get(key);

  // lebih kecil = lebih laju (shadows effect masih ok sebab dia “feel”, bukan detail)
  const maxW = 1600;
  const scale = img.width > maxW ? (maxW / img.width) : 1;

  const cw = Math.round(img.width * scale);
  const ch = Math.round(img.height * scale);

  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, cw, ch);

  const id = ctx.getImageData(0, 0, cw, ch);
  const d = id.data;

  const sh = Math.max(0, Math.min(1, s / 100));

  for (let i = 0; i < d.length; i += 4){
    let r = d[i], g = d[i+1], bl = d[i+2];
    const a = d[i+3];

    const lum = 0.2126*r + 0.7152*g + 0.0722*bl;

    // shadow lift stronger on dark pixels
    const t = 1 - Math.min(1, lum / 170);
    const lift = (t * t) * sh * 110;

    d[i]   = clamp255(r + lift);
    d[i+1] = clamp255(g + lift);
    d[i+2] = clamp255(bl + lift);
    d[i+3] = a;
  }

  ctx.putImageData(id, 0, 0);

  processedCache.set(key, c);
  return c;
}

function autoAdjustForImage(img){
  const sw = 240;
  const sh = Math.max(1, Math.round(img.height * (sw / img.width)));
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);

  const id = ctx.getImageData(0, 0, c.width, c.height);
  const d = id.data;

  const hist = new Array(256).fill(0);
  let sum = 0, cnt = 0;

  for (let i = 0; i < d.length; i += 4){
    const r = d[i], g = d[i+1], bl = d[i+2];
    const lum = Math.round(0.2126*r + 0.7152*g + 0.0722*bl);
    hist[lum] += 1;
    sum += lum;
    cnt += 1;
  }

  const mean = sum / Math.max(1, cnt);

  const p = (q) => {
    const target = cnt * q;
    let acc = 0;
    for (let i = 0; i < 256; i++){
      acc += hist[i];
      if (acc >= target) return i;
    }
    return 255;
  };

  const p05 = p(0.05);
  const p95 = p(0.95);

  const targetMean = 140;
  const ratio = targetMean / Math.max(1, mean);

  const stops = Math.log2(ratio);
  let bright = Math.round((stops / 0.68) * 50);
  bright = Math.max(-50, Math.min(50, bright));

  let shadow = 0;
  if (p05 < 35) shadow = 65;
  else if (p05 < 55) shadow = 45;
  else if (p05 < 70) shadow = 25;
  else shadow = 10;

  if (p95 > 240) bright = Math.max(-30, bright - 15);
  if (p95 > 250) bright = Math.max(-40, bright - 22);

  return { brightness: bright, shadows: shadow };
}

// ==========================
// Drawing (FINAL OUTPUT / PREVIEW)
// ==========================
function getOverlayHeights(){
  let headerH = 0, footerH = 0;
  if (headerImg) headerH = Math.round(headerImg.height * (OUT_W / headerImg.width));
  if (footerImg) footerH = Math.round(footerImg.height * (OUT_W / footerImg.width));
  return { headerH, footerH };
}

function getCanvasDimsForOutput(){
  const OUT_H = parseInt(outHeightInput?.value || "1080", 10) || 1080;
  const { headerH, footerH } = getOverlayHeights();

  let canvasH = OUT_H;
  let photoAreaH = canvasH - headerH - footerH;

  if (photoAreaH < 80) {
    photoAreaH = 80;
    canvasH = headerH + photoAreaH + footerH;
  }

  return { canvasH, headerH, footerH, photoAreaH };
}

function drawEditedPhotoIntoArea(ctx, img, areaX, areaY, areaW, areaH, edit){
  const safe = edit || {};
  const rot = ((safe.rotDeg || 0) * Math.PI) / 180;

  const base = safe.baseScale || Math.min(areaW / img.width, areaH / img.height);
  const zoom = Math.max(0.5, safe.zoom || 1.0);
  const scale = base * zoom;

  const offX = safe.offsetX || 0;
  const offY = safe.offsetY || 0;

  const b = Number(safe.brightness || 0); // -50..50
  const s = Number(safe.shadows || 0);    // 0..100

  // brightness via ctx.filter (FAST)
  // map -50..50 to 0.7..1.3 (simple & stable)
  const brightMul = 1 + (b / 50) * 0.30; // 0.7..1.3

  // shadows: ONLY do heavy work if s > 0
  const photoId = safe._photoId || draftPhotoId || "x";
  const processed = (s > 0) ? getProcessedCanvas(img, photoId, 0, s) : null;
  const src = processed || img;

  ctx.save();
  ctx.beginPath();
  ctx.rect(areaX, areaY, areaW, areaH);
  ctx.clip();

  const cx = areaX + areaW / 2;
  const cy = areaY + areaH / 2;

  ctx.translate(cx + offX, cy + offY);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  if (b !== 0) ctx.filter = `brightness(${brightMul})`;

  // IMPORTANT: keep geometry based on original img size (avoid zoom shifting when src is processed smaller)
  if (src !== img) {
    ctx.drawImage(src, -img.width / 2, -img.height / 2, img.width, img.height);
  } else {
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
  }

  ctx.filter = "none";
  ctx.restore();
}

function drawToCanvas(photoImg, mimeType, edit) {
  const fillWhite = (mimeType === "image/jpeg");
  const useBlurFill = !!blurFillToggle?.checked;

  const { canvasH, headerH, footerH, photoAreaH } = getCanvasDimsForOutput();

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  if (fillWhite) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUT_W, canvasH);
  } else {
    ctx.clearRect(0, 0, OUT_W, canvasH);
  }

  let y = 0;

  if (headerImg) {
    ctx.drawImage(headerImg, 0, y, OUT_W, headerH);
    y += headerH;
  }

  const areaX = 0, areaY = y, areaW = OUT_W, areaH = photoAreaH;

  if (useBlurFill) {
    const bg = fitCover(photoImg.width, photoImg.height, areaW, areaH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(areaX, areaY, areaW, areaH);
    ctx.clip();

    const canFilter = (() => {
      try { return typeof ctx.filter === "string"; }
      catch (e) { return false; }
    })();

    if (canFilter) {
      ctx.filter = "blur(22px)";
      ctx.globalAlpha = 0.95;
      ctx.drawImage(photoImg, areaX + bg.x, areaY + bg.y, bg.w, bg.h);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.95;
      drawBlurCoverFallback(ctx, photoImg, areaX, areaY, areaW, areaH, bg);
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.fillRect(areaX, areaY, areaW, areaH);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawEditedPhotoIntoArea(ctx, photoImg, areaX, areaY, areaW, areaH, edit);

  y += areaH;

  if (footerImg) {
    ctx.drawImage(footerImg, 0, y, OUT_W, footerH);
  }

  // ===== WATERMARK (always LAST so it won't affect zoom/crop/shadow) =====
  drawTextWatermark(ctx, canvas.width, canvas.height, wmState);

  return canvas;
}

function refreshPreview(){
  if (photoItems.length === 0) return;

  const idx = currentIndex >= 0 ? currentIndex : 0;
  const item = photoItems[idx];
  if (!item?.img) return;

  const useDraft = editModal.classList.contains("show") && draftEdit && draftPhotoId === item.id;
  const edit = useDraft ? draftEdit : (edits.get(item.id) || getDefaultEdit(item.img));

  const mimeType = formatSelect.value;
  const canvas = drawToCanvas(item.img, mimeType, edit);

  previewCanvas.width = canvas.width;
  previewCanvas.height = canvas.height;
  const pctx = previewCanvas.getContext("2d");
  pctx.clearRect(0,0,previewCanvas.width,previewCanvas.height);
  pctx.drawImage(canvas, 0, 0);
}

function updateWeightUI(){
  if (!wmFont || !wmWeight) return;

  const isGilroy = wmFont.value === "Gilroy";
  wmWeight.disabled = !isGilroy;

  // kalau bukan Gilroy, paksa Auto supaya UI tak mengarut
  if (!isGilroy) wmWeight.value = "auto";
}

wmFont?.addEventListener("change", () => {
  syncWmStateFromUI();
  updateWeightUI();
  refreshPreview();
});

updateWeightUI();

// ==========================
// Photos loading + list UI
// ==========================
async function loadPhotos(files){
  if (!files.length) return;

  for (const it of photoItems) {
    if (it.url) URL.revokeObjectURL(it.url);
  }
  photoItems = [];
  edits.clear();
  currentIndex = -1;

  draftEdit = null;
  draftPhotoId = null;
  if (editModal.classList.contains("show")) {
    editModal.classList.remove("show");
    editModal.setAttribute("aria-hidden", "true");
  }

  setStatus(`Loading ${files.length} photo...`);
  setProgress(0);

  const items = files.map(file => ({
    id: makeFileId(file),
    file,
    url: URL.createObjectURL(file),
    img: null
  }));

  for (let i = 0; i < items.length; i++){
    const it = items[i];
    const img = new Image();
    img.src = it.url;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });
    it.img = img;

    // committed default edit (FIT)
    const def = getDefaultEdit(img);
    def._photoId = it.id;
    edits.set(it.id, def);

    const pct = Math.round(((i + 1) / items.length) * 100);
    setProgress(pct);
  }

  photoItems = items;
  currentIndex = 0;

  renderPhotoList();
  exportBtn.disabled = false;
  setStatus(`Ready. ${photoItems.length} photo loaded. Klik thumbnail untuk edit.`);
  setProgress(0);
  refreshPreview();
}

function renderPhotoList(){
  photoListEl.innerHTML = "";
  if (!photoItems.length){
    emptyListEl.style.display = "block";
    countInfoEl.textContent = "0 files";
    return;
  }
  emptyListEl.style.display = "none";
  countInfoEl.textContent = `${photoItems.length} files`;

  for (let i = 0; i < photoItems.length; i++){
    const it = photoItems[i];
    const div = document.createElement("div");
    div.className = "photoItem";
    div.dataset.idx = String(i);

    const img = document.createElement("img");
    img.src = it.url;

    const tag = document.createElement("div");
    tag.className = "editedTag";
    tag.textContent = "✅ Edited";

    const meta = document.createElement("div");
    meta.className = "photoMeta";
    meta.textContent = it.file.name;

    div.appendChild(img);
    div.appendChild(tag);
    div.appendChild(meta);

    const ed = edits.get(it.id);
    if (ed && ed._saved) div.classList.add("edited");

    div.addEventListener("click", () => openEditor(i));
    photoListEl.appendChild(div);
  }
}

// ==========================
// Default edit (FIT / CONTAIN) + Light defaults
// ==========================
function getDefaultEdit(img){
  const { photoAreaH } = getCanvasDimsForOutput();
  const areaW = OUT_W;
  const areaH = Math.max(80, photoAreaH);

  const baseScale = Math.min(areaW / img.width, areaH / img.height);

  return {
    baseScale,
    zoom: 1.0,
    offsetX: 0,
    offsetY: 0,
    rotDeg: 0,

    brightness: 0, // -50..50
    shadows: 0,    // 0..100

    _saved: false,
    _photoId: null,
  };
}

// ==========================
// Editor modal logic (DRAFT MODE)
// ==========================
let dragActive = false;
let lastX = 0;
let lastY = 0;

function syncLightUI(){
  if (!draftEdit) return;
  if (brightRange) brightRange.value = String(draftEdit.brightness || 0);
  if (brightVal) brightVal.textContent = String(draftEdit.brightness || 0);
  if (shadowRange) shadowRange.value = String(draftEdit.shadows || 0);
  if (shadowVal) shadowVal.textContent = String(draftEdit.shadows || 0);
}

function openEditor(idx){
  if (!photoItems[idx]) return;
  currentIndex = idx;

  const it = photoItems[idx];
  const img = it.img;
  if (!img) return;

  const committed = edits.get(it.id) || getDefaultEdit(img);

  // recompute baseScale based on current output/overlays
  const baseUpdated = getDefaultEdit(img).baseScale;

  draftPhotoId = it.id;
  draftEdit = {
    ...committed,
    baseScale: baseUpdated,
    _photoId: it.id,
  };

  editTitle.textContent = `Edit: ${it.file.name}`;
  editSub.textContent = `Drag to move • Zoom to crop • (${idx+1}/${photoItems.length})`;

  zoomRange.value = String(draftEdit.zoom || 1.0);
  zoomVal.textContent = `${Number(zoomRange.value).toFixed(2)}x`;
  rotVal.textContent = `${draftEdit.rotDeg || 0}°`;

  syncLightUI();

  editModal.classList.add("show");
  editModal.setAttribute("aria-hidden", "false");

  redrawEditor();
  refreshPreview();
}

function closeEditor(){
  draftEdit = null;
  draftPhotoId = null;

  editModal.classList.remove("show");
  editModal.setAttribute("aria-hidden", "true");

  refreshPreview();
}

closeModalBtn?.addEventListener("click", closeEditor);
editModal?.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditor();
});

// Close editor modal with ESC key
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (editModal?.classList.contains("show")) {
      closeEditor();
    }
  }
});

document.getElementById("wmFont")?.addEventListener("change", () => {
  refreshPreview();
});

function redrawEditor(){
  if (currentIndex < 0) return;
  const it = photoItems[currentIndex];
  if (!it?.img) return;

  const edit = (draftPhotoId === it.id && draftEdit) ? draftEdit : (edits.get(it.id) || getDefaultEdit(it.img));
  const mimeType = formatSelect.value;

  const canvas = drawToCanvas(it.img, mimeType, edit);

  editCanvas.width = canvas.width;
  editCanvas.height = canvas.height;

  const ctx = editCanvas.getContext("2d");
  ctx.clearRect(0,0,editCanvas.width,editCanvas.height);
  ctx.drawImage(canvas, 0, 0);

  const { headerH, photoAreaH } = getCanvasDimsForOutput();
  ctx.save();
  ctx.strokeStyle = "rgba(37,99,235,.9)";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, headerH + 3, OUT_W - 6, photoAreaH - 6);
  ctx.restore();
}

function getCanvasPoint(e, canvas){
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function applyDrag(dx, dy){
  const edit = draftEdit;
  if (!edit) return;

  edit.offsetX = (edit.offsetX || 0) + dx;
  edit.offsetY = (edit.offsetY || 0) + dy;

  const clamp = 2000;
  edit.offsetX = Math.max(-clamp, Math.min(clamp, edit.offsetX));
  edit.offsetY = Math.max(-clamp, Math.min(clamp, edit.offsetY));

  redrawEditor();
  refreshPreview();
}

editCanvas?.addEventListener("mousedown", (e) => {
  if (!editModal.classList.contains("show")) return;
  dragActive = true;
  const p = getCanvasPoint(e, editCanvas);
  lastX = p.x;
  lastY = p.y;
});
window.addEventListener("mousemove", (e) => {
  if (!dragActive || !editModal.classList.contains("show")) return;
  const p = getCanvasPoint(e, editCanvas);
  const dx = p.x - lastX;
  const dy = p.y - lastY;
  lastX = p.x;
  lastY = p.y;
  applyDrag(dx, dy);
});
window.addEventListener("mouseup", () => { dragActive = false; });

editCanvas?.addEventListener("dblclick", () => resetCurrentEdit());

// touch
editCanvas?.addEventListener("touchstart", (e) => {
  if (!editModal.classList.contains("show")) return;
  dragActive = true;
  const p = getCanvasPoint(e, editCanvas);
  lastX = p.x; lastY = p.y;
}, {passive:true});
editCanvas?.addEventListener("touchmove", (e) => {
  if (!dragActive || !editModal.classList.contains("show")) return;
  const p = getCanvasPoint(e, editCanvas);
  const dx = p.x - lastX;
  const dy = p.y - lastY;
  lastX = p.x; lastY = p.y;
  applyDrag(dx, dy);
}, {passive:true});
editCanvas?.addEventListener("touchend", () => { dragActive = false; });

// wheel zoom
editCanvas?.addEventListener("wheel", (e) => {
  if (!editModal.classList.contains("show")) return;
  if (!draftEdit) return;
  e.preventDefault();

  const delta = Math.sign(e.deltaY);
  const step = 0.06;

  let z = draftEdit.zoom || 1.0;
  z = z + (delta > 0 ? -step : step);
  z = Math.max(1, Math.min(3, z));

  draftEdit.zoom = z;
  zoomRange.value = String(z);
  zoomVal.textContent = `${z.toFixed(2)}x`;

  redrawEditor();
  refreshPreview();
}, { passive: false });

zoomRange?.addEventListener("input", () => {
  if (!draftEdit) return;
  draftEdit.zoom = Number(zoomRange.value);
  zoomVal.textContent = `${Number(zoomRange.value).toFixed(2)}x`;
  redrawEditor();
  refreshPreview();
});

function rotateCurrent(deg){
  if (!draftEdit) return;
  draftEdit.rotDeg = ((draftEdit.rotDeg || 0) + deg) % 360;
  rotVal.textContent = `${draftEdit.rotDeg}°`;
  redrawEditor();
  refreshPreview();
}
rotLeftBtn?.addEventListener("click", () => rotateCurrent(-90));
rotRightBtn?.addEventListener("click", () => rotateCurrent(90));

function resetCurrentEdit(){
  const it = photoItems[currentIndex];
  if (!it?.img) return;

  draftEdit = getDefaultEdit(it.img);
  draftEdit._photoId = it.id;
  draftPhotoId = it.id;

  zoomRange.value = String(draftEdit.zoom);
  zoomVal.textContent = `${draftEdit.zoom.toFixed(2)}x`;
  rotVal.textContent = `${draftEdit.rotDeg}°`;

  syncLightUI();
  redrawEditor();
  refreshPreview();
}
resetBtn?.addEventListener("click", resetCurrentEdit);

// Light adjust events
brightRange?.addEventListener("input", () => {
  if (!draftEdit) return;
  draftEdit.brightness = Number(brightRange.value);
  if (brightVal) brightVal.textContent = String(draftEdit.brightness);
  redrawEditor();
  refreshPreview();
});
shadowRange?.addEventListener("input", () => {
  if (!draftEdit) return;
  draftEdit.shadows = Number(shadowRange.value);
  if (shadowVal) shadowVal.textContent = String(draftEdit.shadows);
  redrawEditor();
  refreshPreview();
});
autoAdjustBtn?.addEventListener("click", () => {
  if (!draftEdit) return;
  const it = photoItems[currentIndex];
  if (!it?.img) return;

  const res = autoAdjustForImage(it.img);
  draftEdit.brightness = res.brightness;
  draftEdit.shadows = res.shadows;

  syncLightUI();
  redrawEditor();
  refreshPreview();
  setStatus(`Auto Adjust applied: ${it.file.name}`);
});
clearAdjustBtn?.addEventListener("click", () => {
  if (!draftEdit) return;
  draftEdit.brightness = 0;
  draftEdit.shadows = 0;
  syncLightUI();
  redrawEditor();
  refreshPreview();
});

saveBtn?.addEventListener("click", () => {
  const it = photoItems[currentIndex];
  if (!it) return;
  if (!draftEdit) return;

  const committed = { ...draftEdit, _saved: true, _photoId: it.id };
  edits.set(it.id, committed);

  // mark thumb edited
  const node = photoListEl.querySelector(`.photoItem[data-idx="${currentIndex}"]`);
  if (node) node.classList.add("edited");

  // ✅ Button feedback
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saved ✅";
  saveBtn.classList.add("saved", "pop");

  setTimeout(() => saveBtn.classList.remove("pop"), 220);

  setStatus(`Saved: ${it.file.name}`);
  redrawEditor();
  refreshPreview();

  // ✅ Auto close modal lepas nampak feedback sekejap
  setTimeout(() => {
    saveBtn.textContent = originalText || "Save (Apply)";
    saveBtn.classList.remove("saved");
    saveBtn.disabled = false;

    closeEditor();
  }, 650);
});
prevBtn?.addEventListener("click", () => {
  if (photoItems.length === 0) return;
  const idx = (currentIndex - 1 + photoItems.length) % photoItems.length;
  openEditor(idx);
});
nextBtn?.addEventListener("click", () => {
  if (photoItems.length === 0) return;
  const idx = (currentIndex + 1) % photoItems.length;
  openEditor(idx);
});

// ==========================
// Export / ZIP
// ==========================
function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

exportBtn?.addEventListener("click", async () => {
  if (!photoItems.length) {
    setStatus("Sila upload / drag foto dulu.");
    return;
  }

  exportBtn.disabled = true;
  setProgress(0);

  const mimeType = formatSelect.value;
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const jpgQ = parseInt(quality.value, 10) / 100;

  const yieldUI = () => new Promise(resolve => setTimeout(resolve, 0));

  let zipMode = !!zipToggle.checked;
  const hasJSZip = typeof JSZip !== "undefined";

  if (zipMode && !hasJSZip) {
    zipMode = false;
    setStatus("ZIP tak available (JSZip tak load). Auto download satu-satu.");
  }

  const zip = zipMode ? new JSZip() : null;

  async function canvasToBlobSafe(canvas) {
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeType, jpgQ);
    });
    if (blob) return blob;

    const dataUrl = canvas.toDataURL(mimeType, jpgQ);
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  try {
    setStatus(`Exporting ${photoItems.length} photo...`);

    for (let i = 0; i < photoItems.length; i++) {
      const it = photoItems[i];

      const edit = edits.get(it.id) || (() => {
        const d = getDefaultEdit(it.img);
        d._photoId = it.id;
        return d;
      })();

      const canvas = drawToCanvas(it.img, mimeType, edit);
      const blob = await canvasToBlobSafe(canvas);

      const safeName = it.file.name.replace(/\.[^/.]+$/, "");
      const outName = `${safeName}_1080x${canvas.height}.${ext}`;

      if (zipMode) {
        zip.file(outName, blob);
      } else {
        downloadBlob(blob, outName);
      }

      const pct = Math.round(((i + 1) / photoItems.length) * 100);
      setProgress(pct);
      setStatus(`Done ${i + 1}/${photoItems.length}`);

      if ((i + 1) % 2 === 0) await yieldUI();
    }

    if (zipMode) {
      setStatus("Generating ZIP...");
      await yieldUI();
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `output_1080_${Date.now()}.zip`);
    }

    setStatus("Siap ✅");
    setProgress(0);
  } catch (err) {
    console.error(err);
    setStatus(`Export gagal: ${err?.message || err}`);
  } finally {
    exportBtn.disabled = false;
  }
});

// ==========================
// Init
// ==========================
window.addEventListener("DOMContentLoaded", () => {

  // ====== THEME TOGGLE (Dark Mode) ======
  const themeBtn = document.getElementById("themeToggle");

  // ZIP toggle remember state
  const savedZip = localStorage.getItem("zip_default");
  if (savedZip !== null) {
    zipToggle.checked = savedZip === "true";
  } else {
    zipToggle.checked = false; // default OFF
  }
  
  zipToggle?.addEventListener("change", () => {
    localStorage.setItem("zip_default", zipToggle.checked);
  });

  function applyTheme(mode){
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("theme", mode);
    if (themeBtn) themeBtn.textContent = (mode === "dark") ? "☀️ Light" : "🌙 Dark";
  }

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }

  themeBtn?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "dark" ? "light" : "dark");
  });

  // ====== WATERMARK INIT ======
  loadWatermarkFromStorage();
  syncWmUIFromState();
  bindWatermarkEvents();

  loadOverlayFromStorage("header");
  loadOverlayFromStorage("footer");

  if (!localStorage.getItem("overlay_header")) {
    loadDefaultOverlay("header", DEFAULT_HEADER_FILE);
  }

  if (!localStorage.getItem("overlay_footer")) {
    loadDefaultOverlay("footer", DEFAULT_FOOTER_FILE);
  }

  setStatus("Ready.");
});
