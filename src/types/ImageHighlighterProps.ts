import { Rect } from 'types/Rect'

export interface ImageHighlighterProps {
	image?: string;
	cores?: Rect[]; // [x, y, right, bottom] нормализованные
	onCoresChange?: (cores: number[][]) => void; // Callback для уведомления об изменении cores
}