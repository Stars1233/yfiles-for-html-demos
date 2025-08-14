/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) by yWorks GmbH, Vor dem Kreuzberg 28,
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
  Command,
  ExteriorNodeLabelModel,
  Graph,
  GraphComponent,
  GraphEditorInputMode,
  GraphSnapContext,
  IGraph,
  type INode,
  LabelStyle,
  License,
  NinePositionsEdgeLabelModel,
  NinePositionsEdgeLabelModelPosition,
  Point,
  PolylineEdgeStyle,
  ShapeNodeStyle
} from '@yfiles/yfiles'
import { colorSets } from '@yfiles/demo-resources/demo-colors'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { finishLoading } from '@yfiles/demo-resources/demo-page'

const graphComponents: GraphComponent[] = []

const graphComponentsContainer = document.getElementById('graphComponents') as HTMLDivElement

const colorPalettes: Record<
  string,
  { primaryColor: string; secondaryColor: string; backgroundColor: string }
> = {
  Blue: {
    primaryColor: colorSets['demo-lightblue'].stroke,
    secondaryColor: colorSets['demo-lightblue'].nodeLabelFill,
    backgroundColor: colorSets['demo-lightblue'].fill
  },
  Orange: {
    primaryColor: colorSets['demo-orange'].stroke,
    secondaryColor: colorSets['demo-orange'].nodeLabelFill,
    backgroundColor: colorSets['demo-orange'].fill
  },
  Green: {
    primaryColor: colorSets['demo-green'].stroke,
    secondaryColor: colorSets['demo-green'].nodeLabelFill,
    backgroundColor: colorSets['demo-green'].fill
  },
  Purple: {
    primaryColor: colorSets['demo-purple'].stroke,
    secondaryColor: colorSets['demo-purple'].nodeLabelFill,
    backgroundColor: colorSets['demo-purple'].fill
  },
  Yellow: {
    primaryColor: colorSets['demo-palette-22'].stroke,
    secondaryColor: colorSets['demo-palette-22'].nodeLabelFill,
    backgroundColor: colorSets['demo-palette-22'].fill
  }
}

let sharedGraph: IGraph

async function run(): Promise<void> {
  License.value = await fetchLicense()

  sharedGraph = createSampleGraph()

  initGraphComponents()

  void graphComponents[0].fitGraphBounds()

  selectSampleItems()

  initializeUI()
  initColorButtons()
}

/**
 * Creates the GraphComponents with the different theme variants
 * and adds them to the document.
 */
function initGraphComponents() {
  // one of each variant
  for (const variant of ['round', 'round-hatched', 'square', 'square-hatched'] as const) {
    createGraphComponent(variant)
  }

  synchronizeGraphComponents()
}

/**
 * Creates a GraphComponent with the given theme and the shared graph and selection.
 */
function createGraphComponent(
  themeVariant: 'round' | 'square' | 'round-hatched' | 'square-hatched'
): void {
  const graphComponent = new GraphComponent()
  graphComponent.htmlElement.style.setProperty('--yfiles-theme-variant', themeVariant)
  const { primaryColor, secondaryColor, backgroundColor } = colorPalettes['Blue']
  graphComponentsContainer.style.setProperty('--yfiles-theme-primary', primaryColor)
  graphComponentsContainer.style.setProperty('--yfiles-theme-secondary', secondaryColor)
  graphComponentsContainer.style.setProperty('--yfiles-theme-background', backgroundColor)
  graphComponentsContainer.appendChild(graphComponent.htmlElement)
  graphComponent.graph = sharedGraph
  graphComponent.inputMode = new GraphEditorInputMode({
    allowReparentNodes: true,
    snapContext: new GraphSnapContext()
  })
  graphComponent.updateContentBounds()
  graphComponents.push(graphComponent)
}

let changing = false

/**
 * Synchronizes the graph components so that changes in one will be mirrored in the others.
 */
