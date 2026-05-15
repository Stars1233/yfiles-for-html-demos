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
  type ArcEdgeStyle,
  Arrow,
  type ArrowTypeStringValues,
  type FillConvertible,
  FontStyle,
  type GraphComponent,
  type GraphEditorInputMode,
  IEdge,
  ILabel,
  ILabelOwner,
  type IModelItem,
  INode,
  type LabelStyle,
  Point,
  type PolylineEdgeStyle,
  Rect,
  type ShapeNodeShapeStringValues,
  ShapeNodeStyle,
  Stroke,
  TextDecorations
} from '@yfiles/yfiles'

import '@fortawesome/fontawesome-free/js/all.min.js'

const template = document.createElement('template')
template.innerHTML = `
<style>
.contextual-toolbar:focus {
  outline: 0;
}

.contextual-toolbar * {
  user-select: none;
  vertical-align: middle;
  color: #666666;
}

.contextual-toolbar {
  display: block;
  box-sizing: border-box;
  user-select: none;
  background-color: #f7f7f7;
  box-shadow:
    0 2px 10px 0 rgba(0, 0, 0, 0.16),
    0 2px 5px 0 rgba(0, 0, 0, 0.26);
  transition:
    width 0.2s ease-out;
}

.contextual-toolbar button,
.contextual-toolbar label {
  display: inline-block;
  outline: none;
  border: none;
  background-repeat: no-repeat;
  background-position: 50% 50%;
  background-color: transparent;
  height: 42px;
  width: 42px;
  line-height: 42px;
  box-sizing: border-box;
  padding: 0;
  cursor: pointer;
}

.contextual-toolbar label {
  text-align: center;
  font-size: 16px;
}

.contextual-toolbar label > svg {
  margin-bottom: 4px;
}

.contextual-toolbar .separator {
  height: 28px;
  width: 1px;
  background: #999;
  display: inline-block;
  vertical-align: middle;
}

.contextual-toolbar button:hover,
.contextual-toolbar label:hover,
#clipboard-actions div:hover {
  background-color: #dedede;
}
.contextual-toolbar button:active,
.contextual-toolbar label:active {
  background-color: #b2b2b2;
}

.contextual-toolbar input.toggle-button:checked:hover + label {
  background-color: #b2b2b2;
}

.contextual-toolbar input.toggle-button {
  display: none !important;
}

.contextual-toolbar input.toggle-button:checked + label {
  background-color: #dedede;
}

#node-ui,
#label-ui,
#edge-ui,
#clipboard-ui {
  display: inline-block;
}

.picker-container {
  position: absolute;
  background-color: #f7f7f7;
  box-shadow:
    0 2px 10px 0 rgba(0, 0, 0, 0.16),
    0 2px 5px 0 rgba(0, 0, 0, 0.26);
  opacity: 0;
  display: none;
  transition: opacity 0.2s ease-out;
  padding: 5px;
  width: 8rem;
  text-align: center;
  box-sizing: border-box;
}

.picker-container button {
  width: 32px;
  height: 32px;
  margin: 2px;
}

.picker-container:not(.bottom):after {
  content: '';
  position: absolute;
  display: inline-block;
  border: 8px solid transparent;
  border-top-color: #b5b5b5;
  left: calc(50% - 8px);
  top: 100%;
}

.picker-container.bottom:after {
  content: '';
  position: absolute;
  display: inline-block;
  border: 8px solid transparent;
  border-bottom-color: #b5b5b5;
  left: calc(50% - 8px);
  top: -16px;
}

.color-picker button {
  transition: border-radius 0.2s ease;
}

.color-picker button:hover {
  border-radius: 5px;
}

#shape-picker-shapes button {
  background-size: 25px 25px;
}

#arrow-picker-types.target button {
  transform: rotate(180deg);
}

#clipboard-actions {
  text-align: left;
  padding: 0;
}

#clipboard-actions div {
  height: 32px;
  line-height: 32px;
  cursor: pointer;
  padding: 0 5px;
}

#clipboard-actions div[disabled] {
  opacity: 0.5;
  cursor: default;
  background-color: transparent;
}

#clipboard-actions span {
  margin-left: 10px;
  font-size: 16px;
}

/* hide separators if they separate nothing */
.contextual-toolbar.label-ui-visible:not(.node-ui-visible) #label-ui .separator,
.contextual-toolbar.edge-ui-visible:not(.label-ui-visible):not(.node-ui-visible)
  #edge-ui
  .separator {
  display: none;
}
</style>

<div id="contextualToolbar" class="contextual-toolbar" tabindex="0">
  <div id="clipboard-ui">
    <input
      type="checkbox"
      id="clipboard"
      class="toggle-button"
      data-container-id="clipboard-actions"
    />
    <label for="clipboard" title="Clipboard">
      <span class="fa-layers fa-fw">
        <i class="fas fa-clipboard"></i>
        <i
          class="fas fa-sm fa-caret-right"
          data-fa-transform="right-14 down-12 rotate-45"
        ></i>
      </span>
    </label>
    <span class="separator"></span>
  </div>
  <div id="node-ui">
    <input
      type="checkbox"
      id="shape-picker"
      class="toggle-button"
      data-container-id="shape-picker-shapes"
    />
    <label for="shape-picker" title="Shape Picker">
      <span class="fa-layers fa-fw">
        <i class="fas fa-star" data-fa-transform="shrink-6 up-8"></i>
        <i class="fas fa-square" data-fa-transform="shrink-6 down-4 left-6"></i>
        <i class="fas fa-circle" data-fa-transform="shrink-6 down-4 right-6"></i>
        <i
          class="fas fa-sm fa-caret-right"
          data-fa-transform="right-14 down-12 rotate-45"
        ></i>
      </span>
    </label>
    <input
      type="checkbox"
      id="color-picker"
      class="toggle-button"
      data-container-id="color-picker-colors"
    />
    <label for="color-picker" title="Color Picker">
      <span class="fa-layers fa-fw">
        <i class="fas fa-paint-brush"></i>
        <i
          class="fas fa-sm fa-caret-right"
          data-fa-transform="right-14 down-12 rotate-45"
        ></i>
      </span>
    </label>
    <span class="separator"></span>
    <input type="checkbox" id="quick-element-creation" class="toggle-button" />
    <label for="quick-element-creation" title="Quick Element Creation">
      <span class="fa-layers fa-fw">
        <i class="fas fa-plus-square" data-fa-transform="grow-6"></i>
      </span>
    </label>
  </div>
  <div id="label-ui">
    <span class="separator"></span>
    <input
      type="checkbox"
      id="font-color-picker"
      class="toggle-button"
      data-container-id="font-color-picker-colors"
    />
    <label for="font-color-picker" title="Font Color Picker">
      <span class="fa-layers fa-fw">
        <i class="fas fa-font" data-fa-transform="shrink-2 up-4"></i>
        <i class="far fa-window-minimize" data-fa-transform="shrink-2"></i>
        <i
          class="fas fa-sm fa-caret-right"
          data-fa-transform="right-14 down-12 rotate-45"
        ></i>
      </span>
    </label>
    <button title="Decrease Font Size" id="decrease-font-size">
      <span class="fa-layers fa-fw">
        <i class="fas fa-long-arrow-alt-right" data-fa-transform="up-8 rotate-20"></i>
        <i class="fas fa-font" data-fa-transform="shrink-5 down-2.5 right-6"></i>
        <i class="fas fa-font" data-fa-transform="left-6 down-1"></i>
      </span>
    </button>
    <button title="Increase Font Size" id="increase-font-size">
      <span class="fa-layers fa-fw">
        <i class="fas fa-long-arrow-alt-right" data-fa-transform="up-8 rotate--20"></i>
        <i class="fas fa-font" data-fa-transform="right-6 down-1"></i>
        <i class="fas fa-font" data-fa-transform="shrink-5 down-2.5 left-6"></i>
      </span>
    </button>
    <input type="checkbox" id="font-bold" class="toggle-button" data-fontweight="bold" />
    <label for="font-bold" title="Bold"><i class="fas fa-bold"></i></label>
    <input
      type="checkbox"
      id="font-italic"
      class="toggle-button"
      data-fontstyle="italic"
    />
    <label for="font-italic" title="Italic"><i class="fas fa-italic"></i></label>
    <input
      type="checkbox"
      id="font-underline"
      class="toggle-button"
      data-textdecoration="underline"
    />
    <label for="font-underline" title="Underline"><i class="fas fa-underline"></i></label>
  </div>
  <div id="edge-ui">
    <span class="separator"></span>
    <input
      type="checkbox"
      id="source-arrow-picker"
      class="toggle-button"
      data-container-id="arrow-picker-types"
    />
    <label for="source-arrow-picker" title="Source Arrow Picker">
      <span class="fa-layers fa-fw">
        <i class="fas fa-long-arrow-alt-left"></i>
        <i
          class="fas fa-sm fa-caret-right"
          data-fa-transform="right-14 down-12 rotate-45"
        ></i>
      </span>
    </label>
    <input
      type="checkbox"
      id="edge-color-picker"
      class="toggle-button"
      data-container-id="edge-colors"
    />
    <label for="edge-color-picker" title="Edge Color Picker">
      <span class="fa-layers fa-fw">
        <i class="fas fa-paint-brush" data-fa-transform="shrink-4 up-4"></i>
        <i class="far fa-window-minimize" data-fa-transform="shrink-2"></i>
        <i
          class="fas fa-sm fa-caret-right"
          data-fa-transform="right-14 down-12 rotate-45"
        ></i>
      </span>
    </label>
    <input
      type="checkbox"
      id="target-arrow-picker"
      class="toggle-button"
      data-container-id="arrow-picker-types"
    />
    <label for="target-arrow-picker" title="Target Arrow Picker">
      <span class="fa-layers fa-fw">
        <i class="fas fa-long-arrow-alt-right"></i>
        <i
          class="fas fa-sm fa-caret-right"
          data-fa-transform="right-14 down-12 rotate-45"
        ></i>
      </span>
    </label>
  </div>

  <div id="color-picker-colors" class="picker-container color-picker">
    <button
      data-color="#DC143C"
      style="background-color: #dc143c"
      title="#DC143C"
    ></button>
    <button
      data-color="#336699"
      style="background-color: #336699"
      title="#336699"
    ></button>
    <button
      data-color="#32CD32"
      style="background-color: #32cd32"
      title="#32CD32"
    ></button>
    <button
      data-color="#228B22"
      style="background-color: #228b22"
      title="#228B22"
    ></button>
    <button
      data-color="#FF8C00"
      style="background-color: #ff8c00"
      title="#FF8C00"
    ></button>
    <button
      data-color="#7B68EE"
      style="background-color: #7b68ee"
      title="#7B68EE"
    ></button>
  </div>

  <div id="edge-colors" class="picker-container color-picker">
    <button
      data-color="#DC143C"
      style="background-color: #dc143c"
      title="#DC143C"
    ></button>
    <button
      data-color="#336699"
      style="background-color: #336699"
      title="#336699"
    ></button>
    <button
      data-color="#32CD32"
      style="background-color: #32cd32"
      title="#32CD32"
    ></button>
    <button
      data-color="#228B22"
      style="background-color: #228b22"
      title="#228B22"
    ></button>
    <button
      data-color="#FF8C00"
      style="background-color: #ff8c00"
      title="#FF8C00"
    ></button>
    <button
      data-color="#333333"
      style="background-color: #333333"
      title="#333333"
    ></button>
  </div>

  <div id="font-color-picker-colors" class="picker-container color-picker">
    <button
      data-color="#000000"
      style="background-color: #000000"
      title="#000000"
    ></button>
    <button
      data-color="#FFFFFF"
      style="background-color: #ffffff"
      title="#FFFFFF"
    ></button>
    <button
      data-color="#336699"
      style="background-color: #336699"
      title="#336699"
    ></button>
    <button
      data-color="#DC143C"
      style="background-color: #dc143c"
      title="#DC143C"
    ></button>
    <button
      data-color="#32CD32"
      style="background-color: #32cd32"
      title="#32CD32"
    ></button>
    <button
      data-color="#7B68EE"
      style="background-color: #7b68ee"
      title="#7B68EE"
    ></button>
  </div>

  <div id="shape-picker-shapes" class="picker-container">
    <button
      title="Rectangle"
      data-shape="RECTANGLE"
      style="background-image: url('resources/shapes/rectangle.svg')"
    ></button>
    <button
      title="Pill"
      data-shape="ROUND_RECTANGLE"
      style="background-image: url('resources/shapes/round-rectangle.svg')"
    ></button>
    <button
      title="Ellipse"
      data-shape="ELLIPSE"
      style="background-image: url('resources/shapes/ellipse.svg')"
    ></button>
    <button
      title="Star-6"
      data-shape="STAR6"
      style="background-image: url('resources/shapes/star6.svg')"
    ></button>
    <button
      title="Hexagon"
      data-shape="HEXAGON"
      style="background-image: url('resources/shapes/hexagon.svg')"
    ></button>
    <button
      title="Triangle"
      data-shape="TRIANGLE"
      style="background-image: url('resources/shapes/triangle.svg')"
    ></button>
  </div>

  <div id="arrow-picker-types" class="picker-container">
    <button
      title="Circle"
      data-type="ELLIPSE"
      style="background-image: url('resources/arrows/circle.svg')"
    ></button>
    <button
      title="Kite"
      data-type="KITE"
      style="background-image: url('resources/arrows/kite.svg')"
    ></button>
    <button
      title="Diamond"
      data-type="DIAMOND"
      style="background-image: url('resources/arrows/diamond.svg')"
    ></button>
    <button
      title="None"
      data-type="NONE"
      style="background-image: url('resources/arrows/none.svg')"
    ></button>
    <button
      title="Chevron"
      data-type="CHEVRON"
      style="background-image: url('resources/arrows/chevron.svg')"
    ></button>
    <button
      title="Triangle"
      data-type="TRIANGLE"
      style="background-image: url('resources/arrows/triangle.svg')"
    ></button>
  </div>

  <div id="clipboard-actions" class="picker-container">
    <div id="cut-button">
      <i class="fas fa-fw fa-lg fa-cut"></i>
      <span>Cut</span>
    </div>
    <div id="copy-button">
      <i class="fas fa-fw fa-lg fa-copy"></i>
      <span>Copy</span>
    </div>
    <div id="paste-button" disabled>
      <i class="fas fa-fw fa-lg fa-paste"></i>
      <span>Paste</span>
    </div>
    <div id="duplicate-button">
      <i class="fas fa-fw fa-lg fa-clone"></i>
      <span>Duplicate</span>
    </div>
    <div id="delete-button">
      <i class="fas fa-fw fa-lg fa-trash"></i>
      <span>Delete</span>
    </div>
  </div>
</div>
`

