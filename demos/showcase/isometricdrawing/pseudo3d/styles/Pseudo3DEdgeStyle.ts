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
  type Constructor,
  EdgeStyleBase,
  GeneralPath,
  type GraphComponent,
  IArrow,
  type ICanvasContext,
  type IEdge,
  type IGraph,
  type IInputModeContext,
  IOrthogonalEdgeHelper,
  type IRenderContext,
  OrthogonalEdgeHelper,
  type Point,
  Rect,
  SvgVisual,
  type TaggedSvgVisual,
  type Visual
} from '@yfiles/yfiles'
import {
  getProjectionHelpersForMatrix,
  getProjectionKey,
  type Pseudo3DProjectionState
} from '../core/Pseudo3DProjection'
import { getGraph, getProjectionState } from '../core/pseudo3dLookup'
import { ProjectionAwareGraphModelManager } from '../ordering/ProjectionAwareGraphModelManager'
import {
  getVisibleProjectedEdgeGeometry,
  type ProjectedEdgeArrow,
  type VisibleProjectedEdgeGeometry
} from '../edge/occlusion'
import { getCachedEdgeTerrainGeometry, getEdgeWaypoints } from '../edge/terrain'
import { projectPoint } from '../geometry/projected/primitives'
import { getProjectionMatrix } from '../geometry/nodeProjectionGeometry'
import {
  buildPreviewEdgeGeometry,
  buildProjectedEdgePath,
  isPointNearProjectedArrow,
  trimArrowOverlap
} from './edgePathRendering'
import {
  applyEdgePathAttributes,
  buildSubpathCapPath,
  type EdgeLineCap,
  syncArrowVisuals
} from './edgeSvgRendering'

type EdgeRenderCache = {
  pointsKey: string
  projectionKey: string
  sourceArrowKey: string
  targetArrowKey: string
  refreshVersion: number
}

type EdgeRenderGeometry = VisibleProjectedEdgeGeometry & { pointsKey: string }

type EdgeVisualTag = {
  cache: EdgeRenderCache
  strokePath: SVGPathElement
  internalRoundCaps: SVGPathElement
  endpointCaps: SVGPathElement
  arrows: SVGGElement
  sourceArrowVisual: Visual | null
  targetArrowVisual: Visual | null
}

type EdgeSvgVisual = TaggedSvgVisual<SVGGElement, EdgeVisualTag>

type EdgeRenderContext = {
  graphComponent: GraphComponent
  graph: IGraph
  projectionState: Pseudo3DProjectionState
  refreshVersion: number
}

/**
 * SVG edge style for the pseudo-3D library.
 *
 * This class owns the yFiles visual lifecycle and delegates path construction,
 * endpoint trimming, and SVG attribute updates to focused helpers.
 */
export class Pseudo3DEdgeStyle extends EdgeStyleBase<EdgeSvgVisual> {
  private readonly width: number

  private readonly color: string

  public readonly sourceArrow: IArrow

  public readonly targetArrow: IArrow

  /** The cap used at the absolute source and target ends of the edge path. */
  public readonly lineCap: EdgeLineCap

  constructor(
    options: {
      width?: number
      color?: string
      sourceArrow?: IArrow
      targetArrow?: IArrow
      lineCap?: EdgeLineCap
    } = {}
  ) {
    super()
    this.width = options.width ?? 5
    this.color = options.color ?? '#f0f0f0'
    this.sourceArrow = options.sourceArrow ?? IArrow.NONE
    this.targetArrow = options.targetArrow ?? IArrow.NONE
    this.lineCap = options.lineCap ?? 'round'
  }

  protected createVisual(context: IRenderContext, edge: IEdge): EdgeSvgVisual | null {
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const strokePath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const internalRoundCaps = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const endpointCaps = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const arrows = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    container.appendChild(strokePath)
    container.appendChild(internalRoundCaps)
    container.appendChild(endpointCaps)
    container.appendChild(arrows)
    const geometry = this.getRenderGeometry(context, edge)
    const cache = this.createRenderCache(context, geometry.pointsKey)
    const { sourceArrowVisual, targetArrowVisual } = this.renderProjectedSegments(
      context,
      edge,
      geometry,
      strokePath,
      internalRoundCaps,
      endpointCaps,
      arrows,
      null,
      null
    )
    return SvgVisual.from(container, {
      cache,
      strokePath,
      internalRoundCaps,
      endpointCaps,
      arrows,
      sourceArrowVisual,
      targetArrowVisual
    }) as EdgeSvgVisual
  }

