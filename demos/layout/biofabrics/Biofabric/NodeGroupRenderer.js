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
  IBoundsProvider,
  ObjectRendererBase,
  Point,
  Rect,
  SvgVisual,
  TextRenderSupport
} from '@yfiles/yfiles'

/**
 * The renderer in charge of visually representing a node group in the biofabric.
 */
export class NodeGroupRenderer extends ObjectRendererBase {
  offset
  thickness
  color
  font

  /**
   * Creates a new biofabric node group renderer instance
   * @param x the offset, i.e., right-most x-coordinate, of a biofabric's node group visual
   * @param thickness the node group visual's SVGRectElement's width
   * @param color the HTML color of the node group visual
   */
  constructor(x, thickness, color) {
    super()
    this.offset = x
    this.thickness = thickness
    this.color = color
    this.font = new Font({ fontFamily: 'Sans-Serif', fontSize: 3 * this.thickness })
  }

  /**
   * Creates a new biofabric node group visual
   * @param context the visualization's IRender context
   * @param renderTag the NodeGroupRendererRenderTag which contains the node group's unique ID/name
   * as well as an NodeGroup object, which itself contains the node group's ID, nodes, collapsed
   * state, and highlighted state
   * @returns a new NodeGroupVisual or nothing (null)
   * @protected
   */
  createVisual(context, renderTag) {
    // Extract the node group's nodes and collapsed state
    const { groupName, nodeGroup } = renderTag
    const nodes = nodeGroup.nodes
    const collapsed = nodeGroup.collapsed

    // Create a new SVG group to contain the node group visual
    const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svgGroup.classList.add('biofabric-node-group')

    // Calculate maximum and minimum x-coordinates of the node group's incident edges
    const { max, min } = this.calculateMinMax(nodes, context)

    // Create the EVGRectElement that spans the height of the node group and append it to the node group's SVG group
    const rectangle = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rectangle.classList.add('group-rectangle')
    rectangle.x.baseVal.value = this.offset
    rectangle.y.baseVal.value = min
    rectangle.height.baseVal.value = max - min
    rectangle.width.baseVal.value = this.thickness
    rectangle.rx.baseVal.value = this.thickness / 2
    rectangle.ry.baseVal.value = this.thickness / 2
    rectangle.style.fill = this.color ? this.color : ''
    rectangle.style.stroke = this.color ? this.color : ''
    svgGroup.append(rectangle)

    // Create the node group's padding between circle and rectangle and add it to the node group's SVG group
    const padding = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    padding.classList.add('group-padding')
    padding.cx.baseVal.value = this.offset + 0.5 * this.thickness
    padding.cy.baseVal.value = (max + min) / 2
    padding.r.baseVal.value = this.thickness * 3
    svgGroup.append(padding)

    // Add the node group's circle indicating the center of the node group as well as its collapsed state
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.classList.add('group-circle')
    if (collapsed) {
      circle.classList.add('collapsed')
    }
    circle.cx.baseVal.value = this.offset + 0.5 * this.thickness
    circle.cy.baseVal.value = (max + min) / 2
    circle.r.baseVal.value = this.thickness
    circle.setAttribute('stroke-width', this.thickness.toString() + 'px')
    circle.style.stroke = this.color ? this.color : ''
    svgGroup.append(circle)

    // Add the node group's label/ID as an SVGTextElement to the node group's SVG group
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.classList.add('group-text')
    text.setAttribute('x', (this.offset - this.thickness * 3).toString())
    text.setAttribute('y', ((max + min) / 2).toString())
    text.setAttribute('text-anchor', 'end')
    text.setAttribute('text-align', 'end')
    text.setAttribute('text-color', '#dfdee3')
    text.setAttribute('dominant-baseline', 'central')
    this.font.applyTo(text)
    text.textContent = groupName
    if (this.color) {
      text.style.fill = this.color
    }
    svgGroup.append(text)

    // Return the SVG visual
    return SvgVisual.from(svgGroup, {
      nodeGroupLine: rectangle,
      nodeGroupPadding: padding,
      nodeGroupCircle: circle,
      nodeGroupText: text
    })
  }

