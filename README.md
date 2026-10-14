# PhotoFrame

A tiny web page where anyone with the link can upload a photo, see your frame
overlaid on it, adjust the position and zoom, and download the framed photo.

- Works on phones and desktops (drag to move, pinch / scroll / slider to zoom)
- On phones, "Download" opens the share sheet, so people can save straight to Photos
- **Photos never leave the visitor's device.** All processing happens in the
  browser, so there's no server, no storage, and no hosting cost.

## Use your own frame

1. Design your frame as a **PNG with a transparent area** where the photo
   should show through (e.g. in Canva, Figma, or Photoshop). Any size or
   aspect ratio is fine.
2. Replace `public/assets/frame.png` with it (keep the same file name, or
   change `FRAME_SRC` at the top of `public/app.js`).

The downloaded image will be the same size as your frame PNG. You can also
change the page title and text in `public/index.html`, and the button color
via `--accent` in `public/style.css`.

## Host it on Cloudflare Workers (free, `*.workers.dev` link)

The repo includes `wrangler.jsonc`, which serves the `public/` folder.

1. In the Cloudflare dashboard, open **Workers & Pages → Create → Import a
   repository**, connect GitHub, and pick this repo.
2. Keep the defaults (deploy command `npx wrangler deploy`) and click
   **Deploy**.
3. Your link appears when it finishes, e.g.
   `https://photoframe.<your-subdomain>.workers.dev`. Every push to `main`
   redeploys automatically.

Or deploy from your own computer: `npx wrangler login`, then
`npx wrangler deploy`.

## Host it on GitHub Pages

Some mobile networks block `*.workers.dev`, so the repo also deploys to
GitHub Pages on every push to `main` (`.github/workflows/pages.yml`).

One-time setup: in the repo's **Settings → Pages**, set **Source** to
**GitHub Actions**. Then re-run the "Deploy to GitHub Pages" workflow from
the **Actions** tab (or push any change). The link is
`https://<your-username>.github.io/<repo-name>/`.

## Run locally

```sh
python3 -m http.server 8000 --directory public
```

Then open <http://localhost:8000>. (Opening `index.html` directly from disk
won't work in some browsers because of image security rules.)
