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
  GeneralPath,
  type GraphMLIOHandler,
  type IArrow,
  IBend,
  IBendSelectionTester,
  type IEdge,
  IOrthogonalEdgeHelper,
  type IPort,
  OrthogonalEdgeHelper,
  PathEdgeStyleBase,
  type Point,
  type Stroke
} from '@yfiles/yfiles'
import { getNextEdgeItem, getVisualCuttingLengthForItems } from './utils'
import { OctilinearBendSelectionTester } from './OctilinearBendSelectionTester'

/**
 * An edge style that draws orthogonal edges in an octilinear style. For this purpose, 90-degree
 * corners are cut with a 45-degree segment (called octilinear segment in this context). This
 * segment's length is controlled by property {@link preferredOctilinearSegmentLength}. The
 * implementation of this style calculates with the cutting length, which is the distance between
 * the cut-off and the actual bend location. This cutting length is stored in the bend's tag.
 */
export class OctilinearEdgeStyle extends PathEdgeStyleBase {
  private _stroke: Stroke
  private _targetArrow: IArrow
  private _preferredOctilinearSegmentLength = 30

  protected get cssClass(): string {
    return 'edge'
  }

  get stroke(): Stroke {
    return this._stroke
  }

  set stroke(value: Stroke) {
    this._stroke = value
  }

  get targetArrow(): IArrow {
    return this._targetArrow
  }

  set targetArrow(value: IArrow) {
    this._targetArrow = value
  }

  /**
   * Gets or sets the preferred length of the octilinear segments. The actual segment lengths might
   * be smaller due to the graph's layout. Once constrained, segments keep their current length on
   * graph changes, but new bends will use this property.
   */
  get preferredOctilinearSegmentLength(): number {
    return this._preferredOctilinearSegmentLength
  }

  /**
   * Gets or sets the preferred length of the octilinear segments. The actual segment lengths might
   * be smaller due to the graph's layout. Once constrained, segments keep their current length on
   * graph changes, but new bends will use this property.
   */
  set preferredOctilinearSegmentLength(value: number) {
    this._preferredOctilinearSegmentLength = value
  }

  constructor(stroke: Stroke, arrow: IArrow, preferredOctilinearSegmentLength: number) {
    super()
    this._stroke = stroke
    this._targetArrow = arrow
    this._preferredOctilinearSegmentLength = preferredOctilinearSegmentLength
  }

  /**
   * Overridden to register custom implementations for {@link IOrthogonalEdgeHelper}
   * and {@link IBendSelectionTester}.
   */
  protected lookup(edge: IEdge, type: Constructor): unknown {
    if (type === IOrthogonalEdgeHelper) {
      return new OrthogonalEdgeHelper(edge)
    }

    if (type === IBendSelectionTester) {
      return new OctilinearBendSelectionTester(edge)
    }

    return super.lookup(edge, type)
  }

  protected getStroke(edge: IEdge): Stroke {
    return this._stroke
  }

  protected getTargetArrow(edge: IEdge): IArrow {
    return this._targetArrow
  }

  /**
   * Creates the visual path for the edge using octilinear segments.
   */
  protected getPath(edge: IEdge): GeneralPath | null {
    // create a new GeneralPath with the edge points
    const generalPath = new GeneralPath()
    const points = this.getEdgePoints(edge)
    generalPath.moveTo(points[0])
    for (const point of points) {
      generalPath.lineTo(point)
    }
    return generalPath
  }

  /**
   * Calculates the visual points that define the octilinear path of the edge.
   * This includes calculating the intermediate points for the diagonal segments
   * based on the current cutting length of each bend.
   */
  private getEdgePoints(edge: IEdge): Point[] {
    if (edge.bends.size === 0) {
      return [edge.sourcePort.location, edge.targetPort.location]
    }

    const points = [edge.sourcePort.location]

    let prevItem: IBend | IPort = edge.sourcePort
    let bend: IBend | IPort = edge.bends.get(0)

    while (bend instanceof IBend) {
      const nextItem = getNextEdgeItem(bend)

      const prevPoint = prevItem.location.toPoint()
      const bendPoint = bend.location.toPoint()
      const nextPoint = nextItem.location.toPoint()

      const vectorToPrev = prevPoint.subtract(bendPoint)
      const vectorToNext = nextPoint.subtract(bendPoint)

      const cuttingLength = getVisualCuttingLengthForItems(prevItem, bend, nextItem)

      points.push(bendPoint.add(vectorToPrev.normalized.multiply(cuttingLength)))
      points.push(bendPoint.add(vectorToNext.normalized.multiply(cuttingLength)))

      prevItem = bend
      bend = nextItem
    }

    points.push(edge.targetPort.location)
    return points
  }
}

/**
 * Registers the {@link OctilinearEdgeStyle} with the {@link GraphMLIOHandler}.
 * @param ioHandler The {@link GraphMLIOHandler} to register the {@link OctilinearEdgeStyle} with.
 */
export function enableOctilinearEdgeStyleSerialization(ioHandler: GraphMLIOHandler): void {
  ioHandler.addTypeInformation(OctilinearEdgeStyle, {
    name: 'OctilinearEdgeStyle',
    xmlNamespace: 'http://www.yworks.com/demos/octilinear-edge-style/1.0'
  })
}
