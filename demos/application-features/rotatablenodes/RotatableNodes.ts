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
  CanvasComponent,
  ClickEventArgs,
  type Constructor,
  Cursor,
  GeneralPath,
  GraphComponent,
  HandlePositions,
  HandleType,
  ICanvasContext,
  IClipboardHelper,
  ICompoundEdit,
  IFocusRenderer,
  IGraph,
  IGraphClipboardContext,
  IHandle,
  IHandleProvider,
  IHighlightRenderer,
  IInputMode,
  IInputModeContext,
  ILookup,
  IMarkupExtensionConverter,
  IModelItem,
  IModelItemCollector,
  INode,
  INodeStyle,
  IOrientedRectangle,
  IPoint,
  IPort,
  IPortLocationModel,
  IPortLocationModelParameter,
  IRenderContext,
  IReshapeHandleProvider,
  IReshapeHandler,
  ISelectionRenderer,
  ISize,
  ISvgDefsCreator,
  IWriteContext,
  List,
  MarkupExtension,
  Matrix,
  NodeStyleBase,
  OrientedRectangle,
  OrthogonalEdgeEditingContext,
  Point,
  PortLocationModelParameterHandle,
  Rect,
  ShapeNodeStyle,
  Size,
  SnapContext,
  SvgVisual,
  SvgVisualGroup,
  Visual
} from '@yfiles/yfiles'
import { OrientedRectangleRendererBase } from '@yfiles/demo-utils/OrientedRectangleRendererBase'

class RotatableNodeSelectionRenderer extends OrientedRectangleRendererBase<INode> {
  createIndicatorElement(_context: IRenderContext, size: ISize, _renderTag: INode): SVGElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', size.width.toString())
    rect.setAttribute('height', size.height.toString())
    rect.setAttribute('stroke', '#e8cb87')
    rect.setAttribute('stroke-width', '2')
    rect.setAttribute('stroke-linecap', 'butt')
    rect.setAttribute('fill', 'none')
    return rect
  }

  updateIndicatorElement(
    _context: IRenderContext,
    size: ISize,
    _renderTag: INode,
    oldSvgElement: SVGElement
  ): SVGElement {
    oldSvgElement.setAttribute('width', size.width.toString())
    oldSvgElement.setAttribute('height', size.height.toString())
    return oldSvgElement
  }

  getLayout(renderTag: INode): IOrientedRectangle {
    const styleWrapper = renderTag.style
    if (styleWrapper instanceof RotatableNodeStyleDecorator) {
      return styleWrapper.getRotatedLayout(renderTag)
    }
    return new OrientedRectangle(renderTag.layout)
  }
}

class RotatableNodeFocusRenderer extends OrientedRectangleRendererBase<INode> {
  createIndicatorElement(_context: IRenderContext, size: ISize, _renderTag: INode): SVGElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', size.width.toString())
    rect.setAttribute('height', size.height.toString())
    rect.setAttribute('stroke', '#e8cb87')
    rect.setAttribute('stroke-width', '2')
    rect.setAttribute('stroke-dasharray', '2, 2')
    rect.setAttribute('stroke-dashoffset', '1.5')
    rect.setAttribute('stroke-linecap', 'butt')
    rect.setAttribute('fill', 'none')
    return rect
  }

  updateIndicatorElement(
    _context: IRenderContext,
    size: ISize,
    _renderTag: INode,
    oldSvgElement: SVGElement
  ): SVGElement {
    const rect = oldSvgElement
    rect.setAttribute('width', size.width.toString())
    rect.setAttribute('height', size.height.toString())
    return rect
  }

  getLayout(renderTag: INode): IOrientedRectangle {
    const styleWrapper = renderTag.style
    if (styleWrapper instanceof RotatableNodeStyleDecorator) {
      return styleWrapper.getRotatedLayout(renderTag)
    }
    return new OrientedRectangle(renderTag.layout)
  }
}

class RotatableNodeHighlightRenderer extends OrientedRectangleRendererBase<INode> {
  createIndicatorElement(_context: IRenderContext, size: ISize, _renderTag: INode): SVGElement {
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect1.setAttribute('width', (size.width + 8).toString())
    rect1.setAttribute('height', (size.height + 8).toString())
    rect1.setAttribute('x', '-4')
    rect1.setAttribute('y', '-4')
    rect1.setAttribute('stroke', '#621B00')
    rect1.setAttribute('stroke-width', '3')
    rect1.setAttribute('fill', 'none')
    container.appendChild(rect1)
    return container
  }

  updateIndicatorElement(
    _context: IRenderContext,
    size: ISize,
    _renderTag: INode,
    oldSvgElement: SVGElement
  ): SVGElement {
    const container = oldSvgElement as SVGGElement
    const rect1 = container.firstChild as SVGRectElement
    rect1.setAttribute('width', (size.width + 8).toString())
    rect1.setAttribute('height', (size.height + 8).toString())
    rect1.setAttribute('x', '-4')
    rect1.setAttribute('y', '-4')
    return container
  }

  getLayout(renderTag: INode): IOrientedRectangle {
    const item = renderTag
    const styleWrapper = item?.style
    if (styleWrapper instanceof RotatableNodeStyleDecorator) {
      return styleWrapper.getRotatedLayout(item)
    }
    return new OrientedRectangle(item.layout)
  }
}

/**
 * A node style that displays another wrapped style rotated by a specified rotation angle.
 * The angle is stored in this decorator to keep the tag free for user data. Hence, this decorator
 * should not be shared between nodes if they can have different angles.
 */
