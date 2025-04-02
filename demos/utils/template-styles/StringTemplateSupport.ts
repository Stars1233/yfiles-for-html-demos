/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) by yWorks GmbH, Vor dem Kreuzberg 28,
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
/*
Helper types and functions that are common to all implementations of the string template styles
 */
import {
  GeneralPath,
  GraphComponent,
  type IModelItem,
  IRenderContext,
  Rect,
  SvgVisual,
  type TaggedSvgVisual
} from '@yfiles/yfiles'
import { registerConverter } from './template-engine/template-engine'
import { convertTextToWrappedSVG } from './text-wrapping-converter'
import type { RenderFunction } from './template-engine/interfaces'

// register this as a default converter
registerConverter('TextWrapConverter', convertTextToWrappedSVG)

export type TemplateStyleCache<TModelItem extends IModelItem> = {
  templateContext: TemplateContext<TModelItem>
  update: (newContext: any, newTemplateContext: any) => void
  cleanup: () => void
  cssClass: string | undefined
}

export type StringTemplateStyleOptions = {
  svgContent: string
} & Partial<{
  cssClass: string
  normalizedOutline: GeneralPath
  styleTag: any
}>

export abstract class TemplateContext<TModelItem extends IModelItem> {
  zoom: number = 1.0
  itemSelected: boolean = false
  itemHighlighted: boolean = false
  itemFocused: boolean = false
  item: TModelItem

  protected constructor(label: TModelItem) {
    this.item = label
  }

  abstract get width(): number

  abstract get height(): number

  get bounds() {
    return new Rect(0, 0, Math.max(this.width, 0), Math.max(this.height, 0))
  }

  // noinspection JSUnusedGlobalSymbols
  abstract get styleTag(): any

  updateState(renderContext: IRenderContext): boolean {
    const canvasComponent = renderContext.canvasComponent
    this.zoom = renderContext.zoom
    if (canvasComponent instanceof GraphComponent) {
      const selected = canvasComponent.selection.includes(this.item)
      const highlighted = canvasComponent.highlights.includes(this.item)
      const focused = canvasComponent.currentItem === this.item

      const changed =
        this.itemSelected !== selected ||
        this.itemHighlighted !== highlighted ||
        this.itemFocused !== focused
      if (changed) {
        this.itemSelected = selected
        this.itemHighlighted = highlighted
        this.itemFocused = focused
      }
      return changed
    } else {
      return false
    }
  }
}

export function createSVG<TModelItem extends IModelItem>(
  item: TModelItem,
  templateContext: TemplateContext<TModelItem>,
  renderContext: IRenderContext,
  renderFunction: RenderFunction,
  cssClass: string | undefined,
  arrange: (element: SVGElement) => void
): SvgVisual & { svgElement: SVGGElement } & {
  tag: {
    templateContext: TemplateContext<TModelItem>
    update: (newContext: any, templateContext: any) => void
    cleanup: () => void
    cssClass: string | undefined
  }
} {
  const showIndicators = templateContext.updateState(renderContext)

  const {
    node: xmlNode,
    update,
    cleanup
  } = renderFunction(item.tag, templateContext, renderContext.svgDefsManager.generateUniqueDefsId())

  let groupElement: SVGGElement
  if (xmlNode instanceof SVGGElement) {
    groupElement = xmlNode
  } else {
    groupElement = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    groupElement.appendChild(xmlNode)
  }

  if (cssClass) {
    groupElement.classList.add(cssClass)
  }

  arrange(groupElement)

  // create the visual and store our tag info
  const svgVisual = SvgVisual.from(groupElement, {
    templateContext,
    update,
    cleanup,
    cssClass
  })

  if (showIndicators) {
    if (templateContext.itemSelected) {
      groupElement.classList.add('yfiles-selected')
    }
    if (templateContext.itemHighlighted) {
      groupElement.classList.add('yfiles-highlighted')
    }
    if (templateContext.itemFocused) {
      groupElement.classList.add('yfiles-focused')
    }
  }

  // ensure proper cleanup
  renderContext.setDisposeCallback(svgVisual, (_, removedVisual) => {
    removedVisual.tag.cleanup()
    return null
  })

  return svgVisual
}

export function updateSVG<TModelItem extends IModelItem>(
  oldVisual: TaggedSvgVisual<SVGGElement, TemplateStyleCache<TModelItem>>,
  item: TModelItem,
  renderContext: IRenderContext,
  cssClass: string | undefined,
  arrange: (element: SVGElement) => void
) {
  const cache = oldVisual.tag

  const templateContext = cache.templateContext
  const changeIndicators = templateContext.updateState(renderContext)

  const svgElement = oldVisual.svgElement
  if (changeIndicators) {
    if (templateContext.itemSelected) {
      svgElement.classList.add('yfiles-selected')
    } else {
      svgElement.classList.remove('yfiles-selected')
    }
    if (templateContext.itemHighlighted) {
      svgElement.classList.add('yfiles-highlighted')
    } else {
      svgElement.classList.remove('yfiles-highlighted')
    }
    if (templateContext.itemFocused) {
      svgElement.classList.add('yfiles-focused')
    } else {
      svgElement.classList.remove('yfiles-focused')
    }
  }

  if (cache.cssClass !== cssClass) {
    if (cache.cssClass) {
      svgElement.classList.remove(cache.cssClass)
    }
    if (cssClass) {
      svgElement.classList.add(cssClass)
    }
    cache.cssClass = cssClass
  }

  cache.update(item.tag, templateContext)

  arrange(svgElement)

  return oldVisual
}
