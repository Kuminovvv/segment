// Функция для проверки, находится ли курсор над рамкой
import { Position } from 'types/Position'
import { Rect } from 'types/Rect'

export const IsPointInRect = (
	pos: Position,
	rect: Rect
): boolean => {
	const [x, y, width, height] = rect
	return pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height
}
