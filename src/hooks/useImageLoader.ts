import { DrawImageAndRectangles } from 'utility/DrawImageAndRectangles'
import { RefObject, useEffect, useRef, useState } from 'react'
import { Rect } from 'types/Rect'
import { Canvas } from 'constants/Canvas'
import { NormalizeToPixels } from 'utility/NormalizeToPixels'

export const useImageLoader = (
	imageSrc: string | undefined,
	canvasRef: RefObject<HTMLCanvasElement | null>,
	cores: Rect[] = [],
	setNormalizedRectangles: (rects: Rect[] | ((prev: Rect[]) => Rect[])) => void
) => {
	const imgRef = useRef<HTMLImageElement | null>(null)
	const [canvasSize, setCanvasSize] = useState({
		width: Canvas.DEFAULT_WIDTH,
		height: Canvas.DEFAULT_HEIGHT,
	})
	const [currentCores, setCurrentCores] = useState<Rect[]>([])

	const canvasStyle = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
		canvas.width = Canvas.DEFAULT_WIDTH
		canvas.height = Canvas.DEFAULT_HEIGHT
		setCanvasSize({ width: Canvas.DEFAULT_WIDTH, height: Canvas.DEFAULT_HEIGHT })
		ctx.fillStyle = Canvas.BACKGROUND_COLOR
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		const pixelRects = cores.map(core => NormalizeToPixels(core, canvas.width, canvas.height))
		DrawImageAndRectangles(ctx, null, pixelRects)
	}

	useEffect(() => {
		if (!canvasRef.current) return

		const canvas = canvasRef.current
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

		if (!imageSrc) {
			canvasStyle(canvas, ctx)
			return
		}

		const img = new Image()
		// img.crossOrigin = 'anonymous';
		img.onload = () => {
			canvas.width = img.width
			canvas.height = img.height
			setCanvasSize({ width: img.width, height: img.height })
			imgRef.current = img

			// Сравниваем cores и currentCores — обновляем, только если есть реальные отличия
			const isSame =
				cores.length === currentCores.length &&
				cores.every((rect, i) =>
					rect.length === 4 &&
					currentCores[i] &&
					rect.every((val, j) => val === currentCores[i][j])
				)

			if (!isSame) {
				setNormalizedRectangles(cores)
				setCurrentCores(cores.map(r => [...r])) // клон для изоляции
			}

			const pixelRects = cores.map(core => NormalizeToPixels(core, img.width, img.height))
			DrawImageAndRectangles(ctx, img, pixelRects)
		}

		img.onerror = () => {
			canvasStyle(canvas, ctx)
		}
		img.src = imageSrc

		return () => {
			img.onload = null
			img.onerror = null
		}
	}, [imageSrc, canvasRef, cores, setNormalizedRectangles])

	return { imgRef, canvasSize }
}
