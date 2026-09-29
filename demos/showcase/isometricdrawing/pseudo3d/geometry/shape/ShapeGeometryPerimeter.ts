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
  type INode,
  type INodeStyle,
  type IRenderContext,
  type Matrix,
  type Point
} from '@yfiles/yfiles'
import type {
  OutlineConfig,
  Pseudo3DExtrusionSegment,
  Pseudo3DPerimeter,
  Pseudo3DPerimeterGeometryProvider
} from '../../core/types'
import { calculateHeightVector } from '../../core/Pseudo3DProjection'
import { getCachedOutlineGeometry, getShapeOutlinePolyline } from './outline'
import {
  createVisibleFacePieces,
  getVisibleShapeSidePolylines as createVisibleShapeSidePolylines,
  isVisibleSegment
} from './perimeterVisibility'

export type ShapeGeometryPerimeterOptions<TWrappedStyle extends INodeStyle> = {
  applyStroke?: (
    wrappedNodeStyle: TWrappedStyle,
    element: SVGElement,
    context: IRenderContext
  ) => void
  sideFill?: string
  outlineConfig?: OutlineConfig
}

export function createShapeGeometryPerimeterProvider<TWrappedStyle extends INodeStyle>(
  options: ShapeGeometryPerimeterOptions<TWrappedStyle> = {}
): Pseudo3DPerimeterGeometryProvider<TWrappedStyle, number> {
  return {
    getPerimeter(node, wrappedNodeStyle): Pseudo3DPerimeter<number> {
      const geometry = getCachedOutlineGeometry(node, wrappedNodeStyle)
      return {
        orderedParts: geometry.segments.map((_, index) => index),
        anchors: geometry.anchors,
        sideFill: options.sideFill,
        outlineConfig: options.outlineConfig
      }
    },
    getVisibleParts(context, node, wrappedNodeStyle, perimeter): number[] {
      const { segments } = getCachedOutlineGeometry(node, wrappedNodeStyle)
      const extrusionDirection = calculateHeightVector(context.projection)
      const visibleParts = perimeter.orderedParts.filter((part) =>
        isVisibleSegment(segments[part], extrusionDirection)
      )
      return visibleParts.length > 0 ? visibleParts : [...perimeter.orderedParts]
    },
    createVisibleSegments(context, node, wrappedNodeStyle, _perimeter, visibleParts) {
      const { segments } = getCachedOutlineGeometry(node, wrappedNodeStyle)
      return createVisibleFacePieces(
        visibleParts.map((part) => ({ index: part, segment: segments[part] })),
        context.projection
      ).map((piece) => piece.segment)
    },
    createSegment(_context, node, wrappedNodeStyle, part): Pseudo3DExtrusionSegment {
      return getCachedOutlineGeometry(node, wrappedNodeStyle).segments[part].segment
    },
    applyStroke: options.applyStroke
  }
}

export { getShapeOutlinePolyline }

export function getVisibleShapeSidePolylines<TWrappedStyle extends INodeStyle>(
  node: INode,
  wrappedNodeStyle: TWrappedStyle,
  projection: Matrix
): Point[][] {
  return createVisibleShapeSidePolylines(
    getCachedOutlineGeometry(node, wrappedNodeStyle).segments,
    projection
  )
}
