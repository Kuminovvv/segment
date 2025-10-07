import { CANVAS_CONFIG, DRAW_CONFIG } from '../model/config'
import type { PixelRect } from '../types'

export interface DrawRectanglesParams {
  ctx: CanvasRenderingContext2D
  image: HTMLImageElement | null
  rects: PixelRect[]
  selectedIndex: number | null
  hoveredIndex: number | null
  tempRect: PixelRect | null
  lineWidth: number
  selectedLineWidth: number
  fontSize: number
  handleSize: number
  hoveredHandle?: string | null
  dragHandle?: string | null
}

export const drawRectangles = ({
  ctx,
  image,
  rects,
  selectedIndex,
  hoveredIndex,
  tempRect,
  lineWidth,
  selectedLineWidth,
  fontSize,
}: DrawRectanglesParams): void => {
  ctx.font = `${fontSize}px ${DRAW_CONFIG.fontFamily}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  rects.forEach((rect, index) => {
    const { x, y, width, height } = rect
    if (width <= 0 || height <= 0) return

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, width, height)
    ctx.clip()
    if (image) {
      ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height)
    }
    ctx.restore()

    ctx.save()
    ctx.lineWidth = index === selectedIndex ? selectedLineWidth : lineWidth
    ctx.strokeStyle =
      index === selectedIndex
        ? CANVAS_CONFIG.selectedStrokeColor
        : index === hoveredIndex
        ? CANVAS_CONFIG.hoverStrokeColor
        : CANVAS_CONFIG.baseStrokeColor
    ctx.strokeRect(x, y, width, height)
    if (index === selectedIndex) {
      ctx.fillStyle = 'rgba(0, 123, 255, 0.12)'
      ctx.fillRect(x, y, width, height)
    }
    ctx.restore()

    ctx.save()
    ctx.fillStyle = index === selectedIndex ? CANVAS_CONFIG.selectedStrokeColor : CANVAS_CONFIG.baseStrokeColor
    ctx.fillText(String(index + 1), x + fontSize * 0.6, y + fontSize * 0.4)
    ctx.restore()
  })

  if (tempRect) {
    ctx.save()
    ctx.setLineDash([8, 4])
    ctx.strokeStyle = CANVAS_CONFIG.hoverStrokeColor
    ctx.lineWidth = lineWidth
    ctx.strokeRect(tempRect.x, tempRect.y, tempRect.width, tempRect.height)
    ctx.restore()
  }
}
