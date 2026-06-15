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
/**
 * A simple navigation component.
 */
export class NavigationComponent extends HTMLElement {
  private _items: string[] = []
  private _selectedItem: string | null = null
  private _disabled = false
  private readonly itemsElement: HTMLElement

  constructor() {
    super()
    const shadowRoot = this.attachShadow({ mode: 'open' })
    shadowRoot.innerHTML = `
<style lang="less">
  :host {
    display: block;
  }

  #navigation-container {
    display: inline-flex;
    flex-direction: row;
    flex-wrap: var(--navigation-wrap, nowrap);
    align-items: center;
    gap: 8px;
    padding: 6px;
    border-radius: 999px;
    background-color: var(--navigation-bg, transparent);

    .navigation-label {
      font-weight: bold;
      color: var(--navigation-text, var(--toolbar-button-text));
    }

    .navigation-items {
      display: flex;
      flex-direction: row;
      flex-wrap: var(--navigation-wrap, nowrap);
      align-items: center;
      gap: 4px;

      .navigation-item {
        width: fit-content;
        height: fit-content;
        border: none;
        border-radius: var(--border-radius);
        background-color: var(--toolbar-button);
        color: var(--toolbar-button-text);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 6px 10px;

        &:hover {
          background-color: var(--toolbar-bg-hover);
          color: var(--color-text);
          cursor: pointer;
        }

        &.selected {
          background: #4caf50;
          color: white;
        }
      }
    }

    .navigation-arrow {
      display: inline-block;
      font-weight: bold;
      color: var(--navigation-text, var(--toolbar-button-text));
    }
  }
</style>
<div id="navigation-container">
  <span class="navigation-label">You are here:</span>
  <span class="navigation-items"></span>
</div>
    `
    this.itemsElement = shadowRoot.querySelector('.navigation-items')!
  }

  /**
   * Gets the navigation items.
   */
  get items(): string[] {
    return this._items
  }

  /**
   * Sets the navigation items.
   */
  set items(items: string[]) {
    this._items = items
    this.render()
  }

  /**
   * Gets the selected item.
   */
  get selectedItem(): string | null {
    return this._selectedItem
  }

  /**
   * Sets the selected item.
   */
  set selectedItem(item: string | null) {
    this._selectedItem = item
    this.render()
  }

  /**
   * Gets the disabled state of the component.
   */
  get disabled(): boolean {
    return this._disabled
  }

  /**
   * Sets the disabled state of the component.
   */
  set disabled(value: boolean) {
    this._disabled = value
    this.itemsElement.querySelectorAll('button').forEach((b) => {
      b.disabled = value
    })
  }

  private render() {
    this.itemsElement.innerHTML = ''
    const ancestors = [...this._items]

    if (ancestors.length === 0) {
      return
    }

    const selectedItem = this._selectedItem || ancestors[ancestors.length - 1]
    const hasManyAncestors = ancestors.length > 10

    let copy = [...ancestors]
    let skipped = false
    if (hasManyAncestors) {
      copy = [ancestors[0], ...ancestors.slice(ancestors.length - 10)]
      skipped = true
    }

    copy.forEach((label, index) => {
      const button = document.createElement('button')
      button.classList.add('navigation-item')
      button.textContent = label
      button.disabled = this._disabled
      if (label === selectedItem) {
        button.classList.add('selected')
      }
      button.onclick = () => {
        this.dispatchEvent(new CustomEvent('item-selected', { detail: label }))
      }
      this.itemsElement.appendChild(button)

      if (index < copy.length - 1) {
        this.itemsElement.appendChild(this.createArrow())
      }

      if (index === 0 && skipped) {
        const dots = document.createElement('span')
        dots.textContent = '...'
        this.itemsElement.appendChild(dots)
        this.itemsElement.appendChild(this.createArrow())
      }
    })
  }

  private createArrow(): HTMLElement {
    const arrow = document.createElement('div')
    arrow.classList.add('navigation-arrow')
    arrow.textContent = ' > '
    return arrow
  }
}

customElements.define('navigation-component', NavigationComponent)
