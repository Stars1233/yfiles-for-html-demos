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
export function createGridItem(demo, index, config) {
  const { isViewerPackage, isLayoutPackage, isCompletePackage, layoutCategories } = config
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
    notAvailableNotice.innerHTML = `<div>Requires "${isViewerPackage ? 'layout' : 'viewer'}" features to run.</div>
         <div><a href="https://www.yfiles.com/demos/${demo.demoPath}">Run it online</a>
          or view the source code files.</div>`
    gridItem.appendChild(notAvailableNotice)
  }

  return gridItem
}
