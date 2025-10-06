const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const ScaleUtils = (referenceWidth: number) => {
	const safeWidth = Math.max(100, referenceWidth);

	return {
		getLineWidth: (zoom = 1) => clamp((safeWidth * 0.002) / zoom, 2, 10),
		getSelectedLineWidth: (zoom = 1) => clamp((safeWidth * 0.002) / zoom, 2, 10) * 1.5,
		getFontSize: (zoom = 1) => clamp((safeWidth * 0.02) / zoom, 12, 64),
		getHandleSize: (zoom = 1) => clamp((safeWidth * 0.01) / zoom, 12, 40),
		getMagnifierSize: (zoom = 1) => clamp((safeWidth * 0.1) / zoom, 100, 450),
	};
};
