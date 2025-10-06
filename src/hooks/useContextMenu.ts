import { useMemo, useState, useCallback } from 'react'
import { ContextMenuItem } from 'types/ContextMenuItem'

export function useContextMenu(
	addRect: () => void,
	delRectByIndex: (idx: number) => void
) {
	const [pos, setPos] = useState<{x:number;y:number}|null>(null)
	const [segmentIndex, setIndex] = useState<number|null>(null)

	const items = useMemo<ContextMenuItem[]>(() => {
		if (segmentIndex == null) {
			return [{ label: 'Добавить новый блок', onClick: addRect }]
		}
		return [{ label: 'Удалить сегмент', onClick: () => delRectByIndex(segmentIndex) }]
	}, [segmentIndex, addRect, delRectByIndex])

	const openAt = useCallback((x:number,y:number, idx:number|null) => {
		setPos({x,y}); setIndex(idx)
	}, [])
	const close = useCallback(() => { setPos(null); setIndex(null) }, [])

	return { pos, segmentIndex, items, openAt, close }
}