export class RotatableNodeStyleDecorator extends BaseClass(
  NodeStyleBase,
  IMarkupExtensionConverter
) {
  rotatedLayout: CachingOrientedRectangle = new CachingOrientedRectangle()
  matrix = new Matrix()
  matrixCenter = Point.ORIGIN
  matrixAngle = 0
  inverseMatrix: Matrix = new Matrix()
  inverseMatrixCenter = Point.ORIGIN
  inverseMatrixAngle = 0

  /**
   * Creates a new instance with a wrapped node style and an angle.
   */
  constructor(wrapped: INodeStyle | null = null, angle = 0) {
    super()
    this.wrapped = wrapped || new ShapeNodeStyle()
    this.angle = angle || 0
  }

  /**
   * Specifies the wrapped style.
   */
  wrapped: INodeStyle

  /**
   * Returns the rotation angle.
   */
  get angle(): number {
    return this.rotatedLayout.angle
  }

  /**
   * Specifies the rotation angle.
   */
  set angle(angle: number) {
    this.rotatedLayout.angle = angle
  }

  /**
   * Creates a visual which rotates the visualization of the wrapped style.
   */
  createVisual(context: IRenderContext, node: INode): SvgVisualGroup {
    const wrappedVisual = this.wrapped.renderer
      .getVisualCreator(node, this.wrapped)
      .createVisual(context)
    const container = new SvgVisualGroup()
    const matrix = new Matrix()
    matrix.rotate(toRadians(this.angle), node.layout.center)
    container.transform = matrix
    if (wrappedVisual instanceof SvgVisual) {
      container.add(wrappedVisual)
    }
    ;(container as any)['render-data-cache'] = {
      angle: this.angle,
      center: node.layout.center,
      wrapped: this.wrapped
    }
    context.registerForChildrenIfNecessary(container, this.disposeChildren.bind(this))
    return container
  }

  /**
   * Updates a visual which rotates the visualization of the wrapped style.
   */
  updateVisual(context: IRenderContext, oldVisual: SvgVisualGroup, node: INode): SvgVisualGroup {
    const cache = (oldVisual as any)['render-data-cache']

    const oldWrappedStyle = cache.wrapped
    const newWrappedStyle = this.wrapped

    const creator = this.wrapped.renderer.getVisualCreator(node, this.wrapped)

    const oldWrappedVisual = oldVisual.children.at(0)

    let newWrappedVisual: Visual | null
    if (newWrappedStyle !== oldWrappedStyle) {
      newWrappedVisual = creator ? creator.createVisual(context) : null
    } else {
      newWrappedVisual = creator ? creator.updateVisual(context, oldWrappedVisual) : null
    }

    if (oldWrappedVisual !== newWrappedVisual) {
      if (newWrappedVisual instanceof SvgVisual) {
        if (oldVisual.children.size >= 1) {
          oldVisual.children.set(0, newWrappedVisual)
        } else {
          oldVisual.add(newWrappedVisual)
        }
      } else {
        if (oldVisual.children.size >= 1) {
          oldVisual.children.removeAt(0)
        }
      }
      context.childVisualRemoved(oldWrappedVisual)
    }
    context.registerForChildrenIfNecessary(oldVisual, this.disposeChildren.bind(this))

    if (cache.angle !== this.angle || !cache.center.equals(node.layout.center)) {
      const matrix = new Matrix()
      matrix.rotate(toRadians(this.angle), node.layout.center)
      oldVisual.transform = matrix
    }

    ;(oldVisual as any)['render-data-cache'] = {
      angle: this.angle,
      center: node.layout.center,
      wrapped: this.wrapped
    }

    return oldVisual
  }

  /**
   * Returns bounds based on the size provided by the wrapped style and the location and
   * rotation of the node.
   */
  getBounds(context: ICanvasContext, node: INode) {
    const nodeOrientedRect = this.getRotatedLayout(node)

    // Create an oriented rectangle with the size of the wrapped bounds and the location and rotation of the node
    const wrappedBounds = this.wrapped.renderer
      .getBoundsProvider(node, this.wrapped)
      .getBounds(context)

    const orientedRectangle = new OrientedRectangle(
      0,
      0,
      wrappedBounds.width,
      wrappedBounds.height,
      nodeOrientedRect.upX,
      nodeOrientedRect.upY
    )
    orientedRectangle.setCenter(node.layout.center)

    return orientedRectangle.bounds
  }

  /**
   * Returns the intersection point of the node's rotated bounds and the segment between the inner
   * and outer point or null if there is no intersection.
   */
  getIntersection(node: INode, inner: Point, outer: Point): Point | null {
    const rotatedInner = this.getRotatedPoint(inner, node, false)
    const rotatedOuter = this.getRotatedPoint(outer, node, false)

    const rotatedIntersection = this.wrapped.renderer
      .getShapeGeometry(node, this.wrapped)
      .getIntersection(rotatedInner, rotatedOuter)
    if (rotatedIntersection) {
      return this.getRotatedPoint(rotatedIntersection, node, true)
    }
    return null
  }

  /**
   * Returns the outline of the node's rotated shape.
   */
  getOutline(node: INode): GeneralPath {
    let outline = this.wrapped.renderer.getShapeGeometry(node, this.wrapped).getOutline()
    if (outline) {
      outline = outline.clone()
      outline.transform(this.getInverseRotationMatrix(node))
    } else {
      const layout = this.getRotatedLayout(node)
      outline = new GeneralPath()
      outline.appendOrientedRectangle(layout, false)
    }
    return outline
  }

  /**
   * Returns whether the given location is inside the rotated node.
   */
  isHit(context: IInputModeContext, location: Point, node: INode): boolean {
    // rotated the point like the node, that is by the angle around the node center
    const transformedPoint = this.getRotatedPoint(location, node, false)
    return this.wrapped.renderer.getHitTestable(node, this.wrapped).isHit(context, transformedPoint)
  }

  /**
   * Returns whether the given node is inside the rectangle.
   */
  isInBox(context: IInputModeContext, rectangle: Rect, node: INode): boolean {
    const nodeOrientedRect = this.getRotatedLayout(node)

    // Create an oriented rectangle with the size of the wrapped bounds and the location and rotation of the node
    const wrappedBounds = this.wrapped.renderer
      .getBoundsProvider(node, this.wrapped)
      .getBounds(context)
    const orientedRectangle = new OrientedRectangle(
      0,
      0,
      wrappedBounds.width,
      wrappedBounds.height,
      nodeOrientedRect.upX,
      nodeOrientedRect.upY
    )
    orientedRectangle.setCenter(node.layout.center)

    return rectangle.intersects(orientedRectangle, 0.01)
  }

  /**
   * Returns whether the node is currently visible.
   */
  isVisible(context: ICanvasContext, rectangle: Rect, node: INode): boolean {
    return (
      this.wrapped.renderer
        .getVisibilityTestable(node, this.wrapped)
        .isVisible(context, rectangle) || this.getBounds(context, node).intersects(rectangle)
    )
  }

  /**
   * Returns customized helpers that consider the node rotation for resizing and rotating gestures,
   * highlight indicators, and clipboard operations. Other lookup calls will be delegated to the
   * lookup of the wrapped node style.
   */
  lookup(node: INode, type: Constructor<any>): object {
    // Custom reshape handles that rotate with the node
    if (type === IReshapeHandleProvider) {
      return new RotatedReshapeHandleProvider(node)
    }
    // Custom handle to rotate the node
    if (type === IHandleProvider) {
      return new NodeRotateHandleProvider(node)
    }
    // Selection decoration
    if (type === ISelectionRenderer) {
      return new RotatableNodeSelectionRenderer()
    }
    // Focus decoration
    if (type === IFocusRenderer) {
      return new RotatableNodeFocusRenderer()
    }
    // // Highlight decoration
    if (type === IHighlightRenderer) {
      return new RotatableNodeHighlightRenderer()
    }
    // Clipboard helper that clones the style instance when pasting rotated nodes
    if (type === IClipboardHelper) {
      return new RotatableNodeClipboardHelper()
    }

    return (
      super.lookup(node, type) || this.wrapped.renderer.getContext(node, this.wrapped).lookup(type)
    )
  }

  /**
   * Creates a copy of this node style decorator.
   */
  clone(): this {
    return new RotatableNodeStyleDecorator(this.wrapped, this.angle) as this
  }

  /**
   * Returns the rotated bounds of the node.
   */
  getRotatedLayout(node: INode): CachingOrientedRectangle {
    this.rotatedLayout.updateCache(node.layout.toRect())
    return this.rotatedLayout
  }

  /**
   * Returns the rotated point.
   */
  getRotatedPoint(point: Point, node: INode, inverse: boolean): Point {
    const matrix = inverse ? this.getInverseRotationMatrix(node) : this.getRotationMatrix(node)
    return matrix.transform(point)
  }

  /**
   * Returns the rotation matrix for the given node and the current angle.
   */
  getRotationMatrix(node: INode): Matrix {
    const center = node.layout.center
    if (!center.equals(this.matrixCenter) || this.angle !== this.matrixAngle) {
      this.matrix.reset()
      this.matrix.rotate(toRadians(-this.angle), center)
      this.matrixCenter = center
      this.matrixAngle = this.angle
    }
    return this.matrix
  }

  /**
   * Returns the inverse rotation matrix for the given node and the current angle.
   */
  getInverseRotationMatrix(node: INode): Matrix {
    const center = node.layout.center
    if (!center.equals(this.inverseMatrixCenter) || this.angle !== this.inverseMatrixAngle) {
      this.inverseMatrix.reset()
      this.inverseMatrix.rotate(toRadians(this.angle), center)
      this.inverseMatrixCenter = center
      this.inverseMatrixAngle = this.angle
    }
    return this.inverseMatrix
  }

  disposeChildren(
    context: IRenderContext,
    removedVisual: Visual,
    _dispose: boolean
  ): Visual | null {
    const container = removedVisual instanceof SvgVisualGroup ? removedVisual : null
    if (container != null && container.children.size > 0) {
      context.childVisualRemoved(container.children.get(0))
    }
    return null
  }

  /**
   * Returns that this style can be converted.
   */
  canConvert(_context: IWriteContext, _value: any): boolean {
    return true
  }

  /**
   * Converts this style using {@link RotatableNodeStyleDecoratorExtension}.
   */
  convert(_context: IWriteContext, value: any): MarkupExtension {
    const decorator = value as RotatableNodeStyleDecorator
    const extension = new RotatableNodeStyleDecoratorExtension()
    extension.wrapped = decorator.wrapped
    extension.angle = decorator.angle
    return extension
  }
}