function synchronizeGraphComponents(): void {
  for (const graphComponent of graphComponents) {
    const otherComponents = graphComponents.filter((g) => g !== graphComponent)
    graphComponent.addEventListener('updated-visual', () => {
      for (const otherComponent of otherComponents) {
        otherComponent.invalidate()
      }
    })
    graphComponent.addEventListener('viewport-changed', () => {
      if (!changing) {
        changing = true
        for (const otherComponent of otherComponents) {
          if (!otherComponent.viewport.equals(graphComponent.viewport)) {
            otherComponent.zoomTo(graphComponent.viewport)
          }
        }
        changing = false
      }
    })
    graphComponent.selection.addEventListener('item-added', (evt) => {
      for (const otherComponent of otherComponents) {
        otherComponent.selection.add(evt.item)
      }
    })

    graphComponent.selection.addEventListener('item-removed', (evt) => {
      for (const otherComponent of otherComponents) {
        otherComponent.selection.remove(evt.item)
      }
    })
  }
}

/**
 * Creates a sample graph.
 */
function createSampleGraph(): IGraph {
  const graph = new Graph()

  graph.nodeDefaults.style = new ShapeNodeStyle({ fill: '#CCCCCC', stroke: '1px black' })
  graph.nodeDefaults.labels.style = new LabelStyle({ padding: 2 })
  graph.nodeDefaults.labels.layoutParameter = new ExteriorNodeLabelModel({
    margins: 5
  }).createParameter('bottom')
  graph.groupNodeDefaults.style = new ShapeNodeStyle({ fill: '#EEEEEE', stroke: 'none' })
  graph.groupNodeDefaults.labels.layoutParameter = new ExteriorNodeLabelModel({
    margins: 5
  }).createParameter('top')
  graph.groupNodeDefaults.labels.style = new LabelStyle({ padding: 2 })
  graph.edgeDefaults.style = new PolylineEdgeStyle({
    stroke: '#AAAAAA',
    targetArrow: '#AAAAAA small triangle'
  })
  graph.edgeDefaults.labels.style = new LabelStyle({ padding: 2 })

  const node1 = graph.createNodeAt({ location: [20, 110] })
  const node2 = graph.createNodeAt({ location: [120, 145] })
  const node3 = graph.createNodeAt({ location: [120, 75] })
  const node4 = graph.createNodeAt({ location: [220, 30], labels: ['Node'] })
  const node5 = graph.createNodeAt({ location: [220, 100], labels: ['Node'] })

  graph.groupNodes({ children: [node1, node2, node3], labels: ['Group'] })

  const edge1 = graph.createEdge(node1, node2)
  const edge2 = graph.createEdge(node1, node3)
  const edge3 = graph.createEdge(node3, node4)
  const edge4 = graph.createEdge(node3, node5)
  const edge5 = graph.createEdge(node1, node5)
  graph.addLabel(
    edge1,
    'Edge',
    new NinePositionsEdgeLabelModel().createParameter(
      NinePositionsEdgeLabelModelPosition.TARGET_BELOW
    )
  )
  graph.setPortLocation(edge1.sourcePort, new Point(40, 123.33))
  graph.setPortLocation(edge1.targetPort, new Point(100, 145))
  graph.setPortLocation(edge2.sourcePort, new Point(40, 96.67))
  graph.setPortLocation(edge2.targetPort, new Point(100, 75))
  graph.setPortLocation(edge3.sourcePort, new Point(140, 65))
  graph.setPortLocation(edge3.targetPort, new Point(200, 30))
  graph.setPortLocation(edge4.sourcePort, new Point(140, 85))
  graph.setPortLocation(edge4.targetPort, new Point(200, 90))
  graph.setPortLocation(edge5.sourcePort, new Point(40, 110))
  graph.setPortLocation(edge5.targetPort, new Point(200, 110))
  graph.addBends(edge1, [new Point(70, 123.33), new Point(70, 145)])
  graph.addBends(edge2, [new Point(70, 96.67), new Point(70, 75)])
  graph.addBends(edge3, [new Point(170, 65), new Point(170, 30)])
  graph.addBends(edge4, [new Point(170, 85), new Point(170, 90)])

  return graph
}

