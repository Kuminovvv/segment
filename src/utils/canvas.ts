import { Size } from 'api/types'

export const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width
        const y = (event.clientY - rect.top) / rect.height
        return { x, y }
}

export const createOffscreenCanvas = (size: Size) => {
        const canvas = document.createElement('canvas')
        canvas.width = size.width
        canvas.height = size.height
        return canvas
}
