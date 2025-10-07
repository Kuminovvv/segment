import type { SortComparator } from '../model/sort'

export type Rect = [number, number, number, number]

export interface PixelRect {
  x: number
  y: number
  width: number
  height: number
}

export enum HandlePosition {
  None = 'none',
  Top = 'top',
  Bottom = 'bottom',
  Left = 'left',
  Right = 'right',
  Inside = 'inside',
}

export type SortDirection = 'asc' | 'desc'
export type SortBy = 'top' | 'bottom' | 'left' | 'right' | 'area' | 'none'

export interface SortOptions {
  by: SortBy
  dir: SortDirection
  comparator?: SortComparator
}

export interface ContextMenuItem {
  label: string
  onClick: () => void
  leftSide?: React.ReactNode
}

export interface ImageHighlighterProps {
  /** Ссылка на изображение */
  image?: string
  /** Список нормализованных прямоугольников [x1, y1, x2, y2] */
  cores?: Rect[]
  /** Колбэк на изменение нормализованных прямоугольников */
  onCoresChange?: (cores: Rect[]) => void
}

export interface ExtendedImageHighlighterProps extends ImageHighlighterProps {
  onSelectRect?: (index: number | null) => void
  onHoverRect?: (index: number | null) => void
}

export interface ImageHighlighterRef {
  getRectangles(): { boxes: Rect[]; cores: Rect[] }
  setSelectedRect(index: number | null): void
  setHoveredRect(index: number | null): void
  getSelectedRect(): number | null
  getHoveredRect(): number | null
  normalizeHeights(): void
  addNewRect(): void
  deleteSegment(index: number): void
  rotateImage(angle: number): void
  getRotatedImage(): Promise<Blob | null>
  sort(options?: Partial<SortOptions>): void
  getSortOptions(): SortOptions
  setSortOptions(options: Partial<SortOptions>): void
  toggleSortDirection(): void
  sortTopToBottom(): void
  sortBottomToTop(): void
  sortLeftToRight(): void
  sortRightToLeft(): void
}
