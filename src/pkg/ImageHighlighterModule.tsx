import React, {
        forwardRef,
        useCallback,
        useEffect,
        useImperativeHandle,
        useMemo,
        useRef,
        useState
} from 'react'
import { ContextMenu } from '@consta/uikit/ContextMenu'
import { IconTrash } from '@consta/icons/IconTrash'

import { HandlePosition } from 'types/HandlePosition'
import { Rect } from 'types/Rect'
import { ImageHighlighterRef } from 'types/ImageHighlighterRef'
import { ExtendedImageHighlighterProps } from 'types/ExtendedImageHighlighterProps'
import { SortOptions, stableSortWithMaps } from 'hooks/rectSorting'
import { useImageLoader } from 'hooks/useImageLoader'
import { useCanvasInteractions } from 'hooks/useCanvasInteractions'
import { useOffscreenBackground } from 'hooks/useOffscreenBackground'
import { useContextMenu } from 'hooks/useContextMenu'
import { NormalizeToPixels } from 'utility/NormalizeToPixels'
import { DrawImageAndRectangles } from 'utility/DrawImageAndRectangles'
import { GetCanvasCoordinates } from 'utility/GetCanvasCoordinates'
import { IsPointInRect } from 'utility/IsPointInRect'
import { DrawBackground } from 'utility/DrawBackground'
import { DrawMagnifier } from 'utility/DrawMagnifier'
import { ScaleUtils } from 'utility/ScaleUtils'

const createNextRect = (rects: Rect[]): Rect => {
        const last = rects[rects.length - 1]
        if (!last) return [0.1, 0.1, 0.2, 0.2]
        return [last[0], last[3] + 0.01, last[2], last[3] + 0.13]
}

