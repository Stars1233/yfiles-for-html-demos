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
/* eslint-disable no-eval */

import './demo-overview-page.css'

import { type DemoCategory, type DemoEntry, getCategoryNames, getDemos } from '../demo-data'

type ExtendedDemoEntry = DemoEntry & Partial<{ element: HTMLElement; availableInPackage: boolean }>

const allDemos = getDemos()
const others = allDemos.filter((d) => !d.demoPath.startsWith('tutorial'))
const tutorialDemos = allDemos.filter((d) => d.demoPath.startsWith('tutorial'))
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
demoGrid.className = 'responsive-css-grid'
const searchBox = document.querySelector<HTMLInputElement>('#search')!
const noSearchResultsElement = document.querySelector<HTMLElement>('#no-search-results')!
const resetSearchButton = document.querySelector('.reset-search')!

let activeCategory: HTMLInputElement | null

//creating the grid

demos.forEach((demo, index) => {
  const gridItem = createGridItem(demo, index + 2)
  demoGrid.appendChild(gridItem)
  demo.element = gridItem
})

function createGridItem(demo: ExtendedDemoEntry, index: number): HTMLElement {
  const gridItem = document.createElement('div')
  gridItem.className = `grid-item`

  const demoPath =
    location.pathname.includes('demos-ts') && demo.languageType === 'js-only'
      ? '../demos-js/' + demo.demoPath
      : location.pathname.includes('demos-js') && demo.languageType === 'ts-only'
        ? '../demos-ts/' + demo.demoPath
        : demo.demoPath

  const tags = demo.tags
    .map((tag) => `<span><a href="#${encodeURIComponent(tag)}" class="tag">${tag}</a></span>`)
    .join('')
  gridItem.innerHTML = `
      <div class="thumbnail">
        <a href="${demoPath}"><img src="${demo.thumbnailPath}" loading="lazy" alt=""/></a>
      </div>
      <div class="description">
        <h2 class="title"><a href="${demoPath}" tabindex="${index}">${demo.name}</a></h2>
        <p class="details">${demo.summary}</p>
        <div class="tags">${tags}</div>
        <div class="gradient-overlay"></div>
      </div>
      <div class="actions">
        <a href="${demoPath}" class="action-run"></a>
      </div>
    `

  const availableInPackage =
    isCompletePackage ||
    (isViewerPackage &&
      layoutCategories.indexOf(demo.category) === -1 &&
      demo.distributionType !== 'needs-layout') ||
    (isLayoutPackage && demo.distributionType === 'no-viewer')
  demo.availableInPackage = availableInPackage
  if (!availableInPackage) {
    gridItem.classList.add('not-available')
    const notAvailableNotice = document.createElement('div')
    notAvailableNotice.className = 'not-available-notice'
    notAvailableNotice.innerHTML = `<div>Requires "${
      isViewerPackage ? 'layout' : 'viewer'
    }" features to run.</div>
         <div><a href="https://www.yfiles.com/demos/${demo.demoPath}">Run it online</a>
          or view the source code files.</div>`
    gridItem.appendChild(notAvailableNotice)
  }

  return gridItem
}

// things for search
searchBox.addEventListener(
  'input',
  debounce(() => {
    searchBoxChanged()
    updateHash()
  }, 300)
)
searchBox.addEventListener('click', searchBoxClicked)
searchBox.addEventListener('blur', () => {
  searchBox.addEventListener('click', searchBoxClicked)
})
resetSearchButton!.addEventListener('click', () => {
  searchBox.value = ''
})

let updatePillsContainerHeight: () => void = () => {}

createStickySearchHeader()
initializeCategoryPills()

