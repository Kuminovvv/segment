import { useCallback, useRef, useState } from 'react'
import type { ExtendedImageHighlighterProps, ImageHighlighterRef, Rect, SortOptions } from '../types'
import { useRectStore, appendRect, normalizeHeights as normalizeHeightsFn } from '../model/rectangles'
import { stableSort } from '../model/sort'
import { useCanvasController } from './useCanvasController'
import { useImageLoader } from './useImageLoader'
import { useOffscreenBackground } from './useOffscreenBackground'
import { drawBackground } from '../drawing/background'
import { useRenderLoop } from './useRenderLoop'
import { useContextMenu, type ContextMenuState } from './useContextMenu'
import { useImperativeHandle } from 'react'
import { removeRectAt } from '../model/rectangles'

export interface ImageHighlighterController {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  rotationAngle: number
  setRotationAngle: React.Dispatch<React.SetStateAction<number>>
  rects: Rect[]
  sortOptions: SortOptions
  addRect: () => void
  deleteRect: (index: number) => void
  normalizeHeights: () => void
  contextMenu: ContextMenuState
  canvasSize: { width: number; height: number }
  imgRef: React.MutableRefObject<HTMLImageElement | null>
  offscreenRef: React.MutableRefObject<HTMLCanvasElement | null>
  controller: ReturnType<typeof useCanvasController>
  sort: (opts?: Partial<SortOptions>) => void
}