/**
 * A contextual toolbar web component that shows interactive style editing controls depending on the passed
 * items.
 */
export class ContextualToolbarComponent extends HTMLElement {
  private _graphComponent: GraphComponent | null = null
  private _selectedItems: IModelItem[] = []
  private containsNodes = false
  private containsLabels = false
  private containsEdges = false

  /**
   * Gets the selected items for which the popup is shown. Returns an empty array if no item is selected and the popup is hidden.
   */
  get selectedItems(): IModelItem[] {
    return this._selectedItems
  }

  /**
   * Sets the selected items for which the popup should be shown.
   */
  set selectedItems(value: IModelItem[]) {
    this._selectedItems = value
    this.containsEdges = this.getSelectedEdges().length > 0
    this.containsNodes = this.getSelectedNodes().length > 0
    this.containsLabels = this.getSelectedLabels().length > 0
  }

  /**
   * Gets the {@link GraphComponent} that is associated with this popup.
   */
  get graphComponent(): GraphComponent | null {
    return this._graphComponent
  }

  /**
   * Sets the {@link GraphComponent} that is associated with this popup.
   */
  set graphComponent(value: GraphComponent | null) {
    this._graphComponent = value
    if (value) {
      this.registerUpdateListeners(value)
    }
  }

  /**
   * Lifecycle callback that is invoked when the element is inserted into the DOM.
   */
  connectedCallback(): void {
    this.appendChild(template.content.cloneNode(true))
    this.registerClickListeners()
    this.hideAllPickerContainer()
    this.updateItemUI()
    this.updateLabelControlState()
  }