  protected updateVisual(
    context: IRenderContext,
    oldVisual: EdgeSvgVisual,
    edge: IEdge
  ): EdgeSvgVisual | null {
    const geometry = this.getRenderGeometry(context, edge)
    const nextCache = this.createRenderCache(context, geometry.pointsKey)
    const currentCache = oldVisual.tag.cache

    if (
      currentCache.pointsKey === nextCache.pointsKey &&
      currentCache.projectionKey === nextCache.projectionKey &&
      currentCache.sourceArrowKey === nextCache.sourceArrowKey &&
      currentCache.targetArrowKey === nextCache.targetArrowKey &&
      currentCache.refreshVersion === nextCache.refreshVersion
    ) {
      return oldVisual
    }

    const { sourceArrowVisual, targetArrowVisual } = this.renderProjectedSegments(
      context,
      edge,
      geometry,
      oldVisual.tag.strokePath,
      oldVisual.tag.internalRoundCaps,
      oldVisual.tag.endpointCaps,
      oldVisual.tag.arrows,
      oldVisual.tag.sourceArrowVisual,
      oldVisual.tag.targetArrowVisual
    )
    oldVisual.tag.cache = nextCache
    oldVisual.tag.sourceArrowVisual = sourceArrowVisual
    oldVisual.tag.targetArrowVisual = targetArrowVisual
    return oldVisual
  }

  private getRenderGeometry(context: IRenderContext, edge: IEdge): EdgeRenderGeometry {
    const renderContext = getEdgeRenderContext(context)
    if (!renderContext.graph.contains(edge)) {
      return buildPreviewEdgeGeometry(getEdgeWaypoints(edge))
    }

    const terrainGeometry = getCachedEdgeTerrainGeometry(edge, renderContext.graph)
    return {
      ...getVisibleProjectedEdgeGeometry({
        edge,
        graphComponent: renderContext.graphComponent,
        projectionState: renderContext.projectionState,
        refreshVersion: renderContext.refreshVersion,
        projection: context.projection,
        strokeWidth: this.width,
        terrainGeometry
      }),
      pointsKey: terrainGeometry.pointsKey
    }
  }

  protected override getBounds(context: ICanvasContext, edge: IEdge): Rect {
    const renderContext = getEdgeRenderContext(context)
    const points = !renderContext.graph.contains(edge)
      ? getEdgeWaypoints(edge)
      : this.getProjectedTerrainPoints(context, edge)
    const padding = Math.max(
      this.width / 2,
      this.sourceArrow === IArrow.NONE ? 0 : this.sourceArrow.length + this.sourceArrow.cropLength,
      this.targetArrow === IArrow.NONE ? 0 : this.targetArrow.length + this.targetArrow.cropLength
    )

    return getPaddedPointBounds(points, padding)
  }

  protected override isVisible(context: ICanvasContext, rectangle: Rect, edge: IEdge): boolean {
    return rectangle.intersects(this.getBounds(context, edge))
  }

  private getProjectedTerrainPoints(context: ICanvasContext, edge: IEdge): Point[] {
    const renderContext = getEdgeRenderContext(context)
    const terrainGeometry = getCachedEdgeTerrainGeometry(edge, renderContext.graph)
    const { heightVector, visualTranslation } = getProjectionHelpersForMatrix(
      getProjectionMatrix(context, renderContext.projectionState),
      renderContext.projectionState.inclination
    )
    return terrainGeometry.terrainPath.map((point) =>
      projectPoint(point, heightVector, visualTranslation)
    )
  }

  protected override isHit(context: IInputModeContext, location: Point, edge: IEdge): boolean {
    const renderContext = getEdgeRenderContext(context)
    if (renderContext.projectionState.isOrbiting) {
      return false
    }

    const geometry = !renderContext.graph.contains(edge)
      ? buildPreviewEdgeGeometry(getEdgeWaypoints(edge))
      : getVisibleProjectedEdgeGeometry({
          edge,
          graphComponent: renderContext.graphComponent,
          projectionState: renderContext.projectionState,
          refreshVersion: renderContext.refreshVersion,
          projection: getProjectionMatrix(context, renderContext.projectionState),
          strokeWidth: this.width
        })
    const projectedSegments = trimArrowOverlap(
      geometry.segments,
      geometry.sourceArrow,
      geometry.targetArrow,
      this.sourceArrow,
      this.targetArrow,
      this.width
    )
    const path = buildProjectedEdgePath(projectedSegments)
    if (path?.pathContains(location, context.hitTestRadius + this.width / 2)) {
      return true
    }

    return (
      isPointNearProjectedArrow(
        location,
        geometry.sourceArrow,
        this.sourceArrow,
        context.hitTestRadius,
        this.width
      ) ||
      isPointNearProjectedArrow(
        location,
        geometry.targetArrow,
        this.targetArrow,
        context.hitTestRadius,
        this.width
      )
    )
  }