  /**
   * Update the current node group visual
   * @param context the visualization's IRender context
   * @param oldVisual the old SVG visual consisting of all SVG elements in the created SVG group
   * @param renderTag the NodeGroupRendererRenderTag which contains the node group's unique ID/name
   * as well as an NodeGroup object, which itself contains the node group's ID, nodes, collapsed
   * state, and highlighted state
   * @protected
   */
  updateVisual(context, oldVisual, renderTag) {
    // Calculate the node group's max/min bounds from the render tag
    const { max, min } = this.calculateMinMax(renderTag.nodeGroup.nodes, context)

    // Extract individual SVG elements from the old visual
    const {
      nodeGroupLine: rectangle,
      nodeGroupPadding: padding,
      nodeGroupCircle: circle,
      nodeGroupText: text
    } = oldVisual.tag

    // Update the rectangle's position, width, and color
    rectangle.x.baseVal.value = this.offset
    rectangle.y.baseVal.value = min
    rectangle.height.baseVal.value = max - min
    rectangle.style.fill = this.color ? this.color : ''
    rectangle.style.stroke = this.color ? this.color : ''

    // Update the position of the padding object
    padding.cx.baseVal.value = this.offset + 0.5 * this.thickness
    padding.cy.baseVal.value = (max + min) / 2

    // Update the position and (if collapsed) the CSS class of the node group's circle
    circle.cx.baseVal.value = this.offset + 0.5 * this.thickness
    circle.cy.baseVal.value = (max + min) / 2
    circle.style.stroke = this.color ? this.color : ''
    circle.style.fill = this.color && renderTag.nodeGroup.collapsed ? this.color : ''
    if (renderTag.nodeGroup.collapsed) {
      circle.classList.add('collapsed')
    } else {
      circle.classList.remove('collapsed')
    }

    // Update the position of the node group's text
    text.setAttribute('x', (this.offset - this.thickness * 3).toString())
    text.setAttribute('y', ((max + min) / 2).toString())
    text.style.fill = this.color ? this.color : ''

    // If mouse-over and thus highlighted, add 'highlight' to the group's CSS class
    if (renderTag.nodeGroup.highlighted) {
      oldVisual.svgElement.classList.add('highlight')
    } else {
      oldVisual.svgElement.classList.remove('highlight')
    }

    // Return the updated visual
    return oldVisual
  }

  /**
   * Calculate the maximum and minimum y-coordinates of the nodes incident to the edge group's edges
   * @param nodes an array of 'IEdges' whose incident nodes' max and min positions are to be determined
   * @param context the ICanvasContext
   * @returns the maximum and minimum y-coordinates of the provided edges' incident nodes
   * @private
   */
  calculateMinMax(nodes, context) {
    // Calculate maximum y-coordinate of nodes in the current edge group
    const max = nodes.reduce(
      (currentMax, node) =>
        Math.max(currentMax, node.lookup(IBoundsProvider).getBounds(context).maxY),
      -Infinity
    )

    // Calculate minimum y-coordinate of nodes in the current edge group
    const min = nodes.reduce(
      (currentMin, node) => Math.min(currentMin, node.lookup(IBoundsProvider).getBounds(context).y),
      Infinity
    )

    // Return both maximum and minimum
    return { max, min }
  }

  /**
   * Check whether a given (x,y) coordinate pair falls within the bounds of the node group's visual's
   * rectangular bounds
   * @param context the visualization's IRenderContext
   * @param location the (x,y) coordinate pair whose overlap with the node group's rectangular bounds
   * is to be checked
   * @param renderTag the NodeGroupRendererRenderTag which contains the node group's unique ID/name
   * as well as an NodeGroup object, which itself contains the node group's ID, nodes, collapsed
   * state, and highlighted state
   * @returns a boolean flag indicating whether the provided location falls within the rectangular
   * bounds of the node group's visuals
   * @protected
   */
  isHit(context, location, renderTag) {
    return this.getBounds(context, renderTag).contains(location)
  }

  /**
   * Calculate the rectangular bounds of the node group's visual elements
   * @param context the visualization's IRenderContext
   * @param renderTag the NodeGroupRendererRenderTag which contains the node group's unique ID/name
   * as well as an NodeGroup object, which itself contains the node group's ID, nodes, collapsed
   * state, and highlighted state
   * @protected
   */
  getBounds(context, renderTag) {
    const textSize = TextRenderSupport.measureText(renderTag.groupName, this.font)

    // The maximum and minimum y-coordinates of the group's nodes
    const { max, min } = this.calculateMinMax(renderTag.nodeGroup.nodes, context)

    // Return a new rectangle describing the bounds of the complete group visual
    return new Rect(
      new Point(
        this.offset - this.thickness * 3 - textSize.width,
        max - min < textSize.height ? min - textSize.height * 0.5 : min
      ),
      new Point(
        this.offset + this.thickness * 2.5,
        max - min < textSize.height ? max + textSize.height * 0.5 : max
      )
    )
  }
}
