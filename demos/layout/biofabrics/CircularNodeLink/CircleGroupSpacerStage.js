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
import { CircularLayoutData, LayoutStageBase, NodeDataKey } from '@yfiles/yfiles'

export class CircleGroupSpacerStage extends LayoutStageBase {
  nodeGroupMapper = null
  nodeComparator
  nodeGroupComparator

  /**
   * Creates a new CircleGroupSpacerStage that adds visual spacing between node groups.
   * @param layout The Layout to which to prepend this stage
   * @param nodeComparator A function with which to compare nodes
   * @param nodeGroupComparator A function with which to compare node groups
   */
  constructor(layout, nodeComparator, nodeGroupComparator) {
    super(layout)
    this.nodeComparator = nodeComparator
    this.nodeGroupComparator = nodeGroupComparator
  }

  static NODE_GROUP_DATA_KEY = new NodeDataKey('CircleGroupSpacerStage.NODE_GROUP_DATA_KEY')

  /**
   * Applies the layout by inserting spacer nodes between groups, running the core layout,
   * and then removing the spacers. This creates visual separation between node groups in
   * the circular layout.
   * @param graph The layout graph to apply the layout to
   */
  applyLayoutImpl(graph) {
    // Retrieve the node group mapper from the graph context
    this.nodeGroupMapper = graph.context.getItemData(CircleGroupSpacerStage.NODE_GROUP_DATA_KEY)

    // Get unique groups from all nodes
    const groups = new Set(graph.nodes.map((node) => this.nodeGroupMapper?.get(node)))

    // Create invisible spacer nodes - one per group (if there are multiple groups)
    // These spacers will create visual gaps between groups in the circular layout
    const spacerNodes = []

    if (groups.size > 1) {
      for (const groupName of groups) {
        const spacerNode = graph.createNode()
        spacerNode.tag = { group: groupName, label: '' }
        spacerNodes.push(spacerNode)
      }
    }

    // Push custom comparator that handles both regular nodes and spacer nodes
    graph.context.pushLayer(
      new CircularLayoutData({ nodeComparator: this.nestedNodeOrderingFunction.bind(this) })
    )

    // Apply the core layout algorithm with the spacer nodes included
    this.coreLayout?.applyLayout(graph)

    // Remove the spacer nodes after layout - they've served their purpose
    for (const spacerNode of spacerNodes) {
      graph.remove(spacerNode)
    }
  }

  /**
   * Comparator of two nodes based on their group and then their individual ordering.
   * Wraps the set comparators for node group and nodes.
   * @param nodeA - the first node to compare
   * @param nodeB - the second node to compare
   * @returns -1 if nodeA is before nodeB, 1 if nodeA is after nodeB, 0 if they are equal.
   * @private
   */
  nestedNodeOrderingFunction(nodeA, nodeB) {
    const groupA = nodeA.tag['group']
    const groupB = nodeB.tag['group']
    if (groupA !== groupB) {
      return this.nodeGroupComparator(groupA, groupB)
    } else {
      return this.nodeComparator(nodeA, nodeB)
    }
  }
}
