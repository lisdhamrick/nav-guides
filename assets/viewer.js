const app = document.getElementById("app");

const getQueryParam = (key) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
};

const storageKeys = { guidePrefix: "guide:" };

const ensureLightbox = () => {
  let box = document.querySelector(".lightbox");
  if (box) return box;

  box = document.createElement("div");
  box.className = "lightbox hidden";
  box.innerHTML = `
    <button class="btn lightbox-close" aria-label="Close zoomed view">✕</button>
    <img alt="Zoomed view" />
  `;
  document.body.appendChild(box);

  const close = () => box.classList.add("hidden");
  box.onclick = (event) => {
    if (event.target === box) close();
  };
  box.querySelector("button").onclick = close;
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  return box;
};

const openLightbox = (src, alt) => {
  const box = ensureLightbox();
  const img = box.querySelector("img");
  img.src = src;
  img.alt = alt || "Zoomed view";
  box.classList.remove("hidden");
};

const normalizeVideoUrl = (url) => {
  if (!url) return "";
  if (url.includes("youtube.com/watch") || url.includes("youtu.be")) {
    const idMatch = url.match(/v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
    if (idMatch && idMatch[1]) {
      return `https://www.youtube.com/embed/${idMatch[1]}`;
    }
  }
  if (url.includes("vimeo.com")) {
    const idMatch = url.match(/vimeo\.com\/(\d+)/);
    if (idMatch && idMatch[1]) {
      return `https://player.vimeo.com/video/${idMatch[1]}`;
    }
  }
  return url;
};

const renderGuide = (guide) => {
  if (!guide) {
    app.innerHTML = "<p class=\"lede\">No guide data found.</p>";
    return;
  }

  const header = document.createElement("div");
  header.className = "viewer-header";
  header.innerHTML = `
    <div>
      <p class="eyebrow">Guide</p>
      <h1>${guide.title || "Untitled Guide"}</h1>
      <p class="lede">${guide.description || ""}</p>
    </div>
    <div class="actions">
      <a class="btn" href="index.html">Home</a>
      <button class="btn primary" id="printBtn">Print / Save PDF</button>
    </div>
  `;
  app.appendChild(header);

  const steps = guide.steps || [];
  steps.forEach((step, index) => {
    const stepEl = document.createElement("section");
    stepEl.className = "viewer-step";
    stepEl.innerHTML = `
      <h3>${index + 1}. ${step.title || "Untitled step"}</h3>
      <p>${step.text || ""}</p>
    `;

    if (step.imageDataUrl) {
      const stage = document.createElement("div");
      stage.className = "image-stage";
      const img = document.createElement("img");
      img.src = step.imageDataUrl;
      img.alt = step.title || `Step ${index + 1}`;
      img.style.cursor = "zoom-in";
      img.onclick = () => openLightbox(step.imageDataUrl, img.alt);
      stage.appendChild(img);

      (step.markers || []).forEach((marker) => {
        const markerEl = document.createElement("div");
        markerEl.className = "marker";
        markerEl.textContent = marker.label;
        markerEl.style.left = `${marker.x}%`;
        markerEl.style.top = `${marker.y}%`;
        stage.appendChild(markerEl);
      });

      stepEl.appendChild(stage);
    }

    if (step.videoUrl) {
      const media = document.createElement("div");
      media.className = "viewer-media";
      const iframe = document.createElement("iframe");
      iframe.src = normalizeVideoUrl(step.videoUrl);
      iframe.setAttribute("allowfullscreen", "true");
      iframe.setAttribute("loading", "lazy");
      media.appendChild(iframe);
      stepEl.appendChild(media);
    }

    if (step.audioUrl) {
      const audio = document.createElement("audio");
      audio.className = "audio";
      audio.controls = true;
      audio.src = step.audioUrl;
      stepEl.appendChild(audio);
    }

    app.appendChild(stepEl);
  });

  const printBtn = document.getElementById("printBtn");
  if (printBtn) {
    printBtn.onclick = () => window.print();
  }
};

const loadGuide = async () => {
  if (window.GUIDE_DATA) {
    renderGuide(window.GUIDE_DATA);
    return;
  }

  const src = getQueryParam("src");
  if (src) {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error("Failed to load guide");
      const data = await res.json();
      renderGuide(data);
      return;
    } catch (err) {
      renderGuide(null);
      return;
    }
  }

  const guideId = getQueryParam("id");
  if (guideId) {
    const storedGuide = localStorage.getItem(`${storageKeys.guidePrefix}${guideId}`);
    if (storedGuide) {
      try {
        renderGuide(JSON.parse(storedGuide));
        return;
      } catch (err) {
        renderGuide(null);
        return;
      }
    }
  }

  const stored = localStorage.getItem("guideDraft");
  if (stored) {
    try {
      renderGuide(JSON.parse(stored));
      return;
    } catch (err) {
      renderGuide(null);
      return;
    }
  }

  try {
    const res = await fetch("guides/sample.json");
    const data = await res.json();
    renderGuide(data);
  } catch (err) {
    renderGuide(null);
  }
};

loadGuide();
