import { HandlePosition, Rect, Size } from 'api/types'
import { rectToPixels } from 'utils/geometry'

export const drawMagnifier = (
        ctx: CanvasRenderingContext2D,
        image: HTMLImageElement | null,
        rect: Rect,
        handle: HandlePosition,
        size: Size
) => {
        if (!image || !image.complete || image.naturalWidth === 0) {
                return
        }
        const [x, y, width, height] = rectToPixels(rect, size)
        let sampleX = x
        let sampleY = y

        switch (handle) {
                case HandlePosition.Top:
                        sampleX += width / 2
                        sampleY = y
                        break
                case HandlePosition.Bottom:
                        sampleX += width / 2
                        sampleY = y + height
                        break
                case HandlePosition.Left:
                        sampleX = x
                        sampleY += height / 2
                        break
                case HandlePosition.Right:
                        sampleX = x + width
                        sampleY += height / 2
                        break
                default:
                        return
        }

        const magnifierSize = 140
        const magnifierX = Math.min(size.width - magnifierSize - 16, Math.max(16, sampleX - magnifierSize / 2))
        const magnifierY = Math.min(size.height - magnifierSize - 16, Math.max(16, sampleY - magnifierSize / 2))

        const sampleSize = 40
        const sx = (sampleX / size.width) * image.naturalWidth - sampleSize / 2
        const sy = (sampleY / size.height) * image.naturalHeight - sampleSize / 2

        ctx.save()
        ctx.beginPath()
        ctx.rect(magnifierX, magnifierY, magnifierSize, magnifierSize)
        ctx.clip()
        ctx.drawImage(
                image,
                sx,
                sy,
                sampleSize,
                sampleSize,
                magnifierX,
                magnifierY,
                magnifierSize,
                magnifierSize
        )
        ctx.restore()

        ctx.save()
        ctx.strokeStyle = '#1D8FF4'
        ctx.lineWidth = 2
        ctx.strokeRect(magnifierX, magnifierY, magnifierSize, magnifierSize)
        ctx.restore()
}
