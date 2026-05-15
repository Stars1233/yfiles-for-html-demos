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
  ArcEdgeStyle,
  Arrow,
  Color,
  ExteriorNodeLabelModel,
  GeneralPath,
  Insets,
  LabelStyle,
  NodeStyleLabelStyleAdapter,
  PolylineEdgeStyle,
  Rect,
  ShapeNodeShape,
  ShapeNodeStyle,
  Stroke
} from '@yfiles/yfiles'
import { LitNodeStyle } from '@yfiles/demo-utils/LitNodeStyle'
import { svg } from 'lit-html'
import { NodeStyleDecorator } from './NodeStyleDecorator'
import { getNodeData } from '../data-types'

let mapEdgeStroke
let centricEdgeStroke
let mapStroke

/**
 * Maps the badge names to material design icon names.
 */
export const badgeIconMap = {
  alert: 'warning',
  chemical: 'experiment',
  decline: 'trending_down',
  ecosystem: 'eco',
  fishing: 'set_meal',
  government: 'account_balance',
  health: 'health_cross',
  industry: 'factory',
  infection: 'coronavirus',
  innovation: 'lightbulb',
  marine: 'anchor',
  observation: 'visibility',
  restrictions: 'block',
  spill: 'colors',
  spread: 'graph_3',
  urban: 'location_city',
  water: 'water'
}

export const defaultTheme = {
  mapEdge: { color: '#4682B4', width: 2.0, dash: 'solid' },
  mapNode: { fill: '#00CED1', stroke: '#FC5130' },
  centricEdge: { color: '#FFFFFF', width: 2.0, dash: 'solid' },
  centricNode: { fill: '#37d124', stroke: '#ffe55f' }
}

setTheme()

/**
 * Applies a set of colors to the graph elements.
 * @param definition see the default theme for details
 */
function setTheme(definition = defaultTheme) {
  mapEdgeStroke = new Stroke({
    thickness: definition.mapEdge.width,
    fill: definition.mapEdge.color,
    dashStyle: definition.mapEdge.dash
  })

  centricEdgeStroke = new Stroke({
    thickness: definition.centricEdge.width,
    fill: definition.centricEdge.color,
    dashStyle: definition.centricEdge.dash
  })

  mapStroke = definition.mapNode.stroke
}

/**
 * Initializes the default styles for the graph elements.
 */
export function initializeDefaultStyles(graph) {
  graph.nodeDefaults.style = createMapNodeStyle()
  graph.nodeDefaults.size = [40, 40]
  graph.nodeDefaults.shareStyleInstance = false
  graph.nodeDefaults.labels.style = createLabelStyle()
  graph.nodeDefaults.labels.layoutParameter = ExteriorNodeLabelModel.RIGHT
  graph.edgeDefaults.style = createMapEdgeStyle()
  graph.edgeDefaults.shareStyleInstance = false
}

/**
 * Applies the corresponding styles to the graph elements for the map view.
 */
export function applyMapStyles(graph) {
  graph.edges.forEach((edge) => {
    graph.setStyle(edge, createMapEdgeStyle(getArcHeight(edge)))
  })
  graph.nodes.forEach((node) => {
    graph.setStyle(node, createMapNodeStyle())
    node.ports.forEach((port) => {
      graph.setPortLocationParameter(port, graph.nodeDefaults.ports.locationParameter.clone())
    })
  })
}

/**
 * Applies the corresponding styles to the graph elements for the centric and tree view.
 */
export function applyLayoutStyles(graph) {
  const edgeStyle = createLayoutEdgeStyle()
  graph.edges.forEach((edge) => {
    graph.setStyle(edge, edgeStyle)
  })
  const nodeStyle = createLayoutNodeStyle()
  graph.nodes.forEach((node) => {
    graph.setStyle(node, nodeStyle)
  })
}

/**
 * Creates a node style for the map view.
 */
