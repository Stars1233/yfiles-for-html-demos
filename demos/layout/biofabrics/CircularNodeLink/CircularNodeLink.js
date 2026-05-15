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
  BezierEdgeStyle,
  CircularLayout,
  CircularLayoutOnCircleRoutingStyle,
  CircularLayoutPartitioningPolicy,
  CircularLayoutRoutingStyle,
  CssFill,
  Font,
  FreeNodeLabelModel,
  FreeNodeLabelModelParameter,
  GenericLayoutData,
  IEdge,
  ILabel,
  IModelItem,
  INode,
  LabelStyle,
  LayoutGraphAdapter,
  LayoutNode,
  RadialNodeLabelPlacement,
  ShapeNodeShape,
  ShapeNodeStyle,
  Stroke,
  TextRenderSupport
} from '@yfiles/yfiles'
import { CircularNodeGroupRenderer } from './CircularNodeGroupRenderer'
import { isNodeGroupRenderTag } from '../Biofabric/BiofabricTypes'
import { CircleGroupSpacerStage } from './CircleGroupSpacerStage'
import { GradientDelegatingEdgeStyle } from './GradientDelegatingEdgeStyle'
import { wrapPointerWithMomentumAnalysis } from '../pointer-debounce'

export class CircularNodeLink {
  graphComponent
  nodeIDKey
  edgeIDKey

  // Ordering Functions
  nodeOrderingKey = 'Degree'
  nodeGroupDataKey
  edgeGroupDataKey
  nodeGroupOrderingKey = 'CardinalityDescending'
  edgeGroupOrderingKey = 'CardinalityDescending'

  // Aesthetics
  _edgeThickness = 2
  edgeColorMode = 'None'
  edgeColors = [
    '#8dd3c7',
    '#fdb462',
    '#80b1d3',
    '#fb8072',
    '#bebada',
    '#b3de69',
    '#fccde5',
    '#d9d9d9',
    '#bc80bd',
    '#ffffb3'
  ]
  cssVarPrefix = 'yfiles-circular'
  edgeColorMap = new Map()

  nodeGroups = {}
  edgeGroups = {}
  nodeGroupRenderers = new Map()
  nodeGroupVisuals = new Map()

  highlightedItems = []
  highlightItemCallback
  clearItemCallback

  /**
   * Creates a new CircularNodeLink instance.
   * @param graphComponent The GraphComponent to visualize the circular layout on.
   * @param nodeIDKey The property key in the node's tag used as a unique identifier.
   * @param edgeIDKey The property key in the edge's tag used as a unique identifier.
   * @param options Configuration options for the CircularNodeLink.
   */
  constructor(graphComponent, nodeIDKey, edgeIDKey, options = {}) {
    this.graphComponent = graphComponent
    this.nodeIDKey = nodeIDKey
    this.edgeIDKey = edgeIDKey
    Object.assign(this, options)

    this.createNodeGroups()
    this.createEdgeGroups()
    this.updateEdgeColorMap()
    this.configureInteraction()
    this.configureStyles()
    void this.applyLayout()
    this.addGroupVisuals()
  }

  /**
   * Creates and sets the NodeGroups property of the CircularNodeLink.
   * @private
   */
  createNodeGroups() {
    this.nodeGroups = {}
    if (this.nodeGroupDataKey) {
      const groupedNodes = this.graphComponent.graph.nodes.groupBy((node) =>
        this.getNodeGroupName(node)
      )
      groupedNodes.forEach(([group, nodes]) => {
        if (group !== undefined) {
          this.nodeGroups[group] = {
            nodes: nodes.toSorted(createNodeOrderings(this.nodeOrderingKey, this)).toArray(),
            id: group.toString(),
            collapsed: false,
            highlighted: false
          }
        }
      })
    }
  }

  /**
   * Creates and sets the EdgeGroups property of the CircularNodeLink.
   * @private
   */
  createEdgeGroups() {
    this.edgeGroups = {}
    if (this.edgeGroupDataKey) {
      const edgeGroups = this.graphComponent.graph.edges.groupBy((edge) =>
        this.getEdgeGroupName(edge)
      )
      edgeGroups.forEach(([group, edges]) => {
        if (group !== undefined) {
          this.edgeGroups[group] = {
            edges: edges.toArray(), // edges cannot be sorted in a node-link diagrammatic representation
            id: group.toString(),
            collapsed: false,
            highlighted: false
          }
        }
      })
    }
  }

