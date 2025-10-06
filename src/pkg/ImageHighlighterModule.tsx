import React, { forwardRef, useRef, useEffect, useState, useCallback, useImperativeHandle, useMemo } from 'react'
import { HandlePosition } from 'types/HandlePosition'
import { NormalizeToPixels } from 'utility/NormalizeToPixels'
import { DrawImageAndRectangles } from 'utility/DrawImageAndRectangles'
import { useImageLoader } from 'hooks/useImageLoader'
import { useCanvasInteractions } from 'hooks/useCanvasInteractions'
import { Rect } from 'types/Rect'
import { GetCanvasCoordinates } from 'utility/GetCanvasCoordinates'
import { IsPointInRect } from 'utility/IsPointInRect'
import { ContextMenu } from '@consta/uikit/ContextMenu'
import { IconTrash } from '@consta/icons/IconTrash'
import { ScaleUtils } from 'utility/ScaleUtils'
import { ImageHighlighterRef } from 'types/ImageHighlighterRef'
import { ExtendedImageHighlighterProps } from 'types/ExtendedImageHighlighterProps'
import { DrawBackground } from 'utility/DrawBackground'
import { DrawMagnifier } from 'utility/DrawMagnifier'
import { useOffscreenBackground } from 'hooks/useOffscreenBackground'
import { SortOptions, stableSortWithMaps } from 'hooks/rectSorting'
import { useContextMenu } from 'hooks/useContextMenu'