function createStickySearchHeader() {
  const overviewMain = document.querySelector<HTMLElement>('.overview-main-container')!
  const overviewHeader = document.querySelector<HTMLElement>('.overview-search-header')!
  const headerAnchor = document.querySelector<HTMLElement>('.overview-header-anchor')!
  const header = document.querySelector<HTMLElement>('.header')!
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

function initializeCategoryPills() {
  const pillsContainer = document.querySelector<HTMLElement>('.category-pills')!
  const pills: { element: HTMLElement; searchValue: string }[] = []

  const seenCategories = new Set<string>()

  demos.forEach((demo) => {
    const category = demo.category
    if (seenCategories.has(category)) return
    const categoryName = categoryNames[category]

    const pill = document.createElement('input')
    pill.className = 'category-pill'
    pill.type = 'button'
    pill.value = categoryName
    pill.setAttribute('data-search', category)

    pill.addEventListener('click', () => {
      pills.forEach((p) => p.element.classList.remove('active'))
      activeCategory?.classList.remove('active')

      pill.classList.add('active')
      searchBox.value = pill.value
      activeCategory = pill
      filterDemos(category, category)
      updateHash()
    })
    pillsContainer.appendChild(pill)
    pills.push({ element: pill, searchValue: '' })
    seenCategories.add(category)
  })
}

function setSearchTermFromHash() {
  searchBox.value =
    location.hash && location.hash.length > 1 && location.hash.charAt(0) === '#'
      ? decodeURIComponent(location.hash.substring(1))
      : ''
  searchBoxChanged()
}

window.onhashchange = setSearchTermFromHash
setSearchTermFromHash()

function updateHash() {
  if (!history.replaceState) {
    // Don't care about IE 9
    return
  }
  const searchTerm = searchBox.value.trim()
  history.replaceState({}, '', `#${searchTerm}`)
}

//Um schnell text aus Suchleiste zu entfernen
function searchBoxClicked() {
  searchBox.select()
  searchBox.removeEventListener('click', searchBoxClicked)
}

function filterDemos(searchTerm: string, categoryFilter = '') {
  let noSearchResults = true
  const searchBoxEmpty = searchTerm === ''

  // when the search term is a category, use category matching/sorting
  const matchedCategory = Object.keys(categoryNames).find(
    (categoryId) => categoryId === searchTerm.toLowerCase()
  )
  if (matchedCategory) {
    categoryFilter = matchedCategory
    searchTerm = ''
  }

  const sortedDemos = demos.map((demo) => ({
    demo: demo,
    priority: matchDemo(demo, searchTerm, categoryFilter)
  }))
  sortedDemos.sort((i1, i2) => {
    if (i1.priority === i2.priority) {
      return 0
    }
    if (i1.priority === 0) {
      return 1
    }
    if (i2.priority === 0) {
      return -1
    }
    return i1.priority > i2.priority ? -1 : 1
  })

  // The first indexes are reserved for other elements.
  let baseTabIndex = 2
  sortedDemos.forEach((item, index) => {
    const demo = item.demo
    // Reorder the nodes in each grid section
    const demoElement = demo.element!
    demoElement.parentElement!.appendChild(demoElement)

    // Update the tabindex.
    demo
      .element!.querySelector('.title')!
      .firstElementChild!.setAttribute('tabindex', String(index + baseTabIndex))

    if (searchBoxEmpty && demo.hiddenInGrid) {
      // the search box is empty ...
      // and this is a demo that should be hidden in overview and only be visible when searching
      if (demoElement.className.indexOf('filtered') === -1) {
        //hide the demo in any case
        demoElement.className += ' filtered'
      }
      //however, for the empty search box we show the sidebar element
      //demo.sidebarElement!.className = demo.sidebarElement!.className.replace(' filtered', '')
      return
    }
    if (item.priority > 0) {
      demoElement.className = demoElement.className.replace(' filtered', '')
      //demo.sidebarElement!.className = demo.sidebarElement!.className.replace(' filtered', '')
      noSearchResults = false
    } else {
      if (demoElement.className.indexOf('filtered') === -1) {
        demoElement.className += ' filtered'
      }
    }
  })

  updatePillsContainerHeight()

  baseTabIndex += sortedDemos.length
  tutorialIds.forEach((id) => {
    const gridElement = document.getElementById(id + '-grid')
    if (!gridElement) {
      return
    }
    const children = gridElement.children
    let allHidden = true
    for (let i = 0; i < children.length; i++) {
      const demoCard = children[i]
      if (demoCard.getAttribute('class')?.indexOf('filtered') === -1) {
        allHidden = false
        // Update the tabindex.
        demoCard
          .querySelector('.title')!
          .firstElementChild!.setAttribute('tabindex', `${baseTabIndex++}`)
      }
    }
    if (allHidden) {
      document.getElementById(id + '-header')!.style.display = 'none'
    } else {
      document.getElementById(id + '-header')!.style.display = 'block'
    }
  })
  noSearchResultsElement.style.display = noSearchResults ? 'flex' : 'none'
}

function searchBoxChanged() {
  const searchTerm = searchBox.value.trim()
  if (searchTerm === '') {
    activeCategory?.classList.remove('active')
    activeCategory = null
  }
  filterDemos(searchTerm, activeCategory ? (activeCategory.getAttribute('data-search') ?? '') : '')
  changeTextContent('')
}

function getDemosWithDescriptionElement(): HTMLElement[] {
  return demos
    .map((item) => document.getElementById(item.category))
    .filter((element): element is HTMLElement => element != null)
}

function changeTextContent(categoryName: string) {
  for (const element of getDemosWithDescriptionElement()) {
    element.style.display = 'none'
  }
  const content = document.getElementById(categoryName)
  if (content != null) {
    content.style.display = 'block'
  }
}
/**
 * @param demo The JSON data of a demo
 * @param needle A space-separated list of search terms
 * @param categoryFilter An optional filter to restrict matches to a certain category
 * @returns The quality of the match in the range [0-100]. Higher quality is better,
 *   and the value is 0 if the demo doesn't match at all.
 */
function matchDemo(demo: ExtendedDemoEntry, needle: string, categoryFilter: string): number {
  if (categoryFilter && demo.category !== categoryFilter) {
    return 0
  }
  const words = needle.split(/[^.\w/]/)
  const priority = words
    .map((word) => matchWord(demo, word))
    .reduce((prev, curr) => {
      if (categoryFilter) {
        // when filtering a specific demo category, avoid any priorities but show demos in the given order
        return prev > 0 || curr > 0 ? 1 : 0
      } else {
        // require that all the words match by multiplying the priority number computed by
        // the function matchWord - if one is zero, the whole demo does not match
        return prev === -1 ? curr : prev * curr
      }
    }, -1)
  // if demo matches, increase priority for available demos
  return priority + (priority > 0 && demo.availableInPackage ? 1000000 : 0)
}

/**
 * @param demo The JSON data of a demo
 * @param word A single search term
 * @returns The quality of the match in the range [0-100]. Higher quality is better,
 *   and the value is 0 if the demo doesn't match at all.
 */
function matchWord(demo: ExtendedDemoEntry, word: string): number {
  const regex = new RegExp(word, 'gi')
  if (regex.test(demo.name)) {
    return 100
  }
  if (demo.tags.some((tag) => regex.test(normalize(tag)))) {
    return 50
  }
  if (demo.keywords && demo.keywords.some((keyword) => regex.test(normalize(keyword)))) {
    return 20
  }
  return regex.test(demo.summary) ? 15 : 0
}

function normalize(word: string) {
  return word.replaceAll(/\s|-/g, '')
}

export function debounce<T extends unknown[], U>(
  callback: (...args: T) => PromiseLike<U> | U,
  wait: number
) {
  let timer: ReturnType<typeof setTimeout> | undefined

  return (...args: T): Promise<U> => {
    if (timer) clearTimeout(timer)

    return new Promise((resolve) => {
      timer = setTimeout(() => resolve(callback(...args)), wait)
    })
  }
}