  /**
   * Lifecycle callback that is invoked when the element is removed from the DOM.
   */
  disconnectedCallback(): void {
    this.innerHTML = ''
  }

  /**
   * Shows or hides the user interface elements for the different item types depending on the current selection.
   */
  private updateItemUI(): void {
    const content = this.querySelector<HTMLDivElement>('#contextualToolbar')!
    const nodeUI = content.querySelector<HTMLElement>('#node-ui')!
    const labelUI = content.querySelector<HTMLElement>('#label-ui')!
    const edgeUI = content.querySelector<HTMLElement>('#edge-ui')!
    if (this.containsNodes) {
      content.classList.add('node-ui-visible')
      nodeUI.style.display = 'inline-block'
    } else {
      content.classList.remove('node-ui-visible')
      nodeUI.style.display = 'none'
    }
    if (this.containsLabels) {
      content.classList.add('label-ui-visible')
      labelUI.style.display = 'inline-block'
    } else {
      content.classList.remove('label-ui-visible')
      labelUI.style.display = 'none'
    }
    if (this.containsEdges) {
      content.classList.add('edge-ui-visible')
      edgeUI.style.display = 'inline-block'
    } else {
      content.classList.remove('edge-ui-visible')
      edgeUI.style.display = 'none'
    }
  }

