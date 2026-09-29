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
  type GraphViewerInputMode,
  type IModelItem,
  type ObservableCollection,
  Rect,
  type SelectionEventArgs
} from '@yfiles/yfiles'
import { type DashboardEntry, findNode, getTag } from './types'

/**
 * Adds bidirectional selection synchronization between graph and dashboard selection.
 *
 * Synchronizes selections in both directions:
 * - Graph selection → dashboard selection: when nodes are selected in graph, add to dashboard selection
 * - Dashboard selection → graph selection: when items added to dashboard selection, select corresponding graph nodes
 *
 * Handles multi-selection gestures by clearing external selection on drag-start and
 * adding all selected nodes on drag-end. Optionally moves viewport to show selected nodes.
 *
 * @param graphComponent - The GraphComponent to sync with
 * @param selection - Dashboard selection collection to sync with
 * @param moveViewport - Whether to animate viewport to selected nodes (default: true)
 * @returns Disposer function to remove all event listeners
 */
export function addSelectionListener(
  graphComponent: GraphComponent,
  selection: ObservableCollection<DashboardEntry>,
  moveViewport: boolean = true
): () => void {
  // Clear the external selection when a new graph-selection gesture starts.
  const onMultiSelectionStarted = (): void => {
    selection.clear()
  }

  // Add all items selected in the graph to the external selection.
  const onMultiSelectionFinished = (event: SelectionEventArgs<IModelItem>): void => {
    event.selection.forEach((selectedItem) => {
      const data = getTag(selectedItem)
      if (!selection.find((item) => item.id === data.id)) {
        selection.add(data)
      }
    })
  }

  // Add graph-selected items to the external selection.
  const onGCItemAdded = ({ item }: { item: IModelItem }): void => {
    const data = getTag(item)
    if (!selection.find((selectedItem) => selectedItem.id === data.id)) {
      selection.add(data)
    }
  }

  // Remove graph-deselected items from the external selection.
  const onGCItemRemoved = ({ item }: { item: IModelItem }): void => {
    const data = getTag(item)
    if (selection.find((selectedItem) => selectedItem.id === data.id)) {
      selection.remove(data)
    }
  }

  // Select the corresponding graph node when an item is added to the external
  // selection, and optionally move it into the viewport.
  const onSelectionAdded = async ({ item }: { item: DashboardEntry }): Promise<void> => {
    const node = findNode(graphComponent.graph, item.id)
    const graphSelection = graphComponent.selection

    if (node && !graphSelection.nodes.includes(node)) {
      graphSelection.nodes.add(node)

      if (moveViewport) {
        if (graphSelection.nodes.size === 1) {
          if (graphComponent.graph.isGroupNode(node)) {
            const zoomCenter = node.layout.center
            const zoomRect = node.layout.toRect().getEnlarged(150)
            const maxPossibleZoom = Math.min(
              graphComponent.size.width / zoomRect.width,
              graphComponent.size.height / zoomRect.height
            )
            const zoom = Math.min(maxPossibleZoom, 1.5)

            await graphComponent.zoomToAnimated(zoom, zoomCenter)
          } else {
            await graphComponent.ensureVisible(node.layout.toRect(), 50)
          }
        } else {
          let bounds = Rect.EMPTY
          graphSelection.nodes.forEach((selectedNode) => {
            bounds = Rect.add(bounds, selectedNode.layout.toRect())
          })
          await graphComponent.ensureVisible(bounds.getEnlarged(50), 50)
        }
      }
    }
  }

  // Deselect the corresponding graph node when an item is removed from the
  // external selection.
  const onSelectionRemoved = async ({ item }: { item: DashboardEntry }): Promise<void> => {
    const node = findNode(graphComponent.graph, item.id)

    if (node && graphComponent.selection.nodes.includes(node)) {
      graphComponent.selection.nodes.remove(node)
    }
  }

  const inputMode = graphComponent.inputMode as GraphViewerInputMode

  inputMode.addEventListener('multi-selection-started', onMultiSelectionStarted)
  inputMode.addEventListener('multi-selection-finished', onMultiSelectionFinished)

  graphComponent.selection.addEventListener('item-added', onGCItemAdded)
  graphComponent.selection.addEventListener('item-removed', onGCItemRemoved)
  selection.addEventListener('item-added', onSelectionAdded)
  selection.addEventListener('item-removed', onSelectionRemoved)

  return () => {
    graphComponent.selection.removeEventListener('item-added', onGCItemAdded)
    graphComponent.selection.removeEventListener('item-removed', onGCItemRemoved)
    selection.removeEventListener('item-added', onSelectionAdded)
    selection.removeEventListener('item-removed', onSelectionRemoved)
  }
}
