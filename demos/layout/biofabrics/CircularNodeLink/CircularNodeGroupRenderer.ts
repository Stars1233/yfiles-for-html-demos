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
  Font,
  GeneralPath,
  type ICanvasContext,
  type IInputModeContext,
  type IRenderContext,
  ObjectRendererBase,
  Point,
  Rect,
  SvgVisual,
  type TaggedSvgVisual,
  TextRenderSupport
} from '@yfiles/yfiles'
import type { NodeGroup } from '../Biofabric/BiofabricTypes'

type CircularNodeGroupCache = { nodeGroupPath: SVGPathElement; nodeGroupText: SVGTextElement }
type CircularNodeGroupVisual = TaggedSvgVisual<SVGGElement, CircularNodeGroupCache>

/**
 * Renderer for circular node groups that displays them as arc segments around the circle.
 * Groups are rendered with a colored arc and a label along the arc path.
 */
export class CircularNodeGroupRenderer extends ObjectRendererBase<{
  groupName: string
  nodeGroup: NodeGroup
  largeGroup: boolean
}> {
  readonly thickness: number
  readonly radiusOffset: number
  private font: Font
  color: string | undefined
  center = new Point(0, 0)

  /**
   * Creates a new circular node group renderer.
   * @param thickness The stroke width of the group arc
   * @param radiusOffset The distance from the node circle to the group arc
   * @param color Optional color for the group arc and text
   */
  constructor(thickness: number, radiusOffset: number, color?: string) {
    super()
    this.thickness = thickness
    this.radiusOffset = radiusOffset
    this.font = new Font({ fontFamily: 'Sans-Serif', fontSize: 4 * this.thickness })
    this.color = color
  }

  protected createVisual(
    _context: IRenderContext,
    renderTag: { groupName: string; nodeGroup: NodeGroup; largeGroup: boolean }
  ): CircularNodeGroupVisual | null {
    const nodes = renderTag.nodeGroup.nodes
    const radius = nodes.at(0)!.layout.center.subtract(this.center).vectorLength + this.radiusOffset

    let start: Point
    let end: Point

    if (nodes.length === 1) {
      const nodePos = nodes[0].layout.center.subtract(this.center).normalized

      const spreadAngle = 0.1

      start = new Point(
        (nodePos.x * Math.cos(-spreadAngle) - nodePos.y * Math.sin(-spreadAngle)) * radius,
        (nodePos.x * Math.sin(-spreadAngle) + nodePos.y * Math.cos(-spreadAngle)) * radius
      )
      end = new Point(
        (nodePos.x * Math.cos(spreadAngle) - nodePos.y * Math.sin(spreadAngle)) * radius,
        (nodePos.x * Math.sin(spreadAngle) + nodePos.y * Math.cos(spreadAngle)) * radius
      )
    } else {
      // Multiple nodes case: use start and end node coordinates
      const startNodeCoordinates = nodes[0].layout.center
      const endNodeCoordinates = nodes[nodes.length - 1].layout.center
      start = startNodeCoordinates.subtract(this.center).normalized.multiply(radius)
      end = endNodeCoordinates.subtract(this.center).normalized.multiply(radius)
    }

    // Set Group
    const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svgGroup.classList.add('circular-node-group')

    // Node Group Line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.classList.add('group-path')
    path.setAttribute('id', 'circular-node-group-' + renderTag.groupName + '-path')

    // Large arc flag is always 0 for single nodes since the spread is small
    const largeArcFlag = nodes.length === 1 ? 0 : renderTag.largeGroup ? 1 : 0

    path.setAttribute(
      'd',
      `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
    )
    path.style.fill = 'none'
    path.style.stroke = this.color ? this.color : ''
    path.style.strokeWidth = this.thickness + 'px'
    path.style.strokeLinecap = 'round'
    svgGroup.append(path)

    // Text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.classList.add('group-text')
    text.style.fill = this.color ? this.color : ''
    text.setAttribute('dy', '-20px')
    this.font.applyTo(text)

    const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath')
    textPath.setAttribute('href', '#circular-node-group-' + renderTag.groupName + '-path')
    textPath.setAttribute('startOffset', '50%')
    textPath.setAttribute('text-anchor', 'middle')
    textPath.textContent = renderTag.groupName
    text.appendChild(textPath)

    // Add to SVG Group
    svgGroup.append(text)
    return SvgVisual.from(svgGroup, { nodeGroupPath: path, nodeGroupText: text })
  }

  protected updateVisual(
    _context: IRenderContext,
    oldVisual: CircularNodeGroupVisual,
    renderTag: { groupName: string; nodeGroup: NodeGroup; largeGroup: boolean }
  ): SvgVisual | null {
    if (renderTag.nodeGroup.highlighted) {
      oldVisual.svgElement.classList.add('highlight')
    } else {
      oldVisual.svgElement.classList.remove('highlight')
    }

    const { nodeGroupPath: path, nodeGroupText: text } = oldVisual.tag
    path.style.stroke = this.color ? this.color : ''
    text.style.fill = this.color ? this.color : ''

    return oldVisual
  }

  protected isHit(
    _context: IInputModeContext,
    location: Point,
    renderTag: { groupName: string; nodeGroup: NodeGroup }
  ): boolean {
    const nodes = renderTag.nodeGroup.nodes
    const startNodeCoordinates = nodes[0].layout.center
    const endNodeCoordinates = nodes[nodes.length - 1].layout.center
    const radius = nodes.at(0)!.layout.center.subtract(this.center).vectorLength + this.radiusOffset

    let start: Point
    let end: Point

    if (nodes.length === 1) {
      const nodePos = nodes[0].layout.center.subtract(this.center).normalized

      const spreadAngle = 0.1

      start = new Point(
        (nodePos.x * Math.cos(-spreadAngle) - nodePos.y * Math.sin(-spreadAngle)) * radius,
        (nodePos.x * Math.sin(-spreadAngle) + nodePos.y * Math.cos(-spreadAngle)) * radius
      )
      end = new Point(
        (nodePos.x * Math.cos(spreadAngle) - nodePos.y * Math.sin(spreadAngle)) * radius,
        (nodePos.x * Math.sin(spreadAngle) + nodePos.y * Math.cos(spreadAngle)) * radius
      )
    } else {
      start = startNodeCoordinates.subtract(this.center).normalized.multiply(radius)
      end = endNodeCoordinates.subtract(this.center).normalized.multiply(radius)
    }

    return this.isPointOnArc(start, end, location, radius, this.center, radius * 0.05)
  }

  protected getBounds(
    _context: ICanvasContext,
    renderTag: { groupName: string; nodeGroup: NodeGroup }
  ): Rect {
    const textHeight = TextRenderSupport.measureText(renderTag.groupName, this.font).height

    const radius =
      renderTag.nodeGroup.nodes.at(0)!.layout.center.subtract(this.center).vectorLength +
      this.radiusOffset * 1.1
    return new Rect(
      -radius - textHeight,
      -radius - textHeight,
      radius * 2 + textHeight,
      radius * 2 + textHeight
    )
  }

  /**
   * Determines if a given point lies on an arc segment.
   * @param a Start point of the arc
   * @param b End point of the arc
   * @param testPoint The point to test
   * @param radius The radius of the arc
   * @param center The center of the circle containing the arc
   * @param epsilon Tolerance for distance check (default 0.1)
   * @param counterClockwise Direction of the arc sweep (default true)
   * @returns True if the test point is on the arc, false otherwise
   */
  isPointOnArc(
    a: Point,
    b: Point,
    testPoint: Point,
    radius: number,
    center: Point,
    epsilon = 0.1,
    counterClockwise = true
  ): boolean {
    // First check if the point is at the correct distance from center
    const distance = center.subtract(testPoint).vectorLength

    if (Math.abs(distance - radius) > epsilon) {
      return false
    }

    // Calculate angles for all three points relative to center
    const angleA = Math.atan2(a.y - center.y, a.x - center.x)
    const angleB = Math.atan2(b.y - center.y, b.x - center.x)
    const angleP = Math.atan2(testPoint.y - center.y, testPoint.x - center.x)

    // Calculate the sweep angle and target angle based on direction
    let sweep: number
    let target: number

    if (!counterClockwise) {
      sweep = angleA - angleB
      target = angleA - angleP
    } else {
      sweep = angleB - angleA
      target = angleP - angleA
    }

    // Normalize angles to [0, 2π) range to handle wraparound
    const normalize = (ang: number): number => {
      const twoPi = Math.PI * 2
      return ((ang % twoPi) + twoPi) % twoPi
    }

    const normalizedSweep = normalize(sweep)
    const normalizedTarget = normalize(target)

    // Check if the target angle falls within the sweep angle
    return normalizedTarget <= normalizedSweep
  }
}