/**
 * A node reshape handle that adjusts its position according to the node rotation.
 */
class RotatedNodeResizeHandle extends BaseClass(IHandle, IPoint) {
  private portHandles: List<IHandle> = new List()
  private initialLayout: OrientedRectangle
  private dummyLocation: Point = null!
  private dummySize: ISize = null!
  private initialRect: Rect = null!

  /**
   * Creates a new instance.
   *
   * @param position The position of the handle around the node
   * @param node The node to resize
   * @param reshapeHandler the original reshape handler of the node
   * @param symmetricResize whether the node is symmetrically resized.
   */
  constructor(
    private position: HandlePositions,
    private node: INode,
    private reshapeHandler: IReshapeHandler,
    public readonly symmetricResize: boolean
  ) {
    super()
    this.initialLayout = new OrientedRectangle(this.getNodeBasedOrientedRectangle())
  }

  /**
   * Returns the node rotation information.
   */
  getNodeBasedOrientedRectangle(): CachingOrientedRectangle {
    if (this.node.style instanceof RotatableNodeStyleDecorator) {
      return this.node.style.getRotatedLayout(this.node)
    }
    return new CachingOrientedRectangle()
  }

  /**
   * Sets the original node bounds according to the given anchor location and size.
   */
  setNodeLocationAndSize(inputModeContext: IInputModeContext, anchor: Point, size: ISize): Rect {
    const graph = inputModeContext.graph
    if (!graph) {
      return Rect.EMPTY
    }
    const orientedRectangle = new OrientedRectangle(
      anchor.x,
      anchor.y,
      size.width,
      size.height,
      this.initialLayout.upX,
      this.initialLayout.upY
    )
    const center = orientedRectangle.center

    const layout = Rect.fromCenter(center, size.toSize())
    graph.setNodeLayout(this.node, layout)
    return layout
  }

  /**
   * Defines the visualization of the handle. In this case a dot that rotates nicely.
   */
  get type(): HandleType {
    return HandleType.RESIZE
  }

  /**
   * Gets the optional tag object associated with the handle.
   */
  get tag(): any {
    return null
  }

  /**
   * Returns the cursor visualization according to the handle position.
   */
  get cursor(): Cursor {
    const layout = this.getNodeBasedOrientedRectangle()
    const angle = layout.angle
    const cursors = [Cursor.NWSE_RESIZE, Cursor.NS_RESIZE, Cursor.NESW_RESIZE, Cursor.EW_RESIZE]
    let index: number
    // Pick the right array index for the respective handle location
    switch (this.position) {
      case HandlePositions.TOP_LEFT:
      case HandlePositions.BOTTOM_RIGHT:
        index = 0
        break
      case HandlePositions.TOP:
      case HandlePositions.BOTTOM:
        index = 1
        break
      case HandlePositions.TOP_RIGHT:
      case HandlePositions.BOTTOM_LEFT:
        index = 2
        break
      case HandlePositions.RIGHT:
      case HandlePositions.LEFT:
        index = 3
        break
      default:
        return Cursor.POINTER
    }
    // Then shift the array position according to the rotation angle
    index += Math.round(angle / 45)
    index %= cursors.length
    if (index < 0) {
      index += cursors.length
    }
    return cursors[index % cursors.length]
  }

  /**
   * Gets the location of this handle considering the node rotation.
   */
  get location(): Point {
    return this.getLocation(this.getNodeBasedOrientedRectangle(), this.position)
  }

