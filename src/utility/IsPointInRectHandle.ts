import { Position } from 'types/Position'
import { HandlePosition } from 'types/HandlePosition'
import { Rect } from 'types/Rect'

export const IsPointInRectHandle = (
	pos: Position,
	rect: Rect,
	referenceWidth: number = 1000
): HandlePosition => {
	const [x, y, width, height] = rect
	// Размер области захвата как 6% от ширины изображения
	const hitboxSize = referenceWidth > 0
		? Math.max(24, Math.min(80, referenceWidth * 0.06))
		: 24
	const halfHitbox = hitboxSize / 2

	// Определяем центры ручек (синхронизировано с drawHandles)
	const handles = [
		{ x: x + width / 2, y: y, position: HandlePosition.Top },
		{ x: x + width / 2, y: y + height, position: HandlePosition.Bottom },
		{ x: x, y: y + height / 2, position: HandlePosition.Left },
		{ x: x + width, y: y + height / 2, position: HandlePosition.Right }
	]

	// Проверяем расстояние до центра каждой ручки
	for (const { x: hx, y: hy, position } of handles) {
		const dx = pos.x - hx
		const dy = pos.y - hy
		if (Math.sqrt(dx * dx + dy * dy) < halfHitbox) {
			return position
		}
	}

	// Проверка внутри прямоугольника только если не попали по ручке
	const isInside =
		pos.x > x && pos.x < x + width && pos.y > y && pos.y < y + height
	if (isInside) {
		return HandlePosition.Inside
	}

	return HandlePosition.None
}