import { Size } from 'shared/api/types'

export const drawBackground = (
        ctx: CanvasRenderingContext2D,
        image: HTMLImageElement | null,
        size: Size
) => {
        ctx.save()
        ctx.clearRect(0, 0, size.width, size.height)
        ctx.fillStyle = '#111318'
        ctx.fillRect(0, 0, size.width, size.height)
        if (image && image.complete && image.naturalWidth > 0) {
                ctx.drawImage(image, 0, 0, size.width, size.height)
        }
        ctx.restore()
}
