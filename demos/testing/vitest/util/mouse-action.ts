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
import type { JSHandle, Locator, Page } from 'playwright'
import type { CanvasComponent, IModelItem } from '@yfiles/yfiles'
import { getItemWorldLocation, getPageCoordinates } from './graph-util'

export type PointLike = { x: number; y: number }
export type PointLikeArgs = PointLike | JSHandle<IModelItem> | Locator
export type TimeLike = number
export type ModifierKeys = 'Shift' | 'Control' | 'Alt' | 'Meta' | 'ControlOrMeta'

/**
 * Creates a new MouseAction builder.
 */
export function mouseAction(): MouseAction {
  return new MouseAction()
}

/**
 * A convenience class for building complex mouse and keyboard interactions with a fluent API.
 */
class MouseAction {
  private readonly actions: ((
    page: Page,
    resolve: (p: PointLikeArgs) => Promise<PointLike>
  ) => Promise<void>)[] = []

  /**
   * Click at the specified location.
   */
  click(location: PointLikeArgs, button = 0, offset?: PointLike, modifier?: ModifierKeys): this {
    return this.moveTo(location, offset)
      .mouseDown(button, modifier)
      .wait(10)
      .mouseUp(button, modifier)
  }

  /**
   * Drag from one location to another.
   */
  drag(
    from: PointLikeArgs,
    to: PointLikeArgs,
    button = 0,
    offset?: PointLike,
    modifier?: ModifierKeys
  ): this {
    return this.moveTo(from, offset)
      .mouseDown(button, modifier)
      .moveTo(to, offset)
      .mouseUp(button, modifier)
  }

  /**
   * Move mouse to the specified location.
   */
  moveTo(location: PointLikeArgs, offset?: PointLike): this {
    this.actions.push(async (page, resolve) => {
      const actualLocation = await resolve(location)
      await page.mouse.move(
        actualLocation.x + (offset?.x ?? 0),
        actualLocation.y + (offset?.y ?? 0),
        { steps: 5 }
      )
    })
    return this
  }

  /**
   * Press and hold a mouse button.
   */
  mouseDown(button = 0, modifiers?: ModifierKeys): this {
    const buttonName = button === 0 ? 'left' : button === 1 ? 'middle' : 'right'
    this.modifierDown(modifiers)
    this.actions.push((page) => page.mouse.down({ button: buttonName, clickCount: 1 }))
    this.modifierUp(modifiers)
    return this
  }

  /**
   * Release a mouse button.
   */
  mouseUp(button = 0, modifiers?: ModifierKeys): this {
    const buttonName = button === 0 ? 'left' : button === 1 ? 'middle' : 'right'
    this.modifierDown(modifiers)
    this.actions.push((page) => page.mouse.up({ button: buttonName, clickCount: 1 }))
    this.modifierUp(modifiers)
    return this
  }

  /**
   * Scroll the mouse wheel.
   */
  mouseWheel(
    deltaX: number,
    deltaY = 0,
    location?: PointLikeArgs,
    offset?: PointLike,
    modifier?: ModifierKeys
  ): this {
    if (location) {
      this.moveTo(location, offset)
    }
    this.modifierDown(modifier)
    this.actions.push((page) => page.mouse.wheel(deltaX, deltaY))
    this.modifierUp(modifier)
    return this
  }

  /**
   * Hold down a modifier key.
   */
  modifierDown(key?: ModifierKeys): this {
    if (key) {
      this.actions.push((page) => page.keyboard.down(key))
    }
    return this
  }

  /**
   * Release a modifier key.
   */
  modifierUp(key?: ModifierKeys): this {
    if (key) {
      this.actions.push((page) => page.keyboard.up(key))
    }
    return this
  }

  /**
   * Wait for a specified duration.
   */
  wait(duration: TimeLike): this {
    this.actions.push((page) => page.waitForTimeout(duration))
    return this
  }

  /**
   * Hover over a location.
   */
  hover(location: PointLikeArgs, duration = 500, offset?: PointLike): this {
    return this.moveTo(location, offset).wait(duration)
  }

  /**
   * Right-click (context menu).
   */
  contextMenu(location: PointLikeArgs, offset?: PointLike): this {
    return this.moveTo(location, offset).mouseDown(2).mouseUp(2)
  }

  /**
   * Execute all queued actions.
   */
  async perform(page: Page, locator?: Locator | JSHandle<CanvasComponent>): Promise<void> {
    async function resolveLocation(location: PointLikeArgs): Promise<PointLike> {
      let point: PointLike
      if (typeof (location as JSHandle).jsonValue === 'function') {
        point = await getItemWorldLocation(location as JSHandle<IModelItem>)
      } else if (typeof (location as Locator).scrollIntoViewIfNeeded === 'function') {
        const bbox = (await (location as Locator).boundingBox())!
        return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 }
      } else {
        point = location as PointLike
      }
      if (locator) {
        return await getPageCoordinates(point, locator)
      } else {
        return point
      }
    }

    for (const action of this.actions) {
      await action(page, resolveLocation)
    }
  }
}
