# Step Guide (Standalone Embed App)

A static, no-login step-by-step guide builder + viewer designed for GitHub Pages.

## Quick start (local)

Open `index.html` in a browser and click **Create a guide**.

## Publishing to GitHub Pages

1. Create a new GitHub repo and add these files.
2. In GitHub Settings, enable **Pages** and select the branch root.
3. Your site will be available at your GitHub Pages URL.

## Sharing a guide

### Option 1: JSON + viewer

1. Build a guide in `editor.html`.
2. Click **Export JSON** and save it into `guides/` in your repo.
3. Share a link like:

```
https://<your-username>.github.io/<repo>/viewer.html?src=guides/your-guide.json
```

### Option 2: Exported HTML

1. Build a guide in `editor.html`.
2. Click **Export HTML** and upload the HTML file to your repo.
3. Share that HTML file directly.

## Embedding in WordPress or Google Sites

Use an iframe and point to the viewer URL:

```
<iframe
  src="https://<your-username>.github.io/<repo>/viewer.html?src=guides/your-guide.json"
  width="100%"
  height="1200"
  style="border:0"
></iframe>
```

## Notes

- Images are stored as data URLs in the JSON. This keeps guides self-contained but can grow file size.
- The viewer includes a **Print / Save PDF** button to export to PDF.
- Video URLs support YouTube and Vimeo embeds by default. Other URLs are used directly.
