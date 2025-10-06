import { ImageHighlighterProps } from 'types/ImageHighlighterProps'

export interface ExtendedImageHighlighterProps extends ImageHighlighterProps {
	onSelectRect?: (index: number | null) => void;
	onHoverRect?: (index: number | null) => void;
}
