import { useEffect, useRef } from 'react'

export function useOffscreenBackground(
	canvasSize: { width: number; height: number },
	imgRef: React.MutableRefObject<HTMLImageElement | null>,
	drawBackground: (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) => void
) {
	const offscreenRef = useRef<HTMLCanvasElement | null>(null)
	const lastImageSrc = useRef<string | null>(null)

	useEffect(() => {
		const img = imgRef.current
		if (!img) return
		const needsNew =
			!offscreenRef.current ||
			offscreenRef.current.width !== canvasSize.width ||
			offscreenRef.current.height !== canvasSize.height

		if (needsNew) {
			offscreenRef.current = document.createElement('canvas')
			offscreenRef.current.width = canvasSize.width
			offscreenRef.current.height = canvasSize.height
		}
		if (img.src !== lastImageSrc.current || needsNew) {
			const ctx = offscreenRef.current!.getContext('2d')!
			drawBackground(ctx, img, canvasSize.width, canvasSize.height)
			lastImageSrc.current = img.src
		}
	}, [canvasSize.width, canvasSize.height, imgRef, drawBackground])

	return offscreenRef
}
