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
import type { DemoCategory, ExtendedDemoEntry } from './demo-overview-types'

let searchBox: HTMLInputElement
let noSearchResultsElement: HTMLElement
let resetSearchButton: Element
let demos: ExtendedDemoEntry[]
let categoryNames: Record<DemoCategory, string>
let tutorialIds: string[]

let activeCategory: HTMLInputElement | null = null

export function initializeSearch(
  searchInput: HTMLInputElement,
  noResultsElement: HTMLElement,
  resetButton: Element,
  demoData: ExtendedDemoEntry[],
  categories: Record<DemoCategory, string>,
  categoryList: DemoCategory[],
  tutorials: string[],
  searchCategories = true,
  useHash: boolean = true
) {
  searchBox = searchInput
  noSearchResultsElement = noResultsElement
  resetSearchButton = resetButton
  demos = demoData
  categoryNames = categories
  tutorialIds = tutorials

  searchBox.addEventListener(
    'input',
    debounce(() => {
      searchBoxChanged()
      if (useHash) {
        updateHash()
      }
    }, 300)
  )
  searchBox.addEventListener('click', searchBoxClicked)
  searchBox.addEventListener('blur', () => {
    searchBox.addEventListener('click', searchBoxClicked)
  })
  resetSearchButton!.addEventListener('click', () => {
    searchBox.value = ''
    searchBoxChanged()
  })

  initializeCategoryPills(categoryList, searchCategories, useHash)

  if (useHash) {
    window.onhashchange = setSearchTermFromHash
    setSearchTermFromHash()
  }
}

function updateToggleVisibility() {
  const pillsContainer = document.querySelector<HTMLElement>('.category-pills')!
  const toggle = document.querySelector<HTMLElement>('.overview-pills-expand-toggle')!
  const checkbox = document.querySelector<HTMLInputElement>(
    '#overview-pills-expand-toggle-checkbox'
  )!

  // The height of one row is defined by --category-pill-height (30px).
  // scrollHeight reflects the total height required by the pills.
  // We use a small buffer (32px) to account for potential sub-pixel rendering or gaps.
  const needsToggle = pillsContainer.scrollHeight > 32

  // Show the toggle only if the content spans more than one row
  toggle.style.display = needsToggle ? 'flex' : 'none'

  // If the toggle is hidden because it's no longer needed,
  // uncheck the checkbox to ensure a clean state if the window is shrunk again.
  if (!needsToggle && checkbox.checked) {
    checkbox.checked = false
  }
}

function initializeCategoryPills(categoryList: string[], searchCategories = true, useHash = true) {
  const pillsContainer = document.querySelector<HTMLElement>('.category-pills')!
  const pills: { element: HTMLElement; searchValue: string }[] = []

  categoryList.forEach((category) => {
    const pill = document.createElement('input')
    pill.className = 'category-pill'
    pill.type = 'button'
    pill.value = category
    pill.setAttribute('data-search', category)

    pill.addEventListener('click', () => {
      pills.forEach((p) => p.element.classList.remove('active'))
      activeCategory?.classList.remove('active')

      pill.classList.add('active')
      searchBox.value = pill.value
      activeCategory = pill
      filterDemos(category, searchCategories ? category : undefined)
      if (useHash) {
        updateHash()
      }
    })
    pillsContainer.appendChild(pill)
    pills.push({ element: pill, searchValue: '' })
  })

  const observer = new ResizeObserver(() => updateToggleVisibility())
  observer.observe(pillsContainer)

  // Initial check
  updateToggleVisibility()
}

function setSearchTermFromHash() {
  searchBox.value =
    location.hash && location.hash.length > 1 && location.hash.charAt(0) === '#'
      ? decodeURIComponent(location.hash.substring(1))
      : ''
  searchBoxChanged()
}

function updateHash() {
  if (!history.replaceState) {
    // Don't care about IE 9
    return
  }
  const searchTerm = searchBox.value.trim()
  history.replaceState({}, '', `#${searchTerm}`)
}

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
    if (demoElement.parentElement) {
      demoElement.parentElement.appendChild(demoElement)
    }

    // Update the tabindex.
    const titleLink = demo.element!.querySelector('.title')?.firstElementChild
    if (titleLink) {
      titleLink.setAttribute('tabindex', String(index + baseTabIndex))
    }

    if (searchBoxEmpty && demo.hiddenInGrid) {
      // the search box is empty ...
      // and this is a demo that should be hidden in overview and only be visible when searching
      demoElement.classList.add('filtered')
      return
    }
    if (item.priority > 0) {
      demoElement.classList.remove('filtered')
      noSearchResults = false
    } else {
      demoElement.classList.add('filtered')
    }
  })

  baseTabIndex += sortedDemos.length
  tutorialIds.forEach((id) => {
    const gridElement = document.getElementById(id + '-grid')
    if (!gridElement) {
      return
    }
    const children = gridElement.children
    let allHidden = true
    for (let i = 0; i < children.length; i++) {
      const demoCard = children[i] as HTMLElement
      if (!demoCard.classList.contains('filtered')) {
        allHidden = false
        // Update the tabindex.
        const titleLink = demoCard.querySelector('.title')?.firstElementChild
        if (titleLink) {
          titleLink.setAttribute('tabindex', `${baseTabIndex++}`)
        }
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

function matchDemo(demo: any, needle: string, categoryFilter: string): number {
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

function matchWord(demo: any, word: string): number {
  const regex = new RegExp(regexpEscape(word), 'gi')
  if (regex.test(demo.name)) {
    return 100
  }
  if (demo.tags.some((tag: string) => regex.test(normalize(tag)))) {
    return 50
  }
  if (demo.keywords && demo.keywords.some((keyword: string) => regex.test(normalize(keyword)))) {
    return 20
  }
  return regex.test(demo.summary) ? 15 : 0
}

function normalize(word: string) {
  return word.replaceAll(/\s|-/g, '')
}

function regexpEscape(content: string): string {
  return (RegExp as any).escape?.(content) ?? content
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
