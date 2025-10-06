import { SortOptions } from 'core/sorting'

export type Rect = [number, number, number, number]

export interface Size {
        width: number
        height: number
}

export enum HandlePosition {
        None = 'none',
        Inside = 'inside',
        Top = 'top',
        Bottom = 'bottom',
        Left = 'left',
        Right = 'right'
}

export interface ImageHighlighterProps {
        image?: string
        cores?: Rect[]
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
        sort(options?: SortOptions): void
        getSortOptions(): SortOptions
        setSortOptions(options: SortOptions): void
        toggleSortDirection(): void
        sortTopToBottom(): void
        sortBottomToTop(): void
        sortLeftToRight(): void
        sortRightToLeft(): void
}
