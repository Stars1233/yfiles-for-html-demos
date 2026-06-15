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
export function createPanelFor(toggleButton, popover) {
  if (toggleButton == null || popover == null) {
    return
  }

  toggleButton.popoverTargetElement = popover
  toggleButton.popoverTargetAction = 'toggle'

  popover.addEventListener('toggle', (evt) => {
    // We need to cast since the event has only been typed as a ToggleEvent since TS 5.9.
    // However, the popover API is part of Baseline 2024, see
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/popover
    const toggleEvt = evt

    if (toggleEvt.newState === 'open') {
      const GAP = 10 // space from the viewport edge
      const ARROW_HEIGHT = 16 // height of the popover arrow

      const buttonRect = toggleButton.getBoundingClientRect()
      const popoverRect = popover.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const buttonCenterY = buttonRect.top + buttonRect.height / 2

      let popoverTop = buttonCenterY - popoverRect.height / 2
      popoverTop = Math.max(
        GAP, // Not to go off the top
        Math.min(popoverTop, viewportHeight - popoverRect.height - GAP) // Not to go off the bottom
      )
      popover.style.top = `${popoverTop}px`

      const arrowTop = buttonCenterY - popoverTop - ARROW_HEIGHT / 2
      popover.style.setProperty('--popover-arrow-top', `${arrowTop}px`)

      toggleButton.classList.add('active')
    } else {
      toggleButton.classList.remove('active')
    }
  })

  const mediaQuery = window.matchMedia('(max-width: 64rem)')
  mediaQuery.addEventListener('change', () => {
    if (mediaQuery.matches) {
      popover.hidePopover?.()
      toggleButton.classList.remove('active')
    }
  })
}