export const useImageHighlighter = (
  props: ExtendedImageHighlighterProps,
  ref: React.ForwardedRef<ImageHighlighterRef>,
): ImageHighlighterController => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rectStore = useRectStore(props)
  const { rects, setRects, sortOptions, applySort } = rectStore
  const [rotationAngle, setRotationAngle] = useState(0)

  const { imgRef, canvasSize } = useImageLoader({ image: props.image, canvasRef })
  const offscreenRef = useOffscreenBackground(canvasSize, imgRef, drawBackground)
  const controllerRef = useRef<ReturnType<typeof useCanvasController> | null>(null)

  const handleDrawRect = useCallback(
    (rect: Rect) => {
      let mapping: number[] | null = null
      let appendedIndex = 0
      setRects(prev => {
        const appended = [...prev, rect]
        appendedIndex = appended.length - 1
        const { rects: sorted, oldToNew } = stableSort(appended, sortOptions)
        mapping = oldToNew
        return sorted
      })

      const nextIndex = mapping ? mapping[appendedIndex] ?? appendedIndex : appendedIndex
      controllerRef.current?.setSelectedRect(nextIndex)
      controllerRef.current?.setHoveredRect(nextIndex)
    },
    [setRects, sortOptions],
  )

  const handleInteractionEnd = useCallback(() => {
    const { oldToNew } = applySort()
    controllerRef.current?.setSelectedRect(prev => (prev === null ? prev : oldToNew[prev] ?? null))
    controllerRef.current?.setHoveredRect(prev => (prev === null ? prev : oldToNew[prev] ?? null))
  }, [applySort])

  const controller = useCanvasController({
    canvasRef,
    canvasSize,
    imgRef,
    rects,
    setRects,
    onSelectRect: props.onSelectRect,
    onHoverRect: props.onHoverRect,
    onDrawRect: handleDrawRect,
    onInteractionEnd: handleInteractionEnd,
  })
  controllerRef.current = controller

  const applySortAndSync = useCallback(
    (opts?: Partial<SortOptions>) => {
      const { oldToNew } = applySort(opts)
      controller.setSelectedRect(prev => (prev === null ? prev : oldToNew[prev] ?? null))
      controller.setHoveredRect(prev => (prev === null ? prev : oldToNew[prev] ?? null))
    },
    [applySort, controller],
  )

  const addRect = useCallback(() => {
    let newIndex = 0
    setRects(prev => {
      const appended = [...prev, appendRect(prev)]
      const { rects: sorted, oldToNew } = stableSort(appended, sortOptions)
      newIndex = oldToNew[appended.length - 1] ?? sorted.length - 1
      return sorted
    })
    controller.setSelectedRect(newIndex)
    controller.setHoveredRect(newIndex)
  }, [setRects, sortOptions, controller])

  const deleteRect = useCallback(
    (index: number) => {
      let mapping: number[] | null = null
      setRects(prev => {
        const filtered = removeRectAt(prev, index)
        const { rects: sorted, oldToNew } = stableSort(filtered, sortOptions)
        mapping = oldToNew
        return sorted
      })

      controller.setSelectedRect(prev => {
        if (prev === null) return null
        if (prev === index) return null
        const shifted = prev > index ? prev - 1 : prev
        return mapping ? mapping[shifted] ?? null : shifted
      })

      controller.setHoveredRect(prev => {
        if (prev === null) return null
        if (prev === index) return null
        const shifted = prev > index ? prev - 1 : prev
        return mapping ? mapping[shifted] ?? null : shifted
      })
    },
    [setRects, sortOptions, controller],
  )

  const normalizeHeights = useCallback(() => {
    let mapping: number[] | null = null
    setRects(prev => {
      const normalized = normalizeHeightsFn(prev)
      const { rects: sorted, oldToNew } = stableSort(normalized, sortOptions)
      mapping = oldToNew
      return sorted
    })
    controller.setSelectedRect(prev => (prev === null || !mapping ? prev : mapping[prev] ?? prev))
    controller.setHoveredRect(prev => (prev === null || !mapping ? prev : mapping[prev] ?? prev))
  }, [setRects, sortOptions, controller])

  const contextMenu = useContextMenu({
    onAdd: () => addRect(),
    onDelete: index => deleteRect(index),
  })

  useRenderLoop({
    canvasRef,
    rects,
    selectedRect: controller.selectedRect,
    hoveredRect: controller.hoveredRect,
    hoveredHandle: controller.hoveredHandle,
    draggingHandle: controller.draggingHandle,
    tempRect: controller.tempRect,
    mousePos: controller.mousePos,
    imgRef,
    offscreenRef,
    canvasSize,
    rotationAngle,
  })

  useImperativeHandle(
    ref,
    (): ImageHighlighterRef => ({
      getRectangles: () => ({ boxes: [[0, 0, 1, 1]], cores: rects }),
      setSelectedRect: controller.setSelectedRect,
      setHoveredRect: controller.setHoveredRect,
      getSelectedRect: () => controller.selectedRect,
      getHoveredRect: () => controller.hoveredRect,
      normalizeHeights,
      addNewRect: addRect,
      deleteSegment: deleteRect,
      rotateImage: (angle: number) => setRotationAngle(prev => (prev + angle) % 360),
      getRotatedImage: async () => {
        const image = imgRef.current
        if (!image || !image.complete || image.naturalWidth === 0) return null
        const swap = Math.abs(rotationAngle % 180) === 90
        const canvas = document.createElement('canvas')
        canvas.width = swap ? image.naturalHeight : image.naturalWidth
        canvas.height = swap ? image.naturalWidth : image.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((rotationAngle * Math.PI) / 180)
        ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
        return new Promise<Blob | null>(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
      },
      sort: applySortAndSync,
      getSortOptions: () => sortOptions,
      setSortOptions: opts => applySortAndSync(opts),
      toggleSortDirection: () => applySortAndSync({ dir: sortOptions.dir === 'asc' ? 'desc' : 'asc' }),
      sortTopToBottom: () => applySortAndSync({ by: 'top', dir: 'asc' }),
      sortBottomToTop: () => applySortAndSync({ by: 'bottom', dir: 'asc' }),
      sortLeftToRight: () => applySortAndSync({ by: 'left', dir: 'asc' }),
      sortRightToLeft: () => applySortAndSync({ by: 'right', dir: 'desc' }),
    })),
    [
      ref,
      rects,
      sortOptions,
      applySortAndSync,
      controller,
      addRect,
      deleteRect,
      normalizeHeights,
      rotationAngle,
      imgRef,
    ],
  )

  const sort = useCallback((opts?: Partial<SortOptions>) => {
    applySortAndSync(opts)
  }, [applySortAndSync])

  return {
    canvasRef,
    rotationAngle,
    setRotationAngle,
    rects,
    sortOptions,
    addRect,
    deleteRect,
    normalizeHeights,
    contextMenu,
    canvasSize,
    imgRef,
    offscreenRef,
    controller,
    sort,
  }
}
