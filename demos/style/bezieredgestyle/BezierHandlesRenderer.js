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
import { IEdge, ObjectRendererBase, Stroke, SvgVisual, SvgVisualGroup } from '@yfiles/yfiles'
import { OuterControlPointHandle, SimpleControlPointHandle } from './BezierHandles'

/**
 * Custom renderer that renders lines from other control points to their inner control point.
 *
 * This implementation wraps the default handles renderer and just adds the lines to the outer control points on top.
 */
export class BezierHandlesRenderer extends ObjectRendererBase {
  coreRenderer

  static selectionStroke = new Stroke({ fill: 'lightgray', dashStyle: 'dash', thickness: 2 })

  constructor(coreRenderer) {
    super()
    this.coreRenderer = coreRenderer
  }

  createVisual(context, renderTag) {
    const mainGroup = new SvgVisualGroup()
    const controlPointLinesGroup = new SvgVisualGroup()
    mainGroup.add(controlPointLinesGroup)
    mainGroup.add(this.coreRenderer.getVisualCreator(renderTag).createVisual(context))
    return this.updateVisual(context, mainGroup, renderTag)
  }

  updateVisual(context, oldVisual, renderTag) {
    if (oldVisual?.children?.size === 2) {
      const mainChildren = oldVisual.children
      const controlPointLinesGroup = mainChildren.get(0)
      if (controlPointLinesGroup) {
        controlPointLinesGroup.children.clear()
        for (const handle of renderTag.handles) {
          let bend

          if (handle instanceof OuterControlPointHandle) {
            bend = handle.bend
          } else if (handle instanceof SimpleControlPointHandle && handle.isOuterControlPoint) {
            bend = handle.bend
          } else {
            continue
          }

          const middleBendLocation = this.getMiddleBendLocation(bend)
          const center = context.worldToViewCoordinates(handle.location.toPoint())
          const otherPoint = context.worldToViewCoordinates(middleBendLocation.toPoint())

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          line.x1.baseVal.value = center.x
          line.y1.baseVal.value = center.y
          line.x2.baseVal.value = otherPoint.x
          line.y2.baseVal.value = otherPoint.y
          BezierHandlesRenderer.selectionStroke.applyTo(line, context)

          controlPointLinesGroup.add(new SvgVisual(line))
        }
        controlPointLinesGroup.transform = context.viewTransform
        const oldHandles = mainChildren.get(1)
        const updatedHandles = this.coreRenderer
          .getVisualCreator(renderTag)
          .updateVisual(context, oldHandles)
        if (updatedHandles !== oldHandles) {
          mainChildren.set(1, updatedHandles)
        }
        return oldVisual
      }
    }

    // If something changed, rebuild the visual structure
    context.childVisualRemoved(oldVisual)
    return this.createVisual(context, renderTag)
  }

  /**
   * Returns the location of the inner control point for the given bend.
   */
  getMiddleBendLocation(bend) {
    const bendIndex = bend.index
    const middleIndexDiff = (() => {
      switch (bendIndex % 3) {
        case 0:
          return -1 // First bend belongs to source port; third of triplet to previous bend
        case 1:
          return 1 // Last bend belongs to target port; first of triplet to next bend
        case 2:
          return 0 // Middle bend in triplet
        default:
          return 0
      }
    })()

    // +1 because path points begin with the source port
    return IEdge.getPathPoints(bend.owner).get(bendIndex + 1 + middleIndexDiff)
  }
}