  /**
   * Updates the edge color map based on the current edge color mode.
   * @private
   */
  updateEdgeColorMap() {
    this.edgeColorMap.clear()
    if (this.edgeColorMode === 'EdgeGroups' && this.edgeGroupDataKey) {
      const comparator = createEdgeGroupOrderings(this.edgeGroupOrderingKey, this)
      this.edgeColorMap = new Map(
        Object.keys(this.edgeGroups)
          .toSorted(comparator)
          .map((sortedGroup, i) => {
            return [sortedGroup, this.edgeColors[i % this.edgeColors.length]]
          })
      )
    }

    if (
      (this.edgeColorMode === 'NodeGroups' || this.edgeColorMode === 'NodeGroupsInverted') &&
      this.nodeGroupDataKey
    ) {
      const comparator = createNodeGroupOrderings(this.nodeGroupOrderingKey, this)
      this.edgeColorMap = new Map(
        Object.keys(this.nodeGroups)
          .toSorted((groupA, groupB) => comparator(groupA, groupB))
          .map((sortedGroup, i) => {
            return [sortedGroup, this.edgeColors[i % this.edgeColors.length]]
          })
      )
    }
  }

  configureInteraction() {
    let previousElements = []
    this.graphComponent.addEventListener(
      'pointer-move',
      wrapPointerWithMomentumAnalysis(
        (evt, sender, movingFast) => {
          // discard quick movements..
          const hitElements = movingFast
            ? []
            : this.graphComponent.renderTree.hitElementsAt(evt.location).toArray()
          if (
            hitElements.length === previousElements.length &&
            hitElements.every((item, index) => item === previousElements[index])
          ) {
            return
          }
          previousElements = hitElements

          this.clearHighlights()
          if (hitElements.length === 0) return
          const rte = hitElements[0]
          if (isNodeGroupRenderTag(rte.tag)) {
            const group = rte.tag.groupName
            const nodes = this.nodeGroups[group]?.nodes ?? []
            if (this.highlightItemCallback) {
              this.highlightItemCallback(this.nodeGroups[group], false)
            }
            nodes.forEach((node) => {
              this.addHighlight(node)
              node.labels.forEach((label) => this.addHighlight(label))
              this.nodeGroups[group].highlighted = true
            })
          } else if (rte.tag instanceof IModelItem) {
            let item = rte.tag
            if (item instanceof ILabel) {
              item = item.owner
            }

            if (item instanceof INode) {
              // Highlight the node and its label(s)
              this.addHighlight(item)
              item.labels.forEach((label) => this.addHighlight(label))

              // Iterate over all incident edges
              const incidentEdges = this.graphComponent.graph.edgesAt(item)
              incidentEdges.forEach((edge) => {
                // Highlight the edge and its label(s)
                this.addHighlight(edge)
                edge.labels.forEach((label) => {
                  this.addHighlight(label, false, false)
                })

                // Ensure the source node is not the current item -> highlight it and its label(s)
                if (edge.sourceNode !== item) {
                  this.addHighlight(edge.sourceNode, true)
                  edge.sourceNode.labels.forEach((label) => {
                    this.addHighlight(label, true)
                  })
                }

                // Ensure the target node is not the current item -> highlight it and its label(s)
                if (edge.targetNode !== item) {
                  this.addHighlight(edge.targetNode, true)
                  edge.targetNode.labels.forEach((label) => {
                    this.addHighlight(label, true)
                  })
                }
              })
            } else if (item instanceof IEdge) {
              this.addHighlight(item)
              this.addHighlight(item.sourceNode)
              this.addHighlight(item.targetNode)
              item.sourceNode.labels.forEach((label) => this.addHighlight(label))
              item.targetNode.labels.forEach((label) => this.addHighlight(label))
            }
          }
        },
        { speedThreshold: 1000 }
      )
    )
  }

