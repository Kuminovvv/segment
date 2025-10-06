import React from 'react'
import { Position } from 'types/Position'

export const GetCanvasCoordinates = (
	event: React.MouseEvent<HTMLCanvasElement>,
	canvas: HTMLCanvasElement
): Position => {
	const rect = canvas.getBoundingClientRect()
	// Вычисляем масштаб между отображаемым размером и внутренним размером canvas
	const scaleX = canvas.width / rect.width
	const scaleY = canvas.height / rect.height
	// Корректируем координаты с учётом масштаба
	const x = (event.clientX - rect.left) * scaleX
	const y = (event.clientY - rect.top) * scaleY
	return { x, y }
}