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
  DelegatingEdgeStyle,
  GeneralPath,
  type IEdge,
  type IEdgeStyle,
  type IRenderContext,
  PathType,
  Point,
  Stroke,
  SvgVisual,
  type TaggedSvgVisual
} from '@yfiles/yfiles'

/**
 * The GeneralPath that is used to render the GradientDelegatingEdgeStyle.
 */
type GradientDelegatingEdgeCache = { generalPath: GeneralPath | null; cssClass?: string | null }

/**
 * The SVG visual that makes up a GradientDelegating Edge
 */
type GradientDelegatingEdgeVisual = TaggedSvgVisual<SVGGElement, GradientDelegatingEdgeCache>

/**
 * A delegating edge style that applies a gradient to the edge's path.
 * Flattens the general path adding interpolated color steps to each resulting line segment.
 */
export class GradientDelegatingEdgeStyle extends DelegatingEdgeStyle {
  private wrappedStyle: IEdgeStyle
  private startColor: string
  private endColor: string
  cssClass: string | undefined
  cssVarPrefix?: string = 'yfiles-gdes'

  // color-mix string to interpolate between startColor and endColor, allows the external setting of additional
  // variables to mix with a background color to dim/brighten the gradient.
  readonly interpolateStroke: string
  subdivisionTargetLength: number

