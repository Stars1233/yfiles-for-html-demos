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
  BaseClass,
  type GraphComponent,
  IHitTestable,
  type IInputModeContext,
  type InputModeEventArgs,
  type IPoint,
  IPositionHandler,
  MoveInputMode,
  Point,
  type Rect
} from '@yfiles/yfiles'

/**
 * A move input mode for a render-tree legend.
 */
export class RenderTreeLegendMoveInputMode extends MoveInputMode {
  private readonly graphComponent: GraphComponent
  private readonly getBounds: () => Rect | null
  private readonly getPosition: () => Point
  private readonly setPosition: (position: Point) => void
  private readonly useViewTransform: boolean
  private handler: RenderTreeLegendPositionHandler | null = null

  constructor(
    graphComponent: GraphComponent,
    getBounds: () => Rect | null,
    getPosition: () => Point,
    setPosition: (position: Point) => void,
    useViewTransform: boolean
  ) {
    super()
    this.graphComponent = graphComponent
    this.getBounds = getBounds
    this.getPosition = getPosition
    this.setPosition = setPosition
    this.useViewTransform = useViewTransform
    this.positionHandler = null
    this.hitTestable = IHitTestable.create(this.isValidHit.bind(this))
  }

  private isValidHit(context: IInputModeContext, location: Point): boolean {
    const bounds = this.getBounds()
    // input location to test is in world coordinates that we might need to transform
    const hitLocation = this.useViewTransform
      ? this.graphComponent.worldToViewCoordinates(location)
      : location
    // apply the hit-test radius in view coordinates
    const hitTestRadius = this.useViewTransform
      ? context.hitTestRadius * this.graphComponent.zoom
      : context.hitTestRadius
    this.handler =
      bounds && bounds.contains(hitLocation, hitTestRadius)
        ? new RenderTreeLegendPositionHandler(
            this.graphComponent,
            this.getPosition,
            this.setPosition,
            location,
            this.useViewTransform
          )
        : null
    return this.handler !== null
  }

  protected override onDragStarting(inputModeEventArgs: InputModeEventArgs): void {
    this.positionHandler = this.handler
    super.onDragStarting(inputModeEventArgs)
  }

  protected override onDragCanceled(inputModeEventArgs: InputModeEventArgs): void {
    super.onDragCanceled(inputModeEventArgs)
    this.positionHandler = null
    this.handler = null
  }

  protected override onDragFinished(inputModeEventArgs: InputModeEventArgs): void {
    super.onDragFinished(inputModeEventArgs)
    this.positionHandler = null
    this.handler = null
  }
}

/**
 * Stores the position of a render-tree legend and distinguishes default from user-defined positions.
 */
export class RenderTreeLegendPosition {
  private readonly onPositionChanged: (position: Point) => void
  private position: Point | null = null
  private hasCustomPosition = false

  constructor(onPositionChanged: (position: Point) => void) {
    this.onPositionChanged = onPositionChanged
  }

  getPosition = (): Point => this.position ?? Point.ORIGIN

  setPosition = (position: Point): void => {
    this.position = position
    this.hasCustomPosition = true
    this.onPositionChanged(position)
  }

  get isManualPosition(): boolean {
    return this.hasCustomPosition
  }

  setDefaultPosition(position: Point): Point {
    // A user-defined position must survive recalculating the orientation-dependent default.
    if (!this.hasCustomPosition) {
      this.position = position
    }
    return this.position!
  }
}

class RenderTreeLegendPositionHandler extends BaseClass(IPositionHandler) {
  private readonly graphComponent: GraphComponent
  private readonly getPosition: () => Point
  private readonly setPosition: (position: Point) => void
  private readonly mouseDeltaFromStart: Point
  private readonly useViewTransform: boolean
  private startPosition: Point = null!

  constructor(
    graphComponent: GraphComponent,
    getPosition: () => Point,
    setPosition: (position: Point) => void,
    mouseLocation: Point,
    useViewTransform: boolean
  ) {
    super()
    this.graphComponent = graphComponent
    this.getPosition = getPosition
    this.setPosition = setPosition
    this.useViewTransform = useViewTransform
    this.mouseDeltaFromStart = this.toLegendCoordinates(mouseLocation).subtract(getPosition())
  }

  get location(): IPoint {
    // MoveInputMode expects the handler location in world coordinates.
    return this.toWorldCoordinates(this.getPosition())
  }

  initializeDrag(_context: IInputModeContext): void {
    this.startPosition = this.getPosition()
  }

  handleMove(_context: IInputModeContext, _originalLocation: Point, newLocation: Point): boolean {
    this.setPosition(this.toLegendCoordinates(newLocation).subtract(this.mouseDeltaFromStart))
    return true
  }

  cancelDrag(_context: IInputModeContext, _originalLocation: Point): void {
    this.setPosition(this.startPosition)
  }

  dragFinished(_context: IInputModeContext, _originalLocation: Point, newLocation: Point): void {
    this.setPosition(this.toLegendCoordinates(newLocation).subtract(this.mouseDeltaFromStart))
  }

  private toLegendCoordinates(location: Point): Point {
    return this.useViewTransform ? this.graphComponent.worldToViewCoordinates(location) : location
  }

  private toWorldCoordinates(location: Point): Point {
    return this.useViewTransform ? this.graphComponent.viewToWorldCoordinates(location) : location
  }
}
