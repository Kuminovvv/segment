import { useCallback, useEffect, useRef, useState } from 'react'
import { ExtendedImageHighlighterProps, HandlePosition, Rect, Size } from 'api/types'
import { clampRect, detectHandle, ensureMinSize, normalizeRect, rotateAroundCenter } from 'utils/geometry'
import { getCanvasPoint } from 'utils/canvas'
import { createNextRect } from 'utils/rectFactory'
import { SortOptions, defaultSortOptions, stableSort } from 'core/sorting'

const MIN_RECT_SIZE = 0.01


interface ControllerOptions extends ExtendedImageHighlighterProps {
        canvasRef: React.RefObject<HTMLCanvasElement | null>
        canvasSize: Size
}

interface DragState {
        handle: HandlePosition
        startPoint: { x: number; y: number }
        initialRect: Rect
}

export interface HighlighterController {
        rects: Rect[]
        selected: number | null
        hovered: number | null
        hoveredHandle: HandlePosition
        draftRect: Rect | null
        dragHandle: HandlePosition
        rotation: number
        sortOptions: SortOptions
        handleMouseDown: (event: React.MouseEvent<HTMLCanvasElement>) => void
        handleMouseMove: (event: React.MouseEvent<HTMLCanvasElement>) => void
        handleMouseUp: (event: React.MouseEvent<HTMLCanvasElement>) => void
        handleMouseLeave: () => void
        handleBlur: () => void
        registerKeyboard: () => void
        unregisterKeyboard: () => void
        addRect: () => void
        deleteRect: (index: number) => void
        setHovered: (index: number | null) => void
        setSelected: (index: number | null) => void
        applySort: (options?: Partial<SortOptions>) => void
        replaceRects: (updater: (rects: Rect[]) => Rect[]) => void
        setRotation: React.Dispatch<React.SetStateAction<number>>
}

