import { HandlePosition, Rect, Size } from 'api/types'
import { rectToPixels } from 'utils/geometry'

export interface DrawRectanglesOptions {
        ctx: CanvasRenderingContext2D
        rects: Rect[]
        selected: number | null
        hovered: number | null
        hoveredHandle: HandlePosition
        handleRadius: number
        fontSize: number
        baseLineWidth: number
        selectionLineWidth: number
}

export const drawRectangles = ({
        ctx,
        rects,
        selected,
        hovered,
        hoveredHandle,
        handleRadius,
        fontSize,
        baseLineWidth,
        selectionLineWidth
}: DrawRectanglesOptions, size: Size) => {
        ctx.save()
        ctx.font = `${fontSize}px Arial`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'

        rects.forEach((rect, index) => {
                const [x, y, width, height] = rectToPixels(rect, size)
                const isSelected = selected === index
                const isHovered = hovered === index

                ctx.save()
                ctx.lineWidth = isSelected ? selectionLineWidth : baseLineWidth
                ctx.strokeStyle = isSelected ? '#1D8FF4' : isHovered ? '#b3d9ff' : '#ffffff'
                ctx.strokeRect(x, y, width, height)
                ctx.restore()

                ctx.save()
                ctx.fillStyle = isSelected ? 'rgba(29, 143, 244, 0.15)' : 'rgba(17, 19, 24, 0.25)'
                ctx.fillRect(x, y, width, height)
                ctx.restore()

                ctx.save()
                ctx.fillStyle = isSelected ? '#1D8FF4' : '#ffffff'
                ctx.fillText(String(index + 1), x + fontSize * 0.6, y + fontSize * 0.6)
                ctx.restore()

                if (isSelected) {
                        drawHandles(ctx, rect, size, handleRadius, hoveredHandle)
                }
        })

        ctx.restore()
}

const drawHandles = (
        ctx: CanvasRenderingContext2D,
        rect: Rect,
        size: Size,
        radius: number,
        hoveredHandle: HandlePosition
) => {
        const [x, y, width, height] = rectToPixels(rect, size)
        const handles: Array<{ cx: number; cy: number; pos: HandlePosition }> = [
                { cx: x + width / 2, cy: y, pos: HandlePosition.Top },
                { cx: x + width / 2, cy: y + height, pos: HandlePosition.Bottom },
                { cx: x, cy: y + height / 2, pos: HandlePosition.Left },
                { cx: x + width, cy: y + height / 2, pos: HandlePosition.Right }
        ]

        ctx.save()
        ctx.lineWidth = 2
        handles.forEach(({ cx, cy, pos }) => {
                ctx.beginPath()
                ctx.fillStyle = pos === hoveredHandle ? '#ffb24c' : '#1D8FF4'
                ctx.strokeStyle = pos === hoveredHandle ? '#1D8FF4' : '#ffffff'
                ctx.arc(cx, cy, radius, 0, Math.PI * 2)
                ctx.fill()
                ctx.stroke()
        })
        ctx.restore()
}
