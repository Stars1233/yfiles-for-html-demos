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
const defaultPadding = 10
const viewportPadding = 12

let currentPage = 0
let visibleTips = []
let overlay = document.getElementById('tour-overlay')
let overlayBlur = document.getElementById('tour-overlay-blur')

let overlayCleanup = null
let dialogCleanup = null

export function startTour(tour) {
  if (document.getElementById('tour-dialog')) {
    // Dialog is already open.
    return
  }

  // Hide the description panel, when tablet view (<80rem) is active
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
  const breakpointPx = 80 * rootFontSize // 80rem from breakpoints.less
  if (window.innerWidth < breakpointPx) {
    document.body.classList.remove('description-panel-visible')
    document.body.classList.add('description-panel-hidden')
  }

  // Filter out tips that won't be visible due to their highlight element being hidden
  visibleTips = tour.tips.filter((tip) => {
    if (!tip.highlightId) {
      return true
    }
    const highlightElement = getHighlightDomElement(tip.highlightId)
    return isElementVisible(highlightElement)
  })

  ensureOverlay()

  if (visibleTips.length === 0 || document.getElementById('tour-dialog')) {
    window.alert('No tips available. Please check the tour configuration.')
    return
  }

  const dialog = createDialog()

  wireButtons(tour, dialog)
  dialog.show()
  showTourPage(currentPage, dialog)
  // The mobile menu closes as part of the same click event and may restore
  // focus after the tour has opened. Re-apply focus once that event finishes.
  window.setTimeout(() => {
    if (dialog.isConnected && dialog.open) {
      dialog.querySelector('#tour-next')?.focus()
    }
  }, 0)
}

function closeTour(dialog) {
  dialog.close()
  clearHighlight()
  if (dialogCleanup) {
    dialogCleanup()
    dialogCleanup = null
  }
}

function wireButtons(tour, dialog) {
  document.getElementById('tour-close').addEventListener('click', () => {
    closeTour(dialog)
  })

  const nextButton = document.getElementById('tour-next')
  nextButton.addEventListener('click', () => {
    collapsePageList()
    if (currentPage < visibleTips.length - 1) {
      currentPage++
      showTourPage(currentPage, dialog)
    } else {
      closeTour(dialog)
    }
  })

  const toggleBtn = document.getElementById('tour-toggle-list')
  const pageList = document.getElementById('tour-page-list')
  toggleBtn.addEventListener('click', () => {
    if (pageList.style.display === 'none' || pageList.style.display === '') {
      buildPagesList(tour, dialog)
      pageList.style.display = 'block'
      toggleBtn.querySelector('.chevron').textContent = 'keyboard_arrow_up'
    } else {
      pageList.style.display = 'none'
      toggleBtn.querySelector('.chevron').textContent = 'keyboard_arrow_down'
    }
  })
}

function createDialog() {
  if (dialogCleanup) {
    dialogCleanup()
  }
  const dialog = document.createElement('dialog')
  dialog.id = 'tour-dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-labelledby', 'tour-title')
  dialog.innerHTML = `
<div class="tour-container">
  <div id="tour-title" class="tour-title"></div>
  <div id="tour-content" class="tour-content"></div>

  <div class="tour-pagination">
    <button id="tour-toggle-list" class="tour-page-button">
      <span id="tour-page-indicator">1/1</span>
      <span class="tour-expand-button chevron material-symbols-outlined">keyboard_arrow_down</span>
    </button>
    <div class="spacer"></div>
    <div class="tour-controls">
      <button id="tour-next" class="tour-next-button">Next</button>
    </div>
  </div>
  <div id="tour-page-list" class="tour-page-list" style="display:none"></div>
  <button data-command id="tour-close" class="tour-close-button">close_small</button>
</div>
  `

  const closeDialogWhenClickedOutside = (evt) => {
    const target = evt.target
    const path = evt.composedPath ? evt.composedPath() : null
    const clickedInside = path ? path.includes(dialog) : !!(target && dialog.contains(target))
    if (clickedInside) {
      return
    }
    closeTour(dialog)
  }

  document.body.appendChild(dialog)
  document.addEventListener('click', closeDialogWhenClickedOutside, true)

  dialogCleanup = () => {
    dialog.remove()
    currentPage = 0
    document.removeEventListener('click', closeDialogWhenClickedOutside, true)
  }

  return dialog
}

