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
  ExteriorNodeLabelModel,
  GraphComponent,
  GroupNodeLabelModel,
  GroupNodeStyle,
  LabelStyle,
  Point,
  Rect,
  Size,
  SvgExport
} from '@yfiles/yfiles'
import { createNodeStyleForType, LEGEND_NODE_SIZE, NODE_TYPE_INFOS } from './node-types'

let iconGraphComponent

/**
 * Returns a hidden GraphComponent used for exporting legend visuals.
 */
function getIconGraphComponent() {
  if (!iconGraphComponent) {
    iconGraphComponent = new GraphComponent(document.createElement('div'))
  }
  return iconGraphComponent
}

/**
 * Base class for shared functionality of all legends.
 */
export class LegendBase {
  graphComponent
  _horizontal = false
  _onlyVisible = false
  _isVisible = false
  lastVisibleTypes = null
  wasHorizontal = false

  constructor(graphComponent) {
    this.graphComponent = graphComponent
  }

  /**
   * Gets whether the legend entries should be displayed horizontally.
   */
  get horizontal() {
    return this._horizontal
  }

  /**
   * Sets whether the legend entries should be displayed horizontally.
   */
  setHorizontal(horizontal) {
    this._horizontal = horizontal
  }

  /**
   * Gets whether the legend is currently visible.
   */
  get isVisible() {
    return this._isVisible
  }

  /**
   * Sets whether only nodes visible in the current viewport should be considered for the legend
   */
  setShowOnlyVisible(visible) {
    this._onlyVisible = visible
  }

  /**
   * Shows the legend.
   */
  show() {
    this._isVisible = true
    this.onShow()
    this.refresh()
  }

  /**
   * Hides the legend.
   */
  hide() {
    this._isVisible = false
    this.onHide()
    // reset the cached visible node types which causes the next refresh to update the legend
    this.lastVisibleTypes = null
  }

  /**
   * Refreshes the legend if the visible node types or the orientation have changed.
   */
  refresh() {
    if (!this.isVisible) {
      return
    }

    const nodeTypesInGraph = this.getNodeTypesInGraph()
    const typesKey = JSON.stringify(Array.from(nodeTypesInGraph))

    if (typesKey === this.lastVisibleTypes && this.wasHorizontal === this.horizontal) {
      // nothing relevant to the legend has changed
      return
    }

    // let the actual legend create itself
    this.refreshCore(nodeTypesInGraph)

    this.lastVisibleTypes = typesKey
    this.wasHorizontal = this.horizontal
  }

  /**
   * Hook for derived classes to perform custom work when the legend is shown.
   */
  onShow() {}

  /**
   * Hook for derived classes to perform custom work when the legend is hidden.
   */
  onHide() {}

  /**
   * Returns the set of node types that are present in the graph, considering the "show only visible" option.
   */
  getNodeTypesInGraph() {
    const presentTypes = new Set()
    for (const node of this.graphComponent.graph.nodes) {
      const type = node.tag
      if (!this._onlyVisible || this.graphComponent.viewport.intersects(node.layout.toRect())) {
        presentTypes.add(type)
      }
    }
    // sort legend entries alphabetically
    return new Set(
      Array.from(presentTypes).sort((a, b) => {
        const nameA = NODE_TYPE_INFOS[a].name
        const nameB = NODE_TYPE_INFOS[b].name
        return nameA.localeCompare(nameB)
      })
    )
  }

  /**
   * Creates a visual representation of the legend using a hidden graph and SvgExport
   * used by the two render tree legends.
   */
  createLegendVisual(nodeTypes) {
    const legendGraphComponent = getIconGraphComponent()
    const graph = legendGraphComponent.graph
    graph.clear()

    // the group node provides the background for the legend
    const group = graph.createGroupNode(
      null,
      Rect.EMPTY,
      new GroupNodeStyle({
        cornerRadius: 14,
        contentAreaFill: '#38536b',
        tabFill: '#38536b',
        stroke: 'none',
        tabHeight: 36,
        tabPadding: 14
      })
    )

    // legend title
    graph.addLabel(
      group,
      'Legend',
      new GroupNodeLabelModel().createTabParameter(),
      new LabelStyle({ textFill: 'white', textSize: 18 })
    )

    // legend entries
    const labelStyle = new LabelStyle({
      verticalTextAlignment: 'center',
      textSize: 16,
      textFill: 'white'
    })
    this.addLegendEntries(nodeTypes, graph, group, labelStyle)

    // make the group node encompass the entries
    graph.adjustGroupNodeLayout(group)

    // adjust the group node to also encompass the labels
    const maxLabelWidth =
      graph.groupingSupport
        .getDescendants(group)
        .reduce(
          (maxLabelWidth, node) => Math.max(maxLabelWidth, node.labels.first().preferredSize.width),
          0
        ) + 8
    const groupLayout = group.layout.toRect()
    graph.setNodeLayout(
      group,
      new Rect(
        groupLayout.x,
        groupLayout.y,
        Math.max(groupLayout.width + maxLabelWidth, 180),
        Math.max(groupLayout.height, 104)
      )
    )

    legendGraphComponent.updateContentBounds()

    // export the legend graph to SVG
    const exporter = new SvgExport({ worldBounds: legendGraphComponent.contentBounds })
    const svg = exporter.exportSvg(legendGraphComponent)
    svg.removeAttribute('clip-path')

    // copy the elements to a group
    const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    Array.from(svg.children).forEach((child) => svgGroup.appendChild(child))
    const viewBox = svg.viewBox.baseVal
    // return the svg group together with its size which we need later for positioning
    return { legendVisual: svgGroup, size: new Size(viewBox.width, viewBox.height) }
  }

  /**
   * Adds a node and a label for each of the given node types to the given graph. Optionally adds
   * them to a group node and applies a label style.
   */
  addLegendEntries(nodeTypes, graph, groupNode, labelStyle) {
    let x = 0
    let y = 0
    nodeTypes.forEach((type) => {
      const node = graph.createNode(
        groupNode,
        new Rect(new Point(x, y), LEGEND_NODE_SIZE),
        createNodeStyleForType(type)
      )
      const label = graph.addLabel(
        node,
        NODE_TYPE_INFOS[type].name,
        new ExteriorNodeLabelModel({ margins: 8 }).createParameter('right'),
        labelStyle
      )
      if (this.horizontal) {
        x += LEGEND_NODE_SIZE.width + label.preferredSize.width + 24
      } else {
        y += 50
      }
    })
  }

  /**
   * Exports a single node style as an SVG element for the HTML panel legend.
   */
  createNodeTypeVisual(style) {
    const iconGraphComponent = getIconGraphComponent()
    const graph = iconGraphComponent.graph
    graph.clear()
    graph.createNode(new Rect(0, 0, LEGEND_NODE_SIZE.width, LEGEND_NODE_SIZE.height), style)

    iconGraphComponent.updateContentBounds(4)
    const exporter = new SvgExport({ worldBounds: iconGraphComponent.contentBounds })
    exporter.scale = exporter.calculateScaleForWidth(LEGEND_NODE_SIZE.width + 8)
    const visual = exporter.exportSvg(iconGraphComponent)
    visual.removeAttribute('clip-path')
    return visual
  }
}
