import { Rect } from 'api/types'

const DEFAULT_RECT: Rect = [0.1, 0.1, 0.2, 0.2]
const SHIFT_STEP = 0.08

export const createNextRect = (rects: Rect[]): Rect => {
        if (rects.length === 0) {
                return [...DEFAULT_RECT]
        }
        const last = rects[rects.length - 1]
        const [, , , lastBottom] = last
        const top = Math.min(lastBottom + SHIFT_STEP, 0.85)
        const bottom = Math.min(top + (DEFAULT_RECT[3] - DEFAULT_RECT[1]), 0.98)
        return [last[0], top, last[2], bottom]
}