  /**
   * Updates the label controls depending on the selection.
   * If multiple labels are selected, we just take the state of the first label, for simplicity.
   */
  private updateLabelControlState(): void {
    const content = this.querySelector<HTMLDivElement>('#contextualToolbar')!
    const labels = this.selectedItems.filter((item) => item instanceof ILabel)
    if (labels.length > 0) {
      const font = (labels[0].style as LabelStyle).font
      const fontBoldToggle = content.querySelector<HTMLInputElement>('#font-bold')!
      fontBoldToggle.checked = font.fontWeight === 'bold'
      const fontItalicToggle = content.querySelector<HTMLInputElement>('#font-italic')!
      fontItalicToggle.checked = font.fontStyle === FontStyle.ITALIC
      const fontUnderlineToggle = content.querySelector<HTMLInputElement>('#font-underline')!
      fontUnderlineToggle.checked = font.textDecoration === TextDecorations.UNDERLINE
    }
  }

  /**
   * Returns an array of the currently selected edges.
   */
  private getSelectedEdges(): IEdge[] {
    return this.selectedItems.filter((item) => item instanceof IEdge) as IEdge[]
  }

  /**
   * Returns an array of the currently selected nodes.
   */
  private getSelectedNodes(): INode[] {
    return this.selectedItems.filter((item) => item instanceof INode) as INode[]
  }