  /**
   * Stores the initial layout of the node in case the user cancels the resizing.
   */
  initializeDrag(inputModeContext: IInputModeContext): void {
    if (this.reshapeHandler) {
      // if there is a reshape handler: initialize to
      // ensure proper handling of a parent group node
      this.reshapeHandler.initializeReshape(inputModeContext)
    }
    this.initialLayout.setShape(this.getNodeBasedOrientedRectangle())
    this.dummyLocation = this.initialLayout.anchor
    this.dummySize = this.initialLayout.toSize()
    this.initialRect = this.node.layout.toRect()

    this.portHandles.clear()
    const portContext = new DelegatingContext(inputModeContext)
    this.node.ports.forEach((port) => {
      const portHandle = new DummyPortLocationModelParameterHandle(port)
      portHandle.initializeDrag(portContext)
      this.portHandles.add(portHandle)
    })
  }

  /**
   * Adjusts the node location and size according to the new handle location.
   */
  handleMove(
    inputModeContext: IInputModeContext,
    originalLocation: Point,
    newLocation: Point
  ): void {
    // calculate how much the handle was moved
    const upNormal = new Point(-this.initialLayout.upY, this.initialLayout.upX)
    const deltaW = this.getWidthDelta(originalLocation, newLocation, upNormal)
    const up = this.initialLayout.upVector
    const deltaH = this.getHeightDelta(originalLocation, newLocation, up)

    // add one or two times delta to the width to expand the node right and left
    this.dummySize = new Size(
      this.initialLayout.width + deltaW * (this.symmetricResize ? 2 : 1),
      this.initialLayout.height + deltaH * (this.symmetricResize ? 2 : 1)
    )

    // Calculate the new location.
    // Depending on our handle position, a different corner of the node should stay fixed.
    if (this.symmetricResize) {
      const dx = upNormal.x * deltaW + up.x * deltaH
      const dy = upNormal.y * deltaW + up.y * deltaH
      this.dummyLocation = this.initialLayout.anchor.subtract(new Point(dx, dy))
    } else {
      const w = this.dummySize.width - this.initialLayout.width
      const h = this.dummySize.height - this.initialLayout.height
      switch (this.position) {
        case HandlePositions.TOP_LEFT:
          this.dummyLocation = this.initialLayout.anchor.subtract(new Point(-up.y * w, up.x * w))
          break
        case HandlePositions.BOTTOM:
        case HandlePositions.BOTTOM_LEFT:
        case HandlePositions.LEFT:
          this.dummyLocation = this.initialLayout.anchor.subtract(
            new Point(up.x * h - up.y * w, up.y * h + up.x * w)
          )
          break
        case HandlePositions.BOTTOM_RIGHT:
          this.dummyLocation = this.initialLayout.anchor.subtract(new Point(up.x * h, up.y * h))
          break
        // case HandlePositions.TOP:
        // case HandlePositions.TOPEast:
        // case HandlePositions.RIGHT:
        default:
          this.dummyLocation = this.initialLayout.anchor
          break
      }
    }

    const newLayout = this.setNodeLocationAndSize(
      inputModeContext,
      this.dummyLocation,
      this.dummySize
    )

    const portContext = new DelegatingContext(inputModeContext)
    this.portHandles.forEach((portHandle) => {
      portHandle.handleMove(portContext, this.dummyLocation, newLocation)
    })
    if (this.reshapeHandler) {
      // if there is a reshape handler:
      // ensure proper handling of a parent group node
      this.reshapeHandler.handleReshape(inputModeContext, this.initialRect, newLayout)
    }
  }

  /**
   * Returns the delta by which the width of the node was changed.
   */
  getWidthDelta(originalLocation: Point, newLocation: Point, vector: Point): number {
    switch (this.position) {
      case HandlePositions.TOP_LEFT:
      case HandlePositions.LEFT:
      case HandlePositions.BOTTOM_LEFT:
        // calculate the total distance the handle has been moved in this drag gesture
        // max with minus half the node size - because the node can't shrink below zero
        return Math.max(
          vector.scalarProduct(originalLocation.subtract(newLocation)),
          -this.initialLayout.width * (this.symmetricResize ? 0.5 : 1)
        )
      case HandlePositions.TOP_RIGHT:
      case HandlePositions.RIGHT:
      case HandlePositions.BOTTOM_RIGHT:
        return Math.max(
          vector.scalarProduct(newLocation.subtract(originalLocation)),
          -this.initialLayout.width * (this.symmetricResize ? 0.5 : 1)
        )
      default:
        return 0.0
    }
  }

  /**
   * Returns the delta by which the height of the node was changed.
   */
  getHeightDelta(originalLocation: Point, newLocation: Point, vector: Point): number {
    switch (this.position) {
      case HandlePositions.TOP_LEFT:
      case HandlePositions.TOP:
      case HandlePositions.TOP_RIGHT:
        return Math.max(
          vector.scalarProduct(newLocation.subtract(originalLocation)),
          -this.initialLayout.height * (this.symmetricResize ? 0.5 : 1)
        )
      case HandlePositions.BOTTOM_LEFT:
      case HandlePositions.BOTTOM:
      case HandlePositions.BOTTOM_RIGHT:
        return Math.max(
          vector.scalarProduct(originalLocation.subtract(newLocation)),
          -this.initialLayout.height * (this.symmetricResize ? 0.5 : 1)
        )
      default:
        return 0.0
    }
  }

  /**
   * Restores the original node layout.
   */
  cancelDrag(inputModeContext: IInputModeContext, originalLocation: Point) {
    this.setNodeLocationAndSize(
      inputModeContext,
      this.initialLayout.anchor.toPoint(),
      this.initialLayout.toSize()
    )
    const portContext = new DelegatingContext(inputModeContext)
    this.portHandles.forEach((portHandle) => {
      portHandle.cancelDrag(portContext, originalLocation)
    })
    this.portHandles.clear()
    if (this.reshapeHandler) {
      // if there is a reshape handler:
      // ensure proper handling of a parent group node
      this.reshapeHandler.cancelReshape(inputModeContext, this.initialRect)
    }
  }

  /**
   * Applies the new node layout.
   */
  dragFinished(
    inputModeContext: IInputModeContext,
    originalLocation: Point,
    newLocation: Point
  ): void {
    const newLayout = this.setNodeLocationAndSize(
      inputModeContext,
      this.dummyLocation,
      this.dummySize
    )
    const portContext = new DelegatingContext(inputModeContext)
    this.portHandles.forEach((portHandle) => {
      portHandle.dragFinished(portContext, originalLocation, newLocation)
    })
    this.portHandles.clear()
    if (this.reshapeHandler) {
      // if there is a reshape handler:
      // ensure proper handling of a parent group node
      this.reshapeHandler.reshapeFinished(inputModeContext, this.initialRect, newLayout)
    }
  }

