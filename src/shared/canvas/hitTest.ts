import { HandlePosition, type PixelRect } from 'features/image-highlighter/types'
import type { CanvasPoint } from './coordinates'

export const hitTestHandle = (point: CanvasPoint, rect: PixelRect, handleRadius: number): HandlePosition => {
  const radius = handleRadius / 2
  const handles = [
    { x: rect.x + rect.width / 2, y: rect.y, pos: HandlePosition.Top },
    { x: rect.x + rect.width / 2, y: rect.y + rect.height, pos: HandlePosition.Bottom },
    { x: rect.x, y: rect.y + rect.height / 2, pos: HandlePosition.Left },
    { x: rect.x + rect.width, y: rect.y + rect.height / 2, pos: HandlePosition.Right },
  ]

  for (const handle of handles) {
    const dx = point.x - handle.x
    const dy = point.y - handle.y
    if (Math.sqrt(dx * dx + dy * dy) <= radius) {
      return handle.pos
    }
  }

  if (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  ) {
    return HandlePosition.Inside
  }

  return HandlePosition.None
}

export const hitTestRect = (point: CanvasPoint, rect: PixelRect): boolean => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}
