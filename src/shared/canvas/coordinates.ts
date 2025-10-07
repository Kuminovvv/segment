import type { PixelRect } from 'features/image-highlighter/types'

export interface CanvasPoint {
  x: number
  y: number
}

export const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): CanvasPoint => {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  }
}

export const rectToPixel = (normalized: [number, number, number, number], canvasWidth: number, canvasHeight: number): PixelRect => {
  const [left, top, right, bottom] = normalized
  return {
    x: left * canvasWidth,
    y: top * canvasHeight,
    width: (right - left) * canvasWidth,
    height: (bottom - top) * canvasHeight,
  }
}

export const rectToNormalized = (
  pixelRect: PixelRect,
  canvasWidth: number,
  canvasHeight: number,
): [number, number, number, number] => {
  const { x, y, width, height } = pixelRect
  const right = (x + width) / canvasWidth
  const bottom = (y + height) / canvasHeight

  return [
    Number((x / canvasWidth).toFixed(6)),
    Number((y / canvasHeight).toFixed(6)),
    Number(right.toFixed(6)),
    Number(bottom.toFixed(6)),
  ]
}
