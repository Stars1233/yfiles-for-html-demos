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
import {
  BaseClass,
  ISelectionRenderer,
  IVisualCreator,
  SvgVisual,
  SvgVisualGroup
} from '@yfiles/yfiles'
import { getHandleOffset } from './utils'

/**
 * A selection renderer wrapper for octilinear edges that uses the original selection renderer for the edge's path and
 * additionally renders the bends in the center of the octilinear segments.
 *
 * Note that the original edge selection renderer also renders bends at their original location, but these are hidden
 * via CSS in styles.css.
 */
export class OctilinearSelectionRenderer extends BaseClass(ISelectionRenderer) {
  originalSelectionRenderer

  constructor(originalSelectionRenderer) {
    super()
    this.originalSelectionRenderer = originalSelectionRenderer
  }

  getBoundsProvider(renderTag) {
    return this.originalSelectionRenderer.getBoundsProvider(renderTag)
  }

  getHitTestable(renderTag) {
    return this.originalSelectionRenderer.getHitTestable(renderTag)
  }

  getVisibilityTestable(renderTag) {
    return this.originalSelectionRenderer.getVisibilityTestable(renderTag)
  }

  getVisualCreator(renderTag) {
    return new OctilinearSelectionVisualCreator(
      renderTag,
      this.originalSelectionRenderer.getVisualCreator(renderTag)
    )
  }
}

/**
 * An {@link IVisualCreator} that creates the visual representation of the edge selection by using the original
 * selection renderer for the edge's path and additional bend indicators in the center of the octilinear segments.
 */
class OctilinearSelectionVisualCreator extends BaseClass(IVisualCreator) {
  edge
  originalVisualCreator

  constructor(edge, originalVisualCreator) {
    super()
    this.edge = edge
    this.originalVisualCreator = originalVisualCreator
  }

  createVisual(context) {
    const group = new SvgVisualGroup()

    // use the original selection renderer for the edge's path
    const originalVisual = this.originalVisualCreator.createVisual(context)
    if (originalVisual) {
      group.add(originalVisual)
    }

    // create bend indicators in the center of the octilinear segments
    const zoom = context.canvasComponent.zoom
    const bendIndicators = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    for (const bend of this.edge.bends) {
      const { x, y } = bend.location.toPoint().add(getHandleOffset(bend))
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', `M -3 0 L 0 -3 L 3 0 L 0 3 z`)
      SvgVisual.setScale(path, 1 / zoom, 1 / zoom)

      const container = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      SvgVisual.setTranslate(container, x, y)

      container.appendChild(path)
      bendIndicators.appendChild(container)
    }
    group.add(new SvgVisual(bendIndicators))

    return group
  }

  updateVisual(context, _oldVisual) {
    return this.createVisual(context)
  }
}
