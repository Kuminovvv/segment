import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { ContextMenu } from '@consta/uikit/ContextMenu'
import { IconTrash } from '@consta/icons/IconTrash'

import {
        ExtendedImageHighlighterProps,
        HandlePosition,
        ImageHighlighterRef,
        Rect
} from 'shared/api/types'
import { useImageSource } from 'features/highlighter/hooks/useImageSource'
import { useHighlighterController } from 'features/highlighter/hooks/useHighlighterController'
import { useBackgroundCanvas } from 'features/highlighter/hooks/useBackgroundCanvas'
import { useCanvasRendering } from 'features/highlighter/hooks/useCanvasRendering'
import { useContextMenuController } from 'features/highlighter/hooks/useContextMenuController'
import { isPointInsideRect, rotateAroundCenter } from 'shared/geometry'
import { getCanvasPoint } from 'shared/canvas'
import { defaultSortOptions } from 'features/highlighter/model/sorting'
import { SortOptions } from 'shared/api/types'

const CANVAS_STYLE: React.CSSProperties = {
        maxWidth: '100%',
        outline: 'none',
        display: 'block'
}

const MIN_HEIGHT = 0.01

export const ImageHighlighterModule = forwardRef<ImageHighlighterRef, ExtendedImageHighlighterProps>(
        (props, ref) => {
                const { image: imageSrc, cores = [] } = props
                const canvasRef = useRef<HTMLCanvasElement | null>(null)

                const { element: image, size } = useImageSource(imageSrc)

                const {
                        rects,
                        selected,
                        hovered,
                        hoveredHandle,
                        draftRect,
                        dragHandle,
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
                } = useHighlighterController({ ...props, cores, canvasRef, canvasSize: size })

                const backgroundRef = useBackgroundCanvas(size, image)

                useCanvasRendering({
                        canvasRef,
                        size,
                        background: backgroundRef,
                        rects,
                        selected,
                        hovered,
                        hoveredHandle,
                        draftRect,
                        dragHandle,
                        rotation,
                        image
                })

                useEffect(() => {
                        registerKeyboard()
                        return () => unregisterKeyboard()
                }, [registerKeyboard, unregisterKeyboard])

                useEffect(() => {
                        const canvas = canvasRef.current
                        if (!canvas) return
                        canvas.width = size.width
                        canvas.height = size.height
                }, [size.width, size.height])

                const contextMenu = useContextMenuController(addRect, deleteRect)

                const handleContextMenu = useMemo(
                        () =>
                                (event: React.MouseEvent<HTMLCanvasElement>) => {
                                        event.preventDefault()
                                        const canvas = canvasRef.current
                                        if (!canvas) return
                                        const pointer = getCanvasPoint(event, canvas)
                                        const logicalPoint = rotateAroundCenter(pointer, rotation)

                                        let index: number | null = null
                                        if (selected != null && rects[selected] && isPointInsideRect(logicalPoint, rects[selected])) {
                                                index = selected
                                        } else {
                                                for (let i = rects.length - 1; i >= 0; i -= 1) {
                                                        if (isPointInsideRect(logicalPoint, rects[i])) {
                                                                index = i
                                                                break
                                                        }
                                                }
                                        }

                                        contextMenu.open(event.clientX, event.clientY, index)
                                },
                        [contextMenu, rotation, rects, selected]
                )

                const cursor = useMemo(() => {
                        if (selected != null) {
                                switch (hoveredHandle) {
                                        case HandlePosition.Top:
                                        case HandlePosition.Bottom:
                                                return 'ns-resize'
                                        case HandlePosition.Left:
                                        case HandlePosition.Right:
                                                return 'ew-resize'
                                        case HandlePosition.Inside:
                                                return 'move'
                                        default:
                                                break
                                }
                        }
                        if (hovered != null) {
                                return 'pointer'
                        }
                        return 'default'
                }, [hovered, hoveredHandle, selected])

                const normalizeHeights = () => {
                        if (rects.length === 0) return
                        const avg = rects.reduce((acc, rect) => acc + (rect[3] - rect[1]), 0) / rects.length
                        const clampedHeight = Math.max(MIN_HEIGHT, Math.min(1, avg))
                        replaceRects(prev =>
                                prev.map(rect => {
                                        const height = Math.min(clampedHeight, 1 - rect[1])
                                        return [rect[0], rect[1], rect[2], rect[1] + height] as Rect
                                })
                        )
                }

                useImperativeHandle(
                        ref,
                        (): ImageHighlighterRef => ({
                                getRectangles: () => ({ boxes: [[0, 0, 1, 1]], cores: rects.map(rect => [...rect]) }),
                                setSelectedRect: setSelected,
                                setHoveredRect: setHovered,
                                getSelectedRect: () => selected,
                                getHoveredRect: () => hovered,
                                normalizeHeights,
                                addNewRect: addRect,
                                deleteSegment: deleteRect,
                                rotateImage: angle => setRotation(prev => (prev + angle) % 360),
                                getRotatedImage: async () => {
                                        if (!image || !image.complete || image.naturalWidth === 0) {
                                                return null
                                        }
                                        const temp = document.createElement('canvas')
                                        const rad = (rotation * Math.PI) / 180
                                        const swap = Math.abs(rotation % 180) === 90
                                        temp.width = swap ? image.naturalHeight : image.naturalWidth
                                        temp.height = swap ? image.naturalWidth : image.naturalHeight
                                        const ctx = temp.getContext('2d')
                                        if (!ctx) return null
                                        ctx.translate(temp.width / 2, temp.height / 2)
                                        ctx.rotate(rad)
                                        ctx.drawImage(
                                                image,
                                                -image.naturalWidth / 2,
                                                -image.naturalHeight / 2,
                                                image.naturalWidth,
                                                image.naturalHeight
                                        )
                                        return new Promise<Blob | null>(resolve => temp.toBlob(blob => resolve(blob), 'image/png'))
                                },
                                sort: (options?: SortOptions) => applySort(options),
                                getSortOptions: () => ({ ...defaultSortOptions, ...sortOptions }),
                                setSortOptions: (options: SortOptions) => applySort(options),
                                toggleSortDirection: () =>
                                        applySort({ dir: sortOptions.dir === 'asc' ? 'desc' : 'asc' }),
                                sortTopToBottom: () => applySort({ by: 'top', dir: 'asc' }),
                                sortBottomToTop: () => applySort({ by: 'bottom', dir: 'asc' }),
                                sortLeftToRight: () => applySort({ by: 'left', dir: 'asc' }),
                                sortRightToLeft: () => applySort({ by: 'right', dir: 'desc' })
                        }),
                        [
                                addRect,
                                applySort,
                                deleteRect,
                                hovered,
                                image,
                                rects,
                                rotation,
                                selected,
                                setHovered,
                                setRotation,
                                setSelected,
                                sortOptions
                        ]
                )

                return (
                        <>
                                <canvas
                                        ref={canvasRef}
                                        style={{ ...CANVAS_STYLE, cursor }}
                                        tabIndex={0}
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseLeave}
                                        onBlur={handleBlur}
                                        onContextMenu={handleContextMenu}
                                />
                                {contextMenu.state.isOpen && (
                                        <ContextMenu
                                                isOpen
                                                items={contextMenu.items.map(item =>
                                                        item.label.includes('Удалить')
                                                                ? { ...item, leftSide: <IconTrash size="s" /> }
                                                                : item
                                                )}
                                                position={{ x: contextMenu.state.x, y: contextMenu.state.y }}
                                                direction="downStartLeft"
                                                onClickOutside={contextMenu.close}
                                        />
                                )}
                        </>
                )
        }
)
