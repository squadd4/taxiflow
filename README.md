# Taxi Flow — landing page

Landing page for Taxi Flow, management apps made to measure for taxi drivers and taxi
companies in Portugal. The hero is a 10-second render of a Mercedes-Benz E250 Portuguese
taxi crossing Lisbon from dawn to night; scrolling is the playhead. When the page opens the
headlamps flash twice. After the hero, the real app screens open one by one
as they rise into view, and each one opens full screen with zoom.

Site copy is European Portuguese in the taxi trade's own words (praça, turnos, fecho de
contas, viaturas). Keep new copy that way.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm test         # unit tests (Node's built-in runner, no extra deps)
npm run lint
```

| Variable                 | Default                                                | Used for                                              |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------------- |
| `CONTACT_WEBHOOK_URL`    | none                                                   | Google Apps Script web app that stores quote requests |
| `CONTACT_WEBHOOK_SECRET` | none                                                   | Shared secret the script checks                       |
| `CONTACT_EMAIL`          | none                                                   | Address offered to the visitor if sending fails       |
| `NEXT_PUBLIC_APP_URL`    | `https://taxi-rust-psi.vercel.app`                     | "Entrar" buttons                                      |
| `NEXT_PUBLIC_SITE_URL`   | Vercel production domain, else `http://localhost:3000` | Absolute URLs in social previews                      |

For development, copy `.env.local.example` to `.env.local`.

## Quote requests

The "Pede um orçamento" form (`components/sections/Contact.tsx`) submits to a Server
Action (`lib/contact/actions.ts`). Fields are validated on the server
(`lib/contact/validation.ts`); errors appear next to each field and the typed values are
kept. A hidden honeypot field drops most bots.

Requests are stored in a Google Sheet in the owner's Drive by the Apps Script in
`integrations/google-sheets/Codigo.gs` (date and time, name, email, phone, driver or company,
message, reference), with an optional email notification. Step-by-step setup, in
Portuguese: [docs/orcamentos-google-sheets.md](docs/orcamentos-google-sheets.md).

Delivery (`lib/contact/delivery.ts`):

- Posts JSON with every field, a request reference (UUID), the time and the secret.
- A Google script only counts as delivered when it answers `{"ok":true}`, because Google
  answers 200 with an HTML page when access or the URL is wrong. Other webhooks need a 2xx.
- Timeouts (9 s), 5xx/429 answers and script errors are retried once. The script writes each
  reference once, so a retry, or the visitor sending the same form again, never duplicates a row.
- If it still fails, the visitor reads why in plain Portuguese with their data kept in the
  form, and the whole request is logged as `[orçamento] NOT DELIVERED` so it can be recovered
  from the Vercel logs.

Without `CONTACT_WEBHOOK_URL`, development logs the request to the server console and shows
the success message; production shows an error.

## Deploy

Hosted on Vercel from [squadd4/taxiflow](https://github.com/squadd4/taxiflow): every push to
`main` deploys to production. Set `CONTACT_WEBHOOK_URL` and `CONTACT_WEBHOOK_SECRET` in the
Vercel project settings and redeploy so quote requests are delivered.

## How the hero works

```
scroll ─▶ ScrollTrigger ─▶ target ─▶ follow() ─▶ progress ─▶ render()
                                                              ├─ video frame       (VideoScrubber / FrameSequence)
                                                              ├─ camera + aperture (headlamp slit → scope → full frame)
                                                              ├─ headlamps, H1 / H2, HUD, night glow, brand mark
                                                              └─ closing CTA over the held final frame
```

- **One timeline.** `lib/hero/engine.ts` derives every layer from a single progress value
  in one pass. Rendering writes only `transform`, `opacity` and `clip-path`, only when a
  value changes, and never reads layout; React never re-renders while scrolling.
- **Smooth at any refresh rate.** ScrollTrigger only reports where the page is.
  `lib/motion/follow.ts` moves the rendered progress towards it with exponential smoothing
  measured in seconds (half-life 85 ms, 40 ms for long jumps), so a mouse-wheel notch glides
  instead of jumping, and 60 Hz and 120 Hz screens move the same. The loop runs on GSAP's
  ticker only while it is catching up.
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
- **Headlamps.** About 1.3 s into the opening the headlamps flash twice
  (`lib/hero/flash.ts`, played with `Element.animate()`), then keep a faint running-light
  pulse until the car moves. The positions are fractions of the first video frame, in
  `components/ScrollVideo.module.css`.
- **Reduced motion / no JS.** An inline script in `app/layout.tsx` sets `data-motion`
  before first paint. With `prefers-reduced-motion: reduce` the page uses a static layout:
  poster, headlines and CTA in normal flow, no video download and no headlamp flash.

## App screens

Captions live in `lib/screens.ts`. `components/sections/AppReveal.tsx` shows the screens
large: a wide screen with its caption beside it, then a pair, alternating (one column on
phones).

- **Reveal.** As a screen rises into view a curtain uncovers it from the bottom while the
  capture settles from a slight zoom, and its caption follows. Only transforms change, so
  the browser composites rather than repaints; layout is measured on resize only; the
  scroll position is smoothed with the same `follow()` as the hero. Timings: `REVEAL` in
  `lib/reveal/reveal.ts`.
- **Viewer.** Every screen opens in a full-screen native `<dialog>`
  (`components/sections/ScreenViewer.tsx`). Escape or a click on the empty space closes it
  and focus returns to the screen that opened it. Arrow keys, the side buttons or a swipe
  move between screens. A click zooms into the high-resolution capture around the clicked
  point; drag or scroll to look around.

The captures come from `Nova pasta/` (not committed) and are exported with:

```bash
python scripts/prepare_screens.py --src "../Nova pasta"
```

For each screen it writes three WebP sizes to `public/images/app` (720 px; the capture's
own size; and a ×2 Lanczos-enlarged, sharpened copy for the viewer) and lists them in
`lib/screens.manifest.json`. Missing captures are skipped, so adding `taxibot.png` and
running the script again shows the "Bot de apoio" screen. Personal data can be painted over
with `MASKS`.

The current captures are about 940 px wide. The ×2 copy keeps text crisp on high-density
screens but cannot add detail that is not in the capture; captures taken at 1920 px wide or
more would give a truly sharp zoom.

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

| URL             | Effect                                                          |
| --------------- | --------------------------------------------------------------- |
| `?motion=off`   | Force the static, reduced-motion layout                         |
| `?scrub=frames` | Force the image-sequence fallback                               |
| `?debug`        | Expose `window.__taxiflowHero` in production (always on in dev) |

## Test coverage

`npm test` covers the storyboard, video scrubbing, the frame fallback, scroll smoothing at
60 and 120 Hz, the headlamp flash timing, the screen reveal and viewer maths, form
validation, and webhook delivery (retries, timeouts, duplicates, Google HTML answers).

Checked in headless Edge against the production build (1440×900 and 390×844): the
headlamps flash in the opening; scroll smoothing converges on the scroll position; all nine screens
load and are fully open once passed; the viewer opens the ×2 capture, zooms around the
clicked point, moves with the arrow keys, closes with Escape or a click outside, returns
focus and unlocks page scrolling; the form keeps the data and the request reference when
delivery fails; `?motion=off` shows the static layout without the headlamp flash.

Not yet verified on real Safari/iOS or Firefox.
