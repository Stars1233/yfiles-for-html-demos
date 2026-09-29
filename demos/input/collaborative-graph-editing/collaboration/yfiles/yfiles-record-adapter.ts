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
  type IEdge,
  type IGraph,
  type ILabelModelParameter,
  type INode,
  Point,
  Rect
} from '@yfiles/yfiles'
import { createUniqueId } from '../core'
import type {
  LabelLayoutParameter,
  YFilesEdgeRecord,
  YFilesLabelRecord,
  YFilesNodeRecord,
  YFilesPointRecord,
  YFilesRecordAdapter,
  YFilesRecordAdapterOptions,
  YFilesRectangleRecord
} from './yfiles-record-types'

function createId(prefix: string): string {
  return createUniqueId(prefix)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getTagId(tag: unknown): string | undefined {
  if (!isRecord(tag)) return undefined
  const id = tag.id
  return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined
}

function getTaggedNodeId(node: INode): string | undefined {
  return getTagId(node.tag)
}

function getTaggedEdgeId(edge: IEdge): string | undefined {
  return getTagId(edge.tag)
}

function pointRecord(point: { x: number; y: number }): YFilesPointRecord {
  return { x: point.x, y: point.y }
}

function relativePointRecord(
  point: { x: number; y: number },
  origin: { x: number; y: number }
): YFilesPointRecord {
  return { x: point.x - origin.x, y: point.y - origin.y }
}

function rectangleRecord(rectangle: {
  x: number
  y: number
  width: number
  height: number
}): YFilesRectangleRecord {
  return { x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height }
}

function rectangleFromRecord(rectangle: YFilesRectangleRecord): Rect {
  return new Rect(rectangle.x, rectangle.y, rectangle.width, rectangle.height)
}

function labelsOf<Record extends YFilesNodeRecord | YFilesEdgeRecord>(
  record: Record
): readonly YFilesLabelRecord<LabelLayoutParameter<Record>>[] {
  // Indexed access through the base constraint widens the parameter to unknown.
  // The conditional type above recovers the concrete parameter from the input record.
  return record.labels as readonly YFilesLabelRecord<LabelLayoutParameter<Record>>[]
}

function restoreLabels<LayoutParameter>(
  graph: IGraph,
  owner: INode | IEdge,
  records: readonly YFilesLabelRecord<LayoutParameter>[],
  deserializeLabelLayoutParameter?: (value: LayoutParameter) => ILabelModelParameter | undefined
): void {
  const defaultLayoutParameter =
    'sourceNode' in owner
      ? graph.edgeDefaults.labels.layoutParameter
      : graph.isGroupNode(owner)
        ? graph.groupNodeDefaults.labels.layoutParameter
        : graph.nodeDefaults.labels.layoutParameter

  for (let index = owner.labels.size - 1; index >= records.length; index--) {
    graph.remove(owner.labels.at(index)!)
  }

  records.forEach((record, index) => {
    let label = owner.labels.at(index)

    if (!label) {
      label = graph.addLabel(owner, record.text)
    } else if (label.text !== record.text) {
      graph.setLabelText(label, record.text)
    }

    const parameter =
      record.layoutParameter !== undefined && deserializeLabelLayoutParameter
        ? deserializeLabelLayoutParameter(record.layoutParameter)
        : defaultLayoutParameter

    if (parameter && JSON.stringify(label.layoutParameter) !== JSON.stringify(parameter)) {
      graph.setLabelLayoutParameter(label, parameter)
    }
  })
}
export function createYFilesRecordAdapter<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
>(
  options: YFilesRecordAdapterOptions<NodeRecord, EdgeRecord>
): YFilesRecordAdapter<NodeRecord, EdgeRecord> {
  const {
    graph,
    nodeById,
    edgeById,
    foldingView,
    getNodeId: getNodeIdOverride,
    getEdgeId: getEdgeIdOverride,
    createNode: createNodeOverride,
    createEdge: createEdgeOverride,
    serializeLabelLayoutParameter,
    deserializeLabelLayoutParameter,
    serializeNodeStyle,
    deserializeNodeStyle,
    serializeEdgeStyle,
    deserializeEdgeStyle,
    extendNodeRecord,
    extendEdgeRecord
  } = options

  const getNodeIdCandidate = getNodeIdOverride ?? getTaggedNodeId
  const getEdgeIdCandidate = getEdgeIdOverride ?? getTaggedEdgeId

  // GraphClipboard copies tags by reference. Consequently, a pasted copy has
  // the same tag id as its source even though it is a different graph item.
  // Treat that id as an identity only while it is not already owned by an
  // item in the graph. Cut/paste remains able to reuse an id after the source
  // has been removed from the graph.
  const getNodeId = (node: INode): string | undefined => {
    const id = getNodeIdCandidate(node)
    const existing = id === undefined ? undefined : nodeById.get(id)
    return existing && existing !== node ? undefined : id
  }

  const getEdgeId = (edge: IEdge): string | undefined => {
    const id = getEdgeIdCandidate(edge)
    const existing =
      id === undefined
        ? undefined
        : (edgeById?.get(id) ??
          Array.from(graph.edges).find(
            (candidate) => candidate !== edge && getEdgeIdCandidate(candidate) === id
          ))
    return existing && existing !== edge ? undefined : id
  }

  const serializeLabels = <LayoutParameter>(
    owner: INode | IEdge,
    serialize?: (parameter: ILabelModelParameter) => LayoutParameter | undefined
  ): YFilesLabelRecord<LayoutParameter>[] =>
    Array.from(owner.labels).map((label) => {
      const layoutParameter = serialize?.(label.layoutParameter)

      return layoutParameter === undefined
        ? { text: label.text }
        : { text: label.text, layoutParameter }
    })

  const createNode = (record: NodeRecord): INode => {
    const parent = record.parentId ? (nodeById.get(record.parentId) ?? null) : null
    const node = createNodeOverride
      ? createNodeOverride(record, parent)
      : record.isGroup
        ? graph.createGroupNode(parent, rectangleFromRecord(record.layout), undefined, record)
        : graph.createNode(parent, rectangleFromRecord(record.layout), undefined, record)
    const style =
      record.nodeStyle !== undefined ? deserializeNodeStyle?.(record.nodeStyle) : undefined
    if (style) graph.setStyle(node, style)
    restoreLabels<LabelLayoutParameter<NodeRecord>>(
      graph,
      node,
      labelsOf(record),
      deserializeLabelLayoutParameter
    )
    return node
  }

  const updateNode = (node: INode, record: NodeRecord): void => {
    node.tag = record
    if (graph.isGroupNode(node) !== record.isGroup) graph.setIsGroupNode(node, record.isGroup)
    graph.setNodeLayout(node, rectangleFromRecord(record.layout))

    const style =
      record.nodeStyle !== undefined ? deserializeNodeStyle?.(record.nodeStyle) : undefined
    if (style) graph.setStyle(node, style)

    const parent = record.parentId ? (nodeById.get(record.parentId) ?? null) : null
    if (graph.getParent(node) !== parent && (!parent || parent !== node)) {
      graph.setParent(node, parent)
    }
    restoreLabels<LabelLayoutParameter<NodeRecord>>(
      graph,
      node,
      labelsOf(record),
      deserializeLabelLayoutParameter
    )
  }

  const createEdge = (record: EdgeRecord, source: INode, target: INode): IEdge => {
    const edge = createEdgeOverride
      ? createEdgeOverride(record, source, target)
      : graph.createEdge(source, target, undefined, record)
    updateEdge(edge, record)
    return edge
  }

  const updateEdge = (edge: IEdge, record: EdgeRecord): void => {
    edge.tag = record
    const style =
      record.edgeStyle !== undefined ? deserializeEdgeStyle?.(record.edgeStyle) : undefined
    if (style) graph.setStyle(edge, style)
    while (edge.bends.size > record.bends.length) {
      graph.remove(edge.bends.at(edge.bends.size - 1)!)
    }
    record.bends.forEach((bend, index) => {
      const current = edge.bends.at(index)
      if (current) graph.setBendLocation(current, new Point(bend.x, bend.y))
      else graph.addBend(edge, new Point(bend.x, bend.y), index)
    })

    const portLocation = (location: YFilesPointRecord, node: INode): Point =>
      record.portLocationsRelative
        ? new Point(node.layout.x + location.x, node.layout.y + location.y)
        : new Point(location.x, location.y)
    const sourcePortLocation = portLocation(record.sourcePort, edge.sourceNode)
    const targetPortLocation = portLocation(record.targetPort, edge.targetNode)
    graph.setPortLocation(edge.sourcePort, sourcePortLocation)
    graph.setPortLocation(edge.targetPort, targetPortLocation)
    restoreLabels<LabelLayoutParameter<EdgeRecord>>(
      graph,
      edge,
      labelsOf(record),
      deserializeLabelLayoutParameter
    )
  }

  const nodeRecord = (node: INode, previous: NodeRecord | undefined): NodeRecord => {
    const id = previous?.id ?? getNodeId(node) ?? createId('node')
    const tag: unknown = node.tag
    node.tag = { ...(isRecord(tag) ? tag : {}), id }
    const parent = graph.getParent(node)
    const record = {
      ...previous,
      id,
      parentId: parent ? (getNodeId(parent) ?? null) : null,
      isGroup: graph.isGroupNode(node),
      layout: rectangleRecord(node.layout),
      labels: serializeLabels<LabelLayoutParameter<NodeRecord>>(node, serializeLabelLayoutParameter)
    }
    if (serializeNodeStyle) {
      const style = serializeNodeStyle(node.style)
      if (style === undefined) delete record.nodeStyle
      else record.nodeStyle = style
    }
    if (foldingView && graph.isGroupNode(node)) {
      const isExpanded = foldingView.isExpanded(node)
      record.isExpanded = isExpanded
      if (!isExpanded) {
        const viewNode = foldingView.getViewItem(node)
        if (viewNode) record.foldingLayout = rectangleRecord(viewNode.layout)
      }
    }
    const baselineRecord = record as NodeRecord
    return extendNodeRecord ? extendNodeRecord(baselineRecord, node, previous) : baselineRecord
  }

  const edgeRecord = (edge: IEdge, previous: EdgeRecord | undefined): EdgeRecord => {
    const id = previous?.id ?? getEdgeId(edge) ?? createId('edge')
    const tag: unknown = edge.tag
    edge.tag = { ...(isRecord(tag) ? tag : {}), id }
    const record = {
      ...previous,
      id,
      sourceId: getNodeId(edge.sourceNode) ?? previous?.sourceId ?? '',
      targetId: getNodeId(edge.targetNode) ?? previous?.targetId ?? '',
      bends: Array.from(edge.bends).map((bend) => pointRecord(bend.location)),
      sourcePort: relativePointRecord(edge.sourcePort.location, edge.sourceNode.layout),
      targetPort: relativePointRecord(edge.targetPort.location, edge.targetNode.layout),
      portLocationsRelative: true,
      labels: serializeLabels<LabelLayoutParameter<EdgeRecord>>(edge, serializeLabelLayoutParameter)
    }
    if (serializeEdgeStyle) {
      const style = serializeEdgeStyle(edge.style)
      if (style === undefined) delete record.edgeStyle
      else record.edgeStyle = style
    }
    const baselineRecord = record as EdgeRecord
    return extendEdgeRecord ? extendEdgeRecord(baselineRecord, edge, previous) : baselineRecord
  }

  return {
    createNode,
    updateNode,
    createEdge,
    updateEdge,
    getNodeId,
    getEdgeId,
    nodeRecord,
    edgeRecord
  }
}
