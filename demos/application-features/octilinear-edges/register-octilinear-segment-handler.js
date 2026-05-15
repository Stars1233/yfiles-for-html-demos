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
  Cursor,
  EventRecognizers,
  GeometryUtilities,
  GraphItemTypes,
  IBend,
  IEdge,
  IHitTestable,
  IHitTester,
  INode,
  MoveInputMode,
  OrthogonalEdgeEditingContext,
  Point
} from '@yfiles/yfiles'
import {
  getCornerType,
  getNextEdgeItem,
  getPreviousEdgeItem,
  getVisualCuttingLength,
  updateCuttingLength
} from './utils'
import { OctilinearEdgeStyle } from './OctilinearEdgeStyle'
import { OctilinearSegmentPositionHandler } from './OctilinearSegmentPositionHandler'
import { OctilinearSegmentHandle } from './OctilinearSegmentHandle'
import { OctilinearSelectionRenderer } from './OctilinearSelectionRenderer'

/**
 * Registers all handlers for interactive editing of edges with {@link OctilinearEdgeStyle}.
 *
 * It installs a separate {@link MoveInputMode} that handles dragging directly on octilinear segments by either moving
 * the bend of the segment or resizing the cutting length; and registers a handle provider that shows an explicit
 * handle on the octilinear segment's center.
 *
 * Additionally, registers a selection renderer wrapper to visualize bend indicators in the center of the octilinear
 * segments.
 *
 * @param graphComponent The graph component on which the interaction is registered.
 */
export function registerOctilinearSegmentHandler(graphComponent) {
  const graphEditorInputMode = graphComponent.inputMode
  const octilinearSegmentInputMode = registerSegmentInteractions(graphEditorInputMode)

  // provide octilinear bend handles for octilinear segments
  graphComponent.graph.decorator.bends.handle.addWrapperFactory(
    (bend) =>
      graphComponent.selection.bends.includes(bend) &&
      bend.owner.style instanceof OctilinearEdgeStyle,
    (bend, handle) => new OctilinearSegmentHandle(bend, handle, false)
  )

  // indicate the bend selection on the octilinear segments
  graphComponent.graph.decorator.edges.selectionRenderer.addWrapperFactory(
    (edge) => edge.style instanceof OctilinearEdgeStyle,
    (_, originalImplementation) => {
      return new OctilinearSelectionRenderer(originalImplementation)
    }
  )

  // Ensure when clicking the handle position that the appearing OctilinearHandle is synced with the
  // input mode state even without an additional input event (e.g., mouse move).
  graphComponent.selection.addEventListener('item-added', () => {
    requeryInputMode(graphEditorInputMode)
  })

  registerCuttingLengthSynchronization(graphEditorInputMode, octilinearSegmentInputMode)
}

/**
 * Triggers a re-evaluation of the last input event.
 */
function requeryInputMode(graphEditorInputMode) {
  graphEditorInputMode.enabled = false
  graphEditorInputMode.enabled = true
}

/**
 * Synchronizes implicit changes of the cutting length to ensure that the stored data on the tag corresponds to the
 * visual representation in the graph.
 *
 * For example, when dragging a node, attached edge paths may change such that the cutting length of a bend cannot be
 * rendered entirely (due to space limitations wrt. the next bend). After the gesture is finished, the actual cutting
 * length is evaluated and stored on the bend's tag.
 */
function registerCuttingLengthSynchronization(graphEditorInputMode, octilinearSegmentInputMode) {
  // dragging on an octilinear segment
  octilinearSegmentInputMode.addEventListener('drag-finished', (evt, sender) => {
    synchronizeAffectedBends(evt.context.graph, sender.affectedItems)
  })

  // moving selected nodes
  graphEditorInputMode.moveSelectedItemsInputMode.addEventListener(
    'drag-finished',
    (evt, sender) => {
      synchronizeAffectedBends(evt.context.graph, sender.affectedItems)
    }
  )

  // moving unselected nodes
  graphEditorInputMode.moveUnselectedItemsInputMode.addEventListener(
    'drag-finished',
    (evt, sender) => {
      synchronizeAffectedBends(evt.context.graph, sender.affectedItems)
    }
  )

  // resizing nodes or dragging on the octilinear segment's handle
  graphEditorInputMode.handleInputMode.addEventListener('drag-finishing', (evt, sender) => {
    synchronizeAffectedBends(evt.context.graph, sender.affectedItems)
  })

  // orthogonal edge editing creates an implicit bend during the gesture whose cutting length must be ignored to avoid style rendering artifacts
  graphEditorInputMode.handleInputMode.addEventListener('drag-starting', (evt) => {
    const selection = evt.context.canvasComponent.selection
    if (selection.bends.size === 1) {
      const temporaryBend = selection.bends.first()
      const bendPoint = temporaryBend.location.toPoint()
      const prevPoint = getPreviousEdgeItem(temporaryBend).location.toPoint()
      const nextPoint = getNextEdgeItem(temporaryBend).location.toPoint()
      if (GeometryUtilities.areCollinear(prevPoint, bendPoint, nextPoint)) {
        // set the cutting length of temporary bend during orthogonal edge editing to zero
        updateCuttingLength(temporaryBend, 0)
      }
    }
  })
}

