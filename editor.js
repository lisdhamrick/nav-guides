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
  loadJson: document.getElementById("loadJson"),
  exportJson: document.getElementById("exportJson"),
  exportHtml: document.getElementById("exportHtml"),
  jsonFile: document.getElementById("jsonFile"),
  addMarker: document.getElementById("addMarker"),
  clearMarkers: document.getElementById("clearMarkers")
};

const saveLocal = () => {
  localStorage.setItem("guideDraft", JSON.stringify(state.guide));
};

const loadLocal = () => {
  const stored = localStorage.getItem("guideDraft");
  if (stored) {
    try {
      state.guide = JSON.parse(stored);
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
  img.onload = () => {
    step.markers.forEach((marker) => {
      const markerEl = document.createElement("div");
      markerEl.className = "marker";
      markerEl.textContent = marker.label;
      markerEl.style.left = `${marker.x}%`;
      markerEl.style.top = `${marker.y}%`;
      els.imageStage.appendChild(markerEl);
    });
  };

  img.onclick = (event) => {
    if (!state.placingMarker) return;
    const rect = img.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const label = String(step.markers.length + 1);
    step.markers.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), label });
    state.placingMarker = false;
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
  saveLocal();
  renderStepList();
};

const handleImageUpload = (file) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const step = state.guide.steps[state.activeStep];
    step.imageDataUrl = event.target.result;
    step.markers = [];
    saveLocal();
    renderPreview();
  };
  reader.readAsDataURL(file);
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
  saveLocal();
  renderForm();
};

els.removeStep.onclick = () => {
  if (state.guide.steps.length <= 1) return;
  state.guide.steps.splice(state.activeStep, 1);
  state.activeStep = Math.max(0, state.activeStep - 1);
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

loadLocal();
renderForm();
