import { useEffect } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { HandlePosition, Rect, Size } from 'shared/api/types'
import { drawRectangles } from 'features/highlighter/renderers/rectanglesRenderer'
import { drawMagnifier } from 'features/highlighter/renderers/magnifierRenderer'

interface RenderOptions {
        canvasRef: RefObject<HTMLCanvasElement | null>
        size: Size
        background: MutableRefObject<HTMLCanvasElement | null>
        rects: Rect[]
        selected: number | null
        hovered: number | null
        hoveredHandle: HandlePosition
        draftRect: Rect | null
        dragHandle: HandlePosition
        rotation: number
        image: HTMLImageElement | null
}

const FONT_SIZE_BASE = 14
const LINE_WIDTH_BASE = 2
const SELECTION_MULTIPLIER = 1.8
const HANDLE_RADIUS_BASE = 6

const ensureCanvasSize = (canvas: HTMLCanvasElement, size: Size) => {
        if (canvas.width !== size.width) {
                canvas.width = size.width
        }
        if (canvas.height !== size.height) {
                canvas.height = size.height
        }
}

export const useCanvasRendering = ({
        canvasRef,
        size,
        background,
        rects,
        selected,
        hovered,
        hoveredHandle,
        draftRect,
        dragHandle,
        rotation,
        image
}: RenderOptions) => {
        useEffect(() => {
                let frame = 0

                const render = () => {
                        const canvas = canvasRef.current
                        if (!canvas || !size.width || !size.height) return
                        const ctx = canvas.getContext('2d')
                        if (!ctx) return
                        ensureCanvasSize(canvas, size)

                        ctx.save()
                        ctx.clearRect(0, 0, size.width, size.height)

                        ctx.translate(size.width / 2, size.height / 2)
                        ctx.rotate((rotation * Math.PI) / 180)
                        ctx.translate(-size.width / 2, -size.height / 2)

                        if (background.current) {
                                ctx.drawImage(background.current, 0, 0, size.width, size.height)
                        }

                        const fontSize = Math.max(FONT_SIZE_BASE, size.width * 0.016)
                        const lineWidth = Math.max(LINE_WIDTH_BASE, size.width * 0.004)
                        const selectionWidth = lineWidth * SELECTION_MULTIPLIER
                        const handleRadius = Math.max(HANDLE_RADIUS_BASE, size.width * 0.015)

                        drawRectangles(
                                {
                                        ctx,
                                        rects,
                                        selected,
                                        hovered,
                                        hoveredHandle,
                                        handleRadius,
                                        fontSize,
                                        baseLineWidth: lineWidth,
                                        selectionLineWidth: selectionWidth
                                },
                                size
                        )

                        if (draftRect) {
                                ctx.save()
                                const [x, y, w, h] = [
                                        draftRect[0] * size.width,
                                        draftRect[1] * size.height,
                                        (draftRect[2] - draftRect[0]) * size.width,
                                        (draftRect[3] - draftRect[1]) * size.height
                                ]
                                ctx.strokeStyle = 'rgba(255,255,255,0.6)'
                                ctx.lineWidth = lineWidth
                                ctx.setLineDash([6, 6])
                                ctx.strokeRect(x, y, w, h)
                                ctx.restore()
                        }

                        if (
                                selected != null &&
                                dragHandle !== HandlePosition.None &&
                                dragHandle !== HandlePosition.Inside &&
                                rects[selected]
                        ) {
                                drawMagnifier(ctx, image, rects[selected], dragHandle, size)
                        }

                        ctx.restore()
                        frame = requestAnimationFrame(render)
                }

                frame = requestAnimationFrame(render)
                return () => cancelAnimationFrame(frame)
        }, [
                canvasRef,
                size.width,
                size.height,
                background,
                rects,
                selected,
                hovered,
                hoveredHandle,
                draftRect,
                dragHandle,
                rotation,
                image
        ])
}