function showTourPage(page, dialog) {
  const tip = visibleTips[page]
  const highlightElement = tip.highlightId ? getHighlightDomElement(tip.highlightId) : null

  document.getElementById('tour-title').innerHTML = tip.title
  document.getElementById('tour-content').innerHTML = tip.content

  if (!tip.highlightId) {
    clearHighlight()
  }

  if (highlightElement) {
    scrollElementIntoView(highlightElement)
  }

  positionDialog(tip, dialog)
  applyOverlay(tip, dialog)
  updatePaginationUI()

  const nextButton = document.getElementById('tour-next')
  if (nextButton) {
    nextButton.textContent = currentPage === visibleTips.length - 1 ? 'Done' : 'Next'
    nextButton.disabled = false
    nextButton.focus()
  }
}

function clearHighlight() {
  if (overlayCleanup) {
    overlayCleanup()
    overlayCleanup = null
  }
  if (!overlay || !overlayBlur) {
    return
  }
  overlay.style.display = 'none'
  overlay.style.background = 'none'
  overlay.style.setProperty('--x', '0px')
  overlay.style.setProperty('--y', '0px')
  overlay.style.setProperty('--rx', '0px')
  overlay.style.setProperty('--ry', '0px')
  overlayBlur.style.display = 'none'
  overlayBlur.style.webkitMaskImage = 'none'
  overlayBlur.style.maskImage = 'none'
  overlayBlur.style.setProperty('--x', '0px')
  overlayBlur.style.setProperty('--y', '0px')
  overlayBlur.style.setProperty('--rx', '0px')
  overlayBlur.style.setProperty('--ry', '0px')
}

