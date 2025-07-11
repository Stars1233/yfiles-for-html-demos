/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) by yWorks GmbH, Vor dem Kreuzberg 28,
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
  BaseClass,
  GeneralPath,
  GeometryUtilities,
  ICanvasContext,
  IInputModeContext,
  INode,
  IRenderContext,
  ISvgDefsCreator,
  Matrix,
  NodeStyleBase,
  Point,
  Rect,
  SvgVisual
} from '@yfiles/yfiles'
/**
 * This class manages an SVG element in the <defs> element.
 */
class SimpleSvgDefsCreator extends BaseClass(ISvgDefsCreator) {
  svgElement
  /**
   * Creates an instance of the defs support class. Each node type
   * is managed by its own defs support.
   * @param svgElement The SVG element of this defs support
   */
  constructor(svgElement) {
    super()
    this.svgElement = svgElement
  }
  /**
   * Creates the actual defs element.
   * @param context The canvas context.
   * @see Specified by {@link ISvgDefsCreator.createDefsElement}.
   */
  createDefsElement(context) {
    // the element needs to be cloned otherwise it will be removed during canvas export
    const visualElement = this.svgElement.cloneNode(true)
    // prevent duplicate ids due to cloning
    visualElement.removeAttribute('id')
    return visualElement
  }
  /**
   * Updates the defs element. This implementation does nothing.
   * @param context The canvas context.
   * @param oldElement The old defs element.
   * @see Specified by {@link ISvgDefsCreator.updateDefsElement}.
   */
  updateDefsElement(context, oldElement) {}
  /**
   * Checks if this defs element is still referenced by this node.
   * In this simple implementation, the element should never be removed from the DOM.
   * @param context The canvas context.
   * @param node The node.
   * @param id The defs id.
   * @see Specified by {@link ISvgDefsCreator.accept}.
   */
  accept(context, node, id) {
    return true
  }
}
/**
 * An node style for complex SVG visualizations with an elliptical shape.
 *
 * Due to the complexity of the visualization, this style avoids duplicating all its SVG elements
 * for each node. Instead, all nodes of the same "type" share a common <g> element in the <defs>
 * section and just reference it via a <use> element.
 *
 * The <g> element is expected to be of size 1x1 and scaled up according to the node's size. Using
 * an SVG with a viewport would work, too, however this is currently discouraged
 * for performance reasons in Firefox (see https://bugzilla.mozilla.org/show_bug.cgi?id=1420160).
 *
 * In the current implementation, the type is given by the node's tag.
 */