  /**
   * Gets the location that is specified by the given ratios.
   */
  static getLocation(
    rectangle: IOrientedRectangle,
    ratioWidth: number,
    ratioHeight: number
  ): Point {
    const x1 = rectangle.anchorX
    const y1 = rectangle.anchorY

    const upX = rectangle.upX
    const upY = rectangle.upY

    const w = rectangle.width * ratioWidth
    const h = rectangle.height * ratioHeight
    const x2 = x1 + upX * h - upY * w
    const y2 = y1 + upY * h + upX * w
    return new Point(x2, y2)
  }

  /**
   * Returns the x-coordinate of the rotated bounds.
   */
  get x(): number {
    return this.getLocation(this.getNodeBasedOrientedRectangle(), this.position).x
  }

  /**
   * Returns the y-coordinate of the rotated bounds.
   */
  get y(): number {
    return this.getLocation(this.getNodeBasedOrientedRectangle(), this.position).y
  }

  /**
   * Returns the location of the specified position on the border of the oriented rectangle.
   */
  getLocation(layout: IOrientedRectangle, position: HandlePositions): Point {
    if (!layout) {
      return this.node.layout.topLeft
    }
    switch (position) {
      case HandlePositions.TOP_LEFT:
        return RotatedNodeResizeHandle.getLocation(layout, 0.0, 1.0)
      case HandlePositions.TOP:
        return RotatedNodeResizeHandle.getLocation(layout, 0.5, 1.0)
      case HandlePositions.TOP_RIGHT:
        return RotatedNodeResizeHandle.getLocation(layout, 1.0, 1.0)
      case HandlePositions.RIGHT:
        return RotatedNodeResizeHandle.getLocation(layout, 1.0, 0.5)
      case HandlePositions.BOTTOM_RIGHT:
        return RotatedNodeResizeHandle.getLocation(layout, 1.0, 0.0)
      case HandlePositions.BOTTOM:
        return RotatedNodeResizeHandle.getLocation(layout, 0.5, 0.0)
      case HandlePositions.BOTTOM_LEFT:
        return layout.anchor
      case HandlePositions.LEFT:
        return RotatedNodeResizeHandle.getLocation(layout, 0.0, 0.5)
      default:
        throw new Error()
    }
  }

  /**
   * This implementation does nothing special when clicked.
   */
  handleClick(_evt: ClickEventArgs): void {}
}

/**
 * Provides reshape handles for rotated nodes.
 */
class RotatedReshapeHandleProvider extends BaseClass(IReshapeHandleProvider) {
  node: INode
  reshapeHandler: IReshapeHandler

  /**
   * Creates a new instance for a given node.
   */
  constructor(node: INode) {
    super()
    this.node = node
    // use a reshape handler to properly handle
    // implicit resizing of parent group nodes
    this.reshapeHandler = node.lookup(IReshapeHandler)!
  }

  /**
   * Returns all eight positions around a node.
   */
  getAvailableHandles(_inputModeContext: IInputModeContext): HandlePositions {
    return HandlePositions.BORDER
  }

  /**
   * Returns a RotatedNodeResizeHandle for the given position and node.
   */
  getHandle(_inputModeContext: IInputModeContext, position: HandlePositions): IHandle {
    return new RotatedNodeResizeHandle(position, this.node, this.reshapeHandler, false)
  }
}

/**
 * Provides a rotate handle for a given node.
 */
class NodeRotateHandleProvider extends BaseClass(IHandleProvider) {
  private readonly reshapeHandler: IReshapeHandler

  /**
   * Creates a new instance for the given node.
   */
  constructor(private readonly node: INode) {
    super()
    this.node = node
    this.reshapeHandler = node.lookup(IReshapeHandler)!
    this.snapStep = 90
    this.snapDelta = 10
    this.snapToSameAngleDelta = 5
  }

  /**
   * Specifies the angular step size to which rotation should snap (in degrees).
   * Default is `90`. Setting this to `0` will disable snapping to predefined steps.
   */
  snapStep: number

  /**
   * Specifies the snapping distance when rotation should snap (in degrees).
   * The rotation will snap if the angle is less than this distance from a {@link snapStep snapping angle}.
   * Default is `10`. Setting this to a non-positive value will
   * disable snapping to predefined steps.
   */
  snapDelta: number

  /**
   * Specifies the snapping distance (in degrees) for snapping to the same angle as other visible
   * nodes. Rotation will snap to another node's rotation angle if the current angle differs from
   * the other one by less than this. The default is `5`. Setting this to a non-positive value will
   * disable same angle snapping.
   */
  snapToSameAngleDelta: number

  /**
   * Returns a set of handles for the rotated node.
   */
  getHandles(_context: IInputModeContext): List<IHandle> {
    const handle = new NodeRotateHandle(this.node, this.reshapeHandler)
    handle.snapDelta = this.snapDelta
    handle.snapStep = this.snapStep
    handle.snapToSameAngleDelta = this.snapToSameAngleDelta

    return List.fromArray([handle])
  }
}

type SameAngleGroup = { angle: number; nodes: [INode] }

/**
 * A custom {@link IHandle} implementation that implements the functionality needed for rotating a
 * label.
 */
export class NodeRotateHandle extends BaseClass(IHandle, IPoint) {
  private portHandles: List<IHandle> = new List<IHandle>()
  private rotationCenter: Point = null!
  private initialAngle = 0
  private compoundEdit: ICompoundEdit | null = null
  // Load the custom rotation cursor
  private _cursor: Cursor = new Cursor('resources/rotate.cur', Cursor.CROSSHAIR)
  // A cache of angles and nodes with those angles used for same angle snapping.
  private nodeAngles: SameAngleGroup[] | null = null
  // The currently highlighted nodes for same angle snapping.
  private sameAngleHighlightedNodes: INode[] | null = null

  /**
   * Creates a new instance.
   */
  constructor(
    private node: INode,
    private reshapeHandler: IReshapeHandler
  ) {
    super()
    this.snapDelta = 0
    this.snapStep = 0
    this.snapToSameAngleDelta = 0
  }

  /**
   * Returns the current oriented rectangle for the given node.
   */
  getOrientedRectangle(node: INode): CachingOrientedRectangle {
    const wrapper = node.style
    return wrapper instanceof RotatableNodeStyleDecorator
      ? wrapper.getRotatedLayout(node)
      : new CachingOrientedRectangle()
  }

