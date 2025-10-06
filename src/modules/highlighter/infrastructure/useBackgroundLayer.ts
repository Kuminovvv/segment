import { useEffect, useRef } from 'react'

import { createOffscreenCanvas } from 'core/canvas'
import { Size } from 'core/types'

import { drawBackground } from '../renderers/backgroundRenderer'

export const useBackgroundLayer = (size: Size, image: HTMLImageElement | null) => {
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
