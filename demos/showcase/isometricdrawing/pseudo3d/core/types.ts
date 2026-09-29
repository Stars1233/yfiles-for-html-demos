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
import type { INode, INodeStyle, IRenderContext, Point } from '@yfiles/yfiles'

export type Pseudo3DNodeTag = { height?: number; elevation?: number }

type Pseudo3DExtrusionSegmentBase = { start: Point; end: Point; connectorAnchors?: Point[] }

type Pseudo3DLineExtrusionSegment = Pseudo3DExtrusionSegmentBase & { kind: 'line' }

type Pseudo3DQuadraticExtrusionSegment = Pseudo3DExtrusionSegmentBase & {
  kind: 'quadratic'
  control: Point
}

type Pseudo3DCubicExtrusionSegment = Pseudo3DExtrusionSegmentBase & {
  kind: 'cubic'
  control1: Point
  control2: Point
}

export type Pseudo3DExtrusionSegment =
  Pseudo3DLineExtrusionSegment | Pseudo3DQuadraticExtrusionSegment | Pseudo3DCubicExtrusionSegment

export type OutlineConfig = {
  /** Stroke color for the silhouette outline. Default: '#000000' */
  color?: string
  /** Stroke width in pixels for the silhouette outline. Default: 1 */
  width?: number
}

export type Pseudo3DProjectionAnchor = 'topLeft' | 'bottomLeft' | 'bottomRight' | 'topRight'

export type Pseudo3DPerimeter<TPart> = {
  orderedParts: readonly TPart[]
  anchors: Record<Pseudo3DProjectionAnchor, TPart>
  sideFill?: string
  outlineConfig?: OutlineConfig
}

export interface Pseudo3DPerimeterGeometryProvider<TWrappedStyle extends INodeStyle, TPart> {
  getPerimeter(node: INode, wrappedNodeStyle: TWrappedStyle): Pseudo3DPerimeter<TPart>
  getVisibleParts?(
    context: IRenderContext,
    node: INode,
    wrappedNodeStyle: TWrappedStyle,
    perimeter: Pseudo3DPerimeter<TPart>,
    rotation: number
  ): TPart[]
  createVisibleSegments?(
    context: IRenderContext,
    node: INode,
    wrappedNodeStyle: TWrappedStyle,
    perimeter: Pseudo3DPerimeter<TPart>,
    visibleParts: readonly TPart[]
  ): Pseudo3DExtrusionSegment[]
  createSegment(
    context: IRenderContext,
    node: INode,
    wrappedNodeStyle: TWrappedStyle,
    part: TPart
  ): Pseudo3DExtrusionSegment
  applyStroke?(wrappedNodeStyle: TWrappedStyle, element: SVGElement, context: IRenderContext): void
}