/**
 * Updates the bend's tags of the affected items with the current cutting length.
 * @param graph The owner graph of the affected items.
 * @param affectedItems The items whose bends' cutting lengths should be updated with the actual cutting length.
 */
function synchronizeAffectedBends(graph, affectedItems) {
  const newCuttingLengths = new Map()
  for (const affectedItem of affectedItems) {
    if (affectedItem instanceof INode) {
      graph.edgesAt(affectedItem).forEach((edge) => {
        if (edge.style instanceof OctilinearEdgeStyle) {
          edge.bends.forEach((bend) => {
            newCuttingLengths.set(bend, getVisualCuttingLength(bend))
          })
        }
      })
    } else if (affectedItem instanceof IBend) {
      if (
        graph.bends.includes(affectedItem) &&
        affectedItem.owner.style instanceof OctilinearEdgeStyle
      ) {
        affectedItem.owner.bends.forEach((bend) => {
          newCuttingLengths.set(bend, getVisualCuttingLength(bend))
        })
      }
    }
  }

  for (const [bend, newCuttingLength] of newCuttingLengths) {
    updateCuttingLength(bend, newCuttingLength)
  }
}

/**
 * Registers a separate {@link MoveInputMode} on the {@link GraphEditorInputMode} that manages drag gestures on
 * octilinear edge segments.
 * @param graphEditorInputMode The input mode to which the additional {@link MoveInputMode} is registered.
 */
function registerSegmentInteractions(graphEditorInputMode) {
  const octilinearSegmentInputMode = new MoveInputMode({
    priority: graphEditorInputMode.handleInputMode.priority + 1,
    // disable directional constraints because we use Shift for toggling orthogonal segment interaction
    directionalConstraintRecognizer: EventRecognizers.NEVER
  })

  // trigger the OrthogonalEdgeEditingContext when moving the octilinear segment
  registerOrthogonalEditing(octilinearSegmentInputMode)

  // arm the MoveInputMode when hovering over an octilinear segment
  octilinearSegmentInputMode.hitTestable = IHitTestable.create((context, location) => {
    const bend = getBendOfHitOctilinearSegment(context, location)
    if (bend) {
      octilinearSegmentInputMode.validBeginCursor = getCursor(context, getCornerType(bend))
      return true
    }
    return false
  })

  // when dragging on an octilinear segment, provide a custom position handler that manages the interaction
  octilinearSegmentInputMode.addEventListener('query-position-handler', (evt) => {
    if (evt.handled) {
      return
    }

    const context = evt.context
    const bendOfHitSegment = getBendOfHitOctilinearSegment(context, evt.queryLocation)
    if (bendOfHitSegment) {
      octilinearSegmentInputMode.moveCursor = getCursor(context, getCornerType(bendOfHitSegment))
      evt.positionHandler = new OctilinearSegmentPositionHandler(
        bendOfHitSegment,
        evt.queryLocation
      )
      evt.handled = true
    }
  })

  // do not move other elements while moving edge segments
  octilinearSegmentInputMode.addEventListener('drag-starting', (evt) => {
    evt.context.canvasComponent.selection.clear()
  })

  graphEditorInputMode.add(octilinearSegmentInputMode)
  return octilinearSegmentInputMode
}

/**
 * Registers the orthogonal edge editing functionality for the given octilinear input mode.
 * @param octilinearHandleInputMode The input mode to which orthogonal editing will be added.
 */
function registerOrthogonalEditing(octilinearHandleInputMode) {
  let initializedOrthogonalDrag = false

  octilinearHandleInputMode.addEventListener('drag-starting', (evt) => {
    if (
      OctilinearSegmentPositionHandler.moveBendRecognizer(
        evt.context.canvasComponent.lastPointerEvent,
        null
      )
    ) {
      evt.context.lookup(OrthogonalEdgeEditingContext)?.initializeDrag(evt.context)
      initializedOrthogonalDrag = true
    }
  })
  octilinearHandleInputMode.addEventListener('drag-started', (evt) => {
    if (initializedOrthogonalDrag) {
      evt.context.lookup(OrthogonalEdgeEditingContext)?.dragInitialized()
    }
  })
  octilinearHandleInputMode.addEventListener('drag-finished', (evt) => {
    if (initializedOrthogonalDrag) {
      evt.context.lookup(OrthogonalEdgeEditingContext)?.dragFinished()
    }
    initializedOrthogonalDrag = false
  })
  octilinearHandleInputMode.addEventListener('drag-canceled', (evt) => {
    if (initializedOrthogonalDrag) {
      evt.context.lookup(OrthogonalEdgeEditingContext)?.cancelDrag()
    }
    initializedOrthogonalDrag = false
  })
}

/**
 * Returns the of bend of an octilinear segment when the given location is a hit on an octilinear segment.
 * @param context The input mode context.
 * @param queryLocation The location that is tested for an octilinear segment hit.
 */
