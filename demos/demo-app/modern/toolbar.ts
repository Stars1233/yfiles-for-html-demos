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
export function initResponsiveToolbars() {
  const observer = new ResizeObserver(toolbarSizeChanged)
  for (const toolbar of document.querySelectorAll('.toolbar')) {
    if (!toolbar.classList.contains('no-overflow')) {
      if (toolbar.parentElement) {
        initToolbarResponsiveness(toolbar)
        // The toolbar (left: 50%, transform: translateX(-50%), flex-wrap: nowrap) is intrinsically sized
        // and will not change its size automatically when the window is resized.
        // Therefore, we need to attach resize observer to its parent element.
        observer.observe(toolbar.parentElement)
        // We also need to attach resize observer to the toolbar itself,
        // since playground demos will add new items to the toolbar dynamically.
        observer.observe(toolbar)
      }
    }
  }
}

function initToolbarResponsiveness(toolbar: Element) {
  const overflowContainer = document.createElement('div')
  overflowContainer.classList.add('toolbar-overflow-container')

  const overflowButton = document.createElement('button')
  overflowButton.classList.add('toolbar-overflow-button')
  overflowButton.setAttribute('title', 'More...')
  overflowButton.innerText = 'more_horiz'
  overflowButton.style.display = 'none'

  // Capture the current icon ligature of each button so we can render it via CSS in the overflow menu
  // This enables showing the button title as text while keeping the Material icon on the right
  const buttons = Array.from(toolbar.querySelectorAll('button')) as HTMLButtonElement[]
  for (const btn of buttons) {
    // Don't overwrite if already set (or for dynamically created buttons later)
    if (!btn.dataset.icon) {
      const ligature = (btn.textContent || '').trim()
      if (ligature) {
        btn.dataset.icon = ligature
      }
    }
  }

  overflowButton.addEventListener('click', (e) => {
    e.stopPropagation()
    overflowContainer.toggleAttribute('data-open', !overflowContainer.hasAttribute('data-open'))
  })

  // Close overflow menu when clicking outside of it
  overflowContainer.addEventListener('click', (e) => e.stopPropagation())
  document.addEventListener('click', () => overflowContainer.removeAttribute('data-open'))

  toolbar.prepend(overflowButton)
  toolbar.prepend(overflowContainer)
}

function toolbarSizeChanged(entries: ResizeObserverEntry[]) {
  window.requestAnimationFrame(() => {
    entries.forEach((entry) => {
      const resizedTarget = entry.target as HTMLElement
      const toolbarParentElement = resizedTarget.classList.contains('toolbar')
        ? resizedTarget.parentElement!
        : resizedTarget
      resizeToolbar(toolbarParentElement)
    })
  })
}

function resizeToolbar(toolbarParentElement: Element): void {
  const toolbar = toolbarParentElement.querySelector('.toolbar')! as HTMLElement
  const overflowButton = toolbar.querySelector('.toolbar-overflow-button') as HTMLButtonElement
  const overflowContainer = toolbar.querySelector('.toolbar-overflow-container') as HTMLDivElement

  // Reset by moving all items back to the toolbar
  toolbar.append(...overflowContainer.children)
  overflowContainer.replaceChildren()

  let toolbarPadding = 30
  const burgerMenu = document.querySelector('.mobile.burger-menu')
  if (burgerMenu && window.getComputedStyle(burgerMenu).display !== 'none') {
    toolbarPadding = 70
  }
  const expand = document.querySelector('.mobile.expand-interaction')
  if (expand && window.getComputedStyle(expand).display !== 'none') {
    toolbarPadding = 120
  }

  const availableWidth = toolbar.parentElement!.clientWidth
  if (toolbar.clientWidth + toolbarPadding > availableWidth) {
    overflowButton.style.display = 'block'
    // Move items to the container until there is no more overflow
    while (toolbar.clientWidth + toolbarPadding > availableWidth) {
      if (toolbar.children.length > 1) {
        overflowContainer.prepend(toolbar.lastElementChild!)
        void toolbar.offsetWidth // To make it asynchronous
      } else {
        return
      }
    }
  } else {
    overflowButton.style.display = 'none'
    overflowContainer.removeAttribute('data-open')
  }
}
