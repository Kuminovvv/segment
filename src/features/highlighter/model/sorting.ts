import { Rect, SortAxis, SortDirection, SortOptions } from 'shared/api/types'

const getAxisValue = (rect: Rect, axis: SortAxis) => {
        const [x1, y1, x2, y2] = rect
        switch (axis) {
                case 'top':
                        return y1
                case 'bottom':
                        return y2
                case 'left':
                        return x1
                case 'right':
                        return x2
                case 'area':
                        return Math.abs((x2 - x1) * (y2 - y1))
                default:
                        return 0
        }
}

export const defaultSortOptions: Required<Omit<SortOptions, 'comparator'>> = {
        by: 'bottom',
        dir: 'asc'
}

export interface SortResult {
        rects: Rect[]
        oldToNew: number[]
        newToOld: number[]
}

export function stableSort(rects: Rect[], options: SortOptions): SortResult {
        const { by, dir, comparator } = {
                ...defaultSortOptions,
                ...options
        }
        if (by === 'none') {
                const identity = rects.map((_, index) => index)
                return { rects: [...rects], oldToNew: identity, newToOld: identity }
        }
        const cmp = comparator ?? ((a: Rect, b: Rect) => {
                const av = getAxisValue(a, by)
                const bv = getAxisValue(b, by)
                if (Number.isNaN(av) && Number.isNaN(bv)) return 0
                if (Number.isNaN(av)) return 1
                if (Number.isNaN(bv)) return -1
                if (av === bv) return 0
                return av < bv ? -1 : 1
        })

        const decorated = rects.map((rect, index) => ({ rect, index }))
        decorated.sort((left, right) => {
                const value = cmp(left.rect, right.rect)
                if (value !== 0) {
                        return dir === 'asc' ? value : -value
                }
                return left.index - right.index
        })

        const sorted = decorated.map(item => item.rect)
        const newToOld = decorated.map(item => item.index)
        const oldToNew = Array(rects.length)
        newToOld.forEach((oldIndex, newIndex) => {
                oldToNew[oldIndex] = newIndex
        })

        return { rects: sorted, oldToNew, newToOld }
}
