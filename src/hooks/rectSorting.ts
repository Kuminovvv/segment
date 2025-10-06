// types
import { Rect } from 'types/Rect'

type SortDir = 'asc' | 'desc'
type SortBy = 'top' | 'bottom' | 'left' | 'right' | 'area' | 'none'
export type SortOptions = { by?: SortBy; dir?: SortDir; comparator?: (a: Rect, b: Rect) => number }

const getKey = (r: Rect, by: SortBy) => {
	const [x, y, w, h] = r
	switch (by) {
		case 'top': return y
		case 'bottom': return y + h
		case 'left': return x
		case 'right': return x + w
		case 'area': return Math.abs(w * h)
		default: return 0
	}
}

export function stableSortWithMaps(
	rects: Rect[],
	opts: SortOptions
): { rects: Rect[]; oldToNew: number[]; newToOld: number[] } {
	const by = opts.by ?? 'bottom'
	const dir = opts.dir ?? 'asc'
	const cmp = opts.comparator ?? ((a: Rect, b: Rect) => {
		const av = getKey(a, by); const bv = getKey(b, by)
		if (Number.isNaN(av) && Number.isNaN(bv)) return 0
		if (Number.isNaN(av)) return 1
		if (Number.isNaN(bv)) return -1
		return av === bv ? 0 : (av < bv ? -1 : 1)
	})

	const dec = rects.map((r, i) => ({ r, i }))
	dec.sort((A, B) => {
		const base = cmp(A.r, B.r)
		if (base !== 0) return dir === 'asc' ? base : -base
		return A.i - B.i // стабильность
	})

	const sorted = dec.map(d => d.r)
	const newToOld = dec.map(d => d.i)
	const oldToNew = Array(rects.length)
	newToOld.forEach((oldIdx, newIdx) => { oldToNew[oldIdx] = newIdx })
	return { rects: sorted, oldToNew, newToOld }
}