function getBendOfHitOctilinearSegment(context, queryLocation) {
  const hitTester = context.lookup(IHitTester)
  const hits = hitTester.enumerateHits(
    context,
    queryLocation,
    // remark: we don't test for other graph items like labels for performance reasons
    GraphItemTypes.EDGE | GraphItemTypes.NODE
  )

  const hitItem = hits.at(0)
  if (hitItem instanceof IEdge && hitItem.style instanceof OctilinearEdgeStyle) {
    const bendOfHitSegment = getBendOfHitOctilinearSegmentForEdge(context, hitItem, queryLocation)
    if (bendOfHitSegment) {
      return bendOfHitSegment
    }
  }

  return null
}

/**
 * Determines the actual hit segment and its bend for the hit edge.
 *
 * To determine the hit segment, a point-based representation of the edge's octilinear path is created
 * where each segment is tested for a hit of the query location considering the context's hit-test radius.
 *
 * @param context The input mode context.
 * @param edge The hit edge.
 * @param queryLocation The location of the hit.
 */
function getBendOfHitOctilinearSegmentForEdge(context, edge, queryLocation) {
  const visualPathPoints = getVisualPathPoints(edge)

  // check which segment is hit and return its owner bend
  for (let i = 0; i < visualPathPoints.length - 1; i++) {
    const current = visualPathPoints[i]
    const next = visualPathPoints[i + 1]

    // octilinear segments are only between two path points belonging to the same oner bend
    if (!(current.owner === next.owner)) {
      continue
    }

    // if an octilinear segment has length zero, there is no segment to hit-test, so we need to check proximity to the
    // neighboring path points instead to be able to resize it
    const distanceToCurrent = current.pathPoint.distanceTo(queryLocation)
    const distanceToNext = next.pathPoint.distanceTo(queryLocation)
    if (distanceToCurrent < context.hitTestRadius && distanceToNext < context.hitTestRadius) {
      return current.owner
    }

    const edgeThickness =
      edge.style instanceof OctilinearEdgeStyle ? edge.style.stroke.thickness : 1
    const hitTestRadius = context.hitTestRadius + 0.5 * edgeThickness
    const hitsLineSegment = queryLocation.hitsLineSegment(
      current.pathPoint,
      next.pathPoint,
      hitTestRadius
    )

    if (hitsLineSegment) {
      // must be a bend because this is an octilinear segment
      return current.owner
    }
  }

  return null
}

/**
 * Creates a point-based representation of the edge's octilinear path.
 * @param edge The edge for which to create the visual path points.
 * @returns An array of path points with their respective owners (bends or ports).
 */
function getVisualPathPoints(edge) {
  const visualPathPoints = [{ pathPoint: edge.sourcePort.location, owner: edge.sourcePort }]

  for (let i = 0; i < edge.bends.size; i++) {
    const bend = edge.bends.get(i)
    const bendLocation = bend.location.toPoint()

    const prevItem = i === 0 ? edge.sourcePort : edge.bends.get(i - 1)
    const prevLocation = prevItem.location.toPoint()

    const currentCuttingLength = getVisualCuttingLength(bend)
    const cornerType = getCornerType(bend)

    function addPoint(dx1, dy1, dx2, dy2) {
      const p1 = new Point(dx1, dy1).add(bendLocation)
      const p2 = new Point(dx2, dy2).add(bendLocation)

      // ensure insertion order along the path
      if (p1.x === prevLocation.x || p1.y === prevLocation.y) {
        visualPathPoints.push({ pathPoint: p1, owner: bend })
        visualPathPoints.push({ pathPoint: p2, owner: bend })
      } else {
        visualPathPoints.push({ pathPoint: p2, owner: bend })
        visualPathPoints.push({ pathPoint: p1, owner: bend })
      }
    }

    if (cornerType === 'TopRight') {
      addPoint(-currentCuttingLength, 0, 0, currentCuttingLength)
    } else if (cornerType === 'BottomRight') {
      addPoint(0, -currentCuttingLength, -currentCuttingLength, 0)
    } else if (cornerType === 'BottomLeft') {
      addPoint(0, -currentCuttingLength, currentCuttingLength, 0)
    } else {
      // TopLeft
      addPoint(currentCuttingLength, 0, 0, currentCuttingLength)
    }
  }

  visualPathPoints.push({ pathPoint: edge.targetPort.location, owner: edge.targetPort })
  return visualPathPoints
}

/**
 * Returns a resize cursor matching the given octilinear corner segment.
 */
function getCursor(context, cornerType) {
  if (
    OctilinearSegmentPositionHandler.moveBendRecognizer(
      context.canvasComponent.lastPointerEvent,
      null
    )
  ) {
    return Cursor.MOVE
  }

  switch (cornerType) {
    case 'TopLeft':
    case 'BottomRight':
      return Cursor.NWSE_RESIZE
    case 'TopRight':
    case 'BottomLeft':
      return Cursor.NESW_RESIZE
  }
}
