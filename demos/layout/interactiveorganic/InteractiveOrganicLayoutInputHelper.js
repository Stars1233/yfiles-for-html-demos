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
import { InteractiveOrganicLayoutHelper } from '@yfiles/demo-utils/InteractiveOrganicLayoutHelper'
import {} from '@yfiles/yfiles'

/**
 * Helps configure the interactive organic layout to respond to manual node dragging.
 */
export class InteractiveOrganicLayoutInputHelper {
  graph
  layoutHelper

  constructor(graph, config) {
    this.graph = graph
    this.layoutHelper = new InteractiveOrganicLayoutHelper(graph, config)
  }

  /**
   * Starts the layout.
   * This is suitable for execution inside a Web Worker thread.
   */
  startInterval() {
    this.prepareStructureChanges()
    this.layoutHelper.startInterval()
  }

  /**
   * Configures the layout to update when the user begins dragging nodes.
   */
  startDrag(draggedNodes, draggedComponent) {
    this.layoutHelper.updateInertiaAndStressForAllNodes(0.8, 0.2)
    this.restartLayout(draggedNodes, draggedComponent)
  }

  /**
   * Configures the layout to update as the user drags nodes.
   */
  drag(draggedNodes, draggedComponent, delta = 0.5) {
    this.updateStressAndInertiaForOtherNodes(draggedNodes, draggedComponent, delta)
    this.layoutHelper.fixNodes(draggedNodes, 1)
  }

  /**
   * Configures the layout to update when the user finishes dragging nodes.
   */
  finishDrag(draggedNodes, draggedComponent) {
    this.layoutHelper.fixNodes(draggedNodes, 1, 0)
    this.updateStressAndInertiaForOtherNodes(draggedNodes, draggedComponent, -1)
  }

  /**
   * Configures the layout to respond when a node or edge is created or deleted.
   * Handling node and edge changes helps prevent excessive node movement
   * when isolated nodes are added.
   */
  updateLayoutAfterStructuralChange(affectedNodes, affectedComponent) {
    this.graph.nodes.forEach((node) => {
      this.layoutHelper.setStressAndInertia(node, 1, affectedNodes.includes(node) ? 0.1 : 0)
    })
    this.updateStressAndInertiaForOtherNodes(affectedNodes, affectedComponent)
  }

  /**
   * Registers the necessary listeners that react to structural changes to the graph like node/edge
   * addition/deletion so that the layout algorithm is updated accordingly.
   */
  prepareStructureChanges() {
    this.graph.addEventListener('node-created', (evt) => {
      // Keep the node unfixed so that it animates upon creation.
      this.layoutHelper.addNode(evt.item, false)
    })
    this.graph.addEventListener('node-removed', () => {
      this.layoutHelper.removeNode()
    })
    this.graph.addEventListener('edge-created', (evt) => {
      this.layoutHelper.addEdge(evt.item)
    })
    this.graph.addEventListener('edge-removed', (evt) => {
      this.layoutHelper.removeEdge(evt.sourcePortOwner, evt.targetPortOwner)
    })
  }

  /**
   * When a node is first dragged, the interactive layout is restarted with
   * an updated graph structure.
   */
  restartLayout(draggedNodes, draggedComponent) {
    this.drag(draggedNodes, draggedComponent, 0.5)
    this.layoutHelper.warmupNodes()
    this.layoutHelper.fixNodes(draggedNodes)
  }

  /**
   * Adjusts the stress and inertia of nodes in the same connected component,
   * allowing them to move closer to the dragged nodes.
   * @param affectedNodes The nodes directly being manipulated.
   * @param affectedComponent The nodes belonging to the component of the affected nodes.
   * @param delta The value determining the stress to add and inertia to subtract.
   */
  updateStressAndInertiaForOtherNodes(affectedNodes, affectedComponent, delta = 0.1) {
    for (const node of affectedComponent) {
      if (!affectedNodes.includes(node)) {
        // Allow the other nodes in the component to follow the dragged nodes closely.
        this.layoutHelper.changeStress(node, delta)
        this.layoutHelper.changeInertia(node, -delta)
      }
    }
  }
}
