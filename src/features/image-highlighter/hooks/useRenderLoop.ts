import { useEffect, useMemo } from 'react'
import { rectToPixel } from 'shared/canvas/coordinates'
import type { HandlePosition, Rect } from '../types'
import { drawBackground } from '../drawing/background'
import { drawRectangles } from '../drawing/rectangles'
import { drawHandles } from '../drawing/handles'
import { drawMagnifier } from '../drawing/magnifier'
import { createScaleHelpers } from 'shared/canvas/scale'

interface UseRenderLoopParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  rects: Rect[]
  selectedRect: number | null
  hoveredRect: number | null
  hoveredHandle: HandlePosition
  draggingHandle: HandlePosition
  tempRect: { x: number; y: number; width: number; height: number } | null
  mousePos: { x: number; y: number } | null
  imgRef: React.MutableRefObject<HTMLImageElement | null>
  offscreenRef: React.MutableRefObject<HTMLCanvasElement | null>
  canvasSize: { width: number; height: number }
  rotationAngle: number
}

export const useRenderLoop = ({
  canvasRef,
  rects,
  selectedRect,
  hoveredRect,
  hoveredHandle,
  draggingHandle,
  tempRect,
  mousePos,
  imgRef,
  offscreenRef,
  canvasSize,
  rotationAngle,
}: UseRenderLoopParams): void => {
  const scale = useMemo(() => createScaleHelpers(imgRef.current?.width ?? canvasSize.width), [imgRef, canvasSize.width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0

    const render = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotationAngle * Math.PI) / 180)
      ctx.translate(-canvas.width / 2, -canvas.height / 2)

      if (offscreenRef.current) {
        ctx.drawImage(offscreenRef.current, 0, 0, canvas.width, canvas.height)
      } else {
        drawBackground(ctx, imgRef.current, canvas.width, canvas.height)
      }

      const pixelRects = rects.map(rect => rectToPixel(rect, canvas.width, canvas.height))

      drawRectangles({
        ctx,
        image: imgRef.current,
        rects: pixelRects,
        selectedIndex: selectedRect,
        hoveredIndex: hoveredRect,
        tempRect,
        lineWidth: scale.getLineWidth(),
        selectedLineWidth: scale.getSelectedLineWidth(),
        fontSize: scale.getFontSize(),
        handleSize: scale.getHandleSize(),
      })

      if (selectedRect !== null) {
        const rect = pixelRects[selectedRect]
        if (rect) {
          drawHandles({
            ctx,
            rect,
            handleSize: scale.getHandleSize(),
            selected: true,
            hoveredHandle,
            draggingHandle,
          })

          if (mousePos && draggingHandle !== HandlePosition.None && draggingHandle !== HandlePosition.Inside) {
            drawMagnifier({
              ctx,
              image: imgRef.current,
              rect,
              handle: draggingHandle,
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              lineWidth: scale.getLineWidth(),
              magnifierSize: scale.getMagnifierSize(),
            })
          }
        }
      }

      ctx.restore()
      frame = window.requestAnimationFrame(render)
    }

    frame = window.requestAnimationFrame(render)

    return () => window.cancelAnimationFrame(frame)
  }, [canvasRef, rects, selectedRect, hoveredRect, hoveredHandle, draggingHandle, tempRect, mousePos, imgRef, offscreenRef, canvasSize.width, canvasSize.height, rotationAngle, scale])
}
