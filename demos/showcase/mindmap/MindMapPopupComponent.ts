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
  FreeNodePortLocationModel,
  type GraphComponent,
  type GraphEditorInputMode,
  type INode,
  Point,
  PortCandidate
} from '@yfiles/yfiles'
import { getEdgeStyle, getLabelStyle, getNodeStyle, setNodeColor } from './styles/styles-support'
import { stateIcons } from './styles/MindMapIconLabelStyle'
import { changeStateLabel, executeCreateChild, executeDeleteItem } from './interaction/commands'
import { getNodeData } from './data-types'
import { isInLayout } from './mind-map-layout'

// we use font-awesome icons for the contextual toolbar in this demo
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
  width: 128px;
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

.state-picker button {
  transition: border-radius 0.2s ease;
  background-size: 28px !important;
}

.color-picker .state-picker button:hover {
  border-radius: 5px;
}
</style>

<div id="contextualToolbar" class="contextual-toolbar" tabindex="0">
  <div id="toolbar-ui">
    <input
      type="checkbox"
      id="state-icon-picker"
      class="toggle-button"
      data-container-id="state-icon-picker-icons"
    />
    <label for="state-icon-picker" title="Select state icon">
      <span class="fa-layers fa-fw">
        <i class="fa-regular fa-face-smile" data-fa-transform="grow-6"></i>
        <i
          class="fa-solid fa-sm fa-caret-right"
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
    <label id="color-picker-label" for="color-picker" title="Select node color">
      <span class="fa-layers fa-fw">
        <i class="fa-solid fa-paint-brush"></i>
        <i
          class="fa-solid fa-sm fa-caret-right"
          data-fa-transform="right-14 down-12 rotate-45"
        ></i>
      </span>
    </label>
    <span class="separator"></span>
    <input type="checkbox" id="cross-edge-creation" class="toggle-button" />
    <label for="cross-edge-creation" title="Create Cross Reference">
      <span class="fa-layers fa-fw">
        <i class="fa-solid fa-up-long" data-fa-transform="grow-4"></i>
      </span>
    </label>
    <span class="separator"></span>
    <input
      type="checkbox"
      id="child-creation"
      data-container-id="child-creation"
      class="toggle-button"
    />
    <label for="child-creation" title="Add child">
      <span class="fa-layers fa-fw">
        <i class="fa-solid fa-plus" data-fa-transform="grow-6"></i>
      </span>
    </label>
    <input type="checkbox" id="node-removal" class="toggle-button" />
    <label id="node-removal-label" for="node-removal" title="Remove Node">
      <span class="fa-layers fa-fw">
        <i class="fa-solid fa-xmark" data-fa-transform="grow-6"></i>
      </span>
    </label>
  </div>

  <div id="color-picker-colors" class="picker-container color-picker"></div>
  <div id="state-icon-picker-icons" class="picker-container state-picker"></div>
