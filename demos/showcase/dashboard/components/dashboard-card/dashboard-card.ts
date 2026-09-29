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
import styles from './dashboard-card.css?inline'

const template = document.createElement('template')
template.innerHTML = `
  <style>${styles}</style>
  <div class="card__header">
    <slot name="header"></slot>
  </div>
  <div class="card__content">
    <slot name="content"></slot>
  </div>
  <div class="card__actions">
    <slot name="actions"></slot>
  </div>
`

/**
 * A custom card element for dashboard layouts with header, content, and actions slots.
 * Supports expanded state, no-padding mode, and dynamic button selection management.
 */
export class DashboardCard extends HTMLElement {
  private content!: HTMLDivElement
  private actionsSlot!: HTMLSlotElement
  private actions!: HTMLDivElement
  private isExpanded = false
  private listenersAttached = false

  private readonly buttonListeners = new Map<
    HTMLButtonElement,
    {
      mouseenter: () => void
      mouseleave: () => void
      mousedown: () => void
      mouseup: () => void
      click: () => void
    }
  >()

  /**
   * Handles changes to the actions slot.
   * Updates action visibility and refreshes button listeners.
   */
  private handleActionsSlotChange = (): void => {
    this.updateActionButtons()
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot!.appendChild(template.content.cloneNode(true))
    this.content = this.shadowRoot!.querySelector<HTMLDivElement>('.card__content')!
    this.actionsSlot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="actions"]')!
    this.actions = this.shadowRoot!.querySelector<HTMLDivElement>('.card__actions')!
  }

  /**
   * Initializes event listeners and updates the UI when the element is connected.
   */
  connectedCallback(): void {
    if (this.listenersAttached) {
      return
    }

    this.updateClasses()
    this.actionsSlot.addEventListener('slotchange', this.handleActionsSlotChange)

    this.listenersAttached = true
    this.updateActionButtons()
  }

  /**
   * Called when an attribute of the element is changed.
   * Handles no-padding and expanded attribute updates.
   *
   * @param name - The name of the attribute
   * @param oldValue - The old value of the attribute
   * @param newValue - The new value of the attribute
   */
  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (oldValue === newValue) return

    switch (name) {
      case 'no-padding':
        this.updateClasses()
        break
      case 'expanded':
        this.isExpanded = this.hasAttribute('expanded')
        this.dispatchEvent(
          new CustomEvent('expand-change', {
            detail: { expanded: this.isExpanded },
            bubbles: true,
            composed: true
          })
        )
        break
    }
  }

  /**
   * Removes all event listeners when the element is disconnected from the DOM.
   */
  disconnectedCallback(): void {
    if (!this.listenersAttached) {
      return
    }

    this.actionsSlot.removeEventListener('slotchange', this.handleActionsSlotChange)

    this.removeButtonListeners()
    this.listenersAttached = false
  }

  /**
   * Sets the expanded state of the card.
   * Does nothing if state hasn't changed.
   *
   * @param expanded - Whether the card should be expanded
   */
  setExpanded(expanded: boolean): void {
    if (this.isExpanded === expanded) {
      return
    }

    this.isExpanded = expanded
    if (expanded) {
      this.setAttribute('expanded', '')
    } else {
      this.removeAttribute('expanded')
    }
  }

  /**
   * Gets the current expanded state of the card.
   *
   * @returns True if expanded, false otherwise
   */
  getExpanded(): boolean {
    return this.isExpanded
  }

  /**
   * Toggles the expanded state of the card.
   */
  toggle(): void {
    this.setExpanded(!this.isExpanded)
  }

  /**
   * Updates content element classes based on no-padding attribute.
   */
  private updateClasses(): void {
    const noPadding = this.hasAttribute('no-padding')
    this.content.className = ['card__content', noPadding ? 'card--no-padding' : '']
      .filter(Boolean)
      .join(' ')
  }

  /**
   * Updates action visibility and synchronizes listeners for assigned buttons.
   */
  private updateActionButtons(): void {
    const assignedElements = this.actionsSlot.assignedElements()
    const hasChildren = assignedElements.length > 0

    this.actions.classList.toggle('card__actions--visible', hasChildren)

    this.removeButtonListeners()

    assignedElements.forEach((element) => {
      if (!(element instanceof HTMLButtonElement)) {
        return
      }

      this.addButtonListeners(element)
    })
  }

  /**
   * Adds interaction listeners to an assigned action button.
   *
   * @param button - Assigned action button
   */
  private addButtonListeners(button: HTMLButtonElement): void {
    const listeners = {
      mouseenter: (): void => {
        button.classList.add('hovered')
      },

      mouseleave: (): void => {
        button.classList.remove('hovered')
        button.classList.remove('active')
      },

      mousedown: (): void => {
        button.classList.add('active')
      },

      mouseup: (): void => {
        button.classList.remove('active')
      },

      click: (): void => {
        if (button.dataset.noPersist !== undefined) return
        if (button.dataset.useCase !== undefined) return

        this.actionsSlot.assignedElements().forEach((sibling) => {
          if (sibling instanceof HTMLButtonElement) {
            sibling.classList.remove('selected')
          }
        })

        button.classList.add('selected')

        const activeColor = button.dataset.activeColor
        if (activeColor) {
          button.style.setProperty('--btn-active-color', activeColor)
        }
      }
    }

    button.addEventListener('mouseenter', listeners.mouseenter)
    button.addEventListener('mouseleave', listeners.mouseleave)
    button.addEventListener('mousedown', listeners.mousedown)
    button.addEventListener('mouseup', listeners.mouseup)
    button.addEventListener('click', listeners.click)

    this.buttonListeners.set(button, listeners)
  }

  /**
   * Removes all listeners registered on currently assigned action buttons.
   */
  private removeButtonListeners(): void {
    this.buttonListeners.forEach((listeners, button) => {
      button.removeEventListener('mouseenter', listeners.mouseenter)
      button.removeEventListener('mouseleave', listeners.mouseleave)
      button.removeEventListener('mousedown', listeners.mousedown)
      button.removeEventListener('mouseup', listeners.mouseup)
      button.removeEventListener('click', listeners.click)
    })

    this.buttonListeners.clear()
  }
}

customElements.define('dashboard-card', DashboardCard)
