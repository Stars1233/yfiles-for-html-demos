/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) 2026 by yWorks GmbH, Vor dem Kreuzberg 28,
 ** 72070 Tuebingen, Germany. All rights reserved.
 **
 ** yFiles demo files exhibit yFiles for HTML functionalities. Any redistribution
 ** of demo files in source code or binary form, with or without
 ** modification, is not permitted.
 **
 ** Owners of a valid software license for a yFiles for HTML version that this
 ** demo is shipped with are allowed to use the demo source code as basis
 ** for their own yFiles for HTML powered applications. Use of such programs is
 ** governed by the rights and conditions as set out in the yFiles for HTML
 ** license agreement.
 **
 ** THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESS OR IMPLIED
 ** WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 ** MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
 ** NO EVENT SHALL yWorks BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 ** SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 ** TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 ** PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 ** LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 ** NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 ** SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **
 ***************************************************************************/
import type { ShapeNodeShapeStringValues } from '@yfiles/yfiles'
import {
  CssFill,
  type GraphComponent,
  type GraphEditorInputMode,
  IEdge,
  INode,
  Point,
  PolylineEdgeStyle,
  PopoverBehavior,
  PopoverDescriptor,
  ShapeNodeShape,
  ShapeNodeStyle
} from '@yfiles/yfiles'

/** Installs the node and edge popovers used by this demo. */
export function initializePopovers(graphComponent: GraphComponent): void {
  const mode = graphComponent.inputMode as GraphEditorInputMode
  mode.contextMenuInputMode.enabled = false

  let openPopover: PopoverDescriptor | null = null

  const field = (labelText: string, control: HTMLElement): HTMLElement => {
    const container = document.createElement('label')
    container.style.display = 'flex'
    container.style.alignItems = 'center'
    container.style.justifyContent = 'space-between'
    container.style.gap = '12px'
    container.style.margin = '4px 0'
    container.textContent = labelText
    container.append(control)
    return container
  }

  const colorInput = (value: string, onChange: (color: string) => void): HTMLInputElement => {
    const input = document.createElement('input')
    input.type = 'color'
    input.value = /^#[0-9a-f]{6}$/i.test(value) ? value : '#666666'
    input.addEventListener('input', () => onChange(input.value))
    return input
  }

  const createNodeMenu = (node: INode): HTMLElement => {
    const style = node.style as ShapeNodeStyle
    const content = document.createElement('div')
    content.className = 'popover-menu'
    content.append(
      field(
        'Color',
        colorInput(style.fill instanceof CssFill ? style.fill.value : '#666666', (color) => {
          if (!(node.style instanceof ShapeNodeStyle)) return
          const nextStyle = node.style.clone()
          nextStyle.fill = color
          graphComponent.graph.setStyle(node, nextStyle)
        })
      )
    )

    const shapeSelect = document.createElement('select')
    const shapes: (keyof typeof ShapeNodeShape)[] = [
      'RECTANGLE',
      'ROUND_RECTANGLE',
      'SQUIRCLE',
      'ELLIPSE',
      'DIAMOND',
      'HEXAGON',
      'TRIANGLE'
    ]
    shapes.forEach((shape) => {
      const option = document.createElement('option')
      option.value = shape
      option.textContent = shape.toLowerCase().replace(/_/g, '-')
      option.selected = style.shape === ShapeNodeShape.from(shape as ShapeNodeShapeStringValues)
      shapeSelect.append(option)
    })
    shapeSelect.addEventListener('change', () => {
      if (!(node.style instanceof ShapeNodeStyle)) return
      const nextStyle = node.style.clone()
      nextStyle.shape = ShapeNodeShape.from(shapeSelect.value as ShapeNodeShapeStringValues)
      graphComponent.graph.setStyle(node, nextStyle)
    })
    content.append(field('Shape', shapeSelect))
    return content
  }

  const createEdgeMenu = (edge: IEdge): HTMLElement => {
    const style = edge.style as PolylineEdgeStyle
    const content = document.createElement('div')
    content.className = 'popover-menu'
    content.append(
      field(
        'Color',
        colorInput(
          style.stroke?.fill instanceof CssFill ? style.stroke.fill.value : '#666666',
          (color) => {
            if (!(edge.style instanceof PolylineEdgeStyle)) return
            const nextStyle = edge.style.clone()
            const thickness = edge.style.stroke?.thickness ?? 1
            nextStyle.stroke = `${thickness}px ${color}`
            graphComponent.graph.setStyle(edge, nextStyle)
          }
        )
      )
    )

    const thicknessInput = document.createElement('input')
    thicknessInput.type = 'number'
    thicknessInput.min = '1'
    thicknessInput.max = '10'
    thicknessInput.step = '0.5'
    thicknessInput.value = String(style.stroke?.thickness ?? 1)
    thicknessInput.addEventListener('input', () => {
      const thickness = Number(thicknessInput.value)
      if (!Number.isFinite(thickness) || thickness <= 0) return
      if (!(edge.style instanceof PolylineEdgeStyle)) return
      const nextStyle = edge.style.clone()
      const color =
        edge.style.stroke?.fill instanceof CssFill ? edge.style.stroke.fill.value : '#666666'
      nextStyle.stroke = `${thickness}px ${color}`
      graphComponent.graph.setStyle(edge, nextStyle)
    })
    content.append(field('Thickness', thicknessInput))
    return content
  }

  const showPopover = (content: HTMLElement, anchor: Point): void => {
    openPopover?.close()
    const descriptor = new PopoverDescriptor({
      behavior: PopoverBehavior.AUTO,
      content,
      anchor,
      offset: new Point(8, 8),
      ratios: new Point(0, 0)
    })
    openPopover = descriptor
    void mode.popoverManager.open(descriptor)
  }

  mode.addEventListener('item-right-clicked', (evt) => {
    const item = evt.item
    const content =
      item instanceof INode && item.style instanceof ShapeNodeStyle
        ? createNodeMenu(item)
        : item instanceof IEdge && item.style instanceof PolylineEdgeStyle
          ? createEdgeMenu(item)
          : null
    if (!content) return

    evt.handled = true
    showPopover(content, evt.location)
  })
}
