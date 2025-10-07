import { CANVAS_CONFIG } from '../model/config'
import { HandlePosition } from '../types'
import type { PixelRect } from '../types'

interface DrawMagnifierParams {
  ctx: CanvasRenderingContext2D
  image: HTMLImageElement | null
  rect: PixelRect
  handle: HandlePosition
  canvasWidth: number
  canvasHeight: number
  lineWidth: number
  magnifierSize: number
}

export const drawMagnifier = ({
  ctx,
  image,
  rect,
  handle,
  canvasWidth,
  canvasHeight,
  lineWidth,
  magnifierSize,
}: DrawMagnifierParams): void => {
  if (!image) return
  if (![HandlePosition.Top, HandlePosition.Bottom, HandlePosition.Left, HandlePosition.Right].includes(handle)) return

  const radius = magnifierSize / 2
  const zoom = CANVAS_CONFIG.magnifierZoom
  const offset = radius + 12

  let centerX = rect.x + rect.width / 2
  let centerY = rect.y + rect.height / 2

  switch (handle) {
    case HandlePosition.Top:
      centerY = rect.y - offset
      break
    case HandlePosition.Bottom:
      centerY = rect.y + rect.height + offset
      break
    case HandlePosition.Left:
      centerX = rect.x - offset
      break
    case HandlePosition.Right:
      centerX = rect.x + rect.width + offset
      break
    default:
      break
  }

  const sourceWidth = radius / zoom
  const sourceHeight = radius / zoom
  const sourceX = rect.x + rect.width / 2 - sourceWidth / 2
  const sourceY = rect.y + rect.height / 2 - sourceHeight / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    centerX - radius,
    centerY - radius,
    radius * 2,
    radius * 2,
  )

  ctx.restore()

  ctx.save()
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = CANVAS_CONFIG.baseStrokeColor
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}
