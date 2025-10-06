import { Rect } from 'types/Rect'

export const PixelsToNormalized = (
	rect: Rect,
	canvasWidth: number,
	canvasHeight: number
): Rect => {
	const [x, y, width, height] = rect
	const right = (x + width) / canvasWidth
	const bottom = (y + height) / canvasHeight
	return [
		parseFloat((x / canvasWidth).toFixed(6)),
		parseFloat((y / canvasHeight).toFixed(6)),
		parseFloat(right.toFixed(6)),
		parseFloat(bottom.toFixed(6))
	]
}
