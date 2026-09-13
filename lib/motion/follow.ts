/**
 * Frame-rate independent smoothing towards a moving target, such as the scroll
 * position. A mouse-wheel notch glides over roughly `halfLife`; long jumps catch
 * up faster, so the page never trails far behind the scrollbar. The same number
 * of seconds gives the same motion at 60 Hz and at 120 Hz.
 */
export interface FollowOptions {
  /** Seconds to halve the remaining distance on small moves. */
  halfLife: number;
  /** Seconds to halve the remaining distance once the gap reaches `far`. */
  fastHalfLife: number;
  /** Gap, in the unit of the values, at which `fastHalfLife` applies. */
  far: number;
  /** Gap below which the value lands exactly on the target. */
  epsilon: number;
}

export function follow(current: number, target: number, dt: number, options: FollowOptions) {
  const gap = target - current;
  const distance = Math.abs(gap);
  if (distance <= options.epsilon) return target;
  if (dt <= 0) return current;
  const reach = Math.min(1, distance / options.far);
  const halfLife = options.halfLife + (options.fastHalfLife - options.halfLife) * reach;
  const next = current + gap * (1 - Math.pow(0.5, dt / halfLife));
  return Math.abs(target - next) <= options.epsilon ? target : next;
}
