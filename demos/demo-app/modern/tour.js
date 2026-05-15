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
  showTourPage(currentPage, dialog)

  dialog.show()
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

  document.getElementById('tour-title').innerHTML = tip.title
  document.getElementById('tour-content').innerHTML = tip.content

  if (!tip.highlightId) {
    clearHighlight()
  }

  positionDialog(tip, dialog)
  applyOverlay(tip, dialog)
  updatePaginationUI()

  const nextButton = document.getElementById('tour-next')
  if (nextButton) {
    nextButton.textContent = currentPage === visibleTips.length - 1 ? 'Done' : 'Next'
    nextButton.disabled = false
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

function computeRelativePosition(rel, elementRect, dialogWidth, padding) {
  const dialogWidthPx = parseFloat(dialogWidth) || 0

  const northAlignBottom = `calc(100vh - ${elementRect.top}px + ${padding * 0.5 + 2}px)`
  const southAlignTop = `calc(${elementRect.top}px + ${elementRect.height}px + ${padding}px)`
  const westAlignLeft = `calc(${elementRect.left}px - ${padding * 0.5}px)`
  const eastAlignLeft = `calc(${elementRect.left}px - ${dialogWidth} + ${elementRect.width}px + ${padding * 0.5}px)`

  switch (rel) {
    case 'north-east': {
      return {
        bottom: northAlignBottom,
        left: elementRect.width > dialogWidthPx ? eastAlignLeft : westAlignLeft
      }
    }
    case 'north-west':
      return {
        bottom: northAlignBottom,
        left: elementRect.width > dialogWidthPx ? westAlignLeft : eastAlignLeft
      }
    case 'south-east': {
      return {
        top: southAlignTop,
        left: elementRect.width > dialogWidthPx ? eastAlignLeft : westAlignLeft
      }
    }
    case 'south-west':
      return {
        top: southAlignTop,
        left: elementRect.width > dialogWidthPx ? westAlignLeft : eastAlignLeft
      }
    case 'east':
      return {
        top: `calc(${elementRect.top}px - ${padding * 0.5}px)`,
        left: `calc(${elementRect.right}px + ${padding}px)`
      }
    case 'west':
      return {
        top: `calc(${elementRect.top}px - ${padding * 0.5}px)`,
        left: `calc(${elementRect.left}px - ${dialogWidth} - ${padding * 4}px)`
      }
    default:
      return { top: `${elementRect.top}px`, left: `${elementRect.left}px` }
  }
}

function positionDialog(tip, dialog) {
  let width = '400px'
  let height = undefined
  let top = '50%'
  let bottom = undefined
  let left = '50%'
  let center = true

  const config = tip.dialogConfig
  if (config) {
    if (config.width) {
      width = config.width
    }
    if (config.height) {
      height = config.height
    }

    dialog.style.position = 'fixed'
    dialog.style.inset = 'auto' /* clear UA inset values if needed */
    dialog.style.maxHeight = height ?? '70vh'
    dialog.style.maxWidth = '450px'

    const highlightElement = tip.highlightId ? getHighlightDomElement(tip.highlightId) : null
    const padding = tip.highlightPadding ?? defaultPadding

    // Compute position if the dialog is to be positioned relatively
    if (config.relativeToElement && highlightElement) {
      removeArrowClasses(dialog) // Remove arrow classes from previous positioning
      center = false

      const pos = computeRelativePosition(
        config.relativeToElement,
        highlightElement.getBoundingClientRect(),
        width,
        padding
      )
      top = pos.top
      bottom = pos.bottom
      left = pos.left

      // Persist positioning info for viewport updates
      dialog.dataset.relativeTo = config.relativeToElement
      dialog.dataset.padding = String(padding)

      // Configure arrow classes
      let arrowClass = ''
      switch (config.relativeToElement) {
        case 'north-east':
        case 'north-west':
          arrowClass = 'tour-arrow-south'
          break
        case 'south-east':
        case 'south-west':
          arrowClass = 'tour-arrow-north'
          break
        case 'east':
          arrowClass = 'tour-arrow-west'
          break
        case 'west':
          arrowClass = 'tour-arrow-east'
          width = `${parseInt(width) - 10}px` // Prevent arrow overlapping highlight element
          break
      }
      if (arrowClass) {
        dialog.classList.add('tour-arrow', arrowClass)
      }
    } else if (config.top || config.left) {
      center = false
      if (config.top) {
        top = config.top
      }
      if (config.left) {
        left = config.left
      }
      dialog.dataset.relativeTo = ''
      dialog.dataset.padding = String(tip.highlightPadding ?? defaultPadding)
      removeArrowClasses(dialog)
    }
  }

  dialog.style.top = top ?? 'auto'
  dialog.style.bottom = bottom ?? 'auto'
  dialog.style.left = left
  dialog.style.width = width

  // Persist width for recomputation during viewport update
  dialog.dataset.width = width

  if (center) {
    dialog.style.transform = 'translate(-50%, -50%)'
    dialog.dataset.center = 'true'
    removeArrowClasses(dialog)
  } else {
    dialog.style.transform = ''
    dialog.dataset.center = 'false'
  }
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
  let recomputePosition

  if (overlayCleanup) {
    overlayCleanup()
  }

  const highlightElement = tip.highlightId ? getHighlightDomElement(tip.highlightId) : null

  // If dialog is positioned relative to the element, recompute its position on viewport changes
  if (dialog.dataset?.relativeTo && highlightElement) {
    recomputePosition = () => {
      const dialogWidth = dialog.dataset?.width || `${dialog.getBoundingClientRect().width}px`
      const dialogPadding = Number(
        dialog.dataset?.padding ?? tip.highlightPadding ?? defaultPadding
      )
      const dialogPosition = computeRelativePosition(
        dialog.dataset.relativeTo,
        highlightElement.getBoundingClientRect(),
        String(dialogWidth),
        dialogPadding
      )
      if (dialogPosition.top || dialogPosition.bottom || dialogPosition.left) {
        dialog.style.top = dialogPosition.top ?? 'auto'
        dialog.style.bottom = dialogPosition.bottom ?? 'auto'
        dialog.style.left = dialogPosition.left
      }
    }
    document.addEventListener('scroll', recomputePosition, true)
    window.addEventListener('resize', recomputePosition)
  }

  ensureOverlay()

  if (!overlay || !overlayBlur) {
    return
  }

  overlay.style.display = 'block'
  overlayBlur.style.display = 'block'

  if (highlightElement) {
    overlay.style.background = ''
    overlayBlur.style.webkitMaskImage = ''
    overlayBlur.style.maskImage = ''

    let { width, height, top, left } = highlightElement.getBoundingClientRect()
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

  overlayCleanup = () => {
    if (dialog.dataset?.relativeTo && highlightElement) {
      document.removeEventListener('scroll', recomputePosition, true)
      window.removeEventListener('resize', recomputePosition)
    }
  }
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
