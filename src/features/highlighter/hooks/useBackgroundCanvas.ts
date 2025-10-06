import { useEffect, useRef } from 'react'
import { Size } from 'shared/api/types'
import { createOffscreenCanvas } from 'shared/canvas'
import { drawBackground } from 'features/highlighter/renderers/backgroundRenderer'

export const useBackgroundCanvas = (size: Size, image: HTMLImageElement | null) => {
        const offscreenRef = useRef<HTMLCanvasElement | null>(null)
        const lastKeyRef = useRef<string>('')

        useEffect(() => {
                if (!size.width || !size.height) return
                if (
                        !offscreenRef.current ||
                        offscreenRef.current.width !== size.width ||
                        offscreenRef.current.height !== size.height
                ) {
                        offscreenRef.current = createOffscreenCanvas(size)
                }
                const offscreen = offscreenRef.current
                const ctx = offscreen.getContext('2d')
                if (!ctx) return
                const key = image?.src ?? 'none'
                if (lastKeyRef.current === key && image?.complete) {
                        return
                }
                drawBackground(ctx, image ?? null, size)
                lastKeyRef.current = key
        }, [size.width, size.height, image])

        return offscreenRef
}
