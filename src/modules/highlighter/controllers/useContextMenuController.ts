import { ReactNode, useCallback, useMemo, useState } from 'react'

export interface ContextMenuItem {
        label: string
        onClick: () => void
        icon?: ReactNode
}

interface ContextMenuState {
        isOpen: boolean
        x: number
        y: number
        index: number | null
}

export const useContextMenuController = (addRect: () => void, deleteRect: (index: number) => void) => {
        const [state, setState] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0, index: null })

        const items = useMemo<ContextMenuItem[]>(() => {
                if (!state.isOpen) {
                        return []
                }
                if (state.index == null) {
                        return [
                                {
                                        label: 'Добавить новый сегмент',
                                        onClick: () => {
                                                setState(prev => ({ ...prev, isOpen: false }))
                                                addRect()
                                        }
                                }
                        ]
                }
                return [
                        {
                                label: 'Удалить сегмент',
                                onClick: () => {
                                        deleteRect(state.index)
                                        setState(prev => ({ ...prev, isOpen: false }))
                                }
                        }
                ]
        }, [state, addRect, deleteRect])

        const open = useCallback((x: number, y: number, index: number | null) => {
                setState({ isOpen: true, x, y, index })
        }, [])

        const close = useCallback(() => {
                setState(prev => ({ ...prev, isOpen: false }))
        }, [])

        return { state, items, open, close }
}