export class ComplexSvgNodeStyle extends NodeStyleBase {
  static IMAGES = [
    new SimpleSvgDefsCreator(document.querySelector('#usericon_female1')),
    new SimpleSvgDefsCreator(document.querySelector('#usericon_female2')),
    new SimpleSvgDefsCreator(document.querySelector('#usericon_female3')),
    new SimpleSvgDefsCreator(document.querySelector('#usericon_female4')),
    new SimpleSvgDefsCreator(document.querySelector('#usericon_female5')),
    new SimpleSvgDefsCreator(document.querySelector('#usericon_male1')),
    new SimpleSvgDefsCreator(document.querySelector('#usericon_male2')),
    new SimpleSvgDefsCreator(document.querySelector('#usericon_male3')),
    new SimpleSvgDefsCreator(document.querySelector('#usericon_male4')),
    new SimpleSvgDefsCreator(document.querySelector('#usericon_male5'))
  ]
  /**
   * Returns the defs creator for the given node based on its tag.
   * @param node The node.
   */
  static getDefsCreator(node) {
    const type = typeof node.tag === 'number' ? node.tag : 0
    const index = Math.max(0, Math.min(type, ComplexSvgNodeStyle.IMAGES.length - 1))
    return ComplexSvgNodeStyle.IMAGES[index]
  }
  /**
   * Creates the visual representation for the given node.
   * @param context The render context.
   * @param node The node to create the visual for.
   * @returns The visual for the given node.
   * @see {@link updateVisual}
   * @see {@link ComplexSvgNodeStyle.updateVisual}
   */
  createVisual(context, node) {
    const useElement = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    // get the defs creator
    const defsCreator = ComplexSvgNodeStyle.getDefsCreator(node)
    // get the defs id of the element that belongs to the creator ...
    const id = context.getDefsId(defsCreator)
    // ... and assign it to the <use> element
    useElement.href.baseVal = `#${id}`
    // set the proper location and size of the <use>
    const { x, y, width, height } = node.layout
    const matrix = new Matrix(width, 0, 0, height, x, y)
    matrix.applyTo(useElement)
    // store the information about current node layout so we can efficiently update the element later
    return SvgVisual.from(useElement, { x, y, width, height })
  }
  /**
   * Updates the visual representation for the given node.
   * @param context The render context.
   * @param oldVisual The visual that has been created in the call to
   * {@link ComplexSvgNodeStyle.createVisual}.
   * @param node The node to create the visual for.
   * @returns The new or updated visual for the given node.
   * @see {@link ComplexSvgNodeStyle.createVisual}
   */
  updateVisual(context, oldVisual, node) {
    const { x, y, width, height } = node.layout
    // get the cache we stored in the createVisual method
    const cache = oldVisual.tag
    // update width and height only if necessary
    if (cache.x !== x || cache.y !== y || cache.width !== width || cache.height !== height) {
      // set the proper location and size of the use
      const matrix = new Matrix(width, 0, 0, height, x, y)
      matrix.applyTo(oldVisual.svgElement)
      cache.x = x
      cache.y = y
      cache.width = width
      cache.height = height
    }
    return oldVisual
  }
  /**
   * Gets the outline of the node's visual, an ellipse in this case.
   * This allows correct edge path intersection calculation, among others.
   * @param node The node.
   * @see Overrides {@link NodeStyleBase.getOutline}
   */
  getOutline(node) {
    const outline = new GeneralPath()
    outline.appendEllipse(node.layout, false)
    return outline
  }
  /**
   * Gets the bounding box of the node's visual.
   * @param context The canvas context.
   * @param node The node.
   * @see Overrides {@link NodeStyleBase.getBounds}
   */
  getBounds(context, node) {
    return node.layout.toRect()
  }
  /**
   * Determines whether the visual representation of the node has been hit at the given location.
   * @param context The input mode context.
   * @param location The location to be checked.
   * @param node The node that may be hit.
   * @returns Whether the visual representation of the node has been hit at the given location.
   * @see Overrides {@link NodeStyleBase.isHit}
   */
  isHit(context, location, node) {
    const nodeLayout = node.layout.toRect()
    return (
      nodeLayout.contains(location) &&
      GeometryUtilities.ellipseContains(nodeLayout, location, context.hitTestRadius)
    )
  }
  /**
   * Determines whether the visualization for the specified node is included in the marquee selection.
   * @param context The input mode context.
   * @param rectangle The rectangle to be checked.
   * @param node The node that may be in the rectangle.
   * @returns true if the specified node is selected by the marquee rectangle; false otherwise.
   * @see Overrides {@link NodeStyleBase.isInBox}
   */
  isInBox(context, rectangle, node) {
    // early exit if not even the bounds are contained in the box
    if (!super.isInBox(context, rectangle, node)) {
      return false
    }
    const eps = context.hitTestRadius
    const outline = this.getOutline(node)
    if (outline.pathIntersects(rectangle, eps)) {
      return true
    }
    if (
      outline.pathContains(rectangle.topLeft, eps) &&
      outline.pathContains(rectangle.bottomRight, eps)
    ) {
      return true
    }
    return rectangle.contains(node.layout.topLeft) && rectangle.contains(node.layout.bottomRight)
  }
  /**
   * Determines whether the provided point is geometrically inside the visual bounds of the node.
   * @param node The node.
   * @param location The point to check.
   * @returns Whether the point is considered to lie inside the shape.
   * @see Overrides {@link NodeStyleBase.isInside}
   */
  isInside(node, location) {
    if (!super.isInside(node, location)) {
      return false
    }
    return GeometryUtilities.ellipseContains(node.layout.toRect(), location, 0)
  }
  /**
   * Gets the intersection of a line with the visual representation of the node.
   * @param node The node.
   * @param inner The coordinates of a point lying inside the shape.
   * @param outer The coordinates of a point lying outside the shape.
   * @see Overrides {@link NodeStyleBase.getIntersection}
   */
  getIntersection(node, inner, outer) {
    return GeometryUtilities.getEllipseLineIntersection(node.layout.toRect(), inner, outer)
  }
}