  /**
   * Returns an array of the currently selected labels.
   */
  private getSelectedLabels(): ILabel[] {
    const labels: ILabel[] = []
    for (const item of this.selectedItems) {
      if (item instanceof ILabel) {
        labels.push(item)
      } else if (item instanceof ILabelOwner) {
        labels.push(...item.labels)
      }
    }
    return labels
  }

  /**
   * Closes all picker containers except for the given elements.
   * @param exceptToggleButton The container toggle that should not be closed.
   * @param exceptContainer The container that should not be closed.
   */
  private hideAllPickerContainer(
    exceptToggleButton?: HTMLInputElement,
    exceptContainer?: HTMLElement
  ): void {
    const toggleButtons = document.querySelectorAll<HTMLInputElement>(
      '#contextualToolbar input[data-container-id]'
    )
    for (let i = 0; i < toggleButtons.length; i++) {
      const btn = toggleButtons[i]
      if (btn !== exceptToggleButton) {
        btn.checked = false
      }
    }

    const pickerContainers = document.querySelectorAll<HTMLElement>(
      '#contextualToolbar .picker-container'
    )
    for (let i = 0; i < pickerContainers.length; i++) {
      const container = pickerContainers[i]
      if (container.style.opacity !== '0' && container !== exceptContainer) {
        container.style.opacity = '0'
        setTimeout(() => {
          container.style.display = 'none'
        }, 300)
      }
    }
  }

  /**
   * Creates a new node next to the current node and connects both nodes with an edge.
   */
  private createConnectedNode(): void {
    if (!this.graphComponent) {
      return
    }

    const nodes = this.getSelectedNodes()
    const newSelection: INode[] = []
    for (const node of nodes) {
      const graph = this.graphComponent.graph
      const clone = node.style.clone()
      const location = this.getConnectedNodeLocation(node)
      const newNode = graph.createNode(
        [location.x, location.y, node.layout.width, node.layout.height],
        clone
      )
      graph.createEdge(node, newNode)
      newSelection.push(newNode)
    }
    this.graphComponent.selection.clear()
    newSelection.forEach((item) => this.graphComponent!.selection.nodes.add(item))
  }

