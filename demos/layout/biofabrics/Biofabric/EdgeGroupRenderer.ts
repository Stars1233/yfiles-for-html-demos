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
  type ICanvasContext,
  type IEdge,
  type IInputModeContext,
  type IRenderContext,
  ObjectRendererBase,
  type Point,
  Rect,
  SvgVisual,
  type TaggedSvgVisual,
  TextRenderSupport
} from '@yfiles/yfiles'
import type { EdgeGroup, EdgeGroupRendererRenderTag } from './BiofabricTypes'

/**
 * The various SVG elements that make up an Edge Group visual, i.e.,
 * - edgeGroupLine: a line stretching from the edge group's first to its last edge,
 * - EdgeGroupPadding: a circle designed to create some visual space between a group's line and circle,
 * - edgeGroupCircle: a circle indicating the center of a edge group as well as its collapsed state, and
 * - edgeGroupText: the unique ID/label of the edge group
 */
type EdgeGroupCache = {
  edgeGroupLine: SVGRectElement
  edgeGroupPadding: SVGCircleElement
  edgeGroupCircle: SVGCircleElement
  edgeGroupText: SVGTextElement
}

/**
 * The SVG visual that makes up a Biofabric's edge group visual
 */
type EdgeGroupVisual = TaggedSvgVisual<SVGGElement, EdgeGroupCache>

/**
 * The renderer in charge of visually representing an edge group in the biofabric.
 */
