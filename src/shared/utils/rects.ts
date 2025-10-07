import type { Rect } from 'features/image-highlighter/types'

export const cloneRect = (rect: Rect): Rect => [...rect] as Rect

export const cloneRects = (rects: Rect[]): Rect[] => rects.map(cloneRect)

export const areRectsEqual = (next: Rect[] | undefined, prev: Rect[] | undefined): boolean => {
  if (!next && !prev) return true
  if (!next || !prev) return false
  if (next.length !== prev.length) return false
  return next.every((rect, index) => rect.every((value, coord) => value === prev[index]?.[coord]))
}

export const ensureRectOrder = (rect: Rect): Rect => {
  const [x1, y1, x2, y2] = rect
  const left = Math.min(x1, x2)
  const right = Math.max(x1, x2)
  const top = Math.min(y1, y2)
  const bottom = Math.max(y1, y2)
  return [left, top, right, bottom]
}

export const clampRect = (rect: Rect, minWidth: number, minHeight: number): Rect => {
  const [left, top, right, bottom] = ensureRectOrder(rect)
  const width = Math.max(right - left, minWidth)
  const height = Math.max(bottom - top, minHeight)
  const adjustedRight = left + width
  const adjustedBottom = top + height

  return [
    Math.max(0, Math.min(1, left)),
    Math.max(0, Math.min(1, top)),
    Math.max(0, Math.min(1, adjustedRight)),
    Math.max(0, Math.min(1, adjustedBottom)),
  ]
}