  private renderProjectedSegments(
    context: IRenderContext,
    edge: IEdge,
    geometry: EdgeRenderGeometry,
    strokePath: SVGPathElement,
    internalRoundCaps: SVGPathElement,
    endpointCaps: SVGPathElement,
    arrows: SVGGElement,
    sourceArrowVisual: Visual | null,
    targetArrowVisual: Visual | null
  ): { sourceArrowVisual: Visual | null; targetArrowVisual: Visual | null } {
    // Committed edges use the full pipeline:
    // layout waypoints -> terrain polyline -> occlusion clipping -> projected segments.
    // Preview-edge ports already contain projected world coordinates, so
    // getRenderGeometry deliberately bypasses that pipeline for them.
    const renderedSegments = trimArrowOverlap(
      geometry.segments,
      geometry.sourceArrow,
      geometry.targetArrow,
      this.sourceArrow,
      this.targetArrow,
      this.width
    )
    const renderedPath = buildProjectedEdgePath(renderedSegments) ?? new GeneralPath()

    applyEdgePathAttributes(
      strokePath,
      renderedPath.createSvgPathData(),
      this.color,
      this.width,
      'butt'
    )
    applyEdgePathAttributes(
      internalRoundCaps,
      buildSubpathCapPath(renderedSegments, 'round', false),
      this.color,
      this.width,
      'round'
    )
    applyEdgePathAttributes(
      endpointCaps,
      buildSubpathCapPath(renderedSegments, this.lineCap, true),
      this.color,
      this.width,
      this.lineCap
    )
    const nextSourceArrowVisual = this.renderArrow(
      context,
      edge,
      geometry.sourceArrow,
      true,
      sourceArrowVisual
    )
    const nextTargetArrowVisual = this.renderArrow(
      context,
      edge,
      geometry.targetArrow,
      false,
      targetArrowVisual
    )
    syncArrowVisuals(arrows, nextSourceArrowVisual, nextTargetArrowVisual)
    return { sourceArrowVisual: nextSourceArrowVisual, targetArrowVisual: nextTargetArrowVisual }
  }

  private createRenderCache(context: IRenderContext, pointsKey: string): EdgeRenderCache {
    return {
      pointsKey,
      projectionKey: getProjectionKey(context.projection),
      sourceArrowKey: computeArrowKey(this.sourceArrow),
      targetArrowKey: computeArrowKey(this.targetArrow),
      refreshVersion: getEdgeRenderContext(context).refreshVersion
    }
  }

  private renderArrow(
    context: IRenderContext,
    edge: IEdge,
    arrow: ProjectedEdgeArrow | null,
    atSource: boolean,
    oldVisual: Visual | null
  ): Visual | null {
    if (!arrow) {
      return null
    }

    const arrowStyle = atSource ? this.sourceArrow : this.targetArrow
    if (arrowStyle === IArrow.NONE) {
      return null
    }

    const creator = arrowStyle.getVisualCreator(edge, atSource, arrow.anchor, arrow.direction)
    return oldVisual ? creator.updateVisual(context, oldVisual) : creator.createVisual(context)
  }

  protected lookup(edge: IEdge, type: Constructor): any {
    if (type === IOrthogonalEdgeHelper) {
      return new OrthogonalEdgeHelper(edge)
    }
    return super.lookup(edge, type)
  }
}

function getEdgeRenderContext(context: ICanvasContext): EdgeRenderContext {
  const graphComponent = context.canvasComponent as GraphComponent
  const graph = getGraph(context)
  const projectionState = getProjectionState(context)

  const graphModelManager = graphComponent.graphModelManager
  if (!(graphModelManager instanceof ProjectionAwareGraphModelManager)) {
    throw new Error('The graph component must use ProjectionAwareGraphModelManager')
  }

  return {
    graphComponent,
    graph,
    projectionState,
    refreshVersion: graphModelManager.projectionRevision
  }
}

function computeArrowKey(arrow: IArrow): string {
  return [arrow.length, arrow.cropLength, arrow.cropAtPort ? '1' : '0'].join(':')
}

function getPaddedPointBounds(points: readonly Point[], padding: number): Rect {
  if (points.length === 0) {
    return Rect.EMPTY
  }

  let minX = points[0].x
  let minY = points[0].y
  let maxX = minX
  let maxY = minY
  for (let index = 1; index < points.length; index++) {
    const point = points[index]
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return new Rect(
    minX - padding,
    minY - padding,
    maxX - minX + padding * 2,
    maxY - minY + padding * 2
  )
}