  /**
   * The threshold value that specifies whether the angle should snap to the next multiple
   * of
   * {@link snapStep} in degrees. Set a value less than or equal to zero to disable this feature.
   */
  snapDelta: number

  /**
   * Specifies the steps in degrees to which rotation should snap to.
   */
  snapStep: number

  /**
   * Specifies the snapping distance (in degrees) for snapping to the same angle as other visible
   * nodes. Rotation will snap to another node's rotation angle if the current angle differs from
   * the other one by less than this. The default is 5. Setting this to a non-positive value will
   * disable same angle snapping.
   */
  snapToSameAngleDelta: number

  /**
   * Returns the type of handle which is used.
   */
  get type(): HandleType {
    return HandleType.MOVE
  }

  /**
   * Returns the cursor that is shown when using this handle.
   */
  get cursor(): Cursor {
    return this._cursor
  }

  /**
   * Gets the optional tag object associated with the handle.
   */
  get tag(): any {
    return null
  }

  /**
   * Returns the location of the handle.
   * Since this instance also implements {@link IPoint}, we can simply return this.
   */
  get location(): this {
    return this
  }

  /**
   * Initializes the drag.
   */
  initializeDrag(inputModeContext: IInputModeContext): void {
    const imc = inputModeContext.lookup(IModelItemCollector)
    if (imc) {
      imc.add(this.node)
    }
    this.rotationCenter = this.node.layout.center
    this.initialAngle = this.getAngle()

    const graph = inputModeContext.graph
    if (graph) {
      this.compoundEdit = graph.beginEdit('Change Rotation Angle', 'Change Rotation Angle')
    }

    this.portHandles.clear()
    const portContext = new DelegatingContext(inputModeContext)
    this.node.ports.forEach((port) => {
      const portHandle = new DummyPortLocationModelParameterHandle(port)
      portHandle.initializeDrag(portContext)
      this.portHandles.add(portHandle)
    })
    if (this.reshapeHandler) {
      this.reshapeHandler.initializeReshape(inputModeContext)
    }
    // Collect other visible nodes and their angles and can be rotated and are not *this* node
    if (this.snapToSameAngleDelta > 0) {
      const canvas = inputModeContext.canvasComponent!

      // only collect nodes that are in the viewport
      const rotatedNodes = canvas.renderTree
        .getElements()
        .filter((elements) => {
          const userObject = elements.tag
          return (
            userObject !== this.node &&
            userObject instanceof INode &&
            userObject.style instanceof RotatableNodeStyleDecorator &&
            canvas.viewport.intersects(userObject.layout.toRect())
          )
        })
        .map((elements) => elements.tag)
      // Group nodes by identical angles
      this.nodeAngles = rotatedNodes.reduce((groups: SameAngleGroup[], node: INode) => {
        const angle = (node.style as RotatableNodeStyleDecorator).angle
        const group = groups.find((g) => g.angle === angle)
        if (group) {
          group.nodes.push(node)
        } else {
          groups.push({
            angle,
            nodes: [node]
          })
        }
        return groups
      }, [])
    }
  }

  /**
   * Updates the node according to the moving handle.
   */
  handleMove(
    inputModeContext: IInputModeContext,
    originalLocation: Point,
    newLocation: Point
  ): void {
    // calculate the angle
    const vector = newLocation.subtract(this.rotationCenter).normalized
    let angle: number = this.calculateAngle(vector)
    if (this.shouldSnap(inputModeContext)) {
      angle = this.snapAngle(inputModeContext, angle)
    }
    this.setAngle(inputModeContext, angle)

    const portContext = new DelegatingContext(inputModeContext)
    this.portHandles.forEach((portHandle) => {
      portHandle.handleMove(portContext, originalLocation, newLocation)
    })
    if (this.reshapeHandler) {
      this.reshapeHandler.handleReshape(
        inputModeContext,
        this.node.layout.toRect(),
        this.node.layout.toRect()
      )
    }
  }

  /**
   * Returns the 'snapped' vector for the given up vector.
   * If the vector is almost horizontal or vertical, this method returns the exact horizontal or
   * vertical up vector instead.
   */
  calculateAngle(upVector: Point): number {
    return normalizeAngle((Math.atan2(upVector.y, upVector.x) / Math.PI) * 180 + 90)
  }

  /**
   * Snaps the angle to the rotation angles of other nodes and the coordinate axes.
   * Angles near such an angle are replaced with this angle.
   */
  snapAngle(inputModeContext: IInputModeContext, angle: number): number {
    // Check for disabled snapping
    const snapContext = inputModeContext.lookup(SnapContext)!
    if (!snapContext || !snapContext.enabled) {
      return angle
    }
    // Same angle snapping
    if (this.snapToSameAngleDelta > 0 && this.nodeAngles) {
      // Find the first angle that is sufficiently similar
      const candidate = this.nodeAngles
        .sort(
          (nodeAngle1: SameAngleGroup, nodeAngle2: SameAngleGroup) =>
            nodeAngle2.angle - nodeAngle1.angle
        )
        .find(
          (nodeAngle) => this.angleDifference(nodeAngle.angle, angle) < this.snapToSameAngleDelta
        )
      if (candidate) {
        // Add highlight to every matching node
        const canvas = inputModeContext.canvasComponent as GraphComponent
        if (this.sameAngleHighlightedNodes !== candidate.nodes) {
          this.clearSameAngleHighlights(inputModeContext)
        }
        candidate.nodes.forEach((matchingNode) => {
          canvas.highlights.add(matchingNode)
        })
        this.sameAngleHighlightedNodes = candidate.nodes
        return candidate.angle
      }
      this.clearSameAngleHighlights(inputModeContext)
    }
    if (this.snapDelta <= 0.0 || this.snapStep === 0) {
      return angle
    }
    // snap step snapping
    const mod = Math.abs(angle % this.snapStep)
    return mod < this.snapDelta || mod > this.snapStep - this.snapDelta
      ? this.snapStep * Math.round(angle / this.snapStep)
      : angle
  }

  angleDifference(angle1: number, angle2: number) {
    return Math.min(Math.abs(angle1 - angle2), 360 - Math.abs(angle1 - angle2))
  }