export const ImageHighlighterModule = forwardRef<ImageHighlighterRef, ExtendedImageHighlighterProps>(
	(props, ref) => {
		const { image, cores = [], onCoresChange, onSelectRect, onHoverRect } = props

		const canvasRef = useRef<HTMLCanvasElement | null>(null)

		const [rects, setRects] = useState<Rect[]>([])
		const [prevCores, setPrevCores] = useState<number[][]>([])
		const [rotationAngle, setRotationAngle] = useState<number>(0)


		const { imgRef, canvasSize } = useImageLoader(image, canvasRef, cores, setRects)
		const referenceWidth = imgRef.current?.width || canvasSize.width
		const scale = useMemo(() => ScaleUtils(referenceWidth), [referenceWidth])

		const offscreenCanvasRef = useOffscreenBackground(canvasSize, imgRef, DrawBackground)

		// сортировка (опции + единая функция)
		const [sortOptions, setSortOptions] = useState<SortOptions>({ by: 'bottom', dir: 'asc' })
		const applySort = useCallback((opts?: SortOptions) => {
			setRects(prev => {
				if (prev.length <= 1) return prev
				const nextOpts = { ...sortOptions, ...(opts ?? {}) }
				const { rects: sorted, oldToNew } = stableSortWithMaps(prev, nextOpts)
				// корректируем selection/hover через setCallbacks, они придут из interactions
				setSelectedRect(prevSel => (prevSel == null ? null : oldToNew[prevSel] ?? null))
				setHoveredRect(prevHover => (prevHover == null ? null : oldToNew[prevHover] ?? null))
				if (opts) setSortOptions(nextOpts)
				return sorted
			})
		}, [sortOptions])

		const {
			handleMouseDown,
			handleMouseMove,
			handleMouseUp,
			handleBlur,
			handleMouseLeave,
			selectedRect,
			setSelectedRect,
			hoveredRect,
			setHoveredRect,
			hoveredHandle,
			dragHandle,
			tempRect,
			mousePos
		} = useCanvasInteractions({
			canvasRef,
			normalizedRectangles: rects,
			setNormalizedRectangles: setRects,
			imgRef,
			canvasSize,
			onSelectRect,
			onHoverRect,
			baseLineWidth: scale.getLineWidth(),
			sortedNormalizedRectangles: () => applySort()
		})

		// Добавление/удаление сегментов
		const handleAddNewRect = useCallback(() => {
			if (!canvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) return
			setRects(prev => {
				const last = prev[prev.length - 1]
				const newRect: Rect = last
					? [last[0], last[3] + 0.01, last[2], last[3] + 0.13]
					: [0.1, 0.1, 0.2, 0.2]
				const updated = [...prev, newRect]
				setSelectedRect(updated.length - 1)
				return updated
			})
			applySort()
		}, [canvasSize.width, canvasSize.height, applySort, setSelectedRect])

		const deleteByIndex = useCallback((idx: number) => {
			setRects(prev => prev.filter((_, i) => i !== idx))
			setSelectedRect(sel => (sel === idx ? null : sel !== null && sel > idx ? sel - 1 : sel))
			setHoveredRect(hov => (hov === idx ? null : hov !== null && hov > idx ? hov - 1 : hov))
			applySort()
		}, [applySort, setSelectedRect, setHoveredRect])

		// Контекстное меню
		const { pos: contextMenuPos, items: contextMenuItems, openAt, close: closeMenu } =
			useContextMenu(handleAddNewRect, deleteByIndex)

		const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
			e.preventDefault()
			const canvas = canvasRef.current
			if (!canvas) return
			const pos = GetCanvasCoordinates(e, canvas)
			const pxRects = rects.map(r => NormalizeToPixels(r, canvasSize.width, canvasSize.height))
			let idx: number | null = null
			if (selectedRect != null && pxRects[selectedRect] && IsPointInRect(pos, pxRects[selectedRect])) {
				idx = selectedRect
			} else {
				for (let i = pxRects.length - 1; i >= 0; i--) {
					if (IsPointInRect(pos, pxRects[i])) { idx = i; break }
				}
			}
			openAt(e.clientX, e.clientY, idx)
		}, [rects, canvasSize.width, canvasSize.height, selectedRect, openAt])

		// клики вне канваса — снимаем выделение
		useEffect(() => {
			const onDocMouseDown = (e: MouseEvent) => {
				if (canvasRef.current && !canvasRef.current.contains(e.target as Node)) setSelectedRect(null)
			}
			document.addEventListener('mousedown', onDocMouseDown)
			return () => document.removeEventListener('mousedown', onDocMouseDown)
		}, [setSelectedRect])

		// отдаём наружу изменившиеся cores
		useEffect(() => {
			if (!onCoresChange) return
			const changed =
				rects.length !== prevCores.length ||
				rects.some((r, i) => r.some((v, j) => v !== prevCores[i]?.[j]))
			if (changed) {
				onCoresChange(rects)
				setPrevCores(rects.map(r => [...r]))
			}
		}, [rects, prevCores, onCoresChange])

		// внешний API
		useImperativeHandle(ref, () => ({
			// данные
			getRectangles: () => ({ boxes: [[0, 0, 1, 1]], cores: rects }),
			getSelectedRect: () => selectedRect,
			getHoveredRect: () => hoveredRect,

			// выбор/hover
			setSelectedRect: (i: number | null) => setSelectedRect(i),
			setHoveredRect: (i: number | null) => setHoveredRect(i),

			// геометрия
			normalizeHeights: () => {
				if (rects.length === 0) return
				const heights = rects.map(([_, y1, __, y2]) => y2 - y1)
				const avg = heights.reduce((a, n) => a + n, 0) / heights.length
				setRects(rs => rs.map(([x, y, w]) => [x, y, w, y + avg]))
			},

			addNewRect: () => {
				setRects(prev => {
					const last = prev[prev.length - 1]
					const newRect: Rect = last
						? [last[0], last[3] + 0.01, last[2], last[3] + 0.13]
						: [0.1, 0.1, 0.2, 0.2]
					const next = [...prev, newRect]
					// выбрать добавленный
					setSelectedRect(next.length - 1)
					return next
				})
				// применяем текущую стратегию сортировки
				applySort()
			},

			deleteSegment: (index: number) => deleteByIndex(index),

			// image
			rotateImage: (angle: number) => setRotationAngle(prev => (prev + angle) % 360),
			getRotatedImage: async () => {
				const img = imgRef.current
				if (!img || !img.complete || img.naturalWidth === 0) return null
				const temp = document.createElement('canvas')
				const ctx = temp.getContext('2d'); if (!ctx) return null
				const rad = (rotationAngle * Math.PI) / 180
				const swap = Math.abs(rotationAngle % 180) === 90
				temp.width = swap ? img.naturalHeight : img.naturalWidth
				temp.height = swap ? img.naturalWidth : img.naturalHeight
				ctx.translate(temp.width / 2, temp.height / 2)
				ctx.rotate(rad)
				ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight)
				return new Promise<Blob | null>(res => temp.toBlob(b => res(b), 'image/png'))
			},

			// сортировка
			sort: (opts) => applySort(opts),
			getSortOptions: () => sortOptions,
			setSortOptions: (opts) => applySort(opts),
			toggleSortDirection: () => applySort({ dir: sortOptions.dir === 'asc' ? 'desc' : 'asc' }),
			sortTopToBottom: () => applySort({ by: 'top', dir: 'asc' }),
			sortBottomToTop: () => applySort({ by: 'bottom', dir: 'asc' }),
			sortLeftToRight: () => applySort({ by: 'left', dir: 'asc' }),
			sortRightToLeft: () => applySort({ by: 'right', dir: 'desc' }),
		}), [
			rects, selectedRect, hoveredRect, rotationAngle,
			applySort, sortOptions, deleteByIndex,
		])



		// рендер канваса (animation frame)
		const renderCanvas = useCallback(() => {
			const canvas = canvasRef.current
			if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return
			const ctx = canvas.getContext('2d')!
			ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
			ctx.save()
			ctx.translate(canvasSize.width/2, canvasSize.height/2)
			ctx.rotate((rotationAngle * Math.PI)/180)
			ctx.translate(-canvasSize.width/2, -canvasSize.height/2)

			if (offscreenCanvasRef.current) {
				ctx.drawImage(offscreenCanvasRef.current, 0, 0, canvasSize.width, canvasSize.height)
			}

			if (rotationAngle === 0) {
				const pxRects = rects.map(r => NormalizeToPixels(r, canvasSize.width, canvasSize.height))
				ctx.font = `${scale.getFontSize()}px Arial`
				ctx.textAlign = 'left'
				ctx.textBaseline = 'top'

				DrawImageAndRectangles(
					ctx, imgRef.current, pxRects, selectedRect, hoveredRect, tempRect,
					scale.getLineWidth(), offscreenCanvasRef.current
				)

				if (selectedRect != null && pxRects[selectedRect]) {
					const [x,y,w,h] = pxRects[selectedRect]
					ctx.save()
					ctx.fillStyle = 'rgba(0,123,255,0.1)'
					ctx.fillRect(x,y,w,h)
					ctx.restore()
				}

				pxRects.forEach((r, i) => {
					const [x,y,w,h] = r
					const label = `${i+1}`
					ctx.save()
					ctx.strokeStyle = i === selectedRect ? '#007bff' : '#ffffff'
					ctx.lineWidth = i === selectedRect ? scale.getSelectedLineWidth() : scale.getLineWidth()
					ctx.strokeRect(x,y,w,h)
					ctx.restore()

					ctx.save()
					ctx.fillStyle = i === selectedRect ? '#007bff' : '#ffffff'
					ctx.fillText(label, x + scale.getFontSize()*0.8, y + scale.getFontSize()*0.8)
					ctx.restore()
				})

				if (selectedRect != null && pxRects[selectedRect]) {
					const [x,y,w,h] = pxRects[selectedRect]
					const handleSize = scale.getHandleSize()
					const half = handleSize/2
					const handles = [
						{ x: x + w/2, y, pos: HandlePosition.Top },
						{ x: x + w/2, y: y + h, pos: HandlePosition.Bottom },
						{ x, y: y + h/2, pos: HandlePosition.Left },
						{ x: x + w, y: y + h/2, pos: HandlePosition.Right },
					]
					ctx.save()
					ctx.strokeStyle = '#ffffff'
					ctx.lineWidth = scale.getLineWidth()
					handles.forEach(({x: hx, y: hy, pos}) => {
						ctx.fillStyle = (hoveredHandle === pos && selectedRect !== null) ? '#ffa500'
							: (dragHandle === pos && selectedRect !== null) ? 'red' : '#007bff'
						ctx.beginPath()
						ctx.arc(hx, hy, half, 0, 2*Math.PI)
						ctx.fill()
						ctx.stroke()
					})
					ctx.restore()
				}

				if (mousePos && selectedRect != null && dragHandle !== HandlePosition.None && dragHandle !== HandlePosition.Inside) {
					DrawMagnifier(
						ctx, imgRef.current, pxRects[selectedRect], dragHandle,
						canvasSize.width, canvasSize.height, scale.getLineWidth(), scale.getMagnifierSize()
					)
				}
			}
			ctx.restore()
		}, [
			canvasSize.width, canvasSize.height, rotationAngle, offscreenCanvasRef,
			rects, selectedRect, hoveredRect, tempRect, dragHandle, mousePos, scale, imgRef
		])

		useEffect(() => {
			let raf = 0
			const tick = () => { renderCanvas(); raf = requestAnimationFrame(tick) }
			raf = requestAnimationFrame(tick)
			return () => cancelAnimationFrame(raf)
		}, [renderCanvas])

		// удаление по клавише
		useEffect(() => {
			const onKey = (e: KeyboardEvent) => {
				if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRect != null) {
					deleteByIndex(selectedRect)
				}
			}
			window.addEventListener('keydown', onKey)
			return () => window.removeEventListener('keydown', onKey)
		}, [selectedRect, deleteByIndex])

		const cursorStyle = useMemo(() => {
			if (selectedRect != null) {
				if (hoveredHandle === HandlePosition.Top || hoveredHandle === HandlePosition.Bottom) return 'ns-resize'
				if (hoveredHandle === HandlePosition.Left || hoveredHandle === HandlePosition.Right) return 'ew-resize'
			} else if (hoveredRect != null) return 'pointer'
			return 'default'
		}, [selectedRect, hoveredHandle, hoveredRect])

		return (
			<>
				<canvas
					ref={canvasRef}
					style={{ maxWidth: '100%', cursor: cursorStyle }}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseLeave}
					onBlur={handleBlur}
					onContextMenu={handleContextMenu}
					tabIndex={0}
				/>
				{contextMenuPos && (
					<ContextMenu
						isOpen
						items={contextMenuItems.map(it => it.label === 'Удалить сегмент'
							? { ...it, leftSide: <IconTrash size="s" /> }
							: it)}
						position={contextMenuPos}
						direction="downStartLeft"
						onClickOutside={closeMenu}
					/>
				)}
			</>
		)
	}
)
