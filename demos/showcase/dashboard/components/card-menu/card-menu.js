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
import styles from './card-menu.css?inline'

const template = document.createElement('template')
template.innerHTML = `
  <style>${styles}</style>
  <button class="menu__button" aria-haspopup="true" aria-expanded="false">&#x22EF;</button>
  <div class="menu__popup" role="menu"></div>
`

/**
 * A dropdown menu component that displays configurable action buttons.
 * Opens/closes on menu button click and closes on document click or focus loss.
 * Hides automatically when no buttons are configured.
 */
export class CardMenu extends HTMLElement {
  menuButton
  popup
  _buttons = []
  listenersAttached = false

  /**
   * Handles clicks outside the component by closing the menu.
   */
  handleDocumentClick = () => {
    this.close()
  }

  /**
   * Prevents clicks inside the component from reaching the document click
   * handler.
   *
   * @param event - Click event dispatched from inside the component
   */
  handleHostClick = (event) => {
    event.stopPropagation()
  }

  /**
   * Opens or closes the menu when the menu button is clicked.
   */
  handleMenuButtonClick = () => {
    if (this.popup.classList.contains('show')) {
      this.close()
    } else {
      this.open()
    }
  }

  /**
   * Closes the menu when focus moves outside the shadow root.
   *
   * @param event - Focus transition event
   */
  handleFocusOut = (event) => {
    const relatedTarget = event.relatedTarget

    if (!(relatedTarget instanceof Node) || !this.shadowRoot?.contains(relatedTarget)) {
      this.close()
    }
  }

  /**
   * Handles menu button clicks using event delegation.
   *
   * @param event - Click event dispatched from the popup
   */
  handlePopupClick = (event) => {
    const target = event.target

    if (!(target instanceof HTMLElement)) {
      return
    }

    const button = target.closest('[role="menuitem"]')

    if (!button || !this.popup.contains(button)) {
      return
    }

    const index = Number(button.dataset.menuIndex)
    this._buttons[index]?.action?.()
    this.close()
  }

  /**
   * Gets the current menu buttons configuration.
   *
   * @returns Array of MenuButton objects
   */
  get buttons() {
    return this._buttons
  }

  /**
   * Sets the menu buttons and re-renders the menu.
   * Automatically hides the menu if no buttons are provided.
   *
   * @param value - Array of MenuButton objects to display
   */
  set buttons(value) {
    this._buttons = value
    this.renderButtons()
  }

  /**
   * Initializes a new instance of the CardMenu.
   */
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.appendChild(template.content.cloneNode(true))
    this.menuButton = this.shadowRoot.querySelector('.menu__button')
    this.popup = this.shadowRoot.querySelector('.menu__popup')
  }

  /**
   * Called when the element is connected to the DOM.
   * Sets up event listeners for menu interactions and document-level click handling.
   */
  connectedCallback() {
    if (this.listenersAttached) {
      return
    }

    this.addEventListener('click', this.handleHostClick)
    this.menuButton.addEventListener('click', this.handleMenuButtonClick)
    this.shadowRoot.addEventListener('focusout', this.handleFocusOut)

    this.popup.addEventListener('click', this.handlePopupClick)
    document.addEventListener('click', this.handleDocumentClick)

    this.listenersAttached = true
    this.renderButtons()
  }

  /**
   * Called when the element is removed from the DOM.
   * Cleans up all event listeners registered by the component.
   */
  disconnectedCallback() {
    if (!this.listenersAttached) {
      return
    }

    this.removeEventListener('click', this.handleHostClick)
    this.menuButton.removeEventListener('click', this.handleMenuButtonClick)
    this.shadowRoot.removeEventListener('focusout', this.handleFocusOut)

    this.popup.removeEventListener('click', this.handlePopupClick)
    document.removeEventListener('click', this.handleDocumentClick)

    this.listenersAttached = false
  }

  /**
   * Renders all menu buttons in the popup and controls visibility.
   * Hides the entire menu component if no buttons are configured.
   */
  renderButtons() {
    this.popup.innerHTML = ''

    this._buttons.forEach((btn, index) => {
      this.popup.appendChild(this.createButton(btn, index))
    })

    this.style.display = this._buttons.length > 0 ? '' : 'none'
  }

  /**
   * Creates a button element from MenuButton configuration.
   * The popup's delegated click listener executes the action and closes the menu.
   *
   * @param button - MenuButton configuration object
   * @param index - Index of the button in the current menu configuration
   * @returns Configured HTMLButtonElement
   */
  createButton(button, index) {
    const btn = document.createElement('button')

    btn.type = 'button'
    btn.textContent = button.label
    btn.setAttribute('role', 'menuitem')
    btn.setAttribute('aria-pressed', String(button.state ?? false))
    btn.dataset.menuIndex = String(index)

    if (button.dataAction) {
      btn.setAttribute('data-action', button.dataAction)
    }

    return btn
  }

  /**
   * Opens the menu popup and updates aria-expanded state.
   */
  open() {
    this.menuButton.setAttribute('aria-expanded', 'true')
    this.popup.classList.add('show')
  }

  /**
   * Closes the menu popup and updates aria-expanded state.
   */
  close() {
    this.menuButton.setAttribute('aria-expanded', 'false')
    this.popup.classList.remove('show')
  }
}

customElements.define('card-menu', CardMenu)
