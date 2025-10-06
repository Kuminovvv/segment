import { Canvas } from 'constants/Canvas';
import { Rect } from 'types/Rect';

export const DrawTempRect = (
	ctx: CanvasRenderingContext2D,
	tempRect: Rect | null | undefined,
	lineWidth: number = 2 // Новый параметр для динамической толщины линии
) => {
	if (tempRect) {
		const [x, y, width, height] = tempRect;
		ctx.strokeStyle = Canvas.DEFAULT_STROKE_COLOR;
		ctx.lineWidth = lineWidth; // Используем динамическую толщину
		ctx.strokeRect(x, y, width, height);
	}
};