  /**
   * Finds a location for the new node that doesn't overlap with other nodes.
   */
  private getConnectedNodeLocation(originalNode: INode): Point {
    const originalLayout = originalNode.layout
    const nodes = this.graphComponent!.graph.nodes
    const stepSize = 70
    for (let i = 1; i < 10; i++) {
      for (let j: number = i * stepSize; j >= -i * stepSize; j -= stepSize) {
        for (let k: number = -i * stepSize; k <= i * stepSize; k += stepSize) {
          const newLayout = new Rect(
            originalLayout.x + k,
            originalLayout.y + j,
            originalLayout.width,
            originalLayout.height
          )
          const noOverlaps = nodes.every((node) => {
            const layout = node.layout
            return (
              layout.x + layout.width < newLayout.x ||
              layout.x > newLayout.x + newLayout.width ||
              layout.y + layout.width < newLayout.y ||
              layout.y > newLayout.y + newLayout.height
            )
          })
          if (noOverlaps) {
            return newLayout.topLeft
          }
        }
      }
    }
    return new Point(originalLayout.x + stepSize, originalLayout.y)
  }

  /**
   * Applies the given color and arrow type to the selected edges.
   */
  private applyEdgeStyle(
    color?: FillConvertible,
    sourceArrowType?: ArrowTypeStringValues,
    targetArrowType?: ArrowTypeStringValues
  ): void {
    for (const edge of this.getSelectedEdges()) {
      const oldStyle = edge.style as PolylineEdgeStyle | ArcEdgeStyle
      const oldStroke = oldStyle.stroke!
      const oldSourceArrow = oldStyle.sourceArrow as Arrow
      const oldTargetArrow = oldStyle.targetArrow as Arrow

      const newStyle = oldStyle.clone()
      newStyle.stroke = new Stroke({
        fill: color || oldStroke.fill || 'black',
        thickness: oldStroke.thickness
      })
      newStyle.sourceArrow = new Arrow({
        type: sourceArrowType || oldSourceArrow.type,
        fill: color || oldStroke.fill,
        lengthScale: 1.5,
        widthScale: 1.5
      })
      newStyle.targetArrow = new Arrow({
        type: targetArrowType || oldTargetArrow.type,
        fill: color || oldStroke.fill,
        lengthScale: 1.5,
        widthScale: 1.5
      })

      this.graphComponent?.graph.setStyle(edge, newStyle)
    }
  }

  /**
   * Increases or decreases the font size by 2px.
   */
  private changeFontSize(doIncrease: boolean): void {
    const labels = this.getSelectedLabels()
    for (const label of labels) {
      const clone = label.style.clone() as LabelStyle
      let fontSize = clone.font.fontSize
      fontSize = Math.max(2, doIncrease ? fontSize + 2 : fontSize - 2)
      clone.font = clone.font.createCopy({ fontSize })
      this.graphComponent?.graph.setStyle(label, clone)
    }
  }

  /**
   * Applies the given color and shape to the selected nodes.
   */
  private applyNodeStyle(color: string | null, shape?: ShapeNodeShapeStringValues | null): void {
    const nodes = this.getSelectedNodes()
    for (const node of nodes) {
      const style = node.style as ShapeNodeStyle
      const clone = new ShapeNodeStyle({
        fill: color || style.fill,
        stroke: color || style.stroke,
        shape: shape || style.shape
      })
      this.graphComponent?.graph.setStyle(node, clone)
    }
  }

  /**
   * Applies the font settings given by the parameter object to all selected labels.
   */
  private applyFontStyle(parameterObject: object, color?: any): void {
    const labels = this.getSelectedLabels()
    for (const label of labels) {
      const clone = label.style.clone() as LabelStyle
      if (color) {
        clone.textFill = color
      }
      clone.font = clone.font.createCopy(parameterObject)
      this.graphComponent?.graph.setStyle(label, clone)
    }
  }

