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
import { toggleTheme } from '../initialize-ui'

export function initializeBurgerMenu() {
  const menuDialog = document.getElementById('burger-menu') as HTMLDialogElement | undefined

  if (!menuDialog) {
    return
  }

  function showLevel(level: string) {
    menuDialog!.querySelectorAll('section').forEach((section) => {
      section.classList.remove('active')
    })
    const targetSection = menuDialog!.querySelector(`[data-level="${level}"]`)
    if (targetSection) {
      targetSection.classList.add('active')
    }
  }

  menuDialog.addEventListener('click', (event) => {
    const target = event.target as HTMLElement

    const navigateTarget = target.closest('[data-navigate]')?.getAttribute('data-navigate')
    if (navigateTarget) {
      showLevel(navigateTarget)
      return
    }

    if (target.closest('.icon-button.close')) {
      menuDialog.close()
      return
    }

    if (target.closest('#open-description')) {
      menuDialog.close()
      addDescriptionPanelButtons()
      document.body.classList.remove('description-panel-hidden')
      document.body.classList.add('description-panel-visible')
      return
    }

    if (target.closest('#start-tour')) {
      menuDialog.close()
      return
    }

    if (target.closest('#toggle-theme')) {
      toggleTheme()
    }
  })

  menuDialog.addEventListener('close', () => {
    showLevel('main')
  })

  // Close menu at increased viewport width
  const mediaQuery = window.matchMedia('(min-width: 64rem)')
  const handleMediaQueryChange = (event: MediaQueryListEvent | MediaQueryList) => {
    if (event.matches && menuDialog.open) {
      menuDialog.close()
    }
  }
  mediaQuery.addEventListener('change', handleMediaQueryChange)

  handleMediaQueryChange(mediaQuery)

  showLevel('main')

  function addDescriptionPanelButtons() {
    const descriptionPanel = document.querySelector('.description-panel')
    if (descriptionPanel) {
      const descriptionButtonsDiv = descriptionPanel.querySelector(
        '.mobile-description-panel-buttons'
      )
      if (!descriptionButtonsDiv) {
        const descriptionButtonsDiv = document.createElement('div')
        descriptionButtonsDiv.setAttribute('class', 'mobile-description-panel-buttons')
        const liveDemoButton = document.createElement('button')
        liveDemoButton.setAttribute('class', 'description-live-demo-button')
        liveDemoButton.textContent = 'Book a live demo'
        liveDemoButton.addEventListener('click', () => {
          if (!menuDialog) {
            return
          }
          if (!menuDialog.open) {
            menuDialog.showModal()
          }
          showLevel('live-demo')
        })
        const tryYfilesButton = document.createElement('a')
        tryYfilesButton.setAttribute('class', 'description-try-yfiles-button')
        tryYfilesButton.href = 'https://my.yworks.com/signup?product=YFILES_HTML_EVAL'
        tryYfilesButton.textContent = 'Try yFiles for free'
        descriptionButtonsDiv.append(liveDemoButton)
        descriptionButtonsDiv.append(tryYfilesButton)
        descriptionPanel.append(descriptionButtonsDiv)
      }
    }
    return
  }
}

export function openBurgerMenu() {
  const menuDialog = document.getElementById('burger-menu') as HTMLDialogElement
  if (menuDialog) {
    menuDialog.showModal()
  }
}
