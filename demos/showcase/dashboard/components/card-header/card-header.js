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
import styles from './card-header.css?inline'
import '../card-menu/card-menu'

const template = document.createElement('template')
template.innerHTML = `
  <style>${styles}</style>
  <slot name="title"></slot>
  <div class="header__actions">
    <card-menu></card-menu>
    <slot name="actions"></slot>
    <button class="help icon" title="Help" aria-pressed="false" style="display: none;">help</button>
    <button class="collapse icon" title="Expand panel" aria-pressed="false">collapse_content</button>
  </div>
`

const helpPopoverTemplate = document.createElement('template')
helpPopoverTemplate.innerHTML = `
  <style>${styles}</style>
  <dashboard-card class="help-popover">
    <card-header slot="header" no-collapse>
      <h3 slot="title">Things to Try</h3>
      <button class="close" slot="actions" aria-label="Close help">close</button>
    </card-header>
    <div slot="content" class="help-popover__content"></div>
  </dashboard-card>
`

/**
 * A customizable header element for card panels with title slot, menu actions,
 * and expand/collapse functionality. Supports blocking interactions during async operations.
 */
export class CardHeader extends HTMLElement {
  collapseButton
  helpButton
  menu
  isExpanded = false
  clicksBlocked = false
  blockTimeout = null
  helpPopover = null
  helpPopoverCloseButton = null
  listenersAttached = false

  static observedAttributes = ['no-collapse', 'expanded', 'showHelp']

  /**
   * Handles clicks on the host element and prevents non-collapse-button clicks
   * from propagating to parent elements.
   *
   * @param event - Click event dispatched from the component
   */
  handleHostClick = (event) => {
    const path = event.composedPath()

    if (!path.includes(this.collapseButton)) {
      event.stopPropagation()
    }
  }

  /**
   * Handles clicks on the collapse button.
   *
   * @param event - Click event dispatched by the collapse button
   */
  handleCollapseClick = (event) => {
    if (this.clicksBlocked) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    event.stopPropagation()

    this.isExpanded = !this.isExpanded
    this.updateButtonUI()

    if (this.isExpanded) {
      this.setAttribute('expanded', '')
    } else {
      this.removeAttribute('expanded')
    }

    this.dispatchEvent(
      new CustomEvent('expand-toggle', {
        detail: { expanded: this.isExpanded },
        bubbles: true,
        composed: true
      })
    )
  }

  /**
   * Handles clicks on the help button.
   *
   * @param event - Click event dispatched by the help button
   */
  handleHelpClick = (event) => {
    event.stopPropagation()
    this.openHelpPopover()

    this.dispatchEvent(new CustomEvent('help-requested', { bubbles: true, composed: true }))
  }

  /**
   * Closes the help popover when a click occurs outside it.
   *
   * @param event - Document click event
   */
  handleDocumentClick = (event) => {
    const target = event.target

    if (this.helpPopover && target instanceof Node && !this.helpPopover.contains(target)) {
      this.closeHelpPopover()
    }
  }

  /**
   * Closes the help popover when its close button is clicked.
   */
  handlePopoverCloseClick = () => {
    this.closeHelpPopover()
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.appendChild(template.content.cloneNode(true))
    this.collapseButton = this.shadowRoot.querySelector('button.collapse')
    this.helpButton = this.shadowRoot.querySelector('button.help')
    this.menu = this.shadowRoot.querySelector('card-menu')
  }

  /**
   * Initializes event listeners and updates UI state when element is inserted into DOM.
   */
  connectedCallback() {
    if (!this.listenersAttached) {
      this.setupCollapseListener()
      this.setupHelpListener()
      this.listenersAttached = true
    }

    this.updateVisibility()
    this.updateButtonUI()
  }

  /**
   * Responds to attribute changes (no-collapse, expanded, showHelp).
   * Updates visibility and button state accordingly.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return

    switch (name) {
      case 'no-collapse':
        this.updateVisibility()
        break
      case 'expanded':
        this.isExpanded = this.hasAttribute('expanded')
        this.updateButtonUI()
        break
      case 'showHelp':
        this.updateVisibility()
        break
    }
  }

  /**
   * Sets the menu buttons for the card-menu component.
   */
  set buttons(value) {
    this.menu.buttons = value
  }

  /**
   * Gets the current menu buttons from the card-menu component.
   */
  get buttons() {
    return this.menu.buttons
  }

  /**
   * Gets whether the help button should be shown.
   *
   * @returns True if help button is visible
   */
  get showHelp() {
    return this.hasAttribute('showHelp')
  }

  /**
   * Sets whether the help button should be shown.
   *
   * @param value - Whether to show the help button
   */
  set showHelp(value) {
    if (value) {
      this.setAttribute('showHelp', 'true')
    } else {
      this.removeAttribute('showHelp')
    }
  }

  /**
   * Gets the help content from the help-content attribute.
   *
   * @returns Help content string or null
   */
  get helpContent() {
    return this.getAttribute('help-content')
  }

