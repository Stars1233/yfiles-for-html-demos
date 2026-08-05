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
  Graph,
  GraphComponent,
  type GraphEditorInputMode,
  IEdge,
  ILabel,
  ILabelModelParameterFinder,
  IListEnumerable,
  type IModelItem,
  INode,
  INodeStyle,
  IPort,
  LabelDropInputMode,
  NodeDropInputMode,
  Point,
  PortDropInputMode,
  Rect,
  SimpleLabel,
  SimpleNode,
  SvgExport
} from '@yfiles/yfiles'
import { EdgeDropInputMode } from '@yfiles/demo-utils/EdgeDropInputMode'

export type DragAndDropPanelItem<T extends IModelItem> = { modelItem: T; tooltip: string }
type DraggablePreviewElement = HTMLElement & { _dragPreview?: HTMLElement }

/**
 * A palette of sample nodes. Users can drag and drop the nodes from this palette to a graph control.
 *
 * This class uses the native drag events to start a drag.
 */
export class NativeDragAndDropPanel {
  private readonly div: HTMLElement

  /**
   * Create a new drag drop panel in the given element.
   * @param div The element that will display the palette items.
   */
  constructor(div: HTMLElement) {
    this.div = div
  }

  /**
   * Whether the labels of the DnD node visual should be transferred to
   * the created node or discarded.
   */
  copyNodeLabels = true

  /**
   * This map is used for getting the instances from the string data of the
   * data transfer during 'drop'.
   */
  private readonly id2items = new Map<string, IModelItem>()

  /**
   * Adds the items in the given array to the palette.
   * This method delegates the creation of the visualization of each node to createNodeVisual.
   */
  initialize(
    items: Iterable<DragAndDropPanelItem<INode | IEdge>>,
    graphEditorInputMode: GraphEditorInputMode
  ): void {
    this.populatePanel(items)
    this.wrapDropInputModes(graphEditorInputMode)
  }

  private populatePanel(items: Iterable<DragAndDropPanelItem<INode | IEdge>>): void {
    // Convert the nodes into plain visualizations
    const exportGraphComponent = new GraphComponent()

    let i = 0
    for (const item of items) {
      const modelItem = item.modelItem

      // The item ID is used to get the node instance from the data transfer during 'drop'
      const itemId = `item ${i}`
      const element =
        modelItem instanceof INode
          ? this.createNodeVisual(item as DragAndDropPanelItem<INode>, exportGraphComponent)
          : this.createEdgeVisual(item as DragAndDropPanelItem<IEdge>, exportGraphComponent)

      this.addToIdMap(modelItem, itemId)
      this.addDragEventListeners(element, modelItem, itemId)

      // Finally, add the visual to palette
      this.div.appendChild(element)
      i++
    }
    // Dispose of the component and remove its references to the graph
    exportGraphComponent.graph = new Graph()
    exportGraphComponent.cleanUp()
  }

  // @yjs:keep=effectAllowed
  private addDragEventListeners(
    element: HTMLElement,
    modelItem: INode | IEdge,
    itemId: string
  ): void {
    // Set the item ID as data of the data transfer and configure some other drop properties according to the
    // dragged type
    element.addEventListener('dragstart', (e) => {
      if (!e.dataTransfer) {
        return
      }

      e.dataTransfer.dropEffect = 'copy'
      e.dataTransfer.effectAllowed = 'copy'

      if (modelItem.tag instanceof IPort) {
        e.dataTransfer.setData(PortDropInputMode.DEFAULT_TRANSFER_TYPE, itemId)
      } else if (modelItem.tag instanceof ILabel) {
        e.dataTransfer.setData(LabelDropInputMode.DEFAULT_TRANSFER_TYPE, itemId)
      } else if (modelItem instanceof IEdge) {
        e.dataTransfer.setData(EdgeDropInputMode.DEFAULT_TRANSFER_TYPE, itemId)
      } else {
        e.dataTransfer.setData(NodeDropInputMode.DEFAULT_TRANSFER_TYPE, itemId)
      }

      // create a preview from the SVG element that is actually drag-and-dropped
      const draggablePreview = this.createDraggablePreview(element)
      if (draggablePreview) {
        e.dataTransfer.setDragImage(
          draggablePreview.element,
          draggablePreview.size.width / 2,
          draggablePreview.size.height / 2
        )
        // store for cleanup
        ;(element as DraggablePreviewElement)._dragPreview = draggablePreview.element
      }
    })

    // clean up the preview element
    element.addEventListener('dragend', () => {
      const preview = (element as DraggablePreviewElement)._dragPreview
      if (preview) {
        preview.remove()
        delete (element as DraggablePreviewElement)._dragPreview
      }
    })
  }

