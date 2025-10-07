import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExtendedImageHighlighterProps, Rect, SortOptions } from '../types'
import { DEFAULT_SORT, stableSort } from './sort'
import { clampRect, cloneRect, cloneRects, ensureRectOrder } from 'shared/utils/rects'
import { CANVAS_CONFIG } from './config'

export interface RectStore {
  rects: Rect[]
  setRects: React.Dispatch<React.SetStateAction<Rect[]>>
  sortOptions: SortOptions
  applySort: (opts?: Partial<SortOptions>) => { oldToNew: number[]; newToOld: number[] }
  setSortOptions: (opts: Partial<SortOptions>) => void
}

export const useRectStore = (
  props: Pick<ExtendedImageHighlighterProps, 'cores' | 'onCoresChange'>,
): RectStore => {
  const { cores, onCoresChange } = props
  const [rects, setRects] = useState<Rect[]>(() => cloneRects(cores ?? []))
  const [sortOptions, setSortOptionsState] = useState<SortOptions>(DEFAULT_SORT)
  const prevPropCores = useRef<Rect[] | undefined>(cloneRects(cores ?? []))
  const prevReported = useRef<Rect[] | undefined>(cloneRects(cores ?? []))

  // синхронизация с пропсами
  useEffect(() => {
    if (!cores) return
    if (prevPropCores.current && cores && cores.length === prevPropCores.current.length) {
      const equal = cores.every((rect, index) => rect.every((value, coord) => value === prevPropCores.current?.[index]?.[coord]))
      if (equal) return
    }
    prevPropCores.current = cloneRects(cores)
    setRects(cloneRects(cores))
  }, [cores])

  // уведомляем об изменениях наружу
  const notify = useCallback(
    (next: Rect[]) => {
      if (!onCoresChange) return
      const nextClone = cloneRects(next)
      const wasSame =
        prevReported.current &&
        nextClone.length === prevReported.current.length &&
        nextClone.every((rect, index) => rect.every((value, coord) => value === prevReported.current?.[index]?.[coord]))

      if (!wasSame) {
        onCoresChange(nextClone)
        prevReported.current = nextClone
      }
    },
    [onCoresChange],
  )

  const applySort = useCallback(
    (opts?: Partial<SortOptions>) => {
      const nextOptions: SortOptions = { ...sortOptions, ...(opts ?? {}) }
      setSortOptionsState(nextOptions)

      let mappings = { oldToNew: rects.map((_, index) => index), newToOld: rects.map((_, index) => index) }

      setRects(prev => {
        if (prev.length <= 1) return prev
        const { rects: sorted, oldToNew, newToOld } = stableSort(prev, nextOptions)
        mappings = { oldToNew, newToOld }
        notify(sorted)
        return sorted
      })

      return mappings
    },
    [rects, sortOptions, notify],
  )

  const setSortOptions = useCallback(
    (opts: Partial<SortOptions>) => {
      applySort(opts)
    },
    [applySort],
  )

  // ensure notification when rects change without sorting
  const setRectsAndNotify = useCallback(
    (updater: React.SetStateAction<Rect[]>) => {
      setRects(prev => {
        const next = typeof updater === 'function' ? (updater as (value: Rect[]) => Rect[])(prev) : updater
        notify(next)
        return next
      })
    },
    [notify],
  )

  return {
    rects,
    setRects: setRectsAndNotify,
    sortOptions,
    applySort,
    setSortOptions,
  }
}

export const appendRect = (rects: Rect[]): Rect => {
  const last = rects[rects.length - 1]
  if (!last) return [0.1, 0.1, 0.2, 0.2]
  const height = last[3] - last[1]
  const offset = Math.max(0.01, height * 0.1)
  const top = last[3] + 0.01
  const bottom = top + (height || 0.13)
  return ensureRectOrder([last[0], top, last[2], bottom])
}

export const normalizeHeights = (rects: Rect[]): Rect[] => {
  if (rects.length === 0) return rects
  const heights = rects.map(rect => rect[3] - rect[1])
  const avg = heights.reduce((acc, value) => acc + value, 0) / heights.length
  return rects.map(rect => [rect[0], rect[1], rect[2], rect[1] + avg])
}

export const clampToCanvas = (rect: Rect, canvasWidth: number, canvasHeight: number): Rect => {
  const minWidth = CANVAS_CONFIG.minRectSize / canvasWidth
  const minHeight = CANVAS_CONFIG.minRectSize / canvasHeight
  return clampRect(rect, minWidth, minHeight)
}

export const updateRectAt = (rects: Rect[], index: number, next: Rect): Rect[] => {
  const copy = cloneRects(rects)
  copy[index] = cloneRect(next)
  return copy
}

export const removeRectAt = (rects: Rect[], index: number): Rect[] => rects.filter((_, idx) => idx !== index)
