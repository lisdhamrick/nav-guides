const storageKeys = {
  library: "guideLibrary",
  guidePrefix: "guide:",
  github: "githubSettings"
};

const els = {
  ghOwner: document.getElementById("ghOwner"),
  ghRepo: document.getElementById("ghRepo"),
  ghBranch: document.getElementById("ghBranch"),
  ghFolder: document.getElementById("ghFolder"),
  ghToken: document.getElementById("ghToken"),
  toggleGithub: document.getElementById("toggleGithub"),
  saveGithub: document.getElementById("saveGithub"),
  clearGithub: document.getElementById("clearGithub"),
  githubStatus: document.getElementById("githubStatus"),
  searchInput: document.getElementById("searchInput"),
  guideList: document.getElementById("guideList"),
  publishedList: document.getElementById("publishedList"),
  refreshPublished: document.getElementById("refreshPublished"),
  githubPanel: document.getElementById("githubPanel")
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "guide";

const loadLibrary = () => {
  const raw = localStorage.getItem(storageKeys.library);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
};

const loadGuide = (id) => {
  const raw = localStorage.getItem(`${storageKeys.guidePrefix}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
};

const saveLibrary = (list) => {
  localStorage.setItem(storageKeys.library, JSON.stringify(list));
};

const saveGithubSettings = (settings) => {
  localStorage.setItem(storageKeys.github, JSON.stringify(settings));
};

const loadGithubSettings = () => {
  const raw = localStorage.getItem(storageKeys.github);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
};

const setGithubPanelVisibility = (visible) => {
  if (!els.githubPanel) return;
  els.githubPanel.style.display = visible ? "block" : "none";
  if (els.toggleGithub) {
    els.toggleGithub.textContent = visible ? "Hide" : "Show";
  }
  localStorage.setItem("githubPanelHidden", visible ? "false" : "true");
};

const updateGithubUI = () => {
  const settings = loadGithubSettings();
  if (!settings) return;
  els.ghOwner.value = settings.owner || "";
  els.ghRepo.value = settings.repo || "";
  els.ghBranch.value = settings.branch || "main";
  els.ghFolder.value = settings.folder || "guides";
  els.ghToken.value = settings.token ? "••••••••" : "";
  if (els.githubStatus) {
    els.githubStatus.textContent = settings.token
      ? "GitHub connected."
      : "";
  }
};

const getViewerUrl = (settings, path) => {
  if (!settings || !settings.owner || !settings.repo) return "";
  const base = `https://${settings.owner}.github.io/${settings.repo}/`;
  return `${base}viewer.html?src=${path}`;
};

const encodeBase64 = (value) =>
  btoa(unescape(encodeURIComponent(value)));

const getGuideThumbnail = (guide) => {
  if (guide && guide.thumbnailDataUrl) return guide.thumbnailDataUrl;
  const firstStep = guide && guide.steps ? guide.steps[0] : null;
  return firstStep && firstStep.imageDataUrl ? firstStep.imageDataUrl : "";
};

const fetchPublishedGuides = async () => {
  const settings = loadGithubSettings();
  if (!settings || !settings.owner || !settings.repo) {
    return [];
  }

  const folder = settings.folder || "guides";
  const apiBase = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${folder}`;

  const res = await fetch(apiBase, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(settings.token ? { Authorization: `token ${settings.token}` } : {})
    }
  });

  if (!res.ok) {
    return [];
  }

  const entries = await res.json();
  const jsonFiles = entries.filter((item) => item.type === "file" && item.name.endsWith(".json"));

  const base = `https://${settings.owner}.github.io/${settings.repo}/`;
  const hydrated = await Promise.all(
    jsonFiles.map(async (item) => {
      let data = null;
      try {
        const res = await fetch(item.download_url);
        if (res.ok) data = await res.json();
      } catch (err) {
        data = null;
      }
      return {
        name: item.name,
        path: item.path,
        url: `${base}viewer.html?src=${item.path}`,
        title: data?.title || item.name.replace(/\.json$/, ""),
        description: data?.description || "",
        thumbnail: getGuideThumbnail(data || {})
      };
    })
  );

  return hydrated;
};

const renderPublished = async () => {
  if (!els.publishedList) return;
  els.publishedList.innerHTML = "<p class=\"lede\">Loading published guides...</p>";
  const items = await fetchPublishedGuides();
  if (!items.length) {
    els.publishedList.innerHTML = "<p class=\"lede\">No published guides found.</p>";
    return;
  }

  els.publishedList.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "library-card";
    card.innerHTML = `
      <div class="library-card-body">
        ${item.thumbnail ? `<img class="library-thumb" src="${item.thumbnail}" alt="Guide thumbnail" />` : ""}
        <h3>${item.title}</h3>
        <p class="lede">${item.description || item.path}</p>
      </div>
      <div class="library-actions">
        <a class="btn" href="${item.url}" target="_blank">Open</a>
        <button class="btn" data-action="copy">Copy Link</button>
      </div>
      <p class="lede" data-status></p>
    `;
    const status = card.querySelector("[data-status]");
    const copyBtn = card.querySelector("[data-action='copy']");
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(item.url);
        status.textContent = "Share link copied.";
      } catch (err) {
        status.textContent = "Unable to copy link.";
      }
    };
    els.publishedList.appendChild(card);
  });
};

