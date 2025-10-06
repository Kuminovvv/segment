// Функции отрисовки
import { Canvas } from 'constants/Canvas'

export const DrawBackground = (
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement | null,
	canvasWidth: number,
	canvasHeight: number
) => {
	ctx.clearRect(0, 0, canvasWidth, canvasHeight)
	if (img) {
		ctx.drawImage(img, 0, 0)
		ctx.fillStyle = Canvas.SHADOW_COLOR
		ctx.fillRect(0, 0, canvasWidth, canvasHeight)
	} else {
		ctx.fillStyle = Canvas.BACKGROUND_COLOR
		ctx.fillRect(0, 0, canvasWidth, canvasHeight)
	}
}