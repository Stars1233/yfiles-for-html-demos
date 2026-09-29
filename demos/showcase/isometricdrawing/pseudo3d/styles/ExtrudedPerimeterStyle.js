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
import {} from '@yfiles/yfiles'
import {
  getVisiblePerimeterParts,
  normalizeVisiblePartsOrder
} from '../geometry/perimeterPartOrdering'
import { createShapeGeometryPerimeterProvider } from '../geometry/shape/ShapeGeometryPerimeter'
import { Pseudo3DNodeStyleBase } from './Pseudo3DNodeStyleBase'

/**
 * Small convenience wrapper for shape-based node styles that can expose a
 * usable outline through yFiles shape geometry.
 */
export class ExtrudedPerimeterStyle extends Pseudo3DNodeStyleBase {
  perimeterProvider
  constructor(wrappedNodeStyle, providerOrOptions = {}, options = {}) {
    const perimeterProvider = isPerimeterProvider(providerOrOptions)
      ? providerOrOptions
      : createShapeGeometryPerimeterProvider({
          applyStroke(nodeStyle, element, context) {
            nodeStyle.stroke?.applyTo(element, context)
          },
          sideFill: providerOrOptions.sideFill,
          outlineConfig: toOutlineConfig(providerOrOptions.outline)
        })
    super(wrappedNodeStyle)
    this.perimeterProvider = perimeterProvider
  }

  getWrappedNodeStyle() {
    return this.wrappedNodeStyle
  }

  getExtrusionGeometry(context, node) {
    const perimeter = this.perimeterProvider.getPerimeter(node, this.wrappedNodeStyle)
    const visibleParts =
      this.perimeterProvider.getVisibleParts?.(
        context,
        node,
        this.wrappedNodeStyle,
        perimeter,
        this.projectionState.rotation
      ) ?? getVisiblePerimeterParts(perimeter, this.projectionState.rotation)
    if (visibleParts.length === 0) return null

    const segments = this.perimeterProvider.createVisibleSegments?.(
      context,
      node,
      this.wrappedNodeStyle,
      perimeter,
      visibleParts
    )
    if (segments) {
      return segments.length > 0
        ? { segments, sideFill: perimeter.sideFill, outlineConfig: perimeter.outlineConfig }
        : null
    }

    const normalizedVisibleParts = normalizeVisiblePartsOrder(visibleParts, perimeter.orderedParts)
    return normalizedVisibleParts.length > 0
      ? {
          segments: normalizedVisibleParts.map((part) =>
            this.perimeterProvider.createSegment(context, node, this.wrappedNodeStyle, part)
          ),
          sideFill: perimeter.sideFill,
          outlineConfig: perimeter.outlineConfig
        }
      : null
  }

  applyExtrusionStroke(element, context) {
    this.perimeterProvider.applyStroke?.(this.wrappedNodeStyle, element, context)
  }
}

function toOutlineConfig(outline) {
  return outline?.enabled === false
    ? undefined
    : outline
      ? { color: outline.color, width: outline.width }
      : undefined
}

function isPerimeterProvider(value) {
  return 'getPerimeter' in value
}