/**
 * Selects some items for illustration, but only if no elements are currently selected.
 */
function selectSampleItems(): void {
  const selection = graphComponents[0].selection
  if (selection.some()) {
    // Something is already selected, don't change it
    return
  }

  const node = sharedGraph.nodes.at(0)!
  if (node == null) {
    return
  }

  selection.add(node)
  for (const edge of graphComponents[0].graph.edgesAt(node)) {
    selection.add(edge)
    const opposite = edge.opposite(node) as INode
    if (opposite.labels.some()) {
      selection.add(opposite.labels.at(0)!)
    }
  }
}

function initColorButtons(): void {
  const toolbar = document.querySelector('.demo-page__toolbar')!
  Object.keys(colorPalettes).forEach((paletteName) => {
    const palette = colorPalettes[paletteName]
    const button = document.createElement('button')
    button.style.backgroundColor = palette.secondaryColor
    button.className = 'color-button'
    button.textContent = paletteName
    button.title = `${paletteName} Color Palette`
    button.addEventListener('click', () => {
      const { primaryColor, secondaryColor, backgroundColor } = colorPalettes[paletteName]
      graphComponentsContainer.style.setProperty('--yfiles-theme-primary', primaryColor)
      graphComponentsContainer.style.setProperty('--yfiles-theme-secondary', secondaryColor)
      graphComponentsContainer.style.setProperty('--yfiles-theme-background', backgroundColor)
    })
    toolbar.appendChild(button)
  })
}

/**
 * Binds actions the buttons in the tutorial's toolbar.
 */
function initializeUI(): void {
  document
    .querySelector("[data-command='FIT_GRAPH_BOUNDS']")!
    .addEventListener('click', async () => {
      await graphComponents[0].fitGraphBounds()
    })

  document.querySelector("[data-command='ZOOM_ORIGINAL']")!.addEventListener('click', () => {
    graphComponents[0].executeCommand(Command.ZOOM)
  })

  const { defaultScale, defaultHandleOffset, defaultIndicatorOffset } = getThemeDefaults()
  const sliders = [
    {
      slider: '#scale-slider',
      label: '#scale-label',
      cssClass: '--yfiles-theme-scale',
      default: '1.5'
    },
    {
      slider: '#handle-offset-slider',
      label: '#handle-offset-label',
      cssClass: '--yfiles-theme-handle-offset',
      default: defaultHandleOffset
    },
    {
      slider: '#indicator-offset-slider',
      label: '#indicator-offset-label',
      cssClass: '--yfiles-theme-indicator-offset',
      default: defaultIndicatorOffset
    }
  ]
  sliders.forEach((slider) => {
    graphComponentsContainer.style.setProperty(slider.cssClass, slider.default)
    const labelElement = document.querySelector(slider.label)!
    labelElement.textContent = slider.default
    const sliderElement = document.querySelector(slider.slider) as HTMLInputElement
    sliderElement.value = slider.default
    sliderElement.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement
      graphComponentsContainer.style.setProperty(slider.cssClass, target.value)
      labelElement.textContent = target.value
    })
  })
}

function getThemeDefaults(): {
  defaultScale: string
  defaultHandleOffset: string
  defaultIndicatorOffset: string
} {
  const tempGC = new GraphComponent()
  document.body.appendChild(tempGC.htmlElement)
  let computedStyle = window.getComputedStyle(tempGC.htmlElement)
  const defaultScale = computedStyle.getPropertyValue('--yfiles-theme-scale')
  const defaultHandleOffset = computedStyle.getPropertyValue('--yfiles-theme-handle-offset')
  const defaultIndicatorOffset = computedStyle.getPropertyValue('--yfiles-theme-indicator-offset')
  document.body.removeChild(tempGC.htmlElement)
  return { defaultScale, defaultHandleOffset, defaultIndicatorOffset }
}

run().then(finishLoading)
