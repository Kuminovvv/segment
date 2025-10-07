import { CANVAS_CONFIG } from '../model/config'
import { HandlePosition } from '../types'
import type { PixelRect } from '../types'

interface DrawHandlesParams {
  ctx: CanvasRenderingContext2D
  rect: PixelRect
  handleSize: number
  selected: boolean
  hoveredHandle: HandlePosition
  draggingHandle: HandlePosition
}

export const drawHandles = ({
  ctx,
  rect,
  handleSize,
  selected,
  hoveredHandle,
  draggingHandle,
}: DrawHandlesParams): void => {
  if (!selected) return

  const radius = handleSize / 2
  const handles = [
    { x: rect.x + rect.width / 2, y: rect.y, pos: HandlePosition.Top },
    { x: rect.x + rect.width / 2, y: rect.y + rect.height, pos: HandlePosition.Bottom },
    { x: rect.x, y: rect.y + rect.height / 2, pos: HandlePosition.Left },
    { x: rect.x + rect.width, y: rect.y + rect.height / 2, pos: HandlePosition.Right },
  ]

  handles.forEach(handle => {
    ctx.save()
    ctx.strokeStyle = CANVAS_CONFIG.baseStrokeColor
    ctx.lineWidth = 1
    const isHovered = hoveredHandle === handle.pos
    const isDragging = draggingHandle === handle.pos
    ctx.fillStyle = isDragging ? 'red' : isHovered ? CANVAS_CONFIG.hoverHandleColor : CANVAS_CONFIG.handleColor
    ctx.beginPath()
    ctx.arc(handle.x, handle.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  })
}