  /**
   * Wire up the functions of the contextual toolbar.
   */
  private registerClickListeners(): void {
    if (!this.graphComponent) {
      return
    }

    const content = this.querySelector<HTMLDivElement>('#contextualToolbar')!
    content
      .querySelector('#clipboard')
      ?.addEventListener('click', (e) => this.showPickerContainer(e))
    content
      .querySelector('#color-picker')
      ?.addEventListener('click', (e) => this.showPickerContainer(e))
    content
      .querySelector('#shape-picker')
      ?.addEventListener('click', (e) => this.showPickerContainer(e))
    content
      .querySelector('#font-color-picker')
      ?.addEventListener('click', (e) => this.showPickerContainer(e))
    content
      .querySelector('#edge-color-picker')
      ?.addEventListener('click', (e) => this.showPickerContainer(e))
    const sourceArrowPicker = content.querySelector<HTMLInputElement>('#source-arrow-picker')
    const targetArrowPicker = content.querySelector<HTMLInputElement>('#target-arrow-picker')
    sourceArrowPicker?.addEventListener('click', (e) => {
      targetArrowPicker!.checked = false
      const pickerContainer = content.querySelector(
        '#' + sourceArrowPicker.getAttribute('data-container-id')!
      )!
      pickerContainer.classList.remove('target')
      this.showPickerContainer(e)
    })
    targetArrowPicker?.addEventListener('click', (e) => {
      sourceArrowPicker!.checked = false
      const pickerContainer = content.querySelector(
        '#' + targetArrowPicker.getAttribute('data-container-id')!
      )!
      pickerContainer.classList.add('target')
      this.showPickerContainer(e)
    })

    for (const button of content.querySelectorAll<HTMLInputElement>(
      '#color-picker-colors > button'
    )) {
      button.addEventListener('click', () => {
        const color = button.getAttribute('data-color')
        this.applyNodeStyle(color)
      })
    }

    for (const button of content.querySelectorAll<HTMLInputElement>(
      '#font-color-picker-colors > button'
    )) {
      button.addEventListener('click', () => {
        const color = button.getAttribute('data-color')
        this.applyFontStyle({}, color)
      })
    }

    for (const button of content.querySelectorAll<HTMLInputElement>(
      '#shape-picker-shapes > button'
    )) {
      button.addEventListener('click', () => {
        const shape = button.getAttribute('data-shape') as ShapeNodeShapeStringValues | null
        this.applyNodeStyle(null, shape)
      })
    }

    content
      .querySelector('#quick-element-creation')
      ?.addEventListener('click', () => this.createConnectedNode())

    for (const button of content.querySelectorAll<HTMLInputElement>(
      '#arrow-picker-types > button'
    )) {
      button.addEventListener('click', () => {
        const arrowType = button.getAttribute('data-type') as ArrowTypeStringValues | undefined
        const isTarget = button.parentElement!.classList.contains('target')
        if (isTarget) {
          this.applyEdgeStyle(undefined, undefined, arrowType)
        } else {
          this.applyEdgeStyle(undefined, arrowType, undefined)
        }
      })
    }

    for (const button of content.querySelectorAll<HTMLInputElement>('#edge-colors > button')) {
      button.addEventListener('click', () => {
        const color = button.getAttribute('data-color') as string | undefined
        this.applyEdgeStyle(color)
      })
    }

    content.querySelector('#font-bold')?.addEventListener('click', (e) => {
      this.hideAllPickerContainer()
      const target = e.target as HTMLInputElement
      this.applyFontStyle({
        fontWeight: target.checked ? target.getAttribute('data-fontWeight')! : 'normal'
      })
    })
    content.querySelector('#font-italic')?.addEventListener('click', (e) => {
      this.hideAllPickerContainer()
      const target = e.target as HTMLInputElement
      this.applyFontStyle({
        fontStyle: target.checked ? target.getAttribute('data-fontStyle')! : 'normal'
      })
    })
    content.querySelector('#font-underline')?.addEventListener('click', (e) => {
      this.hideAllPickerContainer()
      const target = e.target as HTMLInputElement
      this.applyFontStyle({
        textDecoration: target.checked ? target.getAttribute('data-textDecoration')! : 'none'
      })
    })
    content.querySelector('#decrease-font-size')?.addEventListener('click', () => {
      this.hideAllPickerContainer()
      this.changeFontSize(false)
    })
    content.querySelector('#increase-font-size')?.addEventListener('click', () => {
      this.hideAllPickerContainer()
      this.changeFontSize(true)
    })

    const inputMode = this.graphComponent.inputMode as GraphEditorInputMode
    content.querySelector('#cut-button')?.addEventListener('click', () => inputMode.cut())
    content
      .querySelector('#duplicate-button')
      ?.addEventListener('click', () => inputMode.duplicateSelection())
    content
      .querySelector('#delete-button')
      ?.addEventListener('click', () => inputMode.deleteSelection())

    // we don't use the bindYFilesCommand helper for some buttons, because we want to close the picker container after the
    // command was executed
    const pasteButton = content.querySelector<HTMLButtonElement>('#paste-button')!
    const clipboard = this.graphComponent.clipboard
    pasteButton.addEventListener('click', () => {
      if (!clipboard.isEmpty) {
        inputMode.paste()
        this.hideAllPickerContainer()
      }
    })

    clipboard.addEventListener('items-cut', () => {
      if (this.graphComponent?.clipboard.isEmpty) {
        pasteButton.setAttribute('disabled', 'disabled')
      } else {
        pasteButton.removeAttribute('disabled')
      }
    })

    clipboard.addEventListener('items-copied', () => {
      if (this.graphComponent?.clipboard.isEmpty) {
        pasteButton.setAttribute('disabled', 'disabled')
      } else {
        pasteButton.removeAttribute('disabled')
      }
    })

    const copyButton = content.querySelector<HTMLDivElement>('#copy-button')!
    copyButton.addEventListener('click', () => {
      inputMode.copy()
      this.hideAllPickerContainer()
    })
  }