  /**
   * Cancels the drag and cleans up.
   */
  cancelDrag(context: IInputModeContext, originalLocation: Point): void {
    this.setAngle(context, this.initialAngle)

    const portContext = new DelegatingContext(context)
    this.portHandles.forEach((portHandle) => {
      portHandle.cancelDrag(portContext, originalLocation)
    })
    this.portHandles.clear()
    if (this.reshapeHandler) {
      this.reshapeHandler.cancelReshape(context, this.node.layout.toRect())
    }
    if (this.compoundEdit) {
      this.compoundEdit.cancel()
    }
    this.nodeAngles = null
    this.clearSameAngleHighlights(context)
  }

  /**
   * Finishes the drag and updates the angle of the rotated node.
   */
  dragFinished(context: IInputModeContext, originalLocation: Point, newLocation: Point): void {
    const vector = newLocation.subtract(this.rotationCenter).normalized

    let angle: number = this.calculateAngle(vector)
    if (this.shouldSnap(context)) {
      angle = this.snapAngle(context, angle)
    }
    this.setAngle(context, angle)

    // Switch width / height for 'vertical' rotations
    // Note that other parts of the application need support for this feature, too.
    const graph = context.graph
    if (!graph) {
      return
    }

    const portContext = new DelegatingContext(context)
    this.portHandles.forEach((portHandle) => {
      portHandle.dragFinished(portContext, originalLocation, newLocation)
    })
    this.portHandles.clear()

    // Workaround: if the OrthogonalEdgeEditingContext is used to keep the edges orthogonal, it is not allowed
    // to change that edges manually. Therefore, we explicitly finish the OrthogonalEdgeEditingContext here and
    // then call the edge router.
    const edgeEditingContext = context.lookup(OrthogonalEdgeEditingContext)!
    if (edgeEditingContext && edgeEditingContext.isInitialized) {
      edgeEditingContext.dragFinished()
    }

    if (this.reshapeHandler) {
      this.reshapeHandler.reshapeFinished(
        context,
        this.node.layout.toRect(),
        this.node.layout.toRect()
      )
    }

    if (this.compoundEdit) {
      this.compoundEdit.commit()
    }

    this.nodeAngles = null
    this.clearSameAngleHighlights(context)
  }

  /**
   * Removes highlights for same angle snapping.
   */
  clearSameAngleHighlights(context: IInputModeContext): void {
    if (this.sameAngleHighlightedNodes) {
      this.sameAngleHighlightedNodes.forEach((highlightedNode) => {
        ;(context.canvasComponent as GraphComponent).highlights.remove(highlightedNode)
      })
      this.sameAngleHighlightedNodes = null
    }
  }

  /**
   * Sets the angle to the node style if the style supports this.
   */
  setAngle(context: IInputModeContext, angle: number): void {
    const wrapper = this.node.style
    if (wrapper instanceof RotatableNodeStyleDecorator) {
      const oldAngle = wrapper.angle
      context.graph!.addUndoUnit(
        'Change Angle',
        'Change Angle',
        () => (wrapper.angle = oldAngle),
        () => (wrapper.angle = angle)
      )
      wrapper.angle = angle
    }
  }

  /**
   * Reads the angle from the node style if the style supports this.
   */
  getAngle(): number {
    const wrapper = this.node.style
    if (wrapper instanceof RotatableNodeStyleDecorator) {
      return wrapper.angle
    }
    return 0
  }

  /**
   * Whether the current gesture does not disable snapping.
   */
  shouldSnap(context: IInputModeContext): boolean {
    const { altKey } = context.canvasComponent!.lastInputEvent
    const shouldSnap = !altKey
    if (!shouldSnap && this.sameAngleHighlightedNodes) {
      this.clearSameAngleHighlights(context)
    }
    return shouldSnap
  }

  /**
   * Returns the x-coordinate of the handle's location.
   */
  get x(): number {
    return this.getLocation().x
  }

  /**
   * Returns the y-coordinate of the handle's location.
   */
  get y(): number {
    return this.getLocation().y
  }

  /**
   * Returns the handle's location.
   */
  getLocation(): Point {
    const orientedRectangle = this.getOrientedRectangle(this.node)
    const anchor = orientedRectangle.anchor
    const size = orientedRectangle.toSize()
    const up = new Point(orientedRectangle.upX, orientedRectangle.upY)
    // calculate the location of the handle from the anchor, the size and the orientation
    const offset = 20
    return anchor
      .add(up.multiply(size.height + offset))
      .add(new Point(-up.y, up.x).multiply(size.width * 0.5))
  }

  /**
   * This implementation does nothing special when clicked.
   */
  handleClick(_evt: ClickEventArgs): void {}
}

/**
 * Helper class to support clipboard operations for rotatable nodes.
 */
class RotatableNodeClipboardHelper extends BaseClass(IClipboardHelper) {
  /**
   * Copies the node style for the paste-operation because {@link RotatableNodeStyleDecorator}
   * should not be shared.
   */
  onDuplicated(
    context: IGraphClipboardContext,
    _original: IModelItem,
    duplicate: IModelItem
  ): void {
    if (!(duplicate instanceof INode)) {
      return
    }
    const styleWrapper = duplicate.style
    if (styleWrapper instanceof RotatableNodeStyleDecorator) {
      if (context.targetGraph.foldingView) {
        context.targetGraph.foldingView.manager.masterGraph.setStyle(
          duplicate,
          styleWrapper.clone()
        )
      } else {
        context.targetGraph.setStyle(duplicate, styleWrapper.clone())
      }
    }
  }

  /**
   * Copies the node style for the paste-operation because {@link RotatableNodeStyleDecorator}
   * should not be shared.
   */
  onPasted(context: IGraphClipboardContext, item: IModelItem): void {
    if (!(item instanceof INode)) {
      return
    }
    const styleWrapper = item.style
    if (styleWrapper instanceof RotatableNodeStyleDecorator) {
      if (context.targetGraph.foldingView) {
        context.targetGraph.foldingView.manager.masterGraph.setStyle(item, styleWrapper.clone())
      } else {
        context.targetGraph.setStyle(item, styleWrapper.clone())
      }
    }
  }

  shouldCopy(_context: IGraphClipboardContext, _item: IModelItem): boolean {
    return true
  }

  shouldCut(_context: IGraphClipboardContext, _item: IModelItem): boolean {
    return true
  }

  shouldPaste(_context: IGraphClipboardContext, _item: IModelItem): boolean {
    return true
  }

  shouldDuplicate(_context: IGraphClipboardContext, _item: IModelItem): boolean {
    return true
  }

  onCopied(_context: IGraphClipboardContext, _item: IModelItem): void {}

  onCut(_context: IGraphClipboardContext, _item: IModelItem): void {}
}