  constructor(
    wrappedStyle: IEdgeStyle,
    startColor: string,
    endColor: string,
    subdivisionTargetLength: number = 40,
    cssVarPrefix?: string
  ) {
    super()
    this.wrappedStyle = wrappedStyle
    this.startColor = startColor
    this.endColor = endColor
    this.subdivisionTargetLength = subdivisionTargetLength
    this.cssClass = cssVarPrefix
    // get the cssClass from the wrappedStyle
    if ('cssClass' in this.wrappedStyle) {
      this.cssClass = this.wrappedStyle.cssClass as string
    }
    this.cssVarPrefix = cssVarPrefix
    this.interpolateStroke =
      `color-mix(in oklab, color-mix(in oklab, var(--${this.cssVarPrefix}-ca) var(--${this.cssVarPrefix}-ca-val), var(--${this.cssVarPrefix}-cb) ` +
      `var(--${this.cssVarPrefix}-cb-val)) var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
  }

  /**
   * Updates an existing visual by checking if a simple translation is sufficient or if the entire visual needs to be recreated.
   * @param context The rendering context
   * @param oldVisual The existing visual to update
   * @param edge The edge being rendered
   * @returns The updated visual or null if the edge cannot be rendered
   */
  protected updateVisual(
    context: IRenderContext,
    oldVisual: GradientDelegatingEdgeVisual,
    edge: IEdge
  ): GradientDelegatingEdgeVisual | null {
    // If the old visual has no path data, recreate it from scratch
    if (!oldVisual.tag.generalPath) {
      return this.createVisual(context, edge)
    }

    // if cssClass is different, update the class
    if (this.cssClass && oldVisual.tag.cssClass !== this.cssClass) {
      oldVisual.svgElement.classList.value = this.cssClass
      oldVisual.tag.cssClass = this.cssClass
    }

    // get the current GeneralPath of the edge
    const edgePath = this.wrappedStyle.renderer.getPathGeometry(edge, this.wrappedStyle).getPath()
    const oldGeneralPath = oldVisual.tag.generalPath
    if (!edgePath) {
      return null
    }
    // check if a translation is needed and sufficient to reflect changes in the path.
    const translationOnly = this.findCongruentTranslation(oldGeneralPath, edgePath)
    if (translationOnly) {
      SvgVisual.setTranslate(oldVisual.svgElement, translationOnly.x, translationOnly.y)
      return oldVisual
    } else {
      return this.createVisual(context, edge)
    }
  }

  /**
   * Checks if a translation is enough to reflect changes in the path.
   *
   * @param oldPath - The path to compare to.
   * @param newPath - The path to compare with.
   * @returns Translation if path are congruent (and at best need to be moved), undefined otherwise.
   * @private
   */
  private findCongruentTranslation(oldPath: GeneralPath, newPath: GeneralPath): Point | undefined {
    // if the amount of GeneralPath operations is different, the paths are not congruent
    if (oldPath.size !== newPath.size) {
      return
    }

    // the BB origins to translate the path points with
    const boundingOldOrigin = oldPath.getApproximateBounds().topLeft
    const boundingNewOrigin = newPath.getApproximateBounds().topLeft

    // set up the path cursors and position containers
    const oldPathCursor = oldPath.createCursor()
    const newPathCursor = newPath.createCursor()
    const currentOldPathPoints = Array<number>(6)
    const currentNewPathPoints = Array<number>(6)

    while (oldPathCursor.moveNext() && newPathCursor.moveNext()) {
      // depending on the path type we only need to compare a set amount of the entries
      const oldPathType = oldPathCursor.pathType
      const newPathType = newPathCursor.pathType
      if (oldPathType !== newPathType) return
      let arrayLength = -Infinity
      switch (oldPathType) {
        case PathType.MOVE_TO:
          arrayLength = 2
          break
        case PathType.LINE_TO:
          arrayLength = 2
          break
        case PathType.CUBIC_TO:
          arrayLength = 6
          break
        case PathType.QUAD_TO:
          arrayLength = 4
          break
        case PathType.CLOSE:
          arrayLength = 0
      }
      if (arrayLength === -Infinity)
        throw new Error(
          `Unexpected path type ${oldPathType} encountered while comparing GeneralPaths`
        )
      oldPathCursor.getCurrent(currentOldPathPoints)
      newPathCursor.getCurrent(currentNewPathPoints)

      // actually compare the translated points to see if a translation is not enough
      for (let i = 0; i < arrayLength; i++) {
        const normalizeOld =
          i % 2 === 0
            ? currentOldPathPoints[i] - boundingOldOrigin.x
            : currentOldPathPoints[i] - boundingOldOrigin.y
        const normalizeNew =
          i % 2 === 0
            ? currentNewPathPoints[i] - boundingNewOrigin.x
            : currentNewPathPoints[i] - boundingNewOrigin.y
        if (Math.abs(normalizeOld - normalizeNew) > 1e-12) return
      }
    }
    // if a translation is enough to reflect changes in the path, return the translation
    return boundingNewOrigin.subtract(boundingOldOrigin)
  }

  protected createVisual(_context: IRenderContext, edge: IEdge): GradientDelegatingEdgeVisual {
    const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    if (this.cssClass) {
      svgGroup.classList.value = this.cssClass
    }

    // get the GeneralPath produced by the wrapped style's renderer
    const edgePath = this.wrappedStyle.renderer.getPathGeometry(edge, this.wrappedStyle).getPath()
    if (!edgePath) {
      return SvgVisual.from(svgGroup, { generalPath: null, cssClass: null })
    }
    // subdivide the path into line segments that approximate the original curve
    const lineSegments = flattenGeneralPathToSegments(edgePath, 0.5, this.subdivisionTargetLength)
    if (lineSegments.length < 2) {
      return SvgVisual.from(svgGroup, { generalPath: null, cssClass: null })
    }
    // as the colors to interpolate between are fixed per edge we set them on the group element representing the edge
    svgGroup.style.setProperty(`--${this.cssVarPrefix}-ca`, this.startColor)
    svgGroup.style.setProperty(`--${this.cssVarPrefix}-cb`, this.endColor)
    svgGroup.style.strokeLinecap = 'round'

    // create a template line element for the interpolated color steps to avoid having to reparse the stroke css every time
    const templateLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    templateLine.style.stroke = this.interpolateStroke
    if ('stroke' in this.wrappedStyle && this.wrappedStyle.stroke instanceof Stroke) {
      templateLine.style.strokeWidth = this.wrappedStyle.stroke.thickness.toString()
    }
    // iterate over all points in the path and add interpolated color steps
    let internalPosFrom = lineSegments[0]
    let internalPosTo = lineSegments[1]

    //
    for (let index = 1; index <= lineSegments.length; index++) {
      // clone the template line element for the interpolated color steps
      const lineSeg = templateLine.cloneNode(false) as SVGLineElement
      lineSeg.setAttribute('x1', String(internalPosFrom.x))
      lineSeg.setAttribute('y1', String(internalPosFrom.y))
      lineSeg.setAttribute('x2', String(internalPosTo.x))
      lineSeg.setAttribute('y2', String(internalPosTo.y))

      // Calculate the color position along the gradient (0 at start, 1 at end)
      const colorPos = index / lineSegments.length

      // Set the color mixing ratios for the gradient interpolation
      // ca (color A) decreases from 100% to 0%, cb (color B) increases from 0% to 100%
      lineSeg.style.setProperty(`--${this.cssVarPrefix}-ca-val`, (1 - colorPos) * 100 + '%')
      lineSeg.style.setProperty(`--${this.cssVarPrefix}-cb-val`, colorPos * 100 + '%')

      // Add the line segment to the SVG group representing the edge
      svgGroup.appendChild(lineSeg)

      // Update the internal positions for the next iteration
      internalPosFrom = internalPosTo
      internalPosTo = lineSegments[index]
    }
    return SvgVisual.from(svgGroup, { generalPath: edgePath, cssClass: this.cssClass })
  }
  protected getStyle(edge: IEdge): IEdgeStyle {
    return this.wrappedStyle
  }
}

/**
 * Converts a GeneralPath to an array of line segments.
 * @param edgePath - The path to convert.
 * @param flatnessThreshold - The maximum allowed flatness of each curve. A curve is considered flat if the distance between its control points and the segment it is part of is smaller than this threshold.
 * @param sizeThreshold - The maximum allowed length of each segment. A segment is considered long if its length is larger than this threshold.
 * @returns An array of line segments. Each segment is represented by a Point.
 */
function flattenGeneralPathToSegments(
  edgePath: GeneralPath,
  flatnessThreshold: number,
  sizeThreshold: number
): Point[] {
  //storage the coordinates of a given segment
  const coordinates = new Array<number>(6)

  // Point representing the current position of the cursor for vector arithmetic
  let current: Point = new Point(0, 0)

  // the accumulated line segment points, they will be connected to form the edge path
  const lineSegments: Point[] = []

  const cursor = edgePath.createCursor()
  while (cursor.moveNext()) {
    const type = cursor.pathType
    // store the coordinates of the current segment
    cursor.getCurrent(coordinates)

    switch (type) {
      case PathType.MOVE_TO: {
        // move in the beginning of the path push the start point to the lineSegments
        current = new Point(coordinates[0], coordinates[1])
        lineSegments.push(current)
        break
      }
      case PathType.LINE_TO:
      case PathType.CLOSE: {
        // we handle lint_to and close as a linear segment so we subdivide to the line to satisfy the size threshold
        const target = new Point(coordinates[0], coordinates[1])
        const delta = target.subtract(current)
        const dist = current.distanceTo(target)
        if (dist > sizeThreshold) {
          const divisions = Math.ceil(dist / sizeThreshold)
          for (let i = 1; i < divisions; i++) {
            const t = i / divisions
            const segmentEnd = current.add(delta.multiply(t))
            // push each subdivided segment end point to the lineSegments to get a continuous line
            lineSegments.push(segmentEnd)
          }
        }
        // push the target point to the lineSegments to "close" the original LINE_TO/CLOSE
        lineSegments.push(target)
        current = target
        break
      }

      case PathType.CUBIC_TO: {
        const p1 = new Point(coordinates[0], coordinates[1])
        const p2 = new Point(coordinates[2], coordinates[3])
        const p3 = new Point(coordinates[4], coordinates[5])

        // subdivide and flatten the curve into an array of points which correspond to segments that are neither to curvy nor to long
        const flattenedCubic = subdivideCubicBezier(
          current,
          p1,
          p2,
          p3,
          flatnessThreshold,
          sizeThreshold
        )

        // push the subdivided points to the lineSegments to approximate the original curve
        lineSegments.push(...flattenedCubic)
        current = p3
        break
      }
      case PathType.QUAD_TO: {
        //quad can use the same algorithm as cubic using the only control point twice
        const controlPoint = new Point(coordinates[0], coordinates[1])
        const target = new Point(coordinates[2], coordinates[3])
        const flattenedQuad = subdivideCubicBezier(
          current,
          controlPoint,
          controlPoint,
          target,
          flatnessThreshold,
          sizeThreshold
        )
        // push the approximation of the quad curve to the lineSegments
        lineSegments.push(...flattenedQuad)
        current = target
        break
      }
    }
  }
  return lineSegments
}

/**
 * Subdivides a cubic bezier curve into smaller curves until the segment between startPoint and endPoint meets flatness and length thresholds.
 * Uses recursive subdivision to approximate the curve with line segments suitable for gradient rendering.
 * @param startPoint - The start point of the curve.
 * @param cp1 - The first control point of the curve.
 * @param cp2 - The second control point of the curve.
 * @param endPoint - The end point of the curve.
 * @param flatnessThreshold - The maximum allowed flatness of the resulting segments. A segment is considered flat if the distance between its control points and the segment it is part of is smaller than this threshold.
 * @param lengthThreshold - The maximum allowed length of the resulting segments. A segment is considered long if its length is larger than this threshold.
 * @returns An array of points representing the subdivided curve
 */
function subdivideCubicBezier(
  startPoint: Point,
  cp1: Point,
  cp2: Point,
  endPoint: Point,
  flatnessThreshold: number,
  lengthThreshold: number
): Point[] {
  const points = [startPoint] // Start with the first point

  const subdivide = (startPoint: Point, cp1: Point, cp2: Point, endPoint: Point): void => {
    // calculate the flatness as a function of the distance of the control points to the segment
    const flatness = Math.max(
      cp1.distanceToSegment(startPoint, endPoint),
      cp2.distanceToSegment(startPoint, endPoint)
    )
    //calculate the length of the segment
    const dist = startPoint.distanceTo(endPoint)

    // if either measure exceeds the threshold values, subdivide the segment into two
    if (flatness > flatnessThreshold || dist > lengthThreshold) {
      // Subdivide the segment into two at the midpoint of the segment (note t=0.5 does not guarantee an exact midpoint)
      const proximalHalf = GeneralPath.getCubicSplitPoints(
        startPoint,
        cp1,
        cp2,
        endPoint,
        true,
        0.5
      )
      const distalHalf = GeneralPath.getCubicSplitPoints(startPoint, cp1, cp2, endPoint, false, 0.5)

      // Recursively subdivide each half
      subdivide(proximalHalf[0], proximalHalf[1], proximalHalf[2], proximalHalf[3])
      subdivide(distalHalf[0], distalHalf[1], distalHalf[2], distalHalf[3])
    } else {
      // both thresholds are met, add the end point
      points.push(endPoint)
    }
  }

  subdivide(startPoint, cp1, cp2, endPoint)
  return points
}
