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
import { ItemState } from './EventTimelineTypes'

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

function describeValue(value) {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (Array.isArray(value)) {
    return 'an array'
  }
  return typeof value
}

export function requireDefaultAccessorField(data, fieldName, accessorName) {
  if (!isRecord(data)) {
    throw new Error(
      `[EventTimeline] The default accessor "${accessorName}" expected an object with a "${fieldName}" field, ` +
        `but received ${describeValue(data)}. Provide a custom "${accessorName}" when your data shape differs.`
    )
  }

  const value = data[fieldName]
  if (value === undefined) {
    throw new Error(
      `[EventTimeline] The default accessor "${accessorName}" expected the field "${fieldName}" on the item's tag data, ` +
        `but it was missing. Provide a custom "${accessorName}" when your data uses a different field name.`
    )
  }

  return value
}

export function getDefaultNodeId(data) {
  return requireDefaultAccessorField(data, 'id', 'nodeIdAccessor')
}

export function getDefaultEdgeId(data) {
  return requireDefaultAccessorField(data, 'id', 'edgeIdAccessor')
}

export function getDefaultEdgeSourceId(data) {
  return requireDefaultAccessorField(data, 'source', 'edgeSourceIdAccessor')
}

export function getDefaultEdgeTargetId(data) {
  return requireDefaultAccessorField(data, 'target', 'edgeTargetIdAccessor')
}

export function getDefaultNodeLabel(node) {
  return requireDefaultAccessorField(node.tag, 'label', 'nodeLabelAccessor')
}

export function getDefaultEdgeLabel(edge) {
  return requireDefaultAccessorField(edge.tag, 'label', 'edgeLabelAccessor')
}

/**
 * Filter predicate that passes through non-representative edges, i.e., regular edges that have not
 * been created to represent a group of aggregated/hyper edges. Returns `true` for ordinary edges
 * and `false` for synthetic representative edges.
 * @param edge The IEdge object to be tested
 * @returns `true` if the edge is NOT a representative, `false` if it is
 */
export function representativeFilter(edge) {
  return edge.lookup(ItemState)?.representative !== true
}

/**
 * Method with which to determine whether two edges share a source or target node.
 * @param edgeA The first edge.
 * @param edgeB The second edge.
 * @returns a boolean indicating whether the two edges share a source or target node.
 */
export function doEdgesShareNodeTermini(edgeA, edgeB) {
  return (
    edgeA.sourceNode === edgeB.sourceNode ||
    edgeA.sourceNode === edgeB.targetNode ||
    edgeA.targetNode === edgeB.targetNode ||
    edgeA.targetNode === edgeB.sourceNode
  )
}

/**
 * Helper method to update the visibility of items based on label overlap.
 * @param items The items (nodes or edges) to be checked.
 * @param getPosition A function to get the position (x or y) of the item's label.
 * @param minDistance The minimum distance between labels before they are considered overlapping.
 */
export function updateVisibilityByOverlap(items, getPosition, minDistance) {
  let prevItem = null
  items.forEach((currItem) => {
    const currState = currItem.lookup(ItemState)
    if (currState) {
      currState.visible = true
    }
    if (prevItem) {
      const prevLabel = prevItem.labels.at(0)
      const currLabel = currItem.labels.at(0)
      if (
        prevLabel &&
        currLabel &&
        Math.abs(getPosition(currItem) - getPosition(prevItem)) < minDistance
      ) {
        const prevState = prevItem.lookup(ItemState)
        if (prevState) {
          prevState.visible = false
        }
        if (currState) {
          currState.visible = false
        }
      }
    }
    prevItem = currItem
  })
}
