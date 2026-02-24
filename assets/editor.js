const defaultGuide = () => ({
  title: "Untitled Guide",
  description: "",
  steps: [
    {
      title: "Step 1",
      text: "",
      imageDataUrl: "",
      markers: [],
      videoUrl: "",
      audioUrl: ""
    }
  ]
});

const state = {
  guide: defaultGuide(),
  activeStep: 0,
  placingMarker: false
};

const storageKeys = {
  draft: "guideDraft",
  library: "guideLibrary",
  guidePrefix: "guide:"
};

const els = {
  stepList: document.getElementById("stepList"),
  addStep: document.getElementById("addStep"),
  removeStep: document.getElementById("removeStep"),
  guideTitle: document.getElementById("guideTitle"),
  guideDescription: document.getElementById("guideDescription"),
  stepTitle: document.getElementById("stepTitle"),
  stepText: document.getElementById("stepText"),
  stepImage: document.getElementById("stepImage"),
  stepVideo: document.getElementById("stepVideo"),
  stepAudio: document.getElementById("stepAudio"),
  imageStage: document.getElementById("imageStage"),
  markerHint: document.getElementById("markerHint"),
  saveStatus: document.getElementById("saveStatus"),
  loadJson: document.getElementById("loadJson"),
  exportJson: document.getElementById("exportJson"),
  exportHtml: document.getElementById("exportHtml"),
  jsonFile: document.getElementById("jsonFile"),
  addMarker: document.getElementById("addMarker"),
  clearMarkers: document.getElementById("clearMarkers")
};

const saveLocal = () => {
  try {
    localStorage.setItem(storageKeys.draft, JSON.stringify(state.guide));
    if (els.saveStatus) {
      els.saveStatus.textContent = "";
    }
    return true;
  } catch (err) {
    console.warn("Autosave failed:", err);
    if (els.saveStatus) {
      els.saveStatus.textContent =
        "Autosave is off (image too large for browser storage). Your preview is safe, but export or publish soon.";
    }
    return false;
  }
};

const loadLibraryList = () => {
  const stored = localStorage.getItem(storageKeys.library);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (err) {
    return [];
  }
};

const saveLibraryList = (list) => {
  try {
    localStorage.setItem(storageKeys.library, JSON.stringify(list));
  } catch (err) {
    console.warn("Library save failed:", err);
  }
};

