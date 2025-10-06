import { SortOptions } from 'hooks/rectSorting'


export interface ImageHighlighterRef {
	// core
	getRectangles(): { boxes: number[][]; cores: number[][] }
	setSelectedRect(index: number | null): void
	setHoveredRect(index: number | null): void
	getSelectedRect(): number | null
	getHoveredRect(): number | null

	// geometry
	normalizeHeights(): void
	addNewRect(): void
	deleteSegment(index: number): void

	// image ops
	rotateImage(angle: number): void
	getRotatedImage(): Promise<Blob | null>

	// sorting (новое API)
	sort(options?: SortOptions): void
	getSortOptions(): SortOptions
	setSortOptions(options: SortOptions): void
	toggleSortDirection(): void
	sortTopToBottom(): void
	sortBottomToTop(): void
	sortLeftToRight(): void
	sortRightToLeft(): void
}
