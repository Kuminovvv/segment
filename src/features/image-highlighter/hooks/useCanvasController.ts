import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Rect } from '../types'
import { HandlePosition } from '../types'
import { createScaleHelpers } from 'shared/canvas/scale'
import { getCanvasPoint, rectToNormalized, rectToPixel } from 'shared/canvas/coordinates'
import { hitTestHandle, hitTestRect } from 'shared/canvas/hitTest'
import { clampToCanvas, updateRectAt } from '../model/rectangles'
import type { RectStore } from '../model/rectangles'
import { CANVAS_CONFIG } from '../model/config'
import type { PixelRect } from '../types'

interface UseCanvasControllerParams extends RectStore {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  canvasSize: { width: number; height: number }
  imgRef: React.MutableRefObject<HTMLImageElement | null>
  onSelectRect?: (index: number | null) => void
  onHoverRect?: (index: number | null) => void
  onDrawRect?: (rect: Rect) => void
  onInteractionEnd?: () => void
}

type InteractionState =
  | { mode: 'idle' }
  | { mode: 'draw'; start: { x: number; y: number } }
  | { mode: 'resize'; index: number; handle: HandlePosition; start: { x: number; y: number }; initial: PixelRect }
  | { mode: 'move'; index: number; start: { x: number; y: number }; initial: PixelRect }

interface CanvasController {
  handleMouseDown: (event: React.MouseEvent<HTMLCanvasElement>) => void
  handleMouseMove: (event: React.MouseEvent<HTMLCanvasElement>) => void
  handleMouseUp: () => void
  handleMouseLeave: () => void
  handleBlur: () => void
  selectedRect: number | null
  setSelectedRect: React.Dispatch<React.SetStateAction<number | null>>
  hoveredRect: number | null
  setHoveredRect: React.Dispatch<React.SetStateAction<number | null>>
  hoveredHandle: HandlePosition
  draggingHandle: HandlePosition
  tempRect: PixelRect | null
  mousePos: { x: number; y: number } | null
}

