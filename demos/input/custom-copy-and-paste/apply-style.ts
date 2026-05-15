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
  type GraphComponent,
  type GraphEditorInputMode,
  IEdge,
  type IEnumerable,
  type IGraph,
  type IGraphSelection,
  type ILabel,
  INode,
  Rect
} from '@yfiles/yfiles'
import type { PasteOptions } from './CustomCopyAndPasteDemo'

let hideTimer: number | undefined = undefined

/**
 * Shows a toast with the given message.
 */
function showToast(message: string): void {
  const toast = document.querySelector<HTMLElement>('#toast')!
  toast.innerText = message
  toast.style.transform = 'translateY(0)'
  toast.style.opacity = '1'
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    toast.style.transform = 'translateY(calc(100% + 40px))'
    toast.style.opacity = '0'
  }, 5000)
}

/**
 * Applies the style from the clipboard to the selected items in the graph.
 * @param graphComponent the graph component providing graph, clipboard, and selection.
 * @param pasteOptions the options for pasting the style.
 */
export function applyStyle(graphComponent: GraphComponent, pasteOptions: PasteOptions): void {
  const graph = graphComponent.graph
  const clipboard = graphComponent.clipboard
  const clipboardGraph = clipboard.clipboardGraph
  const selection = graphComponent.selection

  const skippedTypes: string[] = []

  // determine the template items based on what's in the clipboard
  let templateNode: INode | null = null
  let templateEdge: IEdge | null = null
  let templateNodeLabel: ILabel | null = null
  let templateEdgeLabel: ILabel | null = null

  // filter out helper nodes. Helper nodes are added automatically to the clipboard graph if one of their dependent
  // items is selected by itself, e.g., if an edge is selected without source or target node
  const nonHelperNodes = clipboardGraph.nodes.filter((n) => !clipboard.isHelper(n))
  if (nonHelperNodes.size === 1) {
    templateNode = nonHelperNodes.first()!
  } else if (nonHelperNodes.size > 1 && selection.nodes.size > 0) {
    skippedTypes.push('nodes')
  }

  // filter out helper edges. Helper edges are added automatically to the clipboard graph if one of their dependent
  // items is selected is selected by itself, e.g., if an edge label is selected without its owner.
  const nonHelperEdges = clipboardGraph.edges.filter((e) => !clipboard.isHelper(e))
  if (nonHelperEdges.size === 1) {
    templateEdge = nonHelperEdges.first()
  } else if (nonHelperEdges.size > 1 && selection.edges.size > 0) {
    skippedTypes.push('edges')
  }

  if (clipboardGraph.nodeLabels.size === 1) {
    templateNodeLabel = clipboardGraph.nodeLabels.first()
  } else if (
    clipboardGraph.nodeLabels.size > 1 &&
    (selection.nodes.size > 0 ||
      selection.labels.filter((label) => label.owner instanceof INode).size > 0)
  ) {
    skippedTypes.push('node labels')
  }

  if (clipboardGraph.edgeLabels.size === 1) {
    templateEdgeLabel = clipboardGraph.edgeLabels.first()
  } else if (
    clipboardGraph.edgeLabels.size > 1 &&
    (selection.edges.size > 0 ||
      selection.labels.filter((label) => label.owner instanceof IEdge).size > 0)
  ) {
    skippedTypes.push('edge labels')
  }

  // When both nodeLabels and edgeLabels are copied apply the one corresponding to the owner.
  // If only one type is copied, it is pasted to the label irrespective of the owner.
  if (!templateNodeLabel && templateEdgeLabel && templateEdgeLabel.owner !== templateEdge) {
    templateNodeLabel = templateEdgeLabel
  }
  if (!templateEdgeLabel && templateNodeLabel && templateNodeLabel.owner !== templateNode) {
    templateEdgeLabel = templateNodeLabel
  }

  // apply the style to selected nodes
  if (templateNode && (pasteOptions.pasteStyle || pasteOptions.pasteNodeSize)) {
    selection.nodes.forEach((node) => {
      if (pasteOptions.pasteStyle) {
        graph.setStyle(node, templateNode.style)
      }
      if (pasteOptions.pasteNodeSize) {
        // set node layout using GEIM instead of graph to make it undoable
        const geim = graphComponent.inputMode as GraphEditorInputMode
        geim.setNodeLayout(node, Rect.fromCenter(node.layout.center, templateNode.layout.size))
      }
    })
  }

  // apply the style to selected edges
  if (templateEdge && pasteOptions.pasteStyle) {
    selection.edges.forEach((edge) => {
      graph.setStyle(edge, templateEdge.style)
    })
  }

  if (pasteOptions.pasteStyle || pasteOptions.pasteLabelPositioning) {
    // apply the style to selected node labels and labels of selected nodes
    if (templateNodeLabel) {
      const selectedNodeLabels = selection.labels.filter((label) => label.owner instanceof INode)
      applyToLabels(graph, selectedNodeLabels, templateNodeLabel, pasteOptions)
      applyToLabelsOfOwners(graph, selection.nodes, templateNodeLabel, selection, pasteOptions)
    }

    // apply the style to selected edge labels and labels of selected edges
    if (templateEdgeLabel) {
      const selectedEdgeLabels = selection.labels.filter((label) => label.owner instanceof IEdge)
      applyToLabels(graph, selectedEdgeLabels, templateEdgeLabel, pasteOptions)
      applyToLabelsOfOwners(graph, selection.edges, templateEdgeLabel, selection, pasteOptions)
    }
  }

  // note: groups, tables, ports and port labels are ignored in this demo

  // display a toast when trying to apply style to items for which there were more than one instances copied
  if (skippedTypes.length > 0) {
    showToast(
      `The style of some items could not be pasted because more than one instance was copied`
    )
  }
}

/**
 * Applies the style of the template label to the labels of the given owners.
 */
function applyToLabelsOfOwners(
  graph: IGraph,
  owners: IEnumerable<INode | IEdge>,
  templateLabel: ILabel,
  selection: IGraphSelection,
  pasteOptions: PasteOptions
): void {
  owners.forEach((owner) => {
    // filter directly selected labels to not apply to them twice
    applyToLabels(
      graph,
      owner.labels.filter((label) => !selection.labels.includes(label)),
      templateLabel,
      pasteOptions
    )
  })
}

/**
 * Applies the style of the template label to the given labels.
 */
function applyToLabels(
  graph: IGraph,
  labels: IEnumerable<ILabel>,
  templateLabel: ILabel,
  pasteOptions: PasteOptions
): void {
  labels.forEach((label) => {
    if (pasteOptions.pasteStyle) {
      graph.setStyle(label, templateLabel.style)
    }
    // only apply node label parameters to node labels and edge label parameters to edge labels
    if (pasteOptions.pasteLabelPositioning && haveSameOwnerType(label, templateLabel)) {
      graph.setLabelLayoutParameter(label, templateLabel.layoutParameter)
    }
  })
}

/**
 * Determines whether two labels have the same owner type (node or edge).
 */
function haveSameOwnerType(label: ILabel, templateLabel: ILabel): boolean {
  return (
    (label.owner instanceof INode && templateLabel.owner instanceof INode) ||
    (label.owner instanceof IEdge && templateLabel.owner instanceof IEdge)
  )
}
