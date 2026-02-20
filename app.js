const headerInput = document.getElementById("headerInput");
const footerInput = document.getElementById("footerInput");
const photosInput = document.getElementById("photosInput");
const processBtn  = document.getElementById("processBtn");
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

const OUT_W = 1080;

const outHeightInput = document.getElementById("outHeight");
const blurFillToggle = document.getElementById("blurFillToggle");


let headerImg = null;
let footerImg = null;

// ====== LOCAL STORAGE ======
function saveOverlay(type, file){
  const reader = new FileReader();
  reader.onload = function(e){
    localStorage.setItem(`overlay_${type}`, e.target.result);
  };
  reader.readAsDataURL(file);
}

function loadOverlayFromStorage(type){
  const data = localStorage.getItem(`overlay_${type}`);
  if(!data) return null;

  const img = new Image();
  img.src = data;

  img.onload = () => {
    if(type === "header"){
      headerImg = img;
      headerThumb.src = data;
      headerThumb.style.display = "block";
      headerEmpty.style.display = "none";
    }
    if(type === "footer"){
      footerImg = img;
      footerThumb.src = data;
      footerThumb.style.display = "block";
      footerEmpty.style.display = "none";
    }
  };
}


function setStatus(msg) { statusEl.textContent = msg; }
function setProgress(pct){ barEl.style.width = `${pct}%`; }

quality.addEventListener("input", () => {
  qualityVal.textContent = quality.value;
});

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
}


headerInput.addEventListener("change", async () => {
  const file = headerInput.files?.[0];
  if (!file) return;
  await loadOverlay(file, "header");
});

footerInput.addEventListener("change", async () => {
  const file = footerInput.files?.[0];
  if (!file) return;
  await loadOverlay(file, "footer");
});

clearHeaderBtn.addEventListener("click", () => {
  headerImg = null;
  headerThumb.style.display = "none";
  headerEmpty.style.display = "block";
  headerInput.value = "";
  localStorage.removeItem("overlay_header");
});

clearFooterBtn.addEventListener("click", () => {
  footerImg = null;
  footerThumb.style.display = "none";
  footerEmpty.style.display = "block";
  footerInput.value = "";
  localStorage.removeItem("overlay_footer");
});


function bindDrop(zoneEl, inputEl, onFile) {
  zoneEl.addEventListener("click", () => inputEl.click());

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
  // inject dropped files into input (not all browsers allow setting files programmatically)
  // So we just keep a reference list via a global.
  droppedPhotos = files.filter(f => f.type.startsWith("image/"));
  setStatus(`${droppedPhotos.length} photo ready (drop). Tekan Process.`);
});

let droppedPhotos = [];

function fitContain(srcW, srcH, dstW, dstH){
  const s = Math.min(dstW / srcW, dstH / srcH);
  const w = srcW * s, h = srcH * s;
  return { x:(dstW - w)/2, y:(dstH - h)/2, w, h, s };
}

function fitCover(srcW, srcH, dstW, dstH){
  const s = Math.max(dstW / srcW, dstH / srcH);
  const w = srcW * s, h = srcH * s;
  return { x:(dstW - w)/2, y:(dstH - h)/2, w, h, s };
}

// Safari/macOS fallback: ctx.filter blur kadang tak berfungsi.
// Teknik: downscale -> upscale (pseudo blur) dalam offscreen canvas.
function drawBlurCoverFallback(ctx, img, areaX, areaY, areaW, areaH, bg) {
  const temp = document.createElement("canvas");
  temp.width = areaW;
  temp.height = areaH;
  const t = temp.getContext("2d");
  t.imageSmoothingEnabled = true;

  // Render cover image ke offscreen (bg coords relative to photo area)
  t.drawImage(img, bg.x, bg.y, bg.w, bg.h);

  const small = document.createElement("canvas");
  const scale = 0.12; // kecilkan = blur lagi kuat
  small.width = Math.max(1, Math.round(areaW * scale));
  small.height = Math.max(1, Math.round(areaH * scale));
  const s = small.getContext("2d");
  s.imageSmoothingEnabled = true;

  // Pass 1
  s.clearRect(0, 0, small.width, small.height);
  s.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, small.width, small.height);
  t.clearRect(0, 0, temp.width, temp.height);
  t.drawImage(small, 0, 0, small.width, small.height, 0, 0, temp.width, temp.height);

  // Pass 2 (optional) - tambah blur
  s.clearRect(0, 0, small.width, small.height);
  s.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, small.width, small.height);
  t.clearRect(0, 0, temp.width, temp.height);
  t.drawImage(small, 0, 0, small.width, small.height, 0, 0, temp.width, temp.height);

  // Paint balik ke main canvas
  ctx.drawImage(temp, areaX, areaY);
}