function createMapNodeStyle() {
  const nodeStyle = new LitNodeStyle(
    ({ tag }) => svg`
        <defs>
            <clipPath id="imageClip">
                <circle stroke-width="0" cx="20" cy="20" r="20" id="circleclip"/>
            </clipPath>
        </defs>
        <!-- Base full ring circle -->
        <circle fill="transparent" stroke-width="10" cx="20" cy="20" r="20" id="circle" stroke="#00d8ff"/>
        <!-- Contamination arc -->
        <circle
          fill="transparent"
          stroke-width="10"
          stroke-linecap="round"
          cx="20" cy="20" r="20"
          stroke="${mapStroke}"
          stroke-dasharray="${applyContamination(tag.level, 20)}"
          stroke-dashoffset="0"
          transform="rotate(-90 20 20)"
        />
        <image href="${getImageUrl(tag.image)}" clip-path="url(#imageClip)" width="40" height="40" transform="translate(0 0)" filter="grayscale(100%)"></image>
    `
  )
  const outlinePath = new GeneralPath()
  // the path is interpreted as normalized - spanning from 0/0 to 1/1
  outlinePath.appendEllipse(new Rect(0, 0, 1, 1), true)
  nodeStyle.normalizedOutline = outlinePath
  return nodeStyle
}

/**
 * Creates an edge style for the map view.
 * @param height The height of the arc. If not specified, the default value is 100.
 */
function createMapEdgeStyle(height = 100) {
  return new ArcEdgeStyle({ stroke: mapEdgeStroke, height: height })
}

/**
 * Creates an edge style for the centric and tree view.
 */
function createLayoutEdgeStyle() {
  return new PolylineEdgeStyle({
    stroke: centricEdgeStroke,
    targetArrow: new Arrow({
      stroke: centricEdgeStroke,
      fill: centricEdgeStroke.fill,
      type: 'deltoid',
      cropLength: 10
    })
  })
}

/**
 * Creates a node style for the centric and tree view.
 */
function createLayoutNodeStyle() {
  const baseStyle = new LitNodeStyle(
    ({ tag }) => svg`
        <defs>
            <clipPath id="imageClip">
                <circle stroke-width="0" cx="20" cy="20" r="20" id="circleclip"/>
            </clipPath>
        </defs>
        <!-- Base full ring circle -->
        <circle fill="transparent" stroke-width="10" cx="20" cy="20" r="20" id="circle" stroke="#00d8ff"/>
        <!-- Contamination arc -->
        <circle
          fill="transparent"
          stroke-width="10"
          stroke-linecap="round"
          cx="20" cy="20" r="20"
          stroke="${mapStroke}"
          stroke-dasharray="${applyContamination(tag.level, 20)}"
          stroke-dashoffset="0"
          transform="rotate(-90 20 20)"
        />
        <image href="${getImageUrl(tag.image)}" clip-path="url(#imageClip)" width="40" height="40" transform="translate(0 0)"></image>
    `
  )

  const outlinePath = new GeneralPath()
  // the path is interpreted as normalized - spanning from 0/0 to 1/1
  outlinePath.appendEllipse(new Rect(0, 0, 1, 1), true)
  baseStyle.normalizedOutline = outlinePath

  return new NodeStyleDecorator(
    baseStyle,
    (node) =>
      getNodeData(node).badges?.map((badgeName) => badgeIconMap[badgeName] ?? badgeName) ?? null
  )
}

/**
 * Creates a label style for the nodes.
 */
function createLabelStyle() {
  return new NodeStyleLabelStyleAdapter({
    nodeStyle: new ShapeNodeStyle({
      shape: ShapeNodeShape.RECTANGLE,
      fill: Color.STEEL_BLUE,
      stroke: null
    }),
    labelStyle: new LabelStyle({ textFill: Color.WHITE }),
    labelStylePadding: Insets.from({ top: 5, right: 3, bottom: 5, left: 3 })
  })
}

/**
 * Calculates the height of the arc for the given edge.
 */
function getArcHeight(edge) {
  const sourceCenter = edge.sourceNode.layout.center
  const targetCenter = edge.targetNode.layout.center
  const distance = sourceCenter.distanceTo(targetCenter)
  if (distance < 500) {
    return distance / 10
  }
  return 100
}

/**
 * Calculates the dash array for the contamination arc visualization.
 */
function applyContamination(level, r = 20) {
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, level))
  // Visible arc length followed by the remaining gap
  return `${clamped * circumference} ${circumference}`
}

/**
 * Gets the URL of the image for the given image name.
 */
export function getImageUrl(image) {
  return `resources/images/places/${image}.jpeg`
}