function getHighlightDomElement(tipId) {
  const escapeFn =
    window.CSS && typeof window.CSS.escape === 'function'
      ? window.CSS.escape
      : (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const selector = `[data-tip-id="${escapeFn(tipId)}"]`
  return document.querySelector(selector)
}

function isElementVisible(highlightElement) {
  if (!highlightElement) return false

  const rects = highlightElement.getClientRects()
  if (!rects || rects.length === 0) return false

  const style = window.getComputedStyle(highlightElement)
  return !(style.display === 'none' || style.visibility === 'hidden')
}

function scrollElementIntoView(element) {
  const rect = element.getBoundingClientRect()
  const viewport = getViewportBounds()
  if (
    rect.top >= viewport.top &&
    rect.bottom <= viewport.bottom &&
    rect.left >= viewport.left &&
    rect.right <= viewport.right
  ) {
    return
  }

  // scrollIntoView finds the dashboard's nested scroll container automatically.
  // Keep the tour's motion calm and comprehensible, but do not animate for
  // users who have requested reduced motion. The scroll listener installed by
  // applyOverlay keeps the dialog and highlight tethered while this runs.
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'instant'
    : 'smooth'
  element.scrollIntoView({ behavior, block: 'center', inline: 'nearest' })
}

function getViewportBounds() {
  return {
    top: viewportPadding,
    left: viewportPadding,
    right: Math.max(viewportPadding, window.innerWidth - viewportPadding),
    bottom: Math.max(viewportPadding, window.innerHeight - viewportPadding)
  }
}

function getElementRect(element) {
  const { top, left, right, bottom, height, width } = element.getBoundingClientRect()
  return { top, left, right, bottom, height, width }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function fitsViewport(position, dialogSize, viewport) {
  return (
    position.left >= viewport.left &&
    position.left + dialogSize.width <= viewport.right &&
    position.top >= viewport.top &&
    position.top + dialogSize.height <= viewport.bottom
  )
}

function fitsVertically(position, dialogSize, viewport) {
  return position.top >= viewport.top && position.top + dialogSize.height <= viewport.bottom
}

function clampToViewport(position, dialogSize, viewport) {
  const maxTop = Math.max(viewport.top, viewport.bottom - dialogSize.height)
  const maxLeft = Math.max(viewport.left, viewport.right - dialogSize.width)
  return {
    top: clamp(position.top, viewport.top, maxTop),
    left: clamp(position.left, viewport.left, maxLeft)
  }
}

function getRelativePosition(placement, elementRect, dialogSize, padding) {
  const above = elementRect.top - dialogSize.height - padding
  const below = elementRect.bottom + padding
  const alignLeft =
    elementRect.width >= dialogSize.width ? elementRect.left : elementRect.right - dialogSize.width
  const alignRight =
    elementRect.width >= dialogSize.width ? elementRect.right - dialogSize.width : elementRect.left

  switch (placement) {
    case 'north-east':
      return { top: above, left: alignRight }
    case 'north-west':
      return { top: above, left: alignLeft }
    case 'south-east':
      return { top: below, left: alignRight }
    case 'south-west':
      return { top: below, left: alignLeft }
    case 'east':
      return { top: elementRect.top - padding * 0.5, left: elementRect.right + padding }
    case 'west':
      return {
        top: elementRect.top - padding * 0.5,
        left: elementRect.left - dialogSize.width - padding
      }
  }
}

function getFallbackPosition(placement, elementRect, dialogSize, padding) {
  return {
    top:
      placement === 'above'
        ? elementRect.top - dialogSize.height - padding
        : elementRect.bottom + padding,
    left: elementRect.left + (elementRect.width - dialogSize.width) / 2
  }
}

function applyArrowClass(dialog, placement) {
  removeArrowClasses(dialog)

  const arrowClass =
    placement === 'east'
      ? 'tour-arrow-west'
      : placement === 'west'
        ? 'tour-arrow-east'
        : placement === 'below' || placement.startsWith('south')
          ? 'tour-arrow-north'
          : 'tour-arrow-south'
  dialog.classList.add('tour-arrow', arrowClass)
}

function positionDialog(tip, dialog) {
  const config = tip.dialogConfig
  const width = config?.width ?? '400px'
  const highlightElement = tip.highlightId ? getHighlightDomElement(tip.highlightId) : null

  dialog.style.position = 'fixed'
  dialog.style.inset = 'auto' /* clear UA inset values if needed */
  dialog.style.margin = '0'
  dialog.style.maxHeight = config?.height ?? '70vh'
  dialog.style.maxWidth = `${Math.max(0, Math.min(450, window.innerWidth - viewportPadding * 2))}px`
  dialog.style.width = width
  dialog.style.bottom = 'auto'
  dialog.dataset.width = width
  dialog.dataset.padding = String(tip.highlightPadding ?? defaultPadding)
  dialog.dataset.relativeTo = ''
  dialog.dataset.placement = ''
  removeArrowClasses(dialog)

  if (config?.relativeToElement && highlightElement) {
    const padding = tip.highlightPadding ?? defaultPadding
    const elementRect = getElementRect(highlightElement)
    const dialogRect = dialog.getBoundingClientRect()
    const dialogSize = { width: dialogRect.width, height: dialogRect.height }
    const viewport = getViewportBounds()
    const preferred = getRelativePosition(
      config.relativeToElement,
      elementRect,
      dialogSize,
      padding
    )
    const above = getFallbackPosition('above', elementRect, dialogSize, padding)
    const below = getFallbackPosition('below', elementRect, dialogSize, padding)

    let position
    if (fitsViewport(preferred, dialogSize, viewport)) {
      position = { ...preferred, placement: config.relativeToElement }
    } else if (fitsViewport(above, dialogSize, viewport)) {
      position = { ...above, placement: 'above' }
    } else if (fitsViewport(below, dialogSize, viewport)) {
      position = { ...below, placement: 'below' }
    } else if (fitsVertically(below, dialogSize, viewport)) {
      // Preserve a usable below placement when only its horizontal alignment
      // overflows. This is common on mobile when the target is narrower than
      // the dialog and sits close to the viewport edge.
      position = { ...clampToViewport(below, dialogSize, viewport), placement: 'below' }
    } else if (fitsVertically(above, dialogSize, viewport)) {
      position = { ...clampToViewport(above, dialogSize, viewport), placement: 'above' }
    } else {
      // A very tall target or a very short viewport may leave no complete
      // candidate. Keep the dialog visible and prefer the requested fallback.
      position = { ...clampToViewport(above, dialogSize, viewport), placement: 'above' }
    }

    dialog.style.top = `${position.top}px`
    dialog.style.left = `${position.left}px`
    dialog.style.transform = ''
    dialog.dataset.relativeTo = config.relativeToElement
    dialog.dataset.placement = position.placement
    dialog.dataset.center = 'false'
    applyArrowClass(dialog, position.placement)
    return
  }

  if (config?.top || config?.left) {
    dialog.style.top = config.top ?? '50%'
    dialog.style.left = config.left ?? '50%'
    dialog.style.transform = ''
    dialog.dataset.center = 'false'
    return
  }

  dialog.style.top = '50%'
  dialog.style.left = '50%'
  dialog.style.transform = 'translate(-50%, -50%)'
  dialog.dataset.center = 'true'
}

function removeArrowClasses(dialog) {
  dialog.classList.remove(
    'tour-arrow',
    'tour-arrow-west',
    'tour-arrow-east',
    'tour-arrow-north',
    'tour-arrow-south'
  )
}

function applyOverlay(tip, dialog) {
  if (overlayCleanup) {
    overlayCleanup()
  }

  const highlightElement = tip.highlightId ? getHighlightDomElement(tip.highlightId) : null

  ensureOverlay()

  if (!overlay || !overlayBlur) {
    return
  }

  overlay.style.display = 'block'
  overlayBlur.style.display = 'block'

  const recomputeLayout = () => {
    if (highlightElement) {
      if (dialog.dataset.relativeTo) {
        positionDialog(tip, dialog)
      }
      updateOverlayHighlight(highlightElement)
    }
  }

  recomputeLayout()

  if (highlightElement) {
    document.addEventListener('scroll', recomputeLayout, true)
    window.addEventListener('resize', recomputeLayout)
  }

  overlayCleanup = () => {
    if (highlightElement) {
      document.removeEventListener('scroll', recomputeLayout, true)
      window.removeEventListener('resize', recomputeLayout)
    }
  }
}

function updateOverlayHighlight(highlightElement) {
  if (!overlay || !overlayBlur) {
    return
  }

  overlay.style.background = ''
  overlayBlur.style.webkitMaskImage = ''
  overlayBlur.style.maskImage = ''

  const { width, height, top, left } = highlightElement.getBoundingClientRect()
  const centerX = left + width / 2
  const centerY = top + height / 2
  const radX = Math.round((width / 2) * (width > height ? 1.3 : 2.5))
  const radY = Math.round((height / 2) * (height > width ? 1.3 : 2.5))
  overlay.style.setProperty('--x', `${centerX}px`)
  overlay.style.setProperty('--y', `${centerY}px`)
  overlay.style.setProperty('--rx', `${radX}px`)
  overlay.style.setProperty('--ry', `${radY}px`)
  overlayBlur.style.setProperty('--x', `${centerX}px`)
  overlayBlur.style.setProperty('--y', `${centerY}px`)
  overlayBlur.style.setProperty('--rx', `${radX}px`)
  overlayBlur.style.setProperty('--ry', `${radY}px`)
}

function ensureOverlay() {
  if (!overlay) {
    overlay = document.getElementById('tour-overlay')
  }
  if (!overlay) {
    const divElement = document.createElement('div')
    divElement.id = 'tour-overlay'
    document.body.appendChild(divElement)
    const blurElem = document.createElement('div')
    blurElem.id = 'tour-overlay-blur'
    document.body.appendChild(blurElem)
    overlay = divElement
    overlayBlur = blurElem
  }
}

function stripHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || div.innerText || '').trim()
}

