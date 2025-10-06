import { NormalizeToPixels } from 'utility/NormalizeToPixels';
import { GetCanvasCoordinates } from 'utility/GetCanvasCoordinates';
import { IsPointInRectHandle } from 'utility/IsPointInRectHandle';
import { HandlePosition } from 'types/HandlePosition';
import { Canvas } from 'constants/Canvas';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PixelsToNormalized } from 'utility/PixelsToNormalized';
import { Rect } from 'types/Rect';
import { Position } from 'types/Position';
import { throttle } from 'lodash';

export interface CanvasInteractionsProps {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	normalizedRectangles: Rect[];
	setNormalizedRectangles: (rects: Rect[] | ((prev: Rect[]) => Rect[])) => void;
	imgRef: React.MutableRefObject<HTMLImageElement | null>;
	canvasSize: { width: number; height: number };
	onSelectRect?: (index: number | null) => void;
	onHoverRect?: (index: number | null) => void;
	baseLineWidth?: number;
	sortedNormalizedRectangles:()=>void
}

export const useCanvasInteractions = ({
										  canvasRef,
										  normalizedRectangles,
										  setNormalizedRectangles,
										  canvasSize,
										  onSelectRect,
										  onHoverRect,
	                                      sortedNormalizedRectangles,
									  }: CanvasInteractionsProps) => {
	const [isDrawing, setIsDrawing] = useState(false);
	const [startPos, setStartPos] = useState<Position | null>(null);
	const [initialRect, setInitialRect] = useState<Rect | null>(null);
	const [selectedRect, setSelectedRect] = useState<number | null>(null);
	const [hoveredRect, setHoveredRect] = useState<number | null>(null);
	const [hoveredHandle, setHoveredHandle] = useState<HandlePosition>(HandlePosition.None);
	const [dragHandle, setDragHandle] = useState<HandlePosition>(HandlePosition.None);
	const [tempRect, setTempRect] = useState<Rect | null>(null);
	const [mousePos, setMousePos] = useState<Position | null>(null); // State для mousePos

	// Преобразуем нормализованные координаты в пиксельные
	const rectangles = useMemo(() => {
		return normalizedRectangles.map(rect =>
			NormalizeToPixels(rect, canvasSize.width, canvasSize.height)
		);
	}, [normalizedRectangles, canvasSize]);

	// Обновление колбэков
	useEffect(() => {
		onSelectRect?.(selectedRect);
	}, [selectedRect, onSelectRect]);

	useEffect(() => {
		onHoverRect?.(hoveredRect);
	}, [hoveredRect, onHoverRect]);

	const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!canvasRef.current) return;
		const pos = GetCanvasCoordinates(e, canvasRef.current);

		// Проверяем ручки в обратном порядке (сначала выбранный, затем остальные)
		const checkOrder = selectedRect !== null ?
			[selectedRect, ...rectangles.map((_, i) => i).filter(i => i !== selectedRect).reverse()] :
			rectangles.map((_, i) => i).reverse();

		for (const i of checkOrder) {
			if (!rectangles[i]) continue;
			const handle = IsPointInRectHandle(pos, rectangles[i], canvasSize.width);
			if (handle !== HandlePosition.None) {
				setSelectedRect(i);
				setDragHandle(handle);
				setStartPos(pos);
				setInitialRect([...rectangles[i]]);
				return;
			}
		}

		// Если не найдена ручка, начинаем рисование нового прямоугольника
		sortedNormalizedRectangles()
		setDragHandle(HandlePosition.None);
		setSelectedRect(null);
		setStartPos(pos);
		setInitialRect(null);
		setIsDrawing(true);
	}, [canvasRef, rectangles, canvasSize, selectedRect]);


	const handleMouseMove = useCallback(
		throttle((e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!canvasRef.current) return;
			const currentPos = GetCanvasCoordinates(e, canvasRef.current);
			setMousePos(currentPos); // Обновляем mousePos

			let newHoveredRect: number | null = null;
			let newHoveredHandle: HandlePosition = HandlePosition.None;

			// 1. Обработка перетаскивания / изменения размера
			if (selectedRect !== null && startPos && dragHandle !== HandlePosition.None && initialRect) {
				const rect = [...initialRect] as Rect;
				const dx = currentPos.x - startPos.x;
				const dy = currentPos.y - startPos.y;

				switch (dragHandle) {
					case HandlePosition.Inside:
						rect[0] = initialRect[0] + dx;
						rect[1] = initialRect[1] + dy;
						break;
					case HandlePosition.Top:
						rect[1] = initialRect[1] + dy;
						rect[3] = initialRect[3] - dy;
						break;
					case HandlePosition.Bottom:
						rect[3] = initialRect[3] + dy;
						break;
					case HandlePosition.Left:
						rect[0] = initialRect[0] + dx;
						rect[2] = initialRect[2] - dx;
						break;
					case HandlePosition.Right:
						rect[2] = initialRect[2] + dx;
						break;
				}

				// Обеспечиваем минимальный размер и правильное направление
				rect[2] = Math.max(Canvas.MIN_RECT_SIZE, rect[2]);
				rect[3] = Math.max(Canvas.MIN_RECT_SIZE, rect[3]);

				// Корректируем положение, если размер изменился через левую или верхнюю ручку
				if (dragHandle === HandlePosition.Left && rect[2] === Canvas.MIN_RECT_SIZE) {
					rect[0] = initialRect[0] + initialRect[2] - Canvas.MIN_RECT_SIZE;
				}
				if (dragHandle === HandlePosition.Top && rect[3] === Canvas.MIN_RECT_SIZE) {
					rect[1] = initialRect[1] + initialRect[3] - Canvas.MIN_RECT_SIZE;
				}

				setNormalizedRectangles(prev => {
					const updated = [...prev];
					updated[selectedRect] = PixelsToNormalized(rect, canvasSize.width, canvasSize.height);
					return updated;
				});
				newHoveredRect = selectedRect;
				newHoveredHandle = dragHandle;
			}
			// 2. Рисование нового прямоугольника
			else if (isDrawing && startPos) {
				const rect = [
					startPos.x,
					startPos.y,
					currentPos.x - startPos.x,
					currentPos.y - startPos.y,
				] as Rect;
				setTempRect(rect);
			}
			// 3. Проверка ховера (только если не рисуем и не перетаскиваем)
			else {
				const hitboxSize = canvasSize.width > 0 ? Math.max(24, Math.min(80, canvasSize.width * 0.06)) : 24;

				const checkOrder = selectedRect !== null ?
					[selectedRect, ...rectangles.map((_, i) => i).filter(i => i !== selectedRect).reverse()] :
					rectangles.map((_, i) => i).reverse();

				for (const i of checkOrder) {
					const rect = rectangles[i];
					if (!rect) continue;

					const [x, y, width, height] = rect;
					// Увеличиваем область проверки на hitboxSize вокруг прямоугольника
					if (
						currentPos.x >= x - hitboxSize &&
						currentPos.x <= x + width + hitboxSize &&
						currentPos.y >= y - hitboxSize &&
						currentPos.y <= y + height + hitboxSize
					) {
						const handle = IsPointInRectHandle(currentPos, rect, canvasSize.width);
						if (handle !== HandlePosition.None) {
							newHoveredRect = i;
							newHoveredHandle = handle;
							break;
						}
					}
				}
			}

			setHoveredRect(newHoveredRect);
			setHoveredHandle(newHoveredHandle);
		}, 16), // Оптимизация с использованием throttle
		[
			canvasRef, rectangles, normalizedRectangles, setNormalizedRectangles,
			selectedRect, setHoveredRect, setHoveredHandle, setTempRect,
			canvasSize, isDrawing, startPos, dragHandle, initialRect,
		]
	);

	// Очистка throttle при размонтировании
	useEffect(() => {
		return () => {
			handleMouseMove.cancel();
		};
	}, [handleMouseMove]);

	const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!canvasRef.current) return;

		if (isDrawing && startPos) {
			const currentPos = GetCanvasCoordinates(e, canvasRef.current);
			const rawRect: Rect = [
				startPos.x,
				startPos.y,
				currentPos.x - startPos.x,
				currentPos.y - startPos.y,
			];

			// Нормализуем координаты нового прямоугольника, учитывая, что width/height могут быть отрицательными
			const normalized: Rect = [
				Math.min(rawRect[0], rawRect[0] + rawRect[2]),
				Math.min(rawRect[1], rawRect[1] + rawRect[3]),
				Math.max(rawRect[0], rawRect[0] + rawRect[2]),
				Math.max(rawRect[1], rawRect[1] + rawRect[3]),
			];

			const finalWidth = normalized[2] - normalized[0];
			const finalHeight = normalized[3] - normalized[1];

			if (finalWidth > Canvas.MIN_RECT_SIZE && finalHeight > Canvas.MIN_RECT_SIZE) {
				setNormalizedRectangles(prev => {
					const newNormalizedRect = PixelsToNormalized(
						[normalized[0], normalized[1], finalWidth, finalHeight],
						canvasSize.width,
						canvasSize.height
					);
					const newNormalizedRectangles = [...prev, newNormalizedRect];
					setSelectedRect(newNormalizedRectangles.length - 1);
					return newNormalizedRectangles;
				});
			}
			setIsDrawing(false);
			setTempRect(null);
		}

		setStartPos(null);
		setInitialRect(null);
		setDragHandle(HandlePosition.None);
	}, [isDrawing, startPos, canvasRef, canvasSize, setNormalizedRectangles, setSelectedRect]);

	const handleBlur = useCallback(() => {
		setHoveredRect(null);
		setHoveredHandle(HandlePosition.None);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setHoveredRect(null);
		setHoveredHandle(HandlePosition.None);
		if (isDrawing) {
			setIsDrawing(false);
			setTempRect(null);
		}
	}, [isDrawing]);

	return {
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleBlur,
		handleMouseLeave,
		selectedRect,
		setSelectedRect,
		hoveredRect,
		setHoveredRect,
		hoveredHandle,
		dragHandle,
		tempRect,
		mousePos, // Возвращаем mousePos
	};
};