  configureStyles() {
    this.graphComponent.graph.nodes.forEach((node) => {
      const nodeGroupName = this.getNodeGroupName(node)
      const nodeStyle = new ShapeNodeStyle({
        cssClass: 'node-link-node',
        shape: ShapeNodeShape.PILL,
        fill: (nodeGroupName ? this.edgeColorMap.get(nodeGroupName) : undefined) ?? 'none',
        keepIntrinsicAspectRatio: false
      })
      this.graphComponent.graph.setStyle(node, nodeStyle)
    })

    const labelStyle = new LabelStyle({
      cssClass: 'node-edge-label',
      textFill: 'var(--yfiles-biofabric-demo-edge-color)',
      textSize: 30,
      shape: 'pill',
      backgroundFill: '#202739',
      backgroundStroke: '0px var(--yfiles-biofabric-demo-background-color) solid',
      wrapping: 'none'
    })

    this.graphComponent.graph.labels.forEach((label) => {
      if (label.owner instanceof INode) {
        if (!(label.layoutParameter instanceof FreeNodeLabelModelParameter)) {
          this.graphComponent.graph.setLabelLayoutParameter(label, FreeNodeLabelModel.CENTER)
        }
        // assign a clone to each label so that we can later set the cssClass per instance
        this.graphComponent.graph.setStyle(label, labelStyle.clone())
      }
    })
    this.configureEdgeStyle()
  }

  async applyLayout(animationDuration) {
    // Create new Layout which does not visualize disconnected components separately
    const circularLayout = new CircularLayout({
      partitioningPolicy: CircularLayoutPartitioningPolicy.SINGLE_CYCLE,
      nodeLabelPlacement: RadialNodeLabelPlacement.RAY_LIKE_LEAVES,
      fromSketchMode: false
    })
    circularLayout.componentLayout.enabled = false

    // defines settings for the non-exterior edges
    const defaultEdgeDescriptor = circularLayout.edgeDescriptor
    defaultEdgeDescriptor.inCircleRoutingStyle = CircularLayoutRoutingStyle.CURVED
    defaultEdgeDescriptor.onCircleRoutingStyle = CircularLayoutOnCircleRoutingStyle.CURVED

    // since we use the BezierEdgeStyle, we need to determine the control points for the curves
    defaultEdgeDescriptor.createControlPoints = true

    const layout = new CircleGroupSpacerStage(
      circularLayout,
      createNodeOrderings(this.nodeOrderingKey, this),
      createNodeGroupOrderings(this.nodeGroupOrderingKey, this)
    )

    // Create Layout Data
    const spacerLayoutData = this.createLayoutData()

    // Layout Graph
    let returnPromise
    if (!animationDuration) {
      this.graphComponent.graph.applyLayout(layout, spacerLayoutData)
      returnPromise = Promise.resolve()
    } else {
      returnPromise = this.graphComponent.applyLayoutAnimated({
        layout: layout,
        animationDuration: animationDuration,
        layoutData: spacerLayoutData,
        animateViewport: false
      })
    }
    return returnPromise
  }

  /**
   * Adds the visuals that represent the CircularNodeLink's NodeGroups to the GraphComponent's RenderTree.
   * @private
   */
  addGroupVisuals() {
    // Remove any existing group visuals
    this.uninstallGroupVisuals()

    // Calculate the width of the longest node label to determine group arc radius
    let longestNodeLabelWidth = 0
    const labelFont = new Font({ fontFamily: 'Sans-Serif', fontSize: 40 })
    Object.entries(this.nodeGroups).forEach(([_, nodeGroup]) => {
      nodeGroup.nodes.forEach((node) => {
        const nodeLabel = node.tag['label'].toString()
        const textWidth = TextRenderSupport.measureText(nodeLabel, labelFont).width
        longestNodeLabelWidth =
          longestNodeLabelWidth > textWidth ? longestNodeLabelWidth : textWidth
      })
    })

    // Add Node Group Visuals
    Object.entries(this.nodeGroups).forEach(([groupName, nodeGroup]) => {
      const nodeGroupRenderer = new CircularNodeGroupRenderer(
        8,
        longestNodeLabelWidth + 40,
        this.edgeColorMode === 'NodeGroups' || this.edgeColorMode === 'NodeGroupsInverted'
          ? this.edgeColorMap.get(groupName)
          : undefined
      )
      this.nodeGroupRenderers.set(groupName, nodeGroupRenderer)

      const nodeGroupVisual = this.graphComponent.renderTree.createElement(
        this.graphComponent.renderTree.contentGroup,
        {
          groupName: groupName,
          nodeGroup: nodeGroup,
          largeGroup: nodeGroup.nodes.length > this.graphComponent.graph.nodes.size * 0.5
        },
        nodeGroupRenderer
      )
      this.nodeGroupVisuals.set(groupName, nodeGroupVisual)
    })
  }
  uninstallGroupVisuals() {
    // Remove all Node Group Visuals (if they exist)
    for (const [_, nodeGroupVisual] of this.nodeGroupVisuals.entries()) {
      this.graphComponent.renderTree.remove(nodeGroupVisual)
    }
    this.nodeGroupVisuals.clear()

    // Reset Node Group Renderer Object
    this.nodeGroupRenderers.clear()
  }

