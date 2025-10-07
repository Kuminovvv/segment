import { useEffect, useRef, useState } from 'react'
import { CANVAS_CONFIG } from '../model/config'
import { drawBackground } from '../drawing/background'

interface UseImageLoaderOptions {
  image?: string
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export const useImageLoader = ({ image, canvasRef }: UseImageLoaderOptions) => {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_CONFIG.defaultWidth, height: CANVAS_CONFIG.defaultHeight })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!image) {
      canvas.width = CANVAS_CONFIG.defaultWidth
      canvas.height = CANVAS_CONFIG.defaultHeight
      setCanvasSize({ width: CANVAS_CONFIG.defaultWidth, height: CANVAS_CONFIG.defaultHeight })
      drawBackground(ctx, null, canvas.width, canvas.height)
      return
    }

    const element = new Image()
    element.onload = () => {
      canvas.width = element.width
      canvas.height = element.height
      setCanvasSize({ width: element.width, height: element.height })
      imgRef.current = element
      drawBackground(ctx, element, element.width, element.height)
    }

    element.onerror = () => {
      canvas.width = CANVAS_CONFIG.defaultWidth
      canvas.height = CANVAS_CONFIG.defaultHeight
      setCanvasSize({ width: CANVAS_CONFIG.defaultWidth, height: CANVAS_CONFIG.defaultHeight })
      drawBackground(ctx, null, canvas.width, canvas.height)
    }

    element.src = image

    return () => {
      element.onload = null
      element.onerror = null
    }
  }, [image, canvasRef])

  return { imgRef, canvasSize }
}
