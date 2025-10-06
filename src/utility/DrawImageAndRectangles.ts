import { Canvas } from 'constants/Canvas';
import { Rect } from 'types/Rect';
import { DrawBackground } from './DrawBackground';
import { DrawTempRect } from './DrawTempRect';

export const DrawImageAndRectangles = (
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement | null,
	rectangles: Rect[],
	selectedRect: number | null = null,
	hoveredRect: number | null = null,
	// hoveredHandle: HandlePosition = HandlePosition.None, // Удален, так как не используется
	tempRect: Rect | null = null,
	lineWidth: number = 2,
	offscreenCanvas: HTMLCanvasElement | null = null
) => {
	const canvasWidth = ctx.canvas.width;
	const canvasHeight = ctx.canvas.height;

	// Использование offscreenCanvas для отрисовки фона (изображения + тени)
	if (offscreenCanvas) {
		ctx.drawImage(offscreenCanvas, 0, 0);
	} else {
		DrawBackground(ctx, img, canvasWidth, canvasHeight);
	}

	// Отрисовка всех прямоугольников
	rectangles.forEach((rect, index) => {
		const [x, y, width, height] = rect;

		// Пропускаем прямоугольники вне канваса
		if (x + width < 0 || x > canvasWidth || y + height < 0 || y > canvasHeight) {
			return;
		}

		ctx.save();
		ctx.beginPath();
		ctx.rect(x, y, width, height);
		ctx.clip(); // Обрезаем изображение по форме прямоугольника

		// Отрисовываем часть изображения, попадающую в прямоугольник
		if (img) {
			ctx.drawImage(img, 0, 0);
		}

		ctx.restore();

		// Обводка
		ctx.save();
		ctx.strokeStyle = Canvas.DEFAULT_STROKE_COLOR;
		ctx.lineWidth = lineWidth;

		if (index === selectedRect) {
			ctx.strokeStyle = Canvas.SELECTED_STROKE_COLOR;
			ctx.lineWidth = lineWidth * 1.5;
		} else if (index === hoveredRect) {
			ctx.strokeStyle = Canvas.HOVER_STROKE_COLOR;
		}
		ctx.strokeRect(x, y, width, height);
		ctx.restore();
	});

	// Отрисовка временного прямоугольника (при рисовании нового)
	DrawTempRect(ctx, tempRect, lineWidth);
};