const publishGuide = async (guide, libraryItem) => {
  const settings = loadGithubSettings();
  if (!settings || !settings.token || !settings.owner || !settings.repo) {
    throw new Error("Missing GitHub settings.");
  }

  const folder = settings.folder || "guides";
  const baseName = slugify(guide.title || "guide");
  const idSuffix = (guide.id || "draft").slice(0, 6);
  const filename = `${baseName}-${idSuffix}.json`;
  const path = `${folder}/${filename}`;
  const apiBase = `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${path}`;

  let sha;
  const existing = await fetch(apiBase, {
    headers: {
      Authorization: `token ${settings.token}`,
      Accept: "application/vnd.github+json"
    }
  });
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  } else if (existing.status !== 404) {
    const text = await existing.text();
    throw new Error(text || "Publish check failed.");
  }

  const body = {
    message: `Publish guide: ${guide.title || "Untitled"}`,
    content: encodeBase64(JSON.stringify(guide, null, 2)),
    branch: settings.branch || "main"
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiBase, {
    method: "PUT",
    headers: {
      Authorization: `token ${settings.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Publish failed.");
  }

  const viewerUrl = getViewerUrl(settings, path);
  libraryItem.publishedPath = path;
  libraryItem.publishedUrl = viewerUrl;
  libraryItem.publishedAt = new Date().toISOString();

  guide.publishedPath = libraryItem.publishedPath;
  guide.publishedUrl = libraryItem.publishedUrl;
  guide.publishedAt = libraryItem.publishedAt;

  const list = loadLibrary();
  const idx = list.findIndex((item) => item.id === libraryItem.id);
  if (idx >= 0) list[idx] = libraryItem;
  saveLibrary(list);

  try {
    localStorage.setItem(`${storageKeys.guidePrefix}${libraryItem.id}`, JSON.stringify(guide));
  } catch (err) {
    console.warn("Guide update failed:", err);
  }

  return viewerUrl;
};

const renderGuide = (guide, settings) => {
  const card = document.createElement("div");
  card.className = "library-card";

  const title = guide.title || "Untitled Guide";
  const description = guide.description || "";
  const updated = guide.updatedAt
    ? new Date(guide.updatedAt).toLocaleString()
    : "";
  const thumb = getGuideThumbnail(guide);

  card.innerHTML = `
    <div class="library-card-body">
      ${thumb ? `<img class="library-thumb" src="${thumb}" alt="Guide thumbnail" />` : ""}
      <h3>${title}</h3>
      <p class="lede">${description}</p>
      <p class="lede" style="font-size: 0.85rem;">Updated ${updated}</p>
    </div>
    <div class="library-actions">
      <a class="btn" href="editor.html?id=${guide.id}">Edit</a>
      <a class="btn" href="viewer.html?id=${guide.id}">Preview</a>
      ${guide.publishedUrl ? `<a class="btn" href="${guide.publishedUrl}" target="_blank">Open live</a>` : ""}
      <button class="btn" data-action="publish">Publish</button>
      <button class="btn" data-action="copy">Copy Link</button>
    </div>
    <p class="lede" data-status></p>
  `;

  const status = card.querySelector("[data-status]");
  const publishBtn = card.querySelector("[data-action='publish']");
  const copyBtn = card.querySelector("[data-action='copy']");

  if (!settings || !settings.token) {
    publishBtn.disabled = true;
  }

  if (guide.publishedUrl) {
    status.textContent = `Published: ${guide.publishedUrl}`;
  }

  publishBtn.onclick = async () => {
    const fullGuide = loadGuide(guide.id);
    if (!fullGuide) {
      status.textContent = "Guide data not found in this browser.";
      return;
    }
    status.textContent = "Publishing...";
    try {
      const url = await publishGuide(fullGuide, guide);
      status.textContent = `Published: ${url}`;
    } catch (err) {
      status.textContent = "Publish failed. Check GitHub settings.";
    }
  };

  copyBtn.onclick = async () => {
    if (!guide.publishedUrl) {
      status.textContent = "Publish to get a share link.";
      return;
    }
    try {
      await navigator.clipboard.writeText(guide.publishedUrl);
      status.textContent = "Share link copied.";
    } catch (err) {
      status.textContent = "Unable to copy link.";
    }
  };

  return card;
};

const renderLibrary = () => {
  const list = loadLibrary();
  const query = (els.searchInput.value || "").toLowerCase();
  const settings = loadGithubSettings();

  const filtered = list.filter((item) => {
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return haystack.includes(query);
  });

  els.guideList.innerHTML = "";
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "lede";
    empty.textContent = "No guides yet. Create one in the editor.";
    els.guideList.appendChild(empty);
    return;
  }

  filtered.forEach((guide) => {
    els.guideList.appendChild(renderGuide(guide, settings));
  });
};

els.saveGithub.onclick = () => {
  const existing = loadGithubSettings() || {};
  const tokenInput = els.ghToken.value.trim();
  const settings = {
    owner: els.ghOwner.value.trim(),
    repo: els.ghRepo.value.trim(),
    branch: els.ghBranch.value.trim() || "main",
    folder: els.ghFolder.value.trim() || "guides",
    token: tokenInput && tokenInput !== "••••••••" ? tokenInput : existing.token || ""
  };
  saveGithubSettings(settings);
  els.githubStatus.textContent = "GitHub settings saved.";
  setGithubPanelVisibility(false);
  renderLibrary();
  renderPublished();
};

els.clearGithub.onclick = () => {
  localStorage.removeItem(storageKeys.github);
  els.githubStatus.textContent = "GitHub settings cleared.";
  els.ghOwner.value = "";
  els.ghRepo.value = "";
  els.ghBranch.value = "";
  els.ghFolder.value = "";
  els.ghToken.value = "";
  renderLibrary();
  renderPublished();
};

els.searchInput.oninput = renderLibrary;
if (els.refreshPublished) {
  els.refreshPublished.onclick = renderPublished;
}
if (els.toggleGithub) {
  els.toggleGithub.onclick = () => {
    const hidden = localStorage.getItem("githubPanelHidden") === "true";
    setGithubPanelVisibility(hidden);
  };
}

updateGithubUI();
renderLibrary();
renderPublished();

if (localStorage.getItem("githubPanelHidden") === "true") {
  setGithubPanelVisibility(false);
}