/**
 * An oriented rectangle that specifies the location, size and rotation angle of a rotated node.
 * This class is used mainly for performance reasons. It provides cached values. In principle, it
 * would be enough to store just the rotation angle but then, we would have to recalculate all the
 * properties of this class very often.
 */
export class CachingOrientedRectangle extends BaseClass(IOrientedRectangle) {
  private _upVector: Point = new Point(0, -1)
  private _angle = 0
  cachedLayout: Rect
  cachedOrientedRect: OrientedRectangle

  /**
   * Creates a new instance.
   */
  constructor(layout: Rect = Rect.EMPTY) {
    super()
    this.cachedLayout = layout
    this.cachedOrientedRect = new OrientedRectangle(layout)
  }

  /**
   * Returns the rotation angle.
   */
  get angle(): number {
    return this._angle
  }

  /**
   * Specifies the rotation angle.
   */
  set angle(angle: number) {
    this._angle = normalizeAngle(angle)
    this.cachedOrientedRect.angle = toRadians(angle)
    this.cachedOrientedRect.setCenter(this.cachedLayout.center)
    this._upVector = this.cachedOrientedRect.upVector
  }

  /**
   * Returns the width of the rectangle.
   */
  get width(): number {
    return this.cachedLayout.width
  }

  /**
   * Returns the height of the rectangle.
   */
  get height(): number {
    return this.cachedLayout.height
  }

  /**
   * Returns the x-coordinate of the rectangle's anchor point.
   */
  get anchorX(): number {
    return this.cachedOrientedRect.anchorX
  }

  /**
   * Returns the y-coordinate of the rectangle's anchor point.
   */
  get anchorY(): number {
    return this.cachedOrientedRect.anchorY
  }

  /**
   * Returns the x-coordinate of the rectangle's up vector.
   */
  get upX(): number {
    return this.cachedOrientedRect.upX
  }

  /**
   * Returns the y-coordinate of the rectangle's up vector.
   */
  get upY(): number {
    return this.cachedOrientedRect.upY
  }

  /**
   * Returns the rectangle's up vector.
   */
  get upVector(): Point {
    return this._upVector
  }

  /**
   * Specifies the rectangle's up vector.
   */
  set upVector(upVector: Point) {
    this._upVector = upVector
    this.cachedOrientedRect.setUpVector(upVector.x, upVector.y)
    this.cachedOrientedRect.setCenter(this.cachedLayout.center)
    this.angle = toDegrees(this.cachedOrientedRect.angle)
  }

  get bounds() {
    return this.cachedOrientedRect.bounds
  }

  /**
   * Returns the angle in radians.
   */
  getRadians(): number {
    return toRadians(this.angle)
  }

  /**
   * Updates the layout in the cache.
   */
  updateCache(layout: Rect): void {
    if (
      layout.equals(this.cachedLayout) &&
      this.upVector.equals(this.cachedOrientedRect.upVector)
    ) {
      return
    }
    this.cachedLayout = layout
    this.cachedOrientedRect.setUpVector(this.upVector.x, this.upVector.y)
    this.cachedOrientedRect.width = this.width
    this.cachedOrientedRect.height = this.height
    this.cachedOrientedRect.setCenter(this.cachedLayout.center)
  }
}

/**
 * A context that returns no SnapContext in its lookup and delegates its other methods to an inner
 * context.
 */
class DelegatingContext extends BaseClass(IInputModeContext) {
  context: IInputModeContext

  /**
   * Creates a new instance
   */
  constructor(context: IInputModeContext) {
    super()
    this.context = context
  }

  /**
   * Returns the wrapped context's zoom.
   */
  get zoom(): number {
    return this.context.zoom
  }

  /**
   * Returns the wrapped context's hit test radius.
   */
  get hitTestRadius(): number {
    return this.context.hitTestRadius
  }

  /**
   * Returns the wrapped context's canvas component.
   */
  get canvasComponent(): CanvasComponent {
    return this.context.canvasComponent
  }

  get inputMode(): IInputMode | null {
    throw this.context.inputMode
  }

  /**
   * Delegates to the wrapped context's lookup but cancels the snap context.
   */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
  lookup<T>(type: Constructor<any>): T | null {
    return type === SnapContext ? null : this.context.lookup(type)
  }

  getDefsId(defsSupport: ISvgDefsCreator): string {
    return this.context.getDefsId(defsSupport)
  }
}

/**
 * This port handle is used only to trigger the updates of the orthogonal edge editing facility of
 * yFiles. In yFiles, all code related to updates of the orthogonal edge editing facility is
 * internal. As a workaround, we explicitly call internal port handles from our custom node
 * handles.
 */
class DummyPortLocationModelParameterHandle extends PortLocationModelParameterHandle {
  /**
   * Does nothing since we don't want to change the port location.
   */
  setParameter(_graph: IGraph, _port: IPort, _newParameter: IPortLocationModelParameter): void {
    // do nothing
  }

  /**
   * Returns the current port location since we don't want to change the port location.
   */
  getNewParameter(
    port: IPort,
    _model: IPortLocationModel,
    _newLocation: Point
  ): IPortLocationModelParameter {
    return port.locationParameter
  }
}

/**
 * Markup extension that helps (de-)serializing a {@link RotatableNodeStyleDecorator}.
 */
export class RotatableNodeStyleDecoratorExtension extends MarkupExtension {
  private _angle = 0
  private _wrapped!: INodeStyle

  get angle(): number {
    return this._angle
  }

  set angle(value: number) {
    this._angle = value
  }

  get wrapped(): INodeStyle {
    return this._wrapped
  }

  set wrapped(value: INodeStyle) {
    this._wrapped = value
  }

  provideValue(_serviceProvider: ILookup): any {
    const style = new RotatableNodeStyleDecorator()
    style.angle = this.angle
    style.wrapped = this.wrapped
    return style
  }

  static create(item: RotatableNodeStyleDecorator): RotatableNodeStyleDecoratorExtension {
    const markupExtension = new RotatableNodeStyleDecoratorExtension()
    markupExtension.angle = item.angle
    markupExtension.wrapped = item.wrapped
    return markupExtension
  }
}

/**
 * Normalizes the angle to 0–360°.
 */
function normalizeAngle(angle: number): number {
  let normalizedAngle: number = angle % 360
  if (normalizedAngle < 0) {
    normalizedAngle += 360
  }
  return normalizedAngle
}

/**
 * Returns the given angle in degrees.
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * Returns the given angle in radians.
 */
function toRadians(degrees: number): number {
  return (degrees / 180) * Math.PI
}
