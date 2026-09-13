# Taxi Flow — landing page

Landing page for Taxi Flow, management apps made to measure for taxi professionals.
The hero is a 10-second render of a Mercedes-Benz E250 Portuguese taxi crossing
Lisbon from dawn to night; scrolling is the playhead. After it, the real app screens
open one by one as they rise into view.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm test         # unit tests (Node's built-in runner, no extra deps)
npm run lint
```

| Variable               | Default                           | Used for                        |
| ---------------------- | --------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_APP_URL`  | `https://taxi-rust-psi.vercel.app` | "Entrar" buttons                |
| `NEXT_PUBLIC_SITE_URL` | Vercel production domain, else `http://localhost:3000` | Absolute URLs in social previews |
| `CONTACT_WEBHOOK_URL`  | none (see below)                  | Where quote requests are sent   |

## Quote requests

The "Pede um orçamento" form (`components/sections/Contact.tsx`) submits to a Server
Action (`lib/contact/actions.ts`). Fields are validated on the server
(`lib/contact/validation.ts`); errors appear next to each field and the typed values are
kept. A hidden honeypot field drops most bots.

Valid requests are posted as JSON to `CONTACT_WEBHOOK_URL`:

```json
{ "name": "…", "email": "…", "phone": "…", "type": "motorista | empresa", "message": "…",
  "receivedAt": "2026-09-13T12:00:00.000Z", "source": "taxiflow-landing" }
```

Without the variable, development logs the request to the server console and shows the
success message; production shows an error and logs that the form is not connected.

One way to receive them, with a Google Sheet and an email: in the Sheet, open
Extensions → Apps Script, paste the script below, replace the email address, then
Deploy → New deployment → Web app (execute as you, access: anyone) and use its URL as
`CONTACT_WEBHOOK_URL`.

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  SpreadsheetApp.getActive().getSheets()[0].appendRow([
    data.receivedAt, data.name, data.email, data.phone, data.type, data.message,
  ]);
  MailApp.sendEmail("o-teu-email@exemplo.pt", "Novo pedido de orçamento", `${data.name} <${data.email}>\n${data.phone}\n\n${data.message}`);
  return ContentService.createTextOutput("ok");
}
```

## Deploy

Hosted on Vercel from [squadd4/taxiflow](https://github.com/squadd4/taxiflow): every push to
`main` deploys to production. Set `CONTACT_WEBHOOK_URL` in the Vercel project settings so
quote requests are delivered.

## How the hero works

```
scroll ─▶ ScrollTrigger (scrub 0.5) ─▶ progress ─▶ render()
                                                  ├─ video frame      (VideoScrubber / FrameSequence)
                                                  ├─ camera + aperture (headlamp slit → scope → full frame)
                                                  ├─ H1 / H2, HUD clock, night glow, brand mark
                                                  └─ closing CTA over the held final frame
```

- **One timeline.** `lib/hero/engine.ts` turns scroll into a single progress value and
  derives every layer from it in one pass. High-frequency work is direct DOM writes
  (only changed values are written); React never re-renders while scrolling.
- **Storyboard.** All timings live in `lib/hero/story.ts` as ranges of video progress
  (`v`) or closing progress (`c`). Track lengths live in `components/Hero.module.css`
  (`640vh` + `130vh` desktop, `460vh` + `110vh` mobile).
- **Video scrubbing.** `lib/scroll-video/VideoScrubber.ts` downloads the MP4 once into a
  Blob (no range requests while seeking), keeps the element paused, coalesces seeks so
  fast scrolling never queues, starts exactly at `t = 0` and lands on frame 239 at 100%.
- **Fallback.** If seeks stay slower than 120 ms (median of 10) or the video errors, the
  page switches to `FrameSequence`: 240 WebP frames on a canvas, loaded coarse-to-fine,
  always showing the nearest loaded frame so it never blanks.
- **Portrait framing.** `lib/hero/camera.ts` keeps the car's important region in view:
  landscape screens get a cover crop that follows the car; portrait screens get a
  letterboxed band that tightens to full bleed as the car drives away.
- **Reduced motion / no JS.** An inline script in `app/layout.tsx` sets
  `data-motion` before first paint. With `prefers-reduced-motion: reduce` the page uses
  a static layout: poster, headlines and CTA in normal flow, no video download.

## App screens

`components/sections/AppReveal.tsx` lays the captures out in justified rows (widths
follow each capture's ratio, so nothing is cropped). As each screen rises into view it
opens upwards from its bottom edge while the capture settles from a slight zoom, and its
caption follows. Screens in the same row open left to right. The reveal follows the scroll
position, so scrolling back closes the screens again (`lib/reveal/`).

Start, end, stagger and zoom live in `REVEAL` in `lib/reveal/reveal.ts`. With reduced
motion nothing is animated and every screen is visible.

The captures come from `Nova pasta/` (not committed) and are exported with:

```bash
python scripts/prepare_screens.py
```

It writes WebP files to `public/images/app` and paints over personal data listed in
`MASKS` (currently the driver's name on the reports screen).

## Video assets

`scripts/prepare_video.py` rebuilds everything in `public/video` and
`app/opengraph-image.jpg` from the source render (`video.mp4`, not committed):

```bash
python scripts/prepare_video.py --ffmpeg /path/to/ffmpeg
```

Requires Python 3.10+, numpy, Pillow and an ffmpeg with libx264 and libwebp. The
script also blanks the registration characters on the rear plate in the closing
shots (frames 197–239), keeping only the blue "P" strip.

| Asset                               | Size    | Notes                                       |
| ----------------------------------- | ------- | ------------------------------------------- |
| `taxi-flow-cinematic.mp4`           | 6.7 MB  | 1080p H.264, CRF 25, GOP 8, no B-frames     |
| `taxi-flow-cinematic-720.mp4`       | 4.0 MB  | Screens ≤ 767 px wide, Save-Data, 2G        |
| `frames/000–239.webp`               | 10.7 MB | Fallback only, never loaded otherwise       |
| posters, OG image                   | < 1 MB  |                                             |

## QA switches

| URL             | Effect                                                   |
| --------------- | -------------------------------------------------------- |
| `?motion=off`   | Force the static, reduced-motion layout                  |
| `?scrub=frames` | Force the image-sequence fallback                        |
| `?debug`        | Expose `window.__taxiflowHero` in production (always on in dev) |

## Test coverage

Verified in Chromium (desktop and 375×812 mobile emulation): scroll-to-frame sync at
several points, first/last frame, fast forward/backward sweeps, frame fallback,
reduced-motion layout, mobile menu focus handling, keyboard focus into the CTA, and
production build. Seek latency measured at ~8 ms median (1080p).

Not yet verified on real Safari/iOS or Firefox.
