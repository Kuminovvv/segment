
import { HandlePosition } from 'types/HandlePosition';
import { Canvas } from 'constants/Canvas';
import { Rect } from 'types/Rect';

export const DrawMagnifier = (
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement | null,
	rect: Rect,
	dragHandle: HandlePosition.Top | HandlePosition.Bottom | HandlePosition.Left | HandlePosition.Right | undefined,
	canvasWidth: number,
	canvasHeight: number,
	lineWidth: number,
	magnifierSize: number,
) => {
	if (!dragHandle) return;

	const [x, y, width, height] = rect;
	const magnification = Canvas.MAGNIFICATION;
	const magnifierRadius = magnifierSize / 2;
	const offset = magnifierRadius + 10; // Смещение лупы от линии

	// Определяем позицию лупы над активной ручкой
	let magnifierX: number, magnifierY: number;
	let sourceX: number, sourceY: number;

	switch (dragHandle) {
		case HandlePosition.Top:
			magnifierX = x + width / 2;
			magnifierY = y - offset; // Лупа выше верхней линии
			sourceX = x + width / 2 - magnifierRadius / magnification;
			sourceY = y - magnifierRadius / magnification;
			break;
		case HandlePosition.Bottom:
			magnifierX = x + width / 2;
			magnifierY = y + height + offset; // Лупа ниже нижней линии
			sourceX = x + width / 2 - magnifierRadius / magnification;
			sourceY = (y + height) - magnifierRadius / magnification;
			break;
		case HandlePosition.Left:
			magnifierX = x - offset; // Лупа левее левой линии
			magnifierY = y + height / 2;
			sourceX = x - magnifierRadius / magnification;
			sourceY = (y + height / 2) - magnifierRadius / magnification;
			break;
		case HandlePosition.Right:
			magnifierX = x + width + offset; // Лупа правее правой линии
			magnifierY = y + height / 2;
			sourceX = (x + width) - magnifierRadius / magnification;
			sourceY = (y + height / 2) - magnifierRadius / magnification;
			break;
		default:
			return;
	}

	// Корректировка позиции, чтобы лупа не выходила за границы канваса
	const clampedX = Math.min(Math.max(magnifierX, magnifierRadius), canvasWidth - magnifierRadius);
	const clampedY = Math.min(Math.max(magnifierY, magnifierRadius), canvasHeight - magnifierRadius);

	// Размеры области увеличения
	const sourceWidth = magnifierSize / magnification;
	const sourceHeight = magnifierSize / magnification;

	// Отрисовка лупы
	ctx.save();
	ctx.beginPath();
	ctx.arc(clampedX, clampedY, magnifierRadius, 0, Math.PI * 2);
	ctx.clip();

	if (img) {
		ctx.drawImage(
			img,
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight,
			clampedX - magnifierRadius,
			clampedY - magnifierRadius,
			magnifierSize,
			magnifierSize
		);
	} else {
		ctx.fillStyle = Canvas.BACKGROUND_COLOR;
		ctx.fillRect(clampedX - magnifierRadius, clampedY - magnifierRadius, magnifierSize, magnifierSize);
	}

	// Отрисовка увеличенного прямоугольника
	const magnifiedRectX = (x - sourceX) * magnification + (clampedX - magnifierRadius);
	const magnifiedRectY = (y - sourceY) * magnification + (clampedY - magnifierRadius);
	const magnifiedRectWidth = width * magnification;
	const magnifiedRectHeight = height * magnification;

	// Масштабированная толщина линии
	const magnifiedLineWidth = lineWidth * magnification;

	ctx.strokeStyle = Canvas.SELECTED_STROKE_COLOR;
	ctx.lineWidth = magnifiedLineWidth;
	ctx.strokeRect(magnifiedRectX, magnifiedRectY, magnifiedRectWidth, magnifiedRectHeight);

	// Рисуем рамку лупы
	ctx.restore();
	ctx.beginPath();
	ctx.arc(clampedX, clampedY, magnifierRadius, 0, Math.PI * 2);
	ctx.strokeStyle = Canvas.DEFAULT_STROKE_COLOR;
	ctx.lineWidth = magnifiedLineWidth;
	ctx.stroke();

	ctx.restore();
};