const ensureGuideMetadata = () => {
  if (!state.guide.id) {
    state.guide.id = (window.crypto?.randomUUID && window.crypto.randomUUID()) ||
      `guide-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  if (!state.guide.createdAt) {
    state.guide.createdAt = new Date().toISOString();
  }
  state.guide.updatedAt = new Date().toISOString();
};

const saveGuideToLibrary = () => {
  ensureGuideMetadata();
  const list = loadLibraryList();
  const entry = {
    id: state.guide.id,
    title: state.guide.title || "Untitled Guide",
    description: state.guide.description || "",
    createdAt: state.guide.createdAt,
    updatedAt: state.guide.updatedAt,
    publishedUrl: state.guide.publishedUrl || "",
    publishedPath: state.guide.publishedPath || "",
    publishedAt: state.guide.publishedAt || ""
  };

  const idx = list.findIndex((item) => item.id === entry.id);
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.unshift(entry);
  }
  saveLibraryList(list);

  try {
    localStorage.setItem(`${storageKeys.guidePrefix}${entry.id}`, JSON.stringify(state.guide));
  } catch (err) {
    console.warn("Guide storage failed:", err);
  }
};

const loadLocal = async () => {
  const params = new URLSearchParams(window.location.search);
  const guideId = params.get("id");
  const src = params.get("src");

  if (guideId) {
    const stored = localStorage.getItem(`${storageKeys.guidePrefix}${guideId}`);
    if (stored) {
      try {
        state.guide = JSON.parse(stored);
        return;
      } catch (err) {
        state.guide = defaultGuide();
      }
    }
  }

  if (src) {
    try {
      const res = await fetch(src);
      if (res.ok) {
        state.guide = await res.json();
        return;
      }
    } catch (err) {
      state.guide = defaultGuide();
    }
  }

  const stored = localStorage.getItem(storageKeys.draft);
  if (stored) {
    try {
      state.guide = JSON.parse(stored);
      return;
    } catch (err) {
      state.guide = defaultGuide();
    }
  }
};

const renderStepList = () => {
  els.stepList.innerHTML = "";
  state.guide.steps.forEach((step, index) => {
    const div = document.createElement("div");
    div.className = `step-item ${index === state.activeStep ? "active" : ""}`;
    div.textContent = `${index + 1}. ${step.title || "Untitled step"}`;
    div.onclick = () => {
      state.activeStep = index;
      renderForm();
    };
    els.stepList.appendChild(div);
  });
};

const renderForm = () => {
  const step = state.guide.steps[state.activeStep];
  if (!step) return;

  els.guideTitle.value = state.guide.title || "";
  els.guideDescription.value = state.guide.description || "";
  els.stepTitle.value = step.title || "";
  els.stepText.value = step.text || "";
  els.stepVideo.value = step.videoUrl || "";
  els.stepAudio.value = step.audioUrl || "";
  els.stepImage.value = "";

  renderPreview();
  renderStepList();
};

const renderPreview = () => {
  const step = state.guide.steps[state.activeStep];
  els.imageStage.innerHTML = "";
  els.markerHint.textContent = state.placingMarker
    ? "Click on the image to place the next marker."
    : "";

  if (!step.imageDataUrl) {
    const empty = document.createElement("p");
    empty.textContent = "Upload an image to place markers.";
    empty.className = "lede";
    els.imageStage.appendChild(empty);
    return;
  }

  const img = document.createElement("img");
  img.src = step.imageDataUrl;
  img.alt = step.title || "Step image";
  img.onclick = (event) => {
    if (!state.placingMarker) return;
    const rect = img.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const label = String(step.markers.length + 1);
    step.markers.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), label });
    state.placingMarker = false;
    saveGuideToLibrary();
    saveLocal();
    renderPreview();
  };

  els.imageStage.appendChild(img);
  step.markers.forEach((marker) => {
    const markerEl = document.createElement("div");
    markerEl.className = "marker";
    markerEl.textContent = marker.label;
    markerEl.style.left = `${marker.x}%`;
    markerEl.style.top = `${marker.y}%`;
    els.imageStage.appendChild(markerEl);
  });
};

const updateGuide = () => {
  const step = state.guide.steps[state.activeStep];
  if (!step) return;

  state.guide.title = els.guideTitle.value.trim();
  state.guide.description = els.guideDescription.value.trim();
  step.title = els.stepTitle.value.trim();
  step.text = els.stepText.value.trim();
  step.videoUrl = els.stepVideo.value.trim();
  step.audioUrl = els.stepAudio.value.trim();
  saveGuideToLibrary();
  saveLocal();
  renderStepList();
};

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const canvasToDataUrl = (canvas, type, quality) => {
  try {
    return canvas.toDataURL(type, quality);
  } catch (err) {
    return canvas.toDataURL("image/jpeg", quality);
  }
};

const compressImage = async (file) => {
  const img = await loadImageElement(file);
  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / img.width);
  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const webp = canvasToDataUrl(canvas, "image/webp", 0.86);
  const dataUrl = webp.startsWith("data:image/webp") ? webp : canvasToDataUrl(canvas, "image/jpeg", 0.86);
  return dataUrl;
};

const handleImageUpload = async (file) => {
  if (!file) return;
  try {
    const optimized = await compressImage(file);
    const step = state.guide.steps[state.activeStep];
    step.imageDataUrl = optimized;
    step.markers = [];
    saveGuideToLibrary();
    saveLocal();
    renderPreview();
  } catch (err) {
    console.warn("Image upload failed:", err);
  }
};

const downloadFile = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const exportJson = () => {
  const json = JSON.stringify(state.guide, null, 2);
  downloadFile(json, "guide.json", "application/json");
};

const exportHtml = () => {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${state.guide.title || "Guide"}</title>
    <link rel="stylesheet" href="assets/app.css" />
  </head>
  <body>
    <main class="viewer-shell" id="app"></main>
    <script>
      window.GUIDE_DATA = ${JSON.stringify(state.guide)};
    </script>
    <script src="assets/viewer.js"></script>
  </body>
</html>`;
  downloadFile(html, "guide.html", "text/html");
};

els.addStep.onclick = () => {
  state.guide.steps.push({
    title: `Step ${state.guide.steps.length + 1}`,
    text: "",
    imageDataUrl: "",
    markers: [],
    videoUrl: "",
    audioUrl: ""
  });
  state.activeStep = state.guide.steps.length - 1;
  saveGuideToLibrary();
  saveLocal();
  renderForm();
};

els.removeStep.onclick = () => {
  if (state.guide.steps.length <= 1) return;
  state.guide.steps.splice(state.activeStep, 1);
  state.activeStep = Math.max(0, state.activeStep - 1);
  saveGuideToLibrary();
  saveLocal();
  renderForm();
};

els.addMarker.onclick = () => {
  state.placingMarker = true;
  renderPreview();
};

els.clearMarkers.onclick = () => {
  const step = state.guide.steps[state.activeStep];
  if (!step) return;
  step.markers = [];
  saveGuideToLibrary();
  saveLocal();
  renderPreview();
};

els.loadJson.onclick = () => {
  els.jsonFile.click();
};

els.jsonFile.onchange = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (fileEvent) => {
    try {
      const data = JSON.parse(fileEvent.target.result);
      state.guide = data;
      state.activeStep = 0;
      saveGuideToLibrary();
      saveLocal();
      renderForm();
    } catch (err) {
      alert("That file does not look like a valid guide JSON.");
    }
  };
  reader.readAsText(file);
};

els.exportJson.onclick = exportJson;
els.exportHtml.onclick = exportHtml;

els.guideTitle.oninput = updateGuide;
els.guideDescription.oninput = updateGuide;
els.stepTitle.oninput = updateGuide;
els.stepText.oninput = updateGuide;
els.stepVideo.oninput = updateGuide;
els.stepAudio.oninput = updateGuide;
els.stepImage.onchange = (event) => handleImageUpload(event.target.files[0]);

(async () => {
  await loadLocal();
  saveGuideToLibrary();
  renderForm();
})();
