import React, { forwardRef, useMemo } from 'react'
import { ContextMenu } from '@consta/uikit/ContextMenu'
import { IconTrash } from '@consta/icons/IconTrash'
import type { ExtendedImageHighlighterProps, ImageHighlighterRef } from './types'
import { HandlePosition } from './types'
import { useImageHighlighter } from './hooks/useImageHighlighter'
import { rectToPixel, getCanvasPoint } from 'shared/canvas/coordinates'
import { hitTestRect } from 'shared/canvas/hitTest'

export const ImageHighlighterModule = forwardRef<ImageHighlighterRef, ExtendedImageHighlighterProps>((props, ref) => {
  const { canvasRef, controller, contextMenu, rects, canvasSize, deleteRect } = useImageHighlighter(props, ref)

  const cursor = useMemo(() => {
    if (controller.selectedRect !== null) {
      switch (controller.hoveredHandle) {
        case HandlePosition.Top:
        case HandlePosition.Bottom:
          return 'ns-resize'
        case HandlePosition.Left:
        case HandlePosition.Right:
          return 'ew-resize'
        case HandlePosition.Inside:
          return 'move'
        default:
          break
      }
    }
    if (controller.hoveredRect !== null) return 'pointer'
    return 'default'
  }, [controller.selectedRect, controller.hoveredHandle, controller.hoveredRect])

  const handleContextMenu = React.useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const point = getCanvasPoint(event, canvas)
      const pixelRects = rects.map(rect => rectToPixel(rect, canvas.width, canvas.height))

      let target: number | null = null
      if (controller.selectedRect !== null) {
        const selected = pixelRects[controller.selectedRect]
        if (selected && hitTestRect(point, selected)) {
          target = controller.selectedRect
        }
      }

      if (target === null) {
        for (let index = pixelRects.length - 1; index >= 0; index -= 1) {
          if (hitTestRect(point, pixelRects[index])) {
            target = index
            break
          }
        }
      }

      contextMenu.open(event.clientX, event.clientY, target)
    },
    [canvasRef, rects, controller.selectedRect, contextMenu],
  )

  const items = useMemo(
    () =>
      contextMenu.items.map(item =>
        item.label === 'Удалить сегмент'
          ? { ...item, leftSide: <IconTrash size="s" />, onClick: () => { item.onClick(); contextMenu.close() } }
          : { ...item, onClick: () => { item.onClick(); contextMenu.close() } },
      ),
    [contextMenu.items, contextMenu.close],
  )

  React.useEffect(() => {
    if (!contextMenu.position) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') contextMenu.close()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [contextMenu.position, contextMenu.close])

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && controller.selectedRect !== null) {
        deleteRect(controller.selectedRect)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [controller.selectedRect, deleteRect])

  return (
    <>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ maxWidth: '100%', cursor }}
        onMouseDown={controller.handleMouseDown}
        onMouseMove={controller.handleMouseMove}
        onMouseUp={controller.handleMouseUp}
        onMouseLeave={controller.handleMouseLeave}
        onBlur={controller.handleBlur}
        onContextMenu={handleContextMenu}
        tabIndex={0}
      />
      {contextMenu.position && (
        <ContextMenu
          isOpen
          items={items}
          position={contextMenu.position}
          direction="downStartLeft"
          onClickOutside={contextMenu.close}
        />
      )}
    </>
  )
})

ImageHighlighterModule.displayName = 'ImageHighlighterModule'
