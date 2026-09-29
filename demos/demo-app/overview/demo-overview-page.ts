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
import { type DemoCategory, getCategoryNames, getDemos } from '../demo-data'
import type { ExtendedDemoEntry } from './demo-overview-types'
import { createGridItem } from './demo-overview-grid'
import { initializeSearch } from './demo-overview-search'
import './demo-overview-page.css'

const allDemos = getDemos()
const categoryNames: Record<DemoCategory, string> = getCategoryNames()

// @ts-ignore
const isViewerPackage = 'Viewer' === 'Complete'
// @ts-ignore
const isLayoutPackage = 'Layout' === 'Complete'
const isCompletePackage = !isViewerPackage && !isLayoutPackage

const layoutCategories = [
  'analysis',
  'data-binding',
  'layout',
  'layout-features',
  'showcase',
  'tutorial-graph-builder'
]

const demos: ExtendedDemoEntry[] = allDemos

const tutorialIds = demos
  .filter((item) => item.category?.startsWith('tutorial'))
  .map((item) => item.id)

const demoGrid = document.getElementById('demo-grid')!
const searchInput = document.querySelector<HTMLInputElement>('#search')!
const noResultsElement = document.querySelector<HTMLElement>('#no-search-results')!
const resetButton = document.querySelector('.reset-search')!

demoGrid.className = 'responsive-css-grid'
demos.forEach((demo, index) => {
  const gridItem = createGridItem(demo, index + 2, {
    isViewerPackage,
    isLayoutPackage,
    isCompletePackage,
    layoutCategories
  })
  demoGrid.appendChild(gridItem)
  demo.element = gridItem
})

const categories = Array.from(new Set<DemoCategory>(demos.map((demo) => demo.category)))

initializeSearch(
  searchInput,
  noResultsElement,
  resetButton,
  demos,
  categoryNames,
  categories,
  tutorialIds
)
createStickySearchHeader()

function createStickySearchHeader() {
  const overviewMain = document.querySelector<HTMLElement>('.overview-main-container')
  const overviewHeader = document.querySelector<HTMLElement>('.overview-search-header')
  const headerAnchor = document.querySelector<HTMLElement>('.overview-header-anchor')
  const header = document.querySelector<HTMLElement>('.header')

  if (!overviewMain || !overviewHeader || !headerAnchor || !header) {
    return
  }
  const FIXED_HEADER_CLASS = 'header-sticky'

  const siteHeaderHeight = header.clientHeight
  headerAnchor.style.height = `${siteHeaderHeight}px`
  overviewMain.addEventListener('scroll', () => {
    const scrolled = overviewMain.scrollTop
    const anchorHeight = headerAnchor.offsetHeight
    if (scrolled > anchorHeight) {
      overviewHeader.classList.add(FIXED_HEADER_CLASS)
    } else {
      overviewHeader.classList.remove(FIXED_HEADER_CLASS)
    }
  })
}