export const useHighlighterController = ({
        cores = [],
        onCoresChange,
        onHoverRect,
        onSelectRect,
        canvasRef,
        canvasSize
}: ControllerOptions): HighlighterController => {
        const [rects, setRects] = useState<Rect[]>(() => cores.map(rect => [...rect]))
        const [selected, setSelected] = useState<number | null>(null)
        const [hovered, setHovered] = useState<number | null>(null)
        const [hoveredHandle, setHoveredHandle] = useState<HandlePosition>(HandlePosition.None)
        const [draftRect, setDraftRect] = useState<Rect | null>(null)
        const [dragState, setDragState] = useState<DragState | null>(null)
        const [rotation, setRotation] = useState(0)
        const [sortOptions, setSortOptions] = useState<SortOptions>(defaultSortOptions)

        const keydownHandlerRef = useRef<(event: KeyboardEvent) => void>()
        const drawingStartRef = useRef<{ x: number; y: number } | null>(null)

        useEffect(() => {
                setRects(prev => {
                        if (cores.length === prev.length && cores.every((rect, index) => rect.every((value, i) => value === prev[index]?.[i]))) {
                                return prev
                        }
                        return cores.map(rect => [...rect])
                })
        }, [cores])

        useEffect(() => {
                onSelectRect?.(selected)
        }, [selected, onSelectRect])

        useEffect(() => {
                onHoverRect?.(hovered)
        }, [hovered, onHoverRect])

        useEffect(() => {
                setSelected(prev => (prev != null && prev >= rects.length ? null : prev))
                setHovered(prev => (prev != null && prev >= rects.length ? null : prev))
        }, [rects.length])

        const emitCoresChange = useCallback(
                (next: Rect[] | ((prev: Rect[]) => Rect[])) => {
                        setRects(prev => {
                                const updated = typeof next === 'function' ? (next as (prev: Rect[]) => Rect[])(prev) : next
                                onCoresChange?.(updated.map(rect => [...rect]))
                                return updated
                        })
                },
                [onCoresChange]
        )

        const addRect = useCallback(() => {
                emitCoresChange(prevRects => {
                        const next = [...prevRects, createNextRect(prevRects)]
                        setSelected(next.length - 1)
                        return next
                })
        }, [emitCoresChange])

        const deleteRect = useCallback(
                (index: number) => {
                        emitCoresChange(prevRects => prevRects.filter((_, i) => i !== index))
                        setSelected(prev => {
                                if (prev == null) return prev
                                if (prev === index) return null
                                return prev > index ? prev - 1 : prev
                        })
                        setHovered(prev => {
                                if (prev == null) return prev
                                if (prev === index) return null
                                return prev > index ? prev - 1 : prev
                        })
                },
                [emitCoresChange]
        )

        const updateRect = useCallback(
                (index: number, updater: (rect: Rect) => Rect) => {
                        emitCoresChange(prevRects => {
                                const next = [...prevRects]
                                next[index] = clampRect(updater(prevRects[index]))
                                return next
                        })
                },
                [emitCoresChange]
        )

        const applySort = useCallback(
                (options?: Partial<SortOptions>) => {
                        setSortOptions(prevOptions => {
                                const merged = { ...prevOptions, ...options }
                                emitCoresChange(prev => {
                                        if (prev.length <= 1) return prev
                                        const { rects: sorted, oldToNew } = stableSort(prev, merged)
                                        setSelected(prevSelected => (prevSelected == null ? null : oldToNew[prevSelected]))
                                        setHovered(prevHovered => (prevHovered == null ? null : oldToNew[prevHovered]))
                                        return sorted
                                })
                                return merged
                        })
                },
                [emitCoresChange]
        )

        const finishDraftRect = useCallback(
                (point: { x: number; y: number }) => {
                        const start = drawingStartRef.current
                        if (!start) return
                        const normalized = clampRect(ensureMinSize(normalizeRect(start, point), MIN_RECT_SIZE, { width: 1, height: 1 }))
                        if (normalized[2] - normalized[0] <= MIN_RECT_SIZE || normalized[3] - normalized[1] <= MIN_RECT_SIZE) {
                                setDraftRect(null)
                                drawingStartRef.current = null
                                return
                        }
                        emitCoresChange(prev => {
                                const next = [...prev, normalized]
                                setSelected(next.length - 1)
                                return next
                        })
                        setDraftRect(null)
                        drawingStartRef.current = null
                },
                [emitCoresChange]
        )

        const handleMouseDown = useCallback(
                (event: React.MouseEvent<HTMLCanvasElement>) => {
                        const canvas = canvasRef.current
                        if (!canvas) return
                        const pointer = getCanvasPoint(event, canvas)
                        const point = rotateAroundCenter(pointer, rotation)
                        const handleRadius = Math.max(6, canvasSize.width * 0.015)

                        const rectOrder = selected != null
                                ? [selected, ...rects.map((_, index) => index).filter(index => index !== selected)]
                                : rects.map((_, index) => index)

                        for (const index of rectOrder) {
                                const rect = rects[index]
                                const handle = detectHandle(point, rect, canvasSize, handleRadius)
                                if (handle !== HandlePosition.None) {
                                        setSelected(index)
                                        setDragState({ handle, startPoint: point, initialRect: rect })
                                        if (handle !== HandlePosition.None) {
                                                setHovered(index)
                                                setHoveredHandle(handle)
                                        }
                                        return
                                }
                        }

                        drawingStartRef.current = point
                        setDraftRect([point.x, point.y, point.x, point.y])
                        setDragState(null)
                        setSelected(null)
                },
                [canvasRef, canvasSize, rects, rotation, selected]
        )

        const handleMouseMove = useCallback(
                (event: React.MouseEvent<HTMLCanvasElement>) => {
                        const canvas = canvasRef.current
                        if (!canvas) return
                        const pointer = getCanvasPoint(event, canvas)
                        const point = rotateAroundCenter(pointer, rotation)

                        if (dragState && selected != null) {
                                const [x1, y1, x2, y2] = dragState.initialRect
                                const dx = point.x - dragState.startPoint.x
                                const dy = point.y - dragState.startPoint.y

                                if (dragState.handle === HandlePosition.Inside) {
                                        updateRect(selected, () => clampRect([x1 + dx, y1 + dy, x2 + dx, y2 + dy]))
                                } else {
                                        updateRect(selected, () => {
                                                let left = x1
                                                let top = y1
                                                let right = x2
                                                let bottom = y2
                                                if (dragState.handle === HandlePosition.Left || dragState.handle === HandlePosition.Right) {
                                                        if (dragState.handle === HandlePosition.Left) {
                                                                left = Math.min(x2 - MIN_RECT_SIZE, x1 + dx)
                                                        } else {
                                                                right = Math.max(x1 + MIN_RECT_SIZE, x2 + dx)
                                                        }
                                                }
                                                if (dragState.handle === HandlePosition.Top || dragState.handle === HandlePosition.Bottom) {
                                                        if (dragState.handle === HandlePosition.Top) {
                                                                top = Math.min(y2 - MIN_RECT_SIZE, y1 + dy)
                                                        } else {
                                                                bottom = Math.max(y1 + MIN_RECT_SIZE, y2 + dy)
                                                        }
                                                }
                                                return clampRect([left, top, right, bottom])
                                        })
                                }
                                return
                        }

                        if (drawingStartRef.current) {
                                setDraftRect(normalizeRect(drawingStartRef.current, point))
                                return
                        }

                        const handleRadius = Math.max(6, canvasSize.width * 0.015)
                        let hoveredIndex: number | null = null
                        let hoveredHandleNext = HandlePosition.None
                        const rectOrder = selected != null
                                ? [selected, ...rects.map((_, index) => index).filter(index => index !== selected)]
                                : rects.map((_, index) => index)
                        for (const index of rectOrder) {
                                const rect = rects[index]
                                const handle = detectHandle(point, rect, canvasSize, handleRadius)
                                if (handle !== HandlePosition.None) {
                                        hoveredIndex = index
                                        hoveredHandleNext = handle
                                        break
                                }
                        }
                        setHovered(hoveredIndex)
                        setHoveredHandle(hoveredHandleNext)
                },
                [canvasRef, canvasSize, dragState, rects, rotation, selected, updateRect]
        )

        const handleMouseUp = useCallback(
                (event: React.MouseEvent<HTMLCanvasElement>) => {
                        const canvas = canvasRef.current
                        if (!canvas) return
                        const pointer = getCanvasPoint(event, canvas)
                        const point = rotateAroundCenter(pointer, rotation)
                        if (drawingStartRef.current) {
                                finishDraftRect(point)
                        }
                        setDragState(null)
                        drawingStartRef.current = null
                },
                [canvasRef, finishDraftRect, rotation]
        )

        const handleMouseLeave = useCallback(() => {
                        setHovered(null)
                        setHoveredHandle(HandlePosition.None)
                        if (drawingStartRef.current) {
                                setDraftRect(null)
                                drawingStartRef.current = null
                        }
                        setDragState(null)
                }, [])

        const handleBlur = useCallback(() => {
                setHovered(null)
                setHoveredHandle(HandlePosition.None)
        }, [])

        const replaceRects = useCallback(
                (updater: (rects: Rect[]) => Rect[]) => {
                        emitCoresChange(prev => updater(prev))
                },
                [emitCoresChange]
        )

        const registerKeyboard = useCallback(() => {
                keydownHandlerRef.current = event => {
                        if ((event.key === 'Delete' || event.key === 'Backspace') && selected != null) {
                                deleteRect(selected)
                        }
                }
                window.addEventListener('keydown', keydownHandlerRef.current)
        }, [deleteRect, selected])

        const unregisterKeyboard = useCallback(() => {
                if (keydownHandlerRef.current) {
                        window.removeEventListener('keydown', keydownHandlerRef.current)
                        keydownHandlerRef.current = undefined
                }
        }, [])

        return {
                rects,
                selected,
                hovered,
                hoveredHandle,
                draftRect,
                dragHandle: dragState?.handle ?? HandlePosition.None,
                rotation,
                sortOptions,
                handleMouseDown,
                handleMouseMove,
                handleMouseUp,
                handleMouseLeave,
                handleBlur,
                registerKeyboard,
                unregisterKeyboard,
                addRect,
                deleteRect,
                setHovered,
                setSelected,
                applySort,
                replaceRects,
                setRotation
        }
}
