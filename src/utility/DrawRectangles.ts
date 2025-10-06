import { HandlePosition } from 'types/HandlePosition';
import { Canvas } from 'constants/Canvas';
import { Rect } from 'types/Rect';

export const DrawRectangles = (
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement | null,
	rectangles: Rect[],
	selectedRect: number | null = null,
	hoveredRect: number | null = null,
	hoveredHandle: HandlePosition = HandlePosition.None,
	lineWidth: number = 2
) => {
	const handleSize = Math.max(6, lineWidth * 2);
	const hoveredHandleSize = handleSize * 1.5;

	// Рендерим обычные прямоугольники
	ctx.strokeStyle = Canvas.DEFAULT_STROKE_COLOR;
	ctx.lineWidth = lineWidth;
	rectangles.forEach((rect, index) => {
		if (index === selectedRect || index === hoveredRect) return;
		const [x, y, width, height] = rect;
		// Пропускаем прямоугольники вне канваса
		if (
			x + width < 0 ||
			x > ctx.canvas.width ||
			y + height < 0 ||
			y > ctx.canvas.height
		) {
			return;
		}

		if (img) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(x, y, width, height);
			ctx.clip();
			ctx.drawImage(img, 0, 0);
			ctx.restore();
		}
		ctx.strokeRect(x, y, width, height);
	});

	// Рендерим наведённый прямоугольник
	if (
		hoveredRect !== null &&
		hoveredRect !== selectedRect &&
		hoveredRect >= 0 &&
		hoveredRect < rectangles.length &&
		rectangles[hoveredRect]
	) {
		const [x, y, width, height] = rectangles[hoveredRect];
		if (
			x + width >= 0 &&
			x <= ctx.canvas.width &&
			y + height >= 0 &&
			y <= ctx.canvas.height
		) {
			if (img) {
				ctx.save();
				ctx.beginPath();
				ctx.rect(x, y, width, height);
				ctx.clip();
				ctx.drawImage(img, 0, 0);
				ctx.restore();
			}
			ctx.strokeStyle = Canvas.HOVER_STROKE_COLOR;
			ctx.lineWidth = lineWidth;
			ctx.strokeRect(x, y, width, height);
		}
	}

	// Рендерим выбранный прямоугольник и ручки
	if (
		selectedRect !== null &&
		selectedRect >= 0 &&
		selectedRect < rectangles.length &&
		rectangles[selectedRect]
	) {
		const [x, y, width, height] = rectangles[selectedRect];
		if (
			x + width >= 0 &&
			x <= ctx.canvas.width &&
			y + height >= 0 &&
			y <= ctx.canvas.height
		) {
			if (img) {
				ctx.save();
				ctx.beginPath();
				ctx.rect(x, y, width, height);
				ctx.clip();
				ctx.drawImage(img, 0, 0);
				ctx.restore();
			}
			ctx.strokeStyle = Canvas.SELECTED_STROKE_COLOR;
			ctx.lineWidth = lineWidth * 1.5;
			ctx.strokeRect(x, y, width, height);

			const handles = [
				{ x: x + width / 2, y: y, position: HandlePosition.Top, size: handleSize },
				{ x: x + width / 2, y: y + height, position: HandlePosition.Bottom, size: handleSize },
				{ x: x, y: y + height / 2, position: HandlePosition.Left, size: handleSize },
				{ x: x + width, y: y + height / 2, position: HandlePosition.Right, size: handleSize },
			];

			ctx.fillStyle = Canvas.DEFAULT_HANDLE_COLOR;
			handles.forEach(({ x: hx, y: hy, size }) => {
				ctx.fillRect(hx - size / 2, hy - size / 2, size, size);
			});

			const hovered = handles.find(h => h.position === hoveredHandle);
			if (hovered) {
				ctx.fillStyle = Canvas.HOVER_HANDLE_COLOR;
				ctx.fillRect(
					hovered.x - hoveredHandleSize / 2,
					hovered.y - hoveredHandleSize / 2,
					hoveredHandleSize,
					hoveredHandleSize
				);
			}
		}
	}
};
