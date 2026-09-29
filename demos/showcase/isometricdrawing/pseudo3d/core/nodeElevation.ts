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
  type ICanvasContext,
  IGraph,
  type IInputModeContext,
  type INode,
  type Point
} from '@yfiles/yfiles'
import type { Pseudo3DNodeTag } from './types'
import { calculateHeightVector, getVisualTranslation } from './Pseudo3DProjection'
import { getProjectionState } from './pseudo3dLookup'

export function getNodeElevation(context: ICanvasContext, node: INode): number {
  const graph = context.canvasComponent.lookup(IGraph)
  return graph ? getNodeElevationForGraph(graph, node) : getExplicitElevation(node)
}

export function getNodeElevationForGraph(graph: IGraph, node: INode): number {
  return getInheritedGroupElevation(graph, node) + getExplicitElevation(node)
}

export function getNodeHeight(node: INode): number {
  return getFiniteNumber(getNodeTag(node)?.height, 10)
}

export function translateInputLocation(context: IInputModeContext, node: INode, location: Point) {
  const projectionState = getProjectionState(context)

  const nodeHeight = getNodeHeight(node)
  const nodeElevation = getNodeElevation(context, node)
  const heightVector = calculateHeightVector(context.canvasComponent.projection)

  return location.subtract(
    heightVector.multiply(
      getVisualTranslation(nodeHeight + nodeElevation, projectionState.inclination)
    )
  )
}

export type Pseudo3DNodeZInterval = { zBottom: number; zTop: number }

/**
 * Minimum guaranteed Z gap added per ancestor level in the comparator's Z
 * interval. Applied only inside getNodeZInterval (comparator use), NOT in
 * getInheritedGroupElevation (visual rendering).
 */
const Z_MIN_CHILD_OFFSET = 1

export function getNodeZInterval(graph: IGraph, node: INode): Pseudo3DNodeZInterval {
  let inheritedElevation = 0
  let parentComparatorZTop: number | null = null

  for (const ancestor of getAncestors(graph, node)) {
    const visualZBottom = inheritedElevation + getExplicitElevation(ancestor)
    const comparatorZBottom = getComparatorZBottom(visualZBottom, parentComparatorZTop)
    parentComparatorZTop = comparatorZBottom + getNodeHeight(ancestor)
    inheritedElevation = visualZBottom + getNodeHeight(ancestor)
  }

  const visualZBottom = inheritedElevation + getExplicitElevation(node)
  const comparatorZBottom = getComparatorZBottom(visualZBottom, parentComparatorZTop)

  return { zBottom: comparatorZBottom, zTop: comparatorZBottom + getNodeHeight(node) }
}

export function getInheritedGroupElevation(graph: IGraph, node: INode): number {
  let elevation = 0
  let current = graph.getParent(node)

  while (current) {
    elevation += getNodeHeight(current) + getExplicitElevation(current)
    current = graph.getParent(current)
  }

  return elevation
}

function getNodeTag(node: INode): Pseudo3DNodeTag | undefined {
  return node.tag !== null && typeof node.tag === 'object'
    ? (node.tag as Pseudo3DNodeTag)
    : undefined
}

function getExplicitElevation(node: INode): number {
  return getFiniteNumber(getNodeTag(node)?.elevation, 0)
}

function getFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function getAncestors(graph: IGraph, node: INode): INode[] {
  const ancestors: INode[] = []
  let current = graph.getParent(node)
  while (current) {
    ancestors.push(current)
    current = graph.getParent(current)
  }
  ancestors.reverse()
  return ancestors
}

function getComparatorZBottom(visualZBottom: number, parentComparatorZTop: number | null): number {
  return parentComparatorZTop === null
    ? visualZBottom
    : Math.max(visualZBottom, parentComparatorZTop + Z_MIN_CHILD_OFFSET)
}