</div>
`

/**
 * A contextual toolbar that is shown when a node is selected.
 */
export class MindMapPopupComponent extends HTMLElement {
  private _graphComponent: GraphComponent | null = null
  private _currentItem: INode | null = null

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
  }

  /**
   * Gets the current item for which the popup is shown.
   */
  get currentItem(): INode | null {
    return this._currentItem
  }

  /**
   * Sets the current item for which the popup should be shown.
   */
  set currentItem(value: INode | null) {
    this._currentItem = value
  }

  /**
   * Whether the current item is the root node.
   */
  private get isCurrentRootNode(): boolean {
    if (!this.currentItem) {
      return false
    }
    return getNodeData(this.currentItem).depth === 0
  }

  /**
   * Lifecycle callback that is invoked when the element is inserted into the DOM.
   */
  connectedCallback(): void {
    this.appendChild(template.content.cloneNode(true))
    this.createColorPicker()
    this.createStateIconPicker()
    this.registerClickListeners()

    if (this.isCurrentRootNode) {
      // exclude some buttons for the root node
      const content = this.querySelector<HTMLDivElement>('#contextualToolbar')!
      content.querySelector<HTMLLabelElement>('#color-picker-label')!.style.display = 'none'
      content.querySelector<HTMLLabelElement>('#node-removal-label')!.style.display = 'none'
    }
  }

  /**
   * Lifecycle callback that is invoked when the element is removed from the DOM.
   */
  disconnectedCallback(): void {
    this.innerHTML = ''
  }

  /**
   * Shows the color picker associated with the pressed button.
   * Before showing the color-picker, hides any previously opened picker and calculates the position
   * of the new one.
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
    const labelElement = content.querySelector(`label[for="${toggleButton.id}"]`)!
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

  /**
   * Resets the picker container.
   * Hides all pickers except the given one, if exists and unchecks all buttons.
   */
  private hideAllPickerContainer(
    exceptToggleButton?: HTMLInputElement,
    exceptContainer?: HTMLElement
  ): void {
    const content = this.querySelector<HTMLDivElement>('#contextualToolbar')!

    const toggleButtons = content.querySelectorAll('input[data-container-id]')
    for (let i = 0; i < toggleButtons.length; i++) {
      const btn = toggleButtons[i] as HTMLInputElement
      if (btn !== exceptToggleButton) {
        btn.checked = false
      }
    }

    const pickerContainers = content.querySelectorAll('.picker-container')
    for (let i = 0; i < pickerContainers.length; i++) {
      const container = pickerContainers[i] as HTMLElement
      if (container.style.opacity !== '0' && container !== exceptContainer) {
        container.style.opacity = '0'
        setTimeout(() => {
          container.style.display = 'none'
        }, 300)
      }
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
      .querySelector('#color-picker')
      ?.addEventListener('click', (e) => this.showPickerContainer(e))

    content
      .querySelector('#state-icon-picker')
      ?.addEventListener('click', (e) => this.showPickerContainer(e))

    content.querySelector('#cross-edge-creation')?.addEventListener(
      'click',
      async (evt) => {
        const currentItem = this.currentItem
        if (!isInLayout() && currentItem) {
          this.closePopup()
          await this.startCrossReferenceEdgeCreation(currentItem)
          ;(evt.target as HTMLInputElement).checked = false
        }
      },
      false
    )

    content.querySelector('#child-creation')?.addEventListener(
      'click',
      async (evt) => {
        const currentItem = this.currentItem
        if (currentItem && this.graphComponent) {
          this.closePopup()
          const depth = getNodeData(currentItem).depth
          await executeCreateChild(
            getNodeStyle(depth + 1),
            getEdgeStyle(depth),
            getLabelStyle(depth + 1),
            this.graphComponent
          )
          ;(evt.target as HTMLInputElement).checked = false
        }
      },
      false
    )

    content.querySelector('#node-removal')?.addEventListener(
      'click',
      async (evt) => {
        if (this.graphComponent) {
          this.closePopup()
          await executeDeleteItem(this.graphComponent)
          ;(evt.target as HTMLInputElement).checked = false
        }
      },
      false
    )
  }

  /**
   * Creates the div container for the color picker.
   * Adds the necessary buttons and registers the listeners for the change of the color.
   */
  private createColorPicker(): void {
    const colorPickerColors = [
      '#ff6c00',
      '#242265',
      '#aa5f82',
      '#56926e',
      '#6dbc8d',
      '#6c4f77',
      '#4281a4',
      '#e0e04f',
      '#c1c1c1',
      '#db3a34',
      '#f0c808',
      '#2d4d3a'
    ]

    const content = this.querySelector<HTMLDivElement>('#contextualToolbar')!
    const colorContainer = content.querySelector<HTMLDivElement>('#color-picker-colors')!
    colorPickerColors.forEach((color) => {
      const colorButton = document.createElement('button')
      colorButton.setAttribute('data-color', color)
      colorButton.setAttribute('style', `background-color:${color}`)
      colorButton.setAttribute('title', color)
      colorContainer.appendChild(colorButton)
      colorButton.addEventListener(
        'click',
        () => {
          const currentItem = this.currentItem
          if (currentItem && this.graphComponent) {
            setNodeColor(currentItem, color, this.graphComponent)
            this.closePopup()
          }
        },
        false
      )
    })
  }

  /**
   * Creates the div container for the state-icon picker.
   * Adds the necessary buttons and registers the listeners for the change of the icon.
   */
  private createStateIconPicker(): void {
    const content = this.querySelector<HTMLDivElement>('#contextualToolbar')!
    const iconContainer = content.querySelector<HTMLDivElement>('#state-icon-picker-icons')!
    stateIcons.forEach((stateIcon, i) => {
      const stateButton = document.createElement('button')
      stateButton.setAttribute(
        'style',
        `background:url(./resources/icons/${stateIcon}.svg) no-repeat`
      )
      stateButton.classList.add('toggle-button')
      iconContainer.appendChild(stateButton)
      stateButton.addEventListener('click', async () => {
        if (this.graphComponent) {
          this.closePopup()
          await changeStateLabel(i, this.graphComponent)
        }
      })
    })
  }

  /**
   * Starts interactive creation of a new cross-reference edge.
   */
  private async startCrossReferenceEdgeCreation(sourceNode: INode): Promise<void> {
    if (!this.graphComponent) {
      return
    }
    const inputMode = this.graphComponent.inputMode as GraphEditorInputMode
    const portCandidate = new PortCandidate(sourceNode, FreeNodePortLocationModel.CENTER)
    const createEdgeInputMode = inputMode.createEdgeInputMode
    // enable CreateEdgeInputMode for the moment
    createEdgeInputMode.enabled = true
    await createEdgeInputMode.startEdgeCreation(portCandidate)
  }

  /**
   * Closes the popup.
   */
  private closePopup(): void {
    if (this.graphComponent) {
      const inputMode = this.graphComponent.inputMode as GraphEditorInputMode
      inputMode.popoverManager.closeAll()
    }
  }
}

customElements.define('mindmap-popup-component', MindMapPopupComponent)

declare global {
  interface HTMLElementTagNameMap {
    'mindmap-popup-component': MindMapPopupComponent
  }
}