  private createDraggablePreview(
    element: HTMLElement
  ): { element: HTMLElement; size: { width: number; height: number } } | null {
    const svg = element.querySelector<SVGSVGElement>('svg')
    if (!svg) {
      return null
    }

    const rect = svg.getBoundingClientRect()

    const wrapper = document.createElement('div')
    wrapper.style.position = 'fixed'
    wrapper.style.left = '-10000px'
    wrapper.style.top = '-10000px'
    wrapper.style.width = `${rect.width}px`
    wrapper.style.height = `${rect.height}px`
    wrapper.style.background = 'transparent'
    wrapper.style.border = 'none'
    wrapper.style.padding = '0'
    wrapper.style.margin = '0'
    wrapper.style.pointerEvents = 'none'

    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.style.display = 'block'
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`
    clone.style.margin = '0'
    clone.style.padding = '0'
    clone.style.background = 'transparent'
    clone.removeAttribute('class')

    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)
    return { element: wrapper, size: { width: rect.width, height: rect.height } }
  }

  private addToIdMap(modelItem: INode | IEdge, itemId: string): void {
    if (modelItem.tag instanceof IPort) {
      this.id2items.set(itemId, modelItem.tag)
    } else if (modelItem.tag instanceof ILabel) {
      this.id2items.set(itemId, modelItem.tag)
    } else if (modelItem instanceof IEdge) {
      this.id2items.set(itemId, modelItem)
    } else {
      // Store a node without labels to create a plain node on drop
      const modifiedNode = new SimpleNode({
        layout: modelItem.layout,
        style: modelItem.style,
        ports: modelItem.ports,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        tag: modelItem.tag,
        labels: this.copyNodeLabels ? modelItem.labels : IListEnumerable.EMPTY
      })
      this.id2items.set(itemId, modifiedNode)
    }
  }

  /**
   * If the provided data is an id string, it will be resolved to the respective model item.
   * Else, data is returned as a model item.
   */
  private resolveItem(data: unknown): IModelItem {
    if (typeof data === 'string') {
      return this.id2items.get(data)!
    }

    return data as IModelItem
  }

  /**
   * Creates an element that contains the visualization of the given node.
   * This method is used by populatePanel to create the visualization
   * for each node provided by the factory.
   */
  private createNodeVisual(
    original: DragAndDropPanelItem<INode>,
    exportGraphComponent: GraphComponent
  ): HTMLElement {
    const exportGraph = exportGraphComponent.graph
    exportGraph.clear()
    const originalNode = original.modelItem

    const node = exportGraph.createNode(
      originalNode.layout.toRect(),
      originalNode.style,
      originalNode.tag
    )
    originalNode.labels.forEach((label) => {
      exportGraph.addLabel(
        node,
        label.text,
        label.layoutParameter,
        label.style,
        label.preferredSize,
        label.tag
      )
    })
    originalNode.ports.forEach((port) => {
      exportGraph.addPort(node, port.locationParameter, port.style, port.tag)
    })

    return exportAndWrap(exportGraphComponent, original.tooltip)
  }

  /**
   * Creates an element that contains the visualization of the given edge.
   */
  private createEdgeVisual(
    original: DragAndDropPanelItem<IEdge>,
    graphComponent: GraphComponent
  ): HTMLElement {
    const exportGraph = graphComponent.graph
    exportGraph.clear()

    const originalEdge = original.modelItem

    const n1 = exportGraph.createNode(new Rect(0, 10, 0, 0), INodeStyle.VOID_NODE_STYLE)
    const n2 = exportGraph.createNode(new Rect(50, 40, 0, 0), INodeStyle.VOID_NODE_STYLE)
    const edge = exportGraph.createEdge(n1, n2, originalEdge.style)
    exportGraph.addBend(edge, new Point(25, 10))
    exportGraph.addBend(edge, new Point(25, 40))

    originalEdge.labels.forEach((label: ILabel) => {
      exportGraph.addLabel(
        edge,
        label.text,
        label.layoutParameter,
        label.style,
        label.preferredSize,
        label.tag
      )
    })
    return exportAndWrap(graphComponent, original.tooltip)
  }

  /**
   * Wraps the item creators of the drop input modes to resolve the item ids to model items.
   */
  private wrapDropInputModes(graphEditorInputMode: GraphEditorInputMode): void {
    this.wrapNodeDropInputMode(graphEditorInputMode)
    this.wrapPortDropInputMode(graphEditorInputMode)
    this.wrapLabelDropInputMode(graphEditorInputMode)
    this.wrapEdgeDropInputMode(graphEditorInputMode)
  }

  private wrapNodeDropInputMode(graphEditorInputMode: GraphEditorInputMode): void {
    // An item creator returns the node instance for the ID of the data transfer.
    // In this demo, we get the node from the 'id2items' map
    const oldItemCreator = graphEditorInputMode.nodeDropInputMode.itemCreator!
    graphEditorInputMode.nodeDropInputMode.itemCreator = (
      context,
      graph,
      info,
      dropTarget,
      dropLocation
    ): INode | null => {
      const node = this.resolveItem(info)
      // The old item creator handles the placement of the new node in the graph
      return oldItemCreator(context, graph, node, dropTarget, dropLocation)
    }
  }

  private wrapPortDropInputMode(graphEditorInputMode: GraphEditorInputMode): void {
    // An item creator returns the port instance for the ID of the data transfer.
    // In this demo, we get the port from the 'id2items' map
    const portDropInputMode = graphEditorInputMode.portDropInputMode
    const oldPortCreator = portDropInputMode.itemCreator!
    portDropInputMode.itemCreator = (
      context,
      graph,
      info,
      dropTarget,
      dropLocation
    ): IPort | null => {
      const port = this.resolveItem(info)
      // the old item creator handles the placement of the new node in the graph
      return oldPortCreator(context, graph, port, dropTarget, dropLocation)
    }
  }

  private wrapLabelDropInputMode(graphEditorInputMode: GraphEditorInputMode): void {
    // An item creator returns the label instance for the ID of the data transfer.
    // In this demo, we get the label from the 'id2items' map
    const labelDropInputMode = graphEditorInputMode.labelDropInputMode
    const oldLabelCreator = labelDropInputMode.itemCreator!
    labelDropInputMode.itemCreator = (
      context,
      graph,
      info,
      dropTarget,
      dropLocation
    ): ILabel | null => {
      const label = this.resolveItem(info) as ILabel
      // create the label only of the label owner and the drop target are both either nodes or edges
      if (
        (label.owner instanceof INode && dropTarget instanceof INode) ||
        (label.owner instanceof IEdge && dropTarget instanceof IEdge)
      ) {
        if (label instanceof SimpleLabel) {
          const finder = label.layoutParameter.model
            .getContext(label)
            .lookup(ILabelModelParameterFinder)
          if (finder) {
            label.layoutParameter = finder.findBestParameter(label.layout)
          }
        }

        // the old item creator handles the placement of the new node in the graph
        return oldLabelCreator(context, graph, label, dropTarget, dropLocation)
      }
      return null
    }
  }

  private wrapEdgeDropInputMode(graphEditorInputMode: GraphEditorInputMode): void {
    const edgeDropInputMode = graphEditorInputMode
      .getSortedModes()
      .find((mode) => mode instanceof EdgeDropInputMode)
    if (edgeDropInputMode instanceof EdgeDropInputMode) {
      const oldEdgeCreator = edgeDropInputMode.itemCreator!
      edgeDropInputMode.itemCreator = (
        context,
        graph,
        info,
        dropTarget,
        dropLocation
      ): IEdge | null => {
        const edge = this.resolveItem(info)
        // the old item creator handles the placement of the new node in the graph
        return oldEdgeCreator(context, graph, edge, dropTarget, dropLocation)
      }
    }
  }
}

/**
 * Exports and wraps the original visualization in an HTML element.
 */
function exportAndWrap(graphComponent: GraphComponent, tooltip: string): HTMLElement {
  graphComponent.updateContentBounds(10)
  const exporter = new SvgExport(graphComponent.contentBounds)
  const nodeVisual = exporter.exportSvg(graphComponent)

  // Firefox does not display the SVG correctly because of the clip - so we remove it.
  nodeVisual.removeAttribute('clip-path')

  // create the HTML element
  const div = document.createElement('div')
  div.setAttribute('class', 'demo-dnd-panel__item')
  div.appendChild(nodeVisual)

  div.setAttribute('draggable', 'true')
  div.title = tooltip
  return div
}