  /**
   * Adds a highlight to the specified IModelItem.
   * If adjacent is 'true' the highlight-adjacency class is added to the item's CSS class.'
   * @param item - The IModelItem to be highlighted.
   * @param adjacent - A boolean flag if the highlight-adjacency class should be added to the item's CSS class.'
   * @param muteCallback - A boolean flag if the highlightItemCallback (if provided) of the CircularNodeLink should be muted.
   */
  addHighlight(item, adjacent = false, muteCallback = false) {
    const itemStyle = item.style

    if (
      'cssClass' in itemStyle &&
      typeof itemStyle.cssClass === 'string' &&
      !itemStyle.cssClass.includes('highlight')
    ) {
      itemStyle.cssClass += adjacent ? ' highlight-adjacency' : ' highlight'
      this.highlightedItems.push(item)
      if (!muteCallback && this.highlightItemCallback) {
        this.highlightItemCallback(item, adjacent)
      }
    }

    // Bring the highlighted item to the front of the render tree for better visibility
    this.graphComponent.graphModelManager.getRenderTreeElement(item)?.toFront()
  }

  /**
   * Removes all highlights from the CircularNodeLink's IModelItems.'
   * @param muteCallback - A boolean flag if the clearItemCallback (if provided) of the CircularNodeLink should be muted.
   */
  clearHighlights(muteCallback = false) {
    this.highlightedItems.forEach((item) => {
      const itemStyle = item.style
      if ('cssClass' in itemStyle && typeof itemStyle.cssClass === 'string') {
        itemStyle.cssClass = itemStyle.cssClass
          .replaceAll(/\s*highlight-adjacency/g, '')
          .replaceAll(/\s*highlight/g, '')
      }
    })
    this.highlightedItems = []
    if (!muteCallback && this.clearItemCallback) {
      this.clearItemCallback()
    }
    Object.values(this.nodeGroups).forEach((item) => {
      if (item) item.highlighted = false
    })

    this.graphComponent.invalidate()
  }

  /**
   * Set the circular node-link diagram's edge thickness to a new value.
   * @param edgeThickness the new thickness of each edge in the circular node-link diagram in pixels
   */
  set edgeThickness(edgeThickness) {
    this._edgeThickness = edgeThickness
  }

  /**
   *
   */
  get edgeThickness() {
    return this._edgeThickness
  }

  /**
   * Create a GenericLayoutData object with a node group mapper function. Which is used inside
   * the layout to access the node grouping data.
   * @returns a GenericLayoutData object with a node group mapper function.
   * @private
   */
  createLayoutData() {
    const layoutData = new GenericLayoutData()
    layoutData.addItemMapping(CircleGroupSpacerStage.NODE_GROUP_DATA_KEY).mapperFunction = (
      node
    ) => {
      const nodeGroupName = this.getNodeGroupName(node)
      if (nodeGroupName) {
        return nodeGroupName
      } else {
        return 'Ungrouped'
      }
    }
    return layoutData
  }

  /**
   * Returns the node group name given node.
   * @param node The node to get the group data for.
   * @private
   */
  getNodeGroupName(node) {
    const nodeTag = node.tag
    if (this.nodeGroupDataKey && nodeTag[this.nodeGroupDataKey] !== undefined) {
      return String(nodeTag[this.nodeGroupDataKey])
    }
    return undefined
  }

  /**
   * Returns the edge group name for the given edge.
   * @param edge The edge to get the group data for.
   * @private
   */
  getEdgeGroupName(edge) {
    const edgeTag = edge.tag
    if (this.edgeGroupDataKey && edgeTag[this.edgeGroupDataKey] !== undefined) {
      return String(edgeTag[this.edgeGroupDataKey])
    }
    return undefined
  }