export const ImageHighlighterModule = forwardRef<ImageHighlighterRef, ExtendedImageHighlighterProps>(
        (props, ref) => {
                const { image, cores = [], onCoresChange, onSelectRect, onHoverRect } = props

                const canvasRef = useRef<HTMLCanvasElement | null>(null)
                const sortCallbackRef = useRef<() => void>(() => {})

                const [rects, setRects] = useState<Rect[]>([])
                const [prevCores, setPrevCores] = useState<number[][]>([])
                const [rotationAngle, setRotationAngle] = useState(0)
                const [sortOptions, setSortOptions] = useState<SortOptions>({ by: 'bottom', dir: 'asc' })

                const { imgRef, canvasSize } = useImageLoader(image, canvasRef, cores, setRects)
                const offscreenCanvasRef = useOffscreenBackground(canvasSize, imgRef, DrawBackground)

                const referenceWidth = imgRef.current?.width || canvasSize.width
                const scale = useMemo(() => ScaleUtils(referenceWidth), [referenceWidth])

                const {
                        handleMouseDown,
                        handleMouseMove,
                        handleMouseUp,
                        handleBlur,
                        handleMouseLeave,
                        selectedRect,
                        setSelectedRect,
                        hoveredRect,
                        setHoveredRect,
                        hoveredHandle,
                        dragHandle,
                        tempRect,
                        mousePos
                } = useCanvasInteractions({
                        canvasRef,
                        normalizedRectangles: rects,
                        setNormalizedRectangles: setRects,
                        imgRef,
                        canvasSize,
                        onSelectRect,
                        onHoverRect,
                        baseLineWidth: scale.getLineWidth(),
                        sortedNormalizedRectangles: () => sortCallbackRef.current()
                })

                const applySort = useCallback(
                        (next?: Partial<SortOptions>) => {
                                const current = next ? { ...sortOptions, ...next } : sortOptions
                                setRects(prevRects => {
                                        if (prevRects.length <= 1) return prevRects
                                        const { rects: sorted, oldToNew } = stableSortWithMaps(prevRects, current)
                                        setSelectedRect(prevSel => (prevSel == null ? null : oldToNew[prevSel] ?? null))
                                        setHoveredRect(prevHover => (prevHover == null ? null : oldToNew[prevHover] ?? null))
                                        return sorted
                                })
                                if (next) setSortOptions(current)
                        },
                        [sortOptions, setHoveredRect, setSelectedRect]
                )
                sortCallbackRef.current = () => applySort()

                const addRect = useCallback(() => {
                        if (!canvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) return
                        setRects(prev => {
                                const nextRect = createNextRect(prev)
                                const updated = [...prev, nextRect]
                                setSelectedRect(updated.length - 1)
                                return updated
                        })
                        applySort()
                }, [canvasSize.height, canvasSize.width, applySort, setSelectedRect])

                const deleteByIndex = useCallback(
                        (idx: number) => {
                                setRects(prev => prev.filter((_, i) => i !== idx))
                                setSelectedRect(sel => (sel === idx ? null : sel !== null && sel > idx ? sel - 1 : sel))
                                setHoveredRect(hov => (hov === idx ? null : hov !== null && hov > idx ? hov - 1 : hov))
                                applySort()
                        },
                        [applySort, setHoveredRect, setSelectedRect]
                )

                const { pos: contextMenuPos, items: contextMenuItems, openAt, close: closeMenu } =
                        useContextMenu(addRect, deleteByIndex)

                const getPixelRects = useCallback(() => {
                        if (canvasSize.width === 0 || canvasSize.height === 0) return [] as Rect[]
                        return rects.map(r => NormalizeToPixels(r, canvasSize.width, canvasSize.height))
                }, [rects, canvasSize.width, canvasSize.height])

                const handleContextMenu = useCallback(
                        (event: React.MouseEvent<HTMLCanvasElement>) => {
                                event.preventDefault()
                                const canvas = canvasRef.current
                                if (!canvas) return

                                const pixelRects = getPixelRects()
                                const clickPos = GetCanvasCoordinates(event, canvas)
                                let idx: number | null = null

                                if (selectedRect != null && pixelRects[selectedRect] && IsPointInRect(clickPos, pixelRects[selectedRect])) {
                                        idx = selectedRect
                                } else {
                                        for (let i = pixelRects.length - 1; i >= 0; i -= 1) {
                                                if (IsPointInRect(clickPos, pixelRects[i])) {
                                                        idx = i
                                                        break
                                                }
                                        }
                                }

                                openAt(event.clientX, event.clientY, idx)
                        },
                        [getPixelRects, openAt, selectedRect]
                )

                useEffect(() => {
                        const onDocMouseDown = (e: MouseEvent) => {
                                if (canvasRef.current && !canvasRef.current.contains(e.target as Node)) {
                                        setSelectedRect(null)
                                }
                        }

                        document.addEventListener('mousedown', onDocMouseDown)
                        return () => document.removeEventListener('mousedown', onDocMouseDown)
                }, [setSelectedRect])

                useEffect(() => {
                        if (!onCoresChange) return
                        const changed =
                                rects.length !== prevCores.length ||
                                rects.some((rect, index) => rect.some((value, j) => value !== prevCores[index]?.[j]))

                        if (changed) {
                                onCoresChange(rects)
                                setPrevCores(rects.map(rect => [...rect]))
                        }
                }, [rects, prevCores, onCoresChange])

                useImperativeHandle(
                        ref,
                        () => ({
                                getRectangles: () => ({ boxes: [[0, 0, 1, 1]], cores: rects }),
                                getSelectedRect: () => selectedRect,
                                getHoveredRect: () => hoveredRect,
                                setSelectedRect: (i: number | null) => setSelectedRect(i),
                                setHoveredRect: (i: number | null) => setHoveredRect(i),
                                normalizeHeights: () => {
                                        if (rects.length === 0) return
                                        const heights = rects.map(([_, y1, __, y2]) => y2 - y1)
                                        const avg = heights.reduce((acc, n) => acc + n, 0) / heights.length
                                        setRects(rs => rs.map(([x, y, w]) => [x, y, w, y + avg]))
                                },
                                addNewRect: () => {
                                        setRects(prev => {
                                                const next = [...prev, createNextRect(prev)]
                                                setSelectedRect(next.length - 1)
                                                return next
                                        })
                                        applySort()
                                },
                                deleteSegment: (index: number) => deleteByIndex(index),
                                rotateImage: (angle: number) => setRotationAngle(prev => (prev + angle) % 360),
                                getRotatedImage: async () => {
                                        const img = imgRef.current
                                        if (!img || !img.complete || img.naturalWidth === 0) return null

                                        const temp = document.createElement('canvas')
                                        const ctx = temp.getContext('2d')
                                        if (!ctx) return null

                                        const rad = (rotationAngle * Math.PI) / 180
                                        const swap = Math.abs(rotationAngle % 180) === 90
                                        temp.width = swap ? img.naturalHeight : img.naturalWidth
                                        temp.height = swap ? img.naturalWidth : img.naturalHeight

                                        ctx.translate(temp.width / 2, temp.height / 2)
                                        ctx.rotate(rad)
                                        ctx.drawImage(
                                                img,
                                                -img.naturalWidth / 2,
                                                -img.naturalHeight / 2,
                                                img.naturalWidth,
                                                img.naturalHeight
                                        )

                                        return new Promise<Blob | null>(resolve => temp.toBlob(blob => resolve(blob), 'image/png'))
                                },
                                sort: opts => applySort(opts),
                                getSortOptions: () => sortOptions,
                                setSortOptions: opts => applySort(opts),
                                toggleSortDirection: () => applySort({ dir: sortOptions.dir === 'asc' ? 'desc' : 'asc' }),
                                sortTopToBottom: () => applySort({ by: 'top', dir: 'asc' }),
                                sortBottomToTop: () => applySort({ by: 'bottom', dir: 'asc' }),
                                sortLeftToRight: () => applySort({ by: 'left', dir: 'asc' }),
                                sortRightToLeft: () => applySort({ by: 'right', dir: 'desc' })
                        }),
                        [
                                rects,
                                selectedRect,
                                hoveredRect,
                                rotationAngle,
                                applySort,
                                sortOptions,
                                deleteByIndex,
                                imgRef
                        ]
                )

                const renderCanvas = useCallback(() => {
                        const canvas = canvasRef.current
                        if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return

                        const ctx = canvas.getContext('2d')
                        if (!ctx) return

                        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
                        ctx.save()
                        ctx.translate(canvasSize.width / 2, canvasSize.height / 2)
                        ctx.rotate((rotationAngle * Math.PI) / 180)
                        ctx.translate(-canvasSize.width / 2, -canvasSize.height / 2)

                        if (offscreenCanvasRef.current) {
                                ctx.drawImage(offscreenCanvasRef.current, 0, 0, canvasSize.width, canvasSize.height)
                        }

                        if (rotationAngle === 0) {
                                const pixelRects = getPixelRects()
                                ctx.font = `${scale.getFontSize()}px Arial`
                                ctx.textAlign = 'left'
                                ctx.textBaseline = 'top'

                                DrawImageAndRectangles(
                                        ctx,
                                        imgRef.current,
                                        pixelRects,
                                        selectedRect,
                                        hoveredRect,
                                        tempRect,
                                        scale.getLineWidth(),
                                        offscreenCanvasRef.current
                                )

                                if (selectedRect != null && pixelRects[selectedRect]) {
                                        const [x, y, w, h] = pixelRects[selectedRect]
                                        ctx.save()
                                        ctx.fillStyle = 'rgba(0,123,255,0.1)'
                                        ctx.fillRect(x, y, w, h)
                                        ctx.restore()
                                }

                                pixelRects.forEach((rect, index) => {
                                        const [x, y, w, h] = rect
                                        const label = `${index + 1}`

                                        ctx.save()
                                        ctx.strokeStyle = index === selectedRect ? '#007bff' : '#ffffff'
                                        ctx.lineWidth =
                                                index === selectedRect ? scale.getSelectedLineWidth() : scale.getLineWidth()
                                        ctx.strokeRect(x, y, w, h)
                                        ctx.restore()

                                        ctx.save()
                                        ctx.fillStyle = index === selectedRect ? '#007bff' : '#ffffff'
                                        ctx.fillText(label, x + scale.getFontSize() * 0.8, y + scale.getFontSize() * 0.8)
                                        ctx.restore()
                                })

                                if (
                                        mousePos &&
                                        selectedRect != null &&
                                        pixelRects[selectedRect] &&
                                        dragHandle !== HandlePosition.None &&
                                        dragHandle !== HandlePosition.Inside
                                ) {
                                        DrawMagnifier(
                                                ctx,
                                                imgRef.current,
                                                pixelRects[selectedRect],
                                                dragHandle,
                                                canvasSize.width,
                                                canvasSize.height,
                                                scale.getLineWidth(),
                                                scale.getMagnifierSize()
                                        )
                                }

                                if (selectedRect != null && pixelRects[selectedRect]) {
                                        const [x, y, w, h] = pixelRects[selectedRect]
                                        const handleSize = scale.getHandleSize()
                                        const half = handleSize / 2
                                        const handles = [
                                                { x: x + w / 2, y, pos: HandlePosition.Top },
                                                { x: x + w / 2, y: y + h, pos: HandlePosition.Bottom },
                                                { x, y: y + h / 2, pos: HandlePosition.Left },
                                                { x: x + w, y: y + h / 2, pos: HandlePosition.Right }
                                        ]

                                        ctx.save()
                                        ctx.strokeStyle = '#ffffff'
                                        ctx.lineWidth = scale.getLineWidth()

                                        handles.forEach(({ x: hx, y: hy, pos }) => {
                                                ctx.fillStyle =
                                                        hoveredHandle === pos && selectedRect !== null
                                                                ? '#ffa500'
                                                                : dragHandle === pos && selectedRect !== null
                                                                ? 'red'
                                                                : '#007bff'
                                                ctx.beginPath()
                                                ctx.arc(hx, hy, half, 0, 2 * Math.PI)
                                                ctx.fill()
                                                ctx.stroke()
                                        })

                                        ctx.restore()
                                }
                        }

                        ctx.restore()
                }, [
                        canvasSize.height,
                        canvasSize.width,
                        rotationAngle,
                        offscreenCanvasRef,
                        getPixelRects,
                        scale,
                        imgRef,
                        selectedRect,
                        hoveredRect,
                        tempRect,
                        mousePos,
                        dragHandle,
                        hoveredHandle
                ])

                useEffect(() => {
                        let raf = 0
                        const tick = () => {
                                renderCanvas()
                                raf = requestAnimationFrame(tick)
                        }

                        raf = requestAnimationFrame(tick)
                        return () => cancelAnimationFrame(raf)
                }, [renderCanvas])

                useEffect(() => {
                        const onKey = (e: KeyboardEvent) => {
                                if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRect != null) {
                                        deleteByIndex(selectedRect)
                                }
                        }

                        window.addEventListener('keydown', onKey)
                        return () => window.removeEventListener('keydown', onKey)
                }, [selectedRect, deleteByIndex])

                const cursorStyle = useMemo(() => {
                        if (selectedRect != null) {
                                if (hoveredHandle === HandlePosition.Top || hoveredHandle === HandlePosition.Bottom) {
                                        return 'ns-resize'
                                }
                                if (hoveredHandle === HandlePosition.Left || hoveredHandle === HandlePosition.Right) {
                                        return 'ew-resize'
                                }
                        } else if (hoveredRect != null) {
                                return 'pointer'
                        }
                        return 'default'
                }, [selectedRect, hoveredHandle, hoveredRect])

                return (
                        <>
                                <canvas
                                        ref={canvasRef}
                                        style={{ maxWidth: '100%', cursor: cursorStyle }}
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseLeave}
                                        onBlur={handleBlur}
                                        onContextMenu={handleContextMenu}
                                        tabIndex={0}
                                />
                                {contextMenuPos && (
                                        <ContextMenu
                                                isOpen
                                                items={contextMenuItems.map(item =>
                                                        item.label === 'Удалить сегмент'
                                                                ? { ...item, leftSide: <IconTrash size="s" /> }
                                                                : item
                                                )}
                                                position={contextMenuPos}
                                                direction="downStartLeft"
                                                onClickOutside={closeMenu}
                                        />
                                )}
                        </>
                )
        }
)