export const useCanvasController = ({
  canvasRef,
  canvasSize,
  imgRef,
  rects,
  setRects,
  onSelectRect,
  onHoverRect,
  onDrawRect,
  onInteractionEnd,
}: UseCanvasControllerParams): CanvasController => {
  const [selectedRect, setSelectedRect] = useState<number | null>(null)
  const [hoveredRect, setHoveredRect] = useState<number | null>(null)
  const [hoveredHandle, setHoveredHandle] = useState<HandlePosition>(HandlePosition.None)
  const [draggingHandle, setDraggingHandle] = useState<HandlePosition>(HandlePosition.None)
  const [tempRect, setTempRect] = useState<PixelRect | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const draftRect = useRef<Rect | null>(null)
  const interaction = useRef<InteractionState>({ mode: 'idle' })

  const scale = useMemo(() => createScaleHelpers(imgRef.current?.width ?? canvasSize.width), [imgRef, canvasSize.width])

  useEffect(() => {
    onSelectRect?.(selectedRect)
  }, [selectedRect, onSelectRect])

  useEffect(() => {
    onHoverRect?.(hoveredRect)
  }, [hoveredRect, onHoverRect])

  const pixelRects = useMemo(() => rects.map(rect => rectToPixel(rect, canvasSize.width, canvasSize.height)), [rects, canvasSize])

  const resetInteraction = useCallback(() => {
    interaction.current = { mode: 'idle' }
    setDraggingHandle(HandlePosition.None)
    setTempRect(null)
    draftRect.current = null
  }, [])

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const point = getCanvasPoint(event, canvas)
      setMousePos(point)

      const handleSize = scale.getHandleSize()

      const indices = selectedRect !== null
        ? [selectedRect, ...pixelRects.map((_, index) => index).filter(index => index !== selectedRect).reverse()]
        : pixelRects.map((_, index) => index).reverse()

      for (const index of indices) {
        const rect = pixelRects[index]
        if (!rect) continue
        const handle = hitTestHandle(point, rect, handleSize)
        if (handle === HandlePosition.None) continue

        setSelectedRect(index)
        setHoveredRect(index)
        setHoveredHandle(handle)
        setDraggingHandle(handle)

        if (handle === HandlePosition.Inside) {
          interaction.current = { mode: 'move', index, start: point, initial: rect }
        } else {
          interaction.current = { mode: 'resize', index, handle, start: point, initial: rect }
        }
        return
      }

      setSelectedRect(null)
      setHoveredRect(null)
      setHoveredHandle(HandlePosition.None)
      setDraggingHandle(HandlePosition.None)
      interaction.current = { mode: 'draw', start: point }
      setTempRect({ x: point.x, y: point.y, width: 0, height: 0 })
    },
    [canvasRef, pixelRects, scale, selectedRect],
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const point = getCanvasPoint(event, canvas)
      setMousePos(point)

      const current = interaction.current
      const minWidth = CANVAS_CONFIG.minRectSize
      const minHeight = CANVAS_CONFIG.minRectSize

      if (current.mode === 'draw') {
        const x = Math.min(current.start.x, point.x)
        const y = Math.min(current.start.y, point.y)
        const width = Math.abs(point.x - current.start.x)
        const height = Math.abs(point.y - current.start.y)
        const adjustedWidth = Math.max(width, minWidth)
        const adjustedHeight = Math.max(height, minHeight)
        const clampedX = Math.max(0, Math.min(canvas.width - adjustedWidth, x))
        const clampedY = Math.max(0, Math.min(canvas.height - adjustedHeight, y))

        const pixelRect = { x: clampedX, y: clampedY, width: adjustedWidth, height: adjustedHeight }
        const normalized = rectToNormalized(pixelRect, canvas.width, canvas.height)
        const clamped = clampToCanvas(normalized, canvas.width, canvas.height)
        draftRect.current = clamped
        setTempRect(rectToPixel(clamped, canvas.width, canvas.height))
        return
      }

      if (current.mode === 'resize') {
        const rect = { ...current.initial }
        const bottom = rect.y + rect.height
        const right = rect.x + rect.width

        switch (current.handle) {
          case HandlePosition.Top: {
            const nextY = Math.max(0, Math.min(point.y, bottom - minHeight))
            rect.height = bottom - nextY
            rect.y = nextY
            break
          }
          case HandlePosition.Bottom: {
            const nextBottom = Math.max(rect.y + minHeight, Math.min(point.y, canvas.height))
            rect.height = nextBottom - rect.y
            break
          }
          case HandlePosition.Left: {
            const nextX = Math.max(0, Math.min(point.x, right - minWidth))
            rect.width = right - nextX
            rect.x = nextX
            break
          }
          case HandlePosition.Right: {
            const nextRight = Math.max(rect.x + minWidth, Math.min(point.x, canvas.width))
            rect.width = nextRight - rect.x
            break
          }
          default:
            break
        }

        const normalized = rectToNormalized(rect, canvas.width, canvas.height)
        const clamped = clampToCanvas(normalized, canvas.width, canvas.height)
        draftRect.current = clamped
        setRects(prev => updateRectAt(prev, current.index, clamped))
        return
      }

      if (current.mode === 'move') {
        const { initial, start, index } = current
        const width = initial.width
        const height = initial.height
        const dx = point.x - start.x
        const dy = point.y - start.y
        const nextX = Math.max(0, Math.min(canvas.width - width, initial.x + dx))
        const nextY = Math.max(0, Math.min(canvas.height - height, initial.y + dy))
        const pixelRect = { x: nextX, y: nextY, width, height }
        const normalized = rectToNormalized(pixelRect, canvas.width, canvas.height)
        draftRect.current = normalized
        setRects(prev => updateRectAt(prev, index, normalized))
        return
      }

      // idle: обновляем hover состояния
      let hovered: number | null = null
      let handle = HandlePosition.None
      const handleSize = scale.getHandleSize()
      for (let index = pixelRects.length - 1; index >= 0; index -= 1) {
        const rect = pixelRects[index]
        if (!rect) continue
        const hit = hitTestHandle(point, rect, handleSize)
        if (hit !== HandlePosition.None) {
          hovered = index
          handle = hit
          break
        }
        if (hitTestRect(point, rect)) {
          hovered = index
          handle = HandlePosition.Inside
          break
        }
      }
      setHoveredRect(hovered)
      setHoveredHandle(handle)
    },
    [canvasRef, pixelRects, scale, setRects],
  )

  const handleMouseUp = useCallback(() => {
    if (interaction.current.mode === 'draw') {
      const rect = draftRect.current
      if (rect) {
        onDrawRect?.(rect)
      }
    }

    resetInteraction()
    onInteractionEnd?.()
  }, [resetInteraction, onDrawRect, onInteractionEnd])

  const handleMouseLeave = useCallback(() => {
    if (interaction.current.mode === 'draw') {
      setTempRect(null)
    }
    setHoveredRect(null)
    setHoveredHandle(HandlePosition.None)
  }, [])

  const handleBlur = useCallback(() => {
    resetInteraction()
    setHoveredRect(null)
    setHoveredHandle(HandlePosition.None)
  }, [resetInteraction])

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleBlur,
    selectedRect,
    setSelectedRect,
    hoveredRect,
    setHoveredRect,
    hoveredHandle,
    draggingHandle,
    tempRect,
    mousePos,
  }
}