  /**
   * Sets the help content to display in the popover.
   *
   * @param content - Help content string or HTML
   */
  set helpContent(content) {
    if (content) {
      this.setAttribute('help-content', content)
    } else {
      this.removeAttribute('help-content')
    }
  }

  /**
   * Sets the expanded state and updates the DOM attribute and button UI.
   * Does nothing if state hasn't changed.
   *
   * @param expanded - Whether the card should be expanded
   */
  setExpanded(expanded) {
    if (this.isExpanded === expanded) {
      return
    }
    this.isExpanded = expanded

    if (expanded) {
      this.setAttribute('expanded', '')
    } else {
      this.removeAttribute('expanded')
    }

    this.updateButtonUI()
  }

  /**
   * Gets the current expanded state.
   *
   * @returns True if expanded, false otherwise
   */
  getExpanded() {
    return this.isExpanded
  }

  /**
   * Temporarily blocks collapse button clicks and reduces opacity.
   * Useful during async operations to prevent multiple interactions.
   * Minimum duration is 100ms.
   *
   * @param duration - Block duration in milliseconds (default: 1000)
   */
  blockClicksTemporarily(duration = 1000) {
    if (duration < 100) {
      duration = 100
    }

    if (this.blockTimeout !== null) {
      clearTimeout(this.blockTimeout)
    }

    this.setCollapseButtonEnabled(false)

    this.blockTimeout = window.setTimeout(() => {
      this.blockTimeout = null
      this.setCollapseButtonEnabled(true)
    }, duration)
  }

  /**
   * Enables or disables the collapse button.
   *
   * @param enabled - Whether the button should accept input
   */
  setCollapseButtonEnabled(enabled) {
    if (this.blockTimeout !== null) {
      clearTimeout(this.blockTimeout)
      this.blockTimeout = null
    }

    this.clicksBlocked = !enabled
    this.collapseButton.disabled = !enabled
    this.collapseButton.style.opacity = enabled ? '1' : '0.5'
  }

  /**
   * Cleans up timeout and event listeners when element is removed from DOM.
   */
  disconnectedCallback() {
    if (this.blockTimeout !== null) {
      clearTimeout(this.blockTimeout)
      this.blockTimeout = null
    }

    this.closeHelpPopover()

    if (!this.listenersAttached) {
      return
    }

    this.removeEventListener('click', this.handleHostClick)
    this.collapseButton.removeEventListener('click', this.handleCollapseClick)
    this.helpButton.removeEventListener('click', this.handleHelpClick)
    document.removeEventListener('click', this.handleDocumentClick)

    this.listenersAttached = false
  }

  /**
   * Sets up event listeners for collapse button interactions.
   * Dispatches custom 'expand-toggle' event on state change.
   * Prevents propagation from non-button clicks.
   */
  setupCollapseListener() {
    // Guard at host level - only allow clicks from the button
    this.addEventListener('click', this.handleHostClick)
    this.collapseButton.addEventListener('click', this.handleCollapseClick)
  }

  /**
   * Sets up event listener for help button.
   * Opens help popover when clicked and dispatches help-requested event.
   */
  setupHelpListener() {
    this.helpButton.addEventListener('click', this.handleHelpClick)

    // Close popover when clicking outside
    document.addEventListener('click', this.handleDocumentClick)
  }

  /**
   * Opens the help popover using a dashboard-card component.
   * Content is loaded from the help-content attribute.
   */
  openHelpPopover() {
    if (!this.helpContent) {
      return
    }

    this.closeHelpPopover()

    const fragment = helpPopoverTemplate.content.cloneNode(true)
    this.helpPopover = fragment.querySelector('dashboard-card')

    const contentArea = this.helpPopover.querySelector('.help-popover__content')
    if (contentArea) {
      contentArea.innerHTML = this.helpContent
    }

    // Close button handler
    this.helpPopoverCloseButton = this.helpPopover.querySelector('.close')

    this.helpPopoverCloseButton?.addEventListener('click', this.handlePopoverCloseClick)

    // Append to body, not dashboard container
    document.body.appendChild(fragment)
  }

  /**
   * Closes the help popover if it's open.
   */
  closeHelpPopover() {
    if (this.helpPopoverCloseButton) {
      this.helpPopoverCloseButton.removeEventListener('click', this.handlePopoverCloseClick)
      this.helpPopoverCloseButton = null
    }

    if (this.helpPopover) {
      this.helpPopover.remove()
      this.helpPopover = null
    }
  }

  /**
   * Updates button text, title, and aria-pressed attribute based on expanded state.
   */
  updateButtonUI() {
    const text = this.isExpanded ? 'collapse_content' : 'expand_content'
    const title = this.isExpanded ? 'Minimize' : 'Maximize'

    this.collapseButton.textContent = text
    this.collapseButton.title = title
    this.collapseButton.setAttribute('aria-pressed', String(this.isExpanded))
  }

  /**
   * Shows or hides the collapse button and help button based on attributes.
   */
  updateVisibility() {
    this.collapseButton.style.display = this.hasAttribute('no-collapse') ? 'none' : ''
    this.helpButton.style.display = this.hasAttribute('showHelp') ? 'block' : 'none'
  }
}

customElements.define('card-header', CardHeader)