function drawToCanvas(photoImg, headerImg, footerImg, mimeType) {
  const OUT_W = 1080;
  const OUT_H = parseInt(outHeightInput?.value || "0", 10) || 0; // 0 = auto
  const fillWhite = (mimeType === "image/jpeg");
  const useBlurFill = !!blurFillToggle?.checked;

  // scale overlays ikut width 1080
  let headerH = 0, footerH = 0;
  if (headerImg) headerH = Math.round(headerImg.height * (OUT_W / headerImg.width));
  if (footerImg) footerH = Math.round(footerImg.height * (OUT_W / footerImg.width));

  // kalau user set height fixed (contoh 1080), area foto = baki
  // kalau height = 0, fallback auto macam dulu
  let canvasH = OUT_H ? OUT_H : (headerH + Math.round(photoImg.height * (OUT_W / photoImg.width)) + footerH);

  // safety: kalau overlays tinggi sangat sampai area foto negatif
  let photoAreaH = canvasH - headerH - footerH;
  if (photoAreaH < 80) { // minimum ruang
    photoAreaH = 80;
    canvasH = headerH + photoAreaH + footerH;
  }

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  // background base
  if (fillWhite) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUT_W, canvasH);
  } else {
    ctx.clearRect(0, 0, OUT_W, canvasH);
  }

  let y = 0;

  // header
  if (headerImg) {
    ctx.drawImage(headerImg, 0, y, OUT_W, headerH);
    y += headerH;
  }

  // ====== PHOTO AREA (fixed height) ======
  const areaX = 0, areaY = y, areaW = OUT_W, areaH = photoAreaH;

  if (useBlurFill) {
    // blur background: cover the area
    const bg = fitCover(photoImg.width, photoImg.height, areaW, areaH);

    ctx.save();
    // clip to photo area
    ctx.beginPath();
    ctx.rect(areaX, areaY, areaW, areaH);
    ctx.clip();

    // Blur (Chrome/Edge ok) + fallback untuk Safari
    const canFilter = (() => {
      try {
        return typeof ctx.filter === "string";
      } catch (e) {
        return false;
      }
    })();

    if (canFilter) {
      ctx.filter = "blur(22px)";
      ctx.globalAlpha = 0.95;

      ctx.drawImage(
        photoImg,
        areaX + bg.x, areaY + bg.y,
        bg.w, bg.h
      );

      ctx.filter = "none";
      ctx.globalAlpha = 1;
    } else {
      // Safari fallback
      ctx.globalAlpha = 0.95;
      drawBlurCoverFallback(ctx, photoImg, areaX, areaY, areaW, areaH, bg);
      ctx.globalAlpha = 1;
    }

    // optional: darken sedikit supaya subject naik
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.fillRect(areaX, areaY, areaW, areaH);

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // foreground photo: contain the area (tak crop)
  const fg = fitContain(photoImg.width, photoImg.height, areaW, areaH);
  ctx.drawImage(
    photoImg,
    areaX + fg.x, areaY + fg.y,
    fg.w, fg.h
  );

  y += areaH;

  // footer
  if (footerImg) {
    ctx.drawImage(footerImg, 0, y, OUT_W, footerH);
  }

  return canvas;
}


  

function canvasToBlob(canvas, mimeType, jpgQuality=0.92) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, jpgQuality);
  });
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

processBtn.addEventListener("click", async () => {
  const inputFiles = Array.from(photosInput.files || []);
  const files = droppedPhotos.length ? droppedPhotos : inputFiles;

  if (!files.length) {
    setStatus("Sila upload / drag foto dulu.");
    return;
  }

  processBtn.disabled = true;
  setProgress(0);

  const mimeType = formatSelect.value;
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const fillWhite = (mimeType === "image/jpeg");
  const jpgQ = parseInt(quality.value, 10) / 100;

  setStatus(`Processing ${files.length} photo...`);

  const zip = new JSZip();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const photoImg = await fileToImage(file);

    const mimeType = formatSelect.value;
const canvas = drawToCanvas(photoImg, headerImg, footerImg, mimeType);

    const blob = await canvasToBlob(canvas, mimeType, jpgQ);

    if (i === 0) {
      previewCanvas.width = canvas.width;
      previewCanvas.height = canvas.height;
      const pctx = previewCanvas.getContext("2d");
      pctx.clearRect(0,0,previewCanvas.width,previewCanvas.height);
      pctx.drawImage(canvas, 0, 0);
    }

    const safeName = file.name.replace(/\.[^/.]+$/, "");
    const outName = `${safeName}_1080.${ext}`;

    if (zipToggle.checked) zip.file(outName, blob);
    else downloadBlob(blob, outName);

    const pct = Math.round(((i + 1) / files.length) * 100);
    setProgress(pct);
    setStatus(`Done ${i+1}/${files.length}`);
  }

  if (zipToggle.checked) {
    setStatus("Generating ZIP...");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `output_1080_${Date.now()}.zip`);
  }

  setStatus("Siap ✅");
  processBtn.disabled = false;
});

// Auto load overlay bila page refresh
window.addEventListener("DOMContentLoaded", () => {
  loadOverlayFromStorage("header");
  loadOverlayFromStorage("footer");
});
