# PhotoFrame

A tiny web page where anyone with the link can upload a photo, see your frame
overlaid on it, adjust the position and zoom, and download the framed photo.

- Works on phones and desktops (drag to move, pinch / scroll / slider to zoom)
- On phones, "Download" opens the share sheet, so people can save straight to Photos
- **Photos never leave the visitor's device.** All processing happens in the
  browser, so there's no server, no storage, and no hosting cost.

## Use your own frame

1. Design your frame as a **PNG with a transparent area** where the photo
   should show through (e.g. in Canva, Figma, or Photoshop). 1080×1080 works
   well for Instagram; any size or aspect ratio is fine.
2. Replace `assets/frame.png` with it (keep the same file name, or change
   `FRAME_SRC` at the top of `app.js`).

The downloaded image will be the same size as your frame PNG. You can also
change the page title and text in `index.html`, and the button color via
`--accent` in `style.css`.

## Host it for free with GitHub Pages

1. Push this repo to GitHub.
2. Open the repo's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select
   `main` and `/ (root)`, then **Save**.
4. After a minute your link appears at the top of that page, e.g.
   `https://<your-username>.github.io/photoframe/`. Share it with anyone.

Any static host also works (Netlify, Vercel, Cloudflare Pages) — just upload
the folder. No build step needed.

## Run locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Opening `index.html` directly from disk
won't work in some browsers because of image security rules.)
