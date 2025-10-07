import { useCallback, useMemo, useState } from 'react'
import type { ContextMenuItem } from '../types'

export interface ContextMenuState {
  position: { x: number; y: number } | null
  items: ContextMenuItem[]
  segmentIndex: number | null
  open: (clientX: number, clientY: number, segmentIndex: number | null) => void
  close: () => void
}

export const useContextMenu = (options: {
  onAdd: () => void
  onDelete: (index: number) => void
}): ContextMenuState => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [segmentIndex, setSegmentIndex] = useState<number | null>(null)

  const close = useCallback(() => {
    setPosition(null)
    setSegmentIndex(null)
  }, [])

  const open = useCallback(
    (clientX: number, clientY: number, index: number | null) => {
      setPosition({ x: clientX, y: clientY })
      setSegmentIndex(index)
    },
    [],
  )

  const items = useMemo<ContextMenuItem[]>(() => {
    const base: ContextMenuItem[] = [
      { label: 'Добавить сегмент', onClick: options.onAdd },
    ]

    if (segmentIndex !== null) {
      base.push({ label: 'Удалить сегмент', onClick: () => options.onDelete(segmentIndex) })
    }

    return base
  }, [options.onAdd, options.onDelete, segmentIndex])

  return { position, items, segmentIndex, open, close }
}
