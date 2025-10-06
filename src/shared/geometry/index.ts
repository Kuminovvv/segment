import { HandlePosition, Rect, Size } from 'shared/api/types'

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const normalizeRect = (start: { x: number; y: number }, end: { x: number; y: number }): Rect => {
        const left = Math.min(start.x, end.x)
        const top = Math.min(start.y, end.y)
        const right = Math.max(start.x, end.x)
        const bottom = Math.max(start.y, end.y)
        return [left, top, right, bottom]
}

export const rectToPixels = (rect: Rect, size: Size): Rect => {
        const [x1, y1, x2, y2] = rect
        return [x1 * size.width, y1 * size.height, (x2 - x1) * size.width, (y2 - y1) * size.height]
}

export const rectToNormalized = (rect: Rect, size: Size): Rect => {
        const [x, y, width, height] = rect
        const right = (x + width) / size.width
        const bottom = (y + height) / size.height
        return [
                Number((x / size.width).toFixed(6)),
                Number((y / size.height).toFixed(6)),
                Number(right.toFixed(6)),
                Number(bottom.toFixed(6))
        ]
}

export const ensureMinSize = (rect: Rect, min: number, size: Size): Rect => {
        let [x, y, right, bottom] = rect
        if (right - x < min) {
                const center = (x + right) / 2
                x = clamp(center - min / 2, 0, 1)
                right = clamp(center + min / 2, 0, 1)
        }
        if (bottom - y < min) {
                const center = (y + bottom) / 2
                y = clamp(center - min / 2, 0, 1)
                bottom = clamp(center + min / 2, 0, 1)
        }
        return [x, y, right, bottom]
}

export const clampRect = (rect: Rect): Rect => {
        const [x1, y1, x2, y2] = rect
        return [clamp(x1, 0, 1), clamp(y1, 0, 1), clamp(x2, 0, 1), clamp(y2, 0, 1)]
}

export const isPointInsideRect = (point: { x: number; y: number }, rect: Rect) => {
        const [x1, y1, x2, y2] = rect
        return point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2
}

export const detectHandle = (
        point: { x: number; y: number },
        rect: Rect,
        size: Size,
        handleRadius: number
): HandlePosition => {
        const pxRect = rectToPixels(rect, size)
        const [x, y, width, height] = pxRect
        const cx = x + width / 2
        const cy = y + height / 2
        const radius = handleRadius

        const isInsideCircle = (cxp: number, cyp: number) => {
                const dx = point.x * size.width - cxp
                const dy = point.y * size.height - cyp
                return Math.sqrt(dx * dx + dy * dy) <= radius
        }

        if (isInsideCircle(cx, y)) return HandlePosition.Top
        if (isInsideCircle(cx, y + height)) return HandlePosition.Bottom
        if (isInsideCircle(x, cy)) return HandlePosition.Left
        if (isInsideCircle(x + width, cy)) return HandlePosition.Right
        if (isPointInsideRect(point, rect)) return HandlePosition.Inside
        return HandlePosition.None
}

export const rotateAroundCenter = (point: { x: number; y: number }, angle: number) => {
        if (angle === 0) return point
        const rad = (-angle * Math.PI) / 180
        const cx = 0.5
        const cy = 0.5
        const dx = point.x - cx
        const dy = point.y - cy
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        return {
                x: dx * cos - dy * sin + cx,
                y: dx * sin + dy * cos + cy
        }
}
