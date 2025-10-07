import { useEffect, useRef } from 'react'

export const useOffscreenBackground = (
  canvasSize: { width: number; height: number },
  imgRef: React.MutableRefObject<HTMLImageElement | null>,
  draw: (ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number) => void,
): React.MutableRefObject<HTMLCanvasElement | null> => {
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const lastImageSrc = useRef<string | null>(null)

  useEffect(() => {
    const image = imgRef.current
    if (!image) return

    const needsRecreate =
      !offscreenRef.current ||
      offscreenRef.current.width !== canvasSize.width ||
      offscreenRef.current.height !== canvasSize.height

    if (needsRecreate) {
      offscreenRef.current = document.createElement('canvas')
      offscreenRef.current.width = canvasSize.width
      offscreenRef.current.height = canvasSize.height
    }

    if (!offscreenRef.current) return

    if (needsRecreate || image.src !== lastImageSrc.current) {
      const ctx = offscreenRef.current.getContext('2d')
      if (!ctx) return
      draw(ctx, image, canvasSize.width, canvasSize.height)
      lastImageSrc.current = image.src
    }
  }, [canvasSize.width, canvasSize.height, imgRef, draw])

  return offscreenRef
}
