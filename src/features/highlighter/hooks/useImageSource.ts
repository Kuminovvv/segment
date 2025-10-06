import { useCallback, useEffect, useRef, useState } from 'react'
import { Size } from 'shared/api/types'

interface ImageState {
        element: HTMLImageElement | null
        size: Size
        status: 'idle' | 'loading' | 'ready' | 'error'
}

const FALLBACK_SIZE: Size = { width: 1280, height: 720 }

export const useImageSource = (src?: string | null) => {
        const [state, setState] = useState<ImageState>({ element: null, size: FALLBACK_SIZE, status: 'idle' })
        const lastSrc = useRef<string | undefined | null>(null)

        useEffect(() => {
                if (!src) {
                        setState(prev => ({ ...prev, status: 'idle', element: null, size: FALLBACK_SIZE }))
                        lastSrc.current = null
                        return
                }

                if (lastSrc.current === src && state.status === 'ready') {
                        return
                }

                lastSrc.current = src
                setState(prev => ({ ...prev, status: 'loading' }))

                const img = new Image()
                img.onload = () => {
                        setState({ element: img, size: { width: img.naturalWidth, height: img.naturalHeight }, status: 'ready' })
                }
                img.onerror = () => {
                        setState({ element: null, size: FALLBACK_SIZE, status: 'error' })
                }
                img.src = src

                return () => {
                        img.onload = null
                        img.onerror = null
                }
        }, [src, state.status])

        const setSizeManually = useCallback((size: Size) => {
                setState(prev => ({ ...prev, size }))
        }, [])

        return { ...state, setSizeManually }
}
