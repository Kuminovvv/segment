import { CANVAS_CONFIG } from '../model/config'

export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  canvasWidth: number,
  canvasHeight: number,
): void => {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  if (image) {
    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = CANVAS_CONFIG.shadowColor
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    return
  }

  ctx.fillStyle = CANVAS_CONFIG.backgroundColor
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
}