  /**
   * Configures the styles of the CircularNodeLink's edges.'
   * @private
   */
  configureEdgeStyle() {
    this.graphComponent.graph.edges.forEach((edge) => {
      let colorA
      let colorB
      if (this.edgeColorMode === 'None' || this.edgeColorMap.size === 0) {
        this.graphComponent.graph.setStyle(
          edge,
          new BezierEdgeStyle({
            cssClass: 'node-link-edge',
            stroke: new Stroke({
              thickness: this._edgeThickness,
              // adds a CSS fill using the CSS color-mix function this allows mixing in background colors for dimming/brightening using CSS variables
              fill: new CssFill(
                `color-mix(in oklab, var(--${this.cssVarPrefix}-edge-color) var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
              )
            }),
            targetArrow: 'none',
            sourceArrow: 'none'
          })
        )
      } else if (this.edgeColorMode === 'EdgeGroups') {
        const edgeGroupName = this.getEdgeGroupName(edge)
        if (edgeGroupName) {
          colorA = this.edgeColorMap.get(edgeGroupName)
          this.graphComponent.graph.setStyle(
            edge,
            new BezierEdgeStyle({
              cssClass: 'node-link-edge',
              stroke: new Stroke({
                thickness: this._edgeThickness,
                // adds a CSS fill using the CSS color-mix function this allows mixing in background colors for dimming/brightening using CSS variables
                fill: `color-mix(in oklab, ${colorA} var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
              }),
              targetArrow: 'none',
              sourceArrow: 'none'
            })
          )
        } else {
          // Fallback to default when no group name is available
          this.graphComponent.graph.setStyle(
            edge,
            new BezierEdgeStyle({
              cssClass: 'node-link-edge',
              stroke: new Stroke({
                thickness: this._edgeThickness,
                fill: new CssFill(
                  `color-mix(in oklab, var(--${this.cssVarPrefix}-edge-color) var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
                )
              }),
              targetArrow: 'none',
              sourceArrow: 'none'
            })
          )
        }
      } else {
        const sourceGroup = this.getNodeGroupName(edge.sourceNode)
        const targetGroup = this.getNodeGroupName(edge.targetNode)
        if (sourceGroup && targetGroup) {
          colorA =
            this.edgeColorMode === 'NodeGroupsInverted'
              ? this.edgeColorMap.get(targetGroup)
              : this.edgeColorMap.get(sourceGroup)
          colorB =
            this.edgeColorMode === 'NodeGroupsInverted'
              ? this.edgeColorMap.get(sourceGroup)
              : this.edgeColorMap.get(targetGroup)
          if (colorA === colorB) {
            // if the colors are the same just use a regular BezierEdgeStyle
            this.graphComponent.graph.setStyle(
              edge,
              new BezierEdgeStyle({
                cssClass: 'node-link-edge',
                stroke: new Stroke({
                  thickness: this._edgeThickness,
                  fill: new CssFill(
                    `color-mix(in oklab, ${colorA} var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
                  )
                }),
                targetArrow: 'none',
                sourceArrow: 'none'
              })
            )
          } else {
            this.graphComponent.graph.setStyle(
              edge,
              // when two different colors are provided, a GradientDelegatingEdgeStyle is used to interpolate between the two colors
              new GradientDelegatingEdgeStyle(
                new BezierEdgeStyle({
                  cssClass: 'node-link-edge',
                  stroke: new Stroke({ thickness: this._edgeThickness }),
                  targetArrow: 'none',
                  sourceArrow: 'none'
                }),
                colorA,
                colorB,
                250,
                this.cssVarPrefix
              )
            )
          }
        } else {
          // Fallback to default when node groups are not available
          this.graphComponent.graph.setStyle(
            edge,
            new BezierEdgeStyle({
              cssClass: 'node-link-edge',
              stroke: new Stroke({
                thickness: this._edgeThickness,
                fill: new CssFill(
                  `color-mix(in oklab, var(--${this.cssVarPrefix}-edge-color) var(--${this.cssVarPrefix}-edge-color-value, 100%), var(--${this.cssVarPrefix}-background-color, #ffffff) var(--${this.cssVarPrefix}-background-color-value, 0%)`
                )
              }),
              targetArrow: 'none',
              sourceArrow: 'none'
            })
          )
        }
      }
    })
  }

  /**
   * Updates the visualization of the CircularNodeLink. Called whenever the CircularNodeLink's properties change.
   */
  updateVisualization() {
    // create node and edge groupings
    this.createNodeGroups()
    this.createEdgeGroups()

    // update the edge color map according to the current edgeColorMode
    this.updateEdgeColorMap()

    // configure the appearance of the CircularNodeLink's GraphModelItens visuals
    this.configureStyles()

    // Add visuals to the render three, that indicate the group membership of the nodes
    this.addGroupVisuals()

    // Update Group Visuals
    if (this.edgeColorMode === 'NodeGroups' || this.edgeColorMode === 'NodeGroupsInverted') {
      for (const [groupName, nodeGroupRenderer] of this.nodeGroupRenderers.entries()) {
        nodeGroupRenderer.color = this.edgeColorMap.get(groupName)
      }
    } else if (this.edgeColorMode === 'EdgeGroups') {
      for (const [_, nodeGroupRenderer] of this.nodeGroupRenderers.entries()) {
        nodeGroupRenderer.color = undefined
      }
    } else {
      for (const [_, nodeGroupRenderer] of this.nodeGroupRenderers.entries()) {
        nodeGroupRenderer.color = undefined
      }
    }
  }
}

/*
Available Orderings (for Nodes and NodeGroups)
 */
function createNodeOrderings(typeNodeOrderingKey, context) {
  switch (typeNodeOrderingKey) {
    default:
    case 'LexicographicalDescending':
      return (a, b) => compareTagLexicographical(a, b, context.nodeIDKey, false)
    case 'LexicographicalAscending':
      return (a, b) => compareTagLexicographical(a, b, context.nodeIDKey, true)
    case 'Degree':
      return (a, b) => getDegree(b, context) - getDegree(a, context)
  }
}

function createNodeGroupOrderings(key, context) {
  switch (key) {
    default:
    case 'CardinalityAscending':
      return (a, b) => compareGroupCardinality(a, b, context.nodeGroups, 'nodes', true)
    case 'CardinalityDescending':
      return (a, b) => compareGroupCardinality(a, b, context.nodeGroups, 'nodes', false)
    case 'LexicographicalDescending':
      return (a, b) => compareLexicographical(String(b), String(a))
    case 'LexicographicalAscending':
      return (a, b) => compareLexicographical(String(a), String(b))
  }
}

function createEdgeGroupOrderings(key, context) {
  switch (key) {
    default:
    case 'CardinalityAscending':
      return (a, b) => compareGroupCardinality(a, b, context.edgeGroups, 'edges', true)
    case 'CardinalityDescending':
      return (a, b) => compareGroupCardinality(a, b, context.edgeGroups, 'edges', false)
    case 'LexicographicalDescending':
      return (a, b) => compareLexicographical(String(b), String(a))
    case 'LexicographicalAscending':
      return (a, b) => compareLexicographical(String(a), String(b))
  }
}

/**
 * Ordering helpers
 */

function compareLexicographical(a, b) {
  return a.localeCompare(b, undefined, { numeric: true })
}
function getDegree(node, context) {
  if (node instanceof LayoutNode) {
    const nodeMapper = node.graph?.context.getItemData(LayoutGraphAdapter.ORIGINAL_NODE_DATA_KEY)
    if (!nodeMapper) {
      throw new Error('No Node Mapper Defined!')
    }
    const originalINode = nodeMapper.get(node)
    return originalINode ? context.graphComponent.graph.edgesAt(originalINode).size : 0
  } else {
    return context.graphComponent.graph.edgesAt(node).size
  }
}

function compareTagLexicographical(tagOwnerA, tagOwnerB, key, asc) {
  if (!key) throw new Error('Ordering requires a valid ID Key!')
  const valA = tagOwnerA.tag[key]
  const valB = tagOwnerB.tag[key]
  if (!valA && !valB) return 0
  if (!valA) return asc ? -1 : 1
  if (!valB) return asc ? 1 : -1
  return asc ? compareLexicographical(valA, valB) : compareLexicographical(valB, valA)
}

function compareGroupCardinality(groupA, groupB, dataSource, collectionKey, asc) {
  const dataA = dataSource?.[groupA]?.[collectionKey]
  const dataB = dataSource?.[groupB]?.[collectionKey]
  const lenA = Array.isArray(dataA) ? dataA.length : -1
  const lenB = Array.isArray(dataB) ? dataB.length : -1

  if (lenA !== lenB) return asc ? lenA - lenB : lenB - lenA

  const strA = groupA.toString()
  const strB = groupB.toString()
  return asc ? compareLexicographical(strA, strB) : compareLexicographical(strB, strA)
}
