/**
 * The hero storyboard. Every value is expressed against the same scroll
 * timeline so video, typography and interface stay in lock-step.
 *
 *   v — video progress (0 = first frame, 1 = last frame)
 *   c — closing progress, the held final frame that resolves into the CTA
 */

type Range = readonly [number, number];

export const STORY = {
  /** H1 is on screen from load and leaves as the car starts to move. */
  h1Exit: [0.1, 0.16] as Range,
  /** H2 takes over, then clears the frame for the car. */
  h2Enter: [0.15, 0.21] as Range,
  h2Exit: [0.27, 0.33] as Range,
  /** Headlamp slit → scope band → full frame. */
  apertureScope: [0.1, 0.22] as Range,
  apertureFull: [0.27, 0.42] as Range,
  /** Darkening over the frame while text is being read. */
  dimLift: [0.18, 0.42] as Range,
  /** Scroll hint only belongs to the very first moment. */
  hintExit: [0.0, 0.035] as Range,
  /** Night: the roof-green light and the Taxi Flow mark surface. */
  glow: [0.66, 0.86] as Range,
  brandEnter: [0.84, 0.97] as Range,

  /** Closing sequence (c). */
  scrim: [0.0, 0.5] as Range,
  brandSettle: [0.05, 0.5] as Range,
  ctaContent: [0.22, 0.72] as Range,
} as const;

/** Clock shown in the HUD: minutes after midnight across the video (dawn → night). */
export const SHIFT_CLOCK: readonly (readonly [number, number])[] = [
  [0, 7 * 60 + 12],
  [0.3, 12 * 60 + 40],
  [0.55, 18 * 60 + 52],
  [0.72, 20 * 60 + 6],
  [0.86, 20 * 60 + 48],
  [1, 21 * 60 + 36],
];

export interface FocusBox {
  frame: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * The part of the Mercedes that must never be cropped, as fractions of the
 * 16:9 frame, keyed by frame number. Side views keep cabin, roof and wheels
 * and allow bumpers to fall outside a narrow portrait crop.
 */
export const FOCUS: readonly FocusBox[] = [
  { frame: 0, x0: 0.22, x1: 0.76, y0: 0.22, y1: 0.92 },
  { frame: 44, x0: 0.27, x1: 0.71, y0: 0.24, y1: 0.86 },
  { frame: 87, x0: 0.31, x1: 0.74, y0: 0.28, y1: 0.83 },
  { frame: 131, x0: 0.26, x1: 0.8, y0: 0.3, y1: 0.87 },
  { frame: 152, x0: 0.2, x1: 0.76, y0: 0.3, y1: 0.86 },
  { frame: 174, x0: 0.1, x1: 0.72, y0: 0.31, y1: 0.85 },
  { frame: 196, x0: 0.12, x1: 0.74, y0: 0.32, y1: 0.85 },
  { frame: 218, x0: 0.18, x1: 0.7, y0: 0.34, y1: 0.82 },
  { frame: 239, x0: 0.22, x1: 0.56, y0: 0.36, y1: 0.78 },
];

/** Where the headlamps sit in the opening frame (fraction of frame height). */
export const HEADLAMP_LINE = 0.6;