  /**
   * Helper function to show/hide a picker container.
   * @param e The event of the toggle button.
   */
  private showPickerContainer(e: Event): void {
    if (!this.graphComponent) {
      return
    }

    const content = this.querySelector<HTMLDivElement>('#contextualToolbar')!

    const toggleButton = e.target as HTMLInputElement
    const dataContainerId = toggleButton.getAttribute('data-container-id')!
    const pickerContainer = content.querySelector<HTMLElement>(`#${dataContainerId}`)!
    const show = toggleButton.checked

    if (!show) {
      this.hideAllPickerContainer()
      return
    }

    // hide all picker containers except for the one that should be toggled
    this.hideAllPickerContainer(toggleButton, pickerContainer)

    // position the container above/below the toggle button
    pickerContainer.style.display = 'block'
    const labelElement = content.querySelector<HTMLLabelElement>(`label[for="${toggleButton.id}"]`)!
    const labelBoundingRect = labelElement.getBoundingClientRect()
    const toolbarClientRect = content.getBoundingClientRect()
    const pickerClientRect = pickerContainer.getBoundingClientRect()
    pickerContainer.style.left = `${
      labelBoundingRect.left +
      labelBoundingRect.width / 2 -
      pickerContainer.clientWidth / 2 -
      toolbarClientRect.left
    }px`
    const gcAnchor = this.graphComponent.viewToPageCoordinates(new Point(0, 0))
    if (toolbarClientRect.top - gcAnchor.y < pickerClientRect.height + 20) {
      pickerContainer.style.top = '55px'
      pickerContainer.classList.add('bottom')
    } else {
      pickerContainer.style.top = `-${pickerClientRect.height + 12}px`
      pickerContainer.classList.remove('bottom')
    }

    // timeout the fading animation to make sure that the element is visible
    setTimeout(() => {
      pickerContainer.style.opacity = '1'
    }, 0)
  }

  private registerUpdateListeners(graphComponent: GraphComponent): void {
    graphComponent.graph.undoEngine!.addEventListener('unit-undone', () =>
      this.updateLabelControlState()
    )
    graphComponent.graph.undoEngine!.addEventListener('unit-redone', () =>
      this.updateLabelControlState()
    )
  }
}

customElements.define('contextual-toolbar-component', ContextualToolbarComponent)

declare global {
  interface HTMLElementTagNameMap {
    'contextual-toolbar-component': ContextualToolbarComponent
  }
}
