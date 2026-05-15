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
import { createContext, useContext, useLayoutEffect, RefObject } from 'react'
import { GraphComponent } from '@yfiles/yfiles'

export const GraphComponentContext = createContext<GraphComponent | null>(null)

/**
 * Returns the GraphComponent instance from the current context.
 */
export function useGraphComponent() {
  const graphComponent = useContext(GraphComponentContext)
  if (!graphComponent) {
    throw new Error('GraphComponent is not available in this context.')
  }
  return graphComponent
}

/**
 * Adds the given GraphComponent to a parent in useLayoutEffect().
 * @param parentRef
 * @param graphComponent
 */
export function useAddGraphComponent(
  parentRef: RefObject<HTMLElement>,
  graphComponent: GraphComponent
) {
  useLayoutEffect(() => {
    if (parentRef.current && graphComponent) {
      const firstChild = parentRef.current.firstChild
      if (firstChild) {
        parentRef.current.insertBefore(graphComponent.htmlElement, firstChild)
      } else {
        parentRef.current.appendChild(graphComponent.htmlElement)
      }
    }
    return () => {
      if (parentRef.current) {
        parentRef.current.removeChild(graphComponent.htmlElement)
      }
    }
  }, [graphComponent, parentRef])
}
