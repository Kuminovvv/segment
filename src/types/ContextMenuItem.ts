import React from 'react'

export type ContextMenuItem = {
	label: string;
	onClick: () => void;
	leftSide?: React.ReactNode;
};
