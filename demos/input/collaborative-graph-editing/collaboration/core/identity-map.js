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
/**
 * Keeps the public id-to-item map and a fast reverse lookup in sync.
 *
 * The supplied map remains the source of truth, so callers that clear or
 * inspect it directly keep the existing behavior. Reverse entries are always
 * validated against that map before they are used.
 */
export function createIdentityMap(items) {
  const idByItem = new WeakMap()

  const register = (id, item) => {
    const previousId = idByItem.get(item)
    if (previousId && previousId !== id && items.get(previousId) === item) {
      items.delete(previousId)
    }
    const previousItem = items.get(id)
    if (previousItem && previousItem !== item) idByItem.delete(previousItem)
    items.set(id, item)
    idByItem.set(item, id)
  }

  const unregister = (id, item) => {
    const registeredItem = items.get(id)
    items.delete(id)
    if (registeredItem) idByItem.delete(registeredItem)
    if (item && registeredItem !== item) idByItem.delete(item)
  }

  const getId = (item) => {
    const registeredId = idByItem.get(item)
    if (registeredId && items.get(registeredId) === item) return registeredId
    for (const [id, candidate] of items) {
      if (candidate === item) return id
    }
    return undefined
  }

  return { register, unregister, getId, get: (id) => items.get(id) }
}
