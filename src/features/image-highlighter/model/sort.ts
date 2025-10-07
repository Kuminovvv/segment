import type { Rect, SortDirection, SortOptions, SortBy } from '../types'

export type SortComparator = (a: Rect, b: Rect) => number

const defaultComparator = (by: SortBy): SortComparator => {
  switch (by) {
    case 'top':
      return (a, b) => a[1] - b[1]
    case 'bottom':
      return (a, b) => a[3] - b[3]
    case 'left':
      return (a, b) => a[0] - b[0]
    case 'right':
      return (a, b) => a[2] - b[2]
    case 'area':
      return (a, b) => Math.abs((a[2] - a[0]) * (a[3] - a[1])) - Math.abs((b[2] - b[0]) * (b[3] - b[1]))
    case 'none':
    default:
      return () => 0
  }
}

export interface SortResult {
  rects: Rect[]
  oldToNew: number[]
  newToOld: number[]
}

const toDirection = (dir: SortDirection): 1 | -1 => (dir === 'asc' ? 1 : -1)

export const stableSort = (rects: Rect[], options: SortOptions): SortResult => {
  const comparator = options.comparator ?? defaultComparator(options.by)
  const direction = toDirection(options.dir)

  const decorated = rects.map((rect, index) => ({ rect, index }))
  decorated.sort((left, right) => {
    const base = comparator(left.rect, right.rect)
    if (base !== 0) return base * direction
    return left.index - right.index
  })

  const sorted = decorated.map(item => item.rect)
  const newToOld = decorated.map(item => item.index)
  const oldToNew = Array(rects.length).fill(-1)
  newToOld.forEach((originalIndex, newIndex) => {
    oldToNew[originalIndex] = newIndex
  })

  return { rects: sorted, oldToNew, newToOld }
}

export const DEFAULT_SORT: SortOptions = {
  by: 'bottom',
  dir: 'asc',
}
