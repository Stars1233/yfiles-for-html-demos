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
import styles from './floating-toolbar.css?inline'

/**
 * Configuration object for a toolbar button.
 *
 * @property id - Unique identifier for the button
 * @property icon - Icon content or class name to display
 * @property label - Optional display label for the button
 * @property onClick - Callback function executed on button click
 * @property title - Optional tooltip text
 * @property className - Optional additional CSS classes
 */
export interface ToolbarButton {
  id: string
  icon: string
  label?: string
  onClick: () => void
  title?: string
  className?: string
}

/**
 * Toolbar orientation option.
 * @type {'horizontal' | 'vertical'}
 */
type ToolbarOrientation = 'horizontal' | 'vertical'

/**
 * Toolbar position option.
 * @type {'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'}
 */
type ToolbarPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Configuration object for toolbar layout.
 *
 * @property orientation - Layout direction (default: 'vertical')
 * @property position - Fixed position on screen (default: 'top-right')
 */
export interface ToolbarConfig {
  orientation?: ToolbarOrientation
  position?: ToolbarPosition
}

const template = document.createElement('template')
template.innerHTML = `
  <style>${styles}</style>
  <div class="toolbar"></div>
`

/**
 * A customizable floating toolbar that displays action buttons in various layouts.
 * Supports horizontal/vertical orientation and corner positioning with dynamic button management.
 */
export class FloatingToolbar extends HTMLElement {
  private buttons: ToolbarButton[] = []
  private config: ToolbarConfig = { orientation: 'vertical', position: 'top-right' }
  private toolbar!: HTMLDivElement
  private listenersAttached = false

  /**
   * Handles button clicks using event delegation.
   *
   * @param event - Click event dispatched from the toolbar
   */
  private handleToolbarClick = (event: MouseEvent): void => {
    const target = event.target

    if (!(target instanceof Element)) {
      return
    }

    const button = target.closest<HTMLButtonElement>('.toolbar__button')

    if (!button || !this.toolbar.contains(button)) {
      return
    }

    const id = button.getAttribute('data-id')
    const buttonData = this.buttons.find((item) => item.id === id)

    buttonData?.onClick()
  }

  /**
   * Initializes a new instance of the FloatingToolbar.
   */
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot!.appendChild(template.content.cloneNode(true))
    this.toolbar = this.shadowRoot!.querySelector<HTMLDivElement>('.toolbar')!
  }

  /**
   * Called when the element is connected to the DOM.
   * Parses attributes, initializes toolbar classes, and attaches event listeners.
   */
  connectedCallback(): void {
    this.parseAttributes()
    this.updateClasses()

    if (this.listenersAttached) {
      return
    }

    this.toolbar.addEventListener('click', this.handleToolbarClick)
    this.listenersAttached = true
  }

  /**
   * Called when the element is disconnected from the DOM.
   * Removes toolbar event listeners.
   */
  disconnectedCallback(): void {
    if (!this.listenersAttached) {
      return
    }

    this.toolbar.removeEventListener('click', this.handleToolbarClick)
    this.listenersAttached = false
  }

  /**
   * Called when an attribute of the element is changed.
   * Handles orientation and position attribute updates.
   *
   * @param name - The name of the attribute
   * @param oldValue - The old value of the attribute
   * @param newValue - The new value of the attribute
   */
  attributeChangedCallback(
    name: string,
    oldValue?: ToolbarOrientation | ToolbarPosition,
    newValue?: ToolbarOrientation | ToolbarPosition
  ): void {
    if (oldValue === newValue) {
      return
    }

    switch (name) {
      case 'orientation':
        this.config.orientation = newValue ? (newValue as ToolbarOrientation) : 'vertical'
        this.updateClasses()
        break
      case 'position':
        this.config.position = newValue ? (newValue as ToolbarPosition) : 'top-right'
        this.updateClasses()
        break
    }
  }

  /**
   * Parses orientation and position attributes from the DOM element.
   */
  private parseAttributes(): void {
    const orientation = this.getAttribute('orientation')
    if (orientation) {
      this.config.orientation = orientation as ToolbarOrientation
    }

    const position = this.getAttribute('position')
    if (position) {
      this.config.position = position as ToolbarPosition
    }
  }

  /**
   * Sets the toolbar configuration and updates layout.
   *
   * @param config - Partial configuration object to merge with current config
   */
  setConfig(config: Partial<ToolbarConfig>): void {
    this.config = { ...this.config, ...config }
    this.updateClasses()
  }

  /**
   * Gets the current toolbar configuration.
   *
   * @returns Current ToolbarConfig object
   */
  getConfig(): ToolbarConfig {
    return { ...this.config }
  }

  /**
   * Replaces all buttons with the provided array and re-renders the toolbar.
   *
   * @param buttons - Array of ToolbarButton objects to display
   */
  addButtons(buttons: ToolbarButton[]): void {
    this.buttons = buttons
    this.render()
  }

  /**
   * Adds a single button to the toolbar and re-renders.
   *
   * @param button - ToolbarButton object to add
   */
  addButton(button: ToolbarButton): void {
    this.buttons.push(button)
    this.render()
  }

  /**
   * Removes a button by id and re-renders the toolbar.
   *
   * @param id - Button id to remove
   */
  removeButton(id: string): void {
    this.buttons = this.buttons.filter((btn) => btn.id !== id)
    this.render()
  }

  /**
   * Removes all buttons from the toolbar.
   */
  clearButtons(): void {
    this.buttons = []
    this.render()
  }

  /**
   * Renders toolbar buttons as HTML.
   * Button clicks are handled by the toolbar's delegated click listener.
   */
  private render(): void {
    this.toolbar.innerHTML = this.buttons
      .map((btn) => {
        const classes = ['toolbar__button', btn.className].filter(Boolean).join(' ')
        const ariaLabel = btn.label || btn.title || btn.id

        return `
          <button
            class="${classes}"
            data-id="${btn.id}"
            title="${btn.title || btn.label || ''}"
            aria-label="${ariaLabel}"
          >
            <span class="toolbar__icon">${btn.icon}</span>
          </button>
        `
      })
      .join('')
  }

  /**
   * Updates toolbar classes based on current configuration.
   */
  private updateClasses(): void {
    const classes = [
      'toolbar',
      `toolbar--${this.config.orientation}`,
      `toolbar--${this.config.position}`
    ]

    this.toolbar.className = classes.join(' ')
  }
}

customElements.define('floating-toolbar', FloatingToolbar)