export class EdgeGroupRenderer extends ObjectRendererBase<{
  groupName: string
  edgeGroup: EdgeGroup
}> {
  private readonly offset: number
  readonly thickness: number
  color: string | undefined
  readonly font: Font

  /**
   * Creates a new biofabric edge group renderer instance
   * @param y the offset, i.e., lowest y-coordinate, of a biofabric's edge group visual
   * @param thickness the edge group visual's SVGRectElement's height
   * @param color the HTML color of the edge group visual
   */
  constructor(y: number, thickness: number, color?: string) {
    super()
    this.offset = y
    this.thickness = thickness
    this.color = color
    this.font = new Font({ fontFamily: 'Sans-Serif', fontSize: 3 * this.thickness })
  }

  /**
   * Creates a new biofabric edge group visual
   * @param context the visualization's IRender context
   * @param renderTag the EdgeGroupRendererRenderTag which contains the edge group's unique ID/name
   * as well as an EdgeGroup object, which itself contains the edge group's ID, edges, collapsed
   * state, and highlighted state
   * @returns a new EdgeGroupVisual or nothing (null)
   * @protected
   */
  protected createVisual(
    context: IRenderContext,
    renderTag: EdgeGroupRendererRenderTag
  ): EdgeGroupVisual | null {
    // Extract the edge group's edges and collapsed state
    const { groupName, edgeGroup } = renderTag
    const edges = edgeGroup.edges
    const collapsed = edgeGroup.collapsed

    // Create a new SVG group to contain the edge group visual
    const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svgGroup.classList.add('biofabric-edge-group')

    // Calculate maximum and minimum y-coordinates of the edge group's incident nodes
    const { max, min } = this.calculateMinMax(edges, context)

    // Create the EVGRectElement that spans the width of the edge group and append it to the edge group's SVG group
    const rectangle = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rectangle.classList.add('group-rectangle')
    rectangle.y.baseVal.value = this.offset
    rectangle.x.baseVal.value = min
    rectangle.width.baseVal.value = max - min
    rectangle.height.baseVal.value = this.thickness
    rectangle.rx.baseVal.value = this.thickness / 2
    rectangle.ry.baseVal.value = this.thickness / 2
    rectangle.style.fill = this.color ? this.color : ''
    rectangle.style.stroke = this.color ? this.color : ''
    svgGroup.append(rectangle)

    // Create the edge group's padding between circle and rectangle and add it to the edge group's SVG group
    const padding = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    padding.classList.add('group-padding')
    padding.cy.baseVal.value = this.offset + 0.5 * this.thickness
    padding.cx.baseVal.value = (max + min) / 2
    padding.r.baseVal.value = this.thickness * 3
    svgGroup.append(padding)

    // Add the edge group's circle indicating the center of the edge group as well as its collapsed state
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.classList.add('group-circle')
    if (collapsed) {
      circle.classList.add('collapsed')
    }
    circle.cy.baseVal.value = this.offset + 0.5 * this.thickness
    circle.cx.baseVal.value = (max + min) / 2
    circle.r.baseVal.value = this.thickness
    circle.setAttribute('stroke-width', this.thickness.toString() + 'px')
    circle.style.stroke = this.color ? this.color : ''
    svgGroup.append(circle)

    // Add the edge group's label/ID as an SVGTextElement to the edge group's SVG group
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.classList.add('group-text')
    text.setAttribute('y', (this.offset - this.thickness * 3).toString())
    text.setAttribute('x', ((max + min) / 2).toString())
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('text-align', 'middle')
    text.setAttribute('text-color', '#dfdee3')
    text.setAttribute('dominant-baseline', 'auto')
    this.font.applyTo(text)
    text.textContent = groupName
    text.style.fill = this.color ? this.color : ''
    svgGroup.append(text)

    // Return the SVG visual
    return SvgVisual.from(svgGroup, {
      edgeGroupLine: rectangle,
      edgeGroupPadding: padding,
      edgeGroupCircle: circle,
      edgeGroupText: text
    })
  }

  /**
   * Update the current edge group visual
   * @param context the visualization's IRender context
   * @param oldVisual the old SVG visual consisting of all SVG elements in the created SVG group
   * @param renderTag the EdgeGroupRendererRenderTag which contains the edge group's unique ID/name
   * as well as an EdgeGroup object, which itself contains the edge group's ID, edges, collapsed
   * state, and highlighted state
   * @protected
   */
  protected updateVisual(
    context: IRenderContext,
    oldVisual: EdgeGroupVisual,
    renderTag: EdgeGroupRendererRenderTag
  ): EdgeGroupVisual | null {
    // Extract the edge group and its max/min bounds from the render tag
    const edgeGroup = renderTag.edgeGroup
    const { max, min } = this.calculateMinMax(edgeGroup!.edges, context)

    // Extract individual SVG elements from the old visual
    const {
      edgeGroupLine: rectangle,
      edgeGroupPadding: padding,
      edgeGroupCircle: circle,
      edgeGroupText: text
    } = oldVisual.tag

    // Update the rectangle's position, width, and color
    rectangle.y.baseVal.value = this.offset
    rectangle.x.baseVal.value = min
    rectangle.width.baseVal.value = max - min
    rectangle.style.fill = this.color ? this.color : ''
    rectangle.style.stroke = this.color ? this.color : ''

    // Update the position of the padding object
    padding.cy.baseVal.value = this.offset + 0.5 * this.thickness
    padding.cx.baseVal.value = (max + min) / 2

    // Update the position and (if collapsed) the CSS class of the edge group's circle
    circle.cy.baseVal.value = this.offset + 0.5 * this.thickness
    circle.cx.baseVal.value = (max + min) / 2
    circle.style.stroke = this.color ? this.color : ''
    circle.style.fill = this.color && renderTag.edgeGroup.collapsed ? this.color : ''
    if (edgeGroup!.collapsed) {
      circle.classList.add('collapsed')
    } else {
      circle.classList.remove('collapsed')
    }

    // Update the position of the edge group's text
    text.setAttribute('y', (this.offset - this.thickness * 3).toString())
    text.setAttribute('x', ((max + min) / 2).toString())
    text.style.fill = this.color ? this.color : ''

    // If mouse-over and thus highlighted, add 'highlight' to the group's CSS class
    if (edgeGroup!.highlighted) {
      oldVisual.svgElement.classList.add('highlight')
    } else {
      oldVisual.svgElement.classList.remove('highlight')
    }

    // Return the updated visual
    return oldVisual
  }

  /**
   * Calculate the maximum and minimum x-coordinates of the nodes incident to the edge group's edges
   * @param edges an array of 'IEdges' whose incident nodes' max and min positions are to be determined
   * @param _ the ICanvasContext
   * @returns the maximum and minimum x-coordinates of the provided edges' incident nodes
   * @private
   */
  private calculateMinMax(edges: Array<IEdge>, _: ICanvasContext): { max: number; min: number } {
    // Calculate maximum x-coordinate of nodes in the current edge group
    const max = edges.reduce(
      (currentMax, edge): number => Math.max(currentMax, edge.sourcePort.location.x),
      -Infinity
    )

    // Calculate minimum x-coordinate of nodes in the current edge group
    const min = edges.reduce(
      (currentMin, edge): number => Math.min(currentMin, edge.sourcePort.location.x),
      Infinity
    )

    // Return both maximum and minimum
    return { max, min }
  }

  /**
   * Calculate the rectangular bounds of the edge group's visual elements
   * @param context the visualization's IRenderContext
   * @param renderTag the EdgeGroupRendererRenderTag which contains the edge group's unique ID/name
   * as well as an EdgeGroup object, which itself contains the edge group's ID, edges, collapsed
   * state, and highlighted state
   * @protected
   */
  protected getBounds(context: ICanvasContext, renderTag: EdgeGroupRendererRenderTag): Rect {
    // Calculate the edge group's label's/ID's text size
    const textSize = TextRenderSupport.measureText(renderTag.groupName, this.font)

    // Calculate the max/min bounds of the edge group's nodes' x-coordinates
    const { max, min } = this.calculateMinMax(renderTag.edgeGroup.edges, context)

    // Return the rectangular bounds of the edge group's visual elements
    return new Rect(
      max - min > textSize.width ? min : min - 0.5 * textSize.width,
      this.offset - this.thickness * 5.5,
      Math.max(max - min, textSize.width),
      this.thickness * 7.5
    )
  }

  /**
   * Check whether a given (x,y) coordinate pair falls within the bounds of the edge group's visual's
   * rectangular bounds
   * @param context the visualization's IRenderContext
   * @param location the (x,y) coordinate pair whose overlap with the edge group's rectangular bounds
   * is to be checked
   * @param renderTag the EdgeGroupRendererRenderTag which contains the edge group's unique ID/name
   * as well as an EdgeGroup object, which itself contains the edge group's ID, edges, collapsed
   * state, and highlighted state
   * @returns a boolean flag indicating whether the provided location falls within the rectangular
   * bounds of the edge group's visuals
   * @protected
   */
  protected isHit(
    context: IInputModeContext,
    location: Point,
    renderTag: EdgeGroupRendererRenderTag
  ): boolean {
    return this.getBounds(context, renderTag).contains(location)
  }
}