function buildPagesList(tour, dialog) {
  const list = document.getElementById('tour-page-list')
  if (!list) {
    return
  }
  list.innerHTML = ''

  const ul = document.createElement('ul')
  ul.className = 'tour-page-ul'

  visibleTips.forEach((tip, index) => {
    const li = document.createElement('li')
    li.className = 'tour-page-item' + (index === currentPage ? ' active' : '')
    const marker = document.createElement('span')
    marker.className = 'tour-page-item-marker'
    marker.textContent = 'circle'
    const btn = document.createElement('button')
    btn.className = 'tour-page-link'
    btn.type = 'button'
    btn.textContent = stripHtml(tip.title) || `Step ${index + 1}`
    btn.addEventListener('click', () => {
      collapsePageList()
      if (currentPage !== index) {
        currentPage = index
        showTourPage(currentPage, dialog)
        const nextBtn = document.getElementById('tour-next')
        nextBtn.textContent = currentPage === visibleTips.length - 1 ? 'Done' : 'Next'
        nextBtn.disabled = false
      }
    })
    li.appendChild(marker)
    li.appendChild(btn)
    ul.appendChild(li)
  })

  list.appendChild(ul)
}

function updatePaginationUI() {
  const indicator = document.getElementById('tour-page-indicator')
  if (indicator) {
    indicator.textContent = `${currentPage + 1}/${visibleTips.length}`
  }
  const list = document.getElementById('tour-page-list')
  if (list) {
    list.querySelectorAll('.tour-page-item').forEach((el, i) => {
      if (i === currentPage) {
        el.classList.add('active')
      } else {
        el.classList.remove('active')
      }
    })
  }
}

function collapsePageList() {
  const pageList = document.getElementById('tour-page-list')
  if (pageList?.style.display === 'block') {
    const toggleBtn = document.getElementById('tour-toggle-list')
    toggleBtn.querySelector('.chevron').textContent = 'keyboard_arrow_down'
    document.getElementById('tour-page-list').style.display = 'none'
  }
}
