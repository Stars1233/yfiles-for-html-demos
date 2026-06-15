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
 * Mouse action helpers for selenium-webdriver tests.
 *
 * Provides a fluent builder (MouseAction) for composing and executing sequences
 * of low-level mouse and keyboard events using the Selenium Actions API.
 *
 * Coordinate handling:
 *   - Input coordinates are always in yFiles world space (e.g. { x: 300, y: 300 }).
 *   - Before each action the coordinates are converted to page-pixel coordinates
 *     using worldToPageCoordinates(), which calls the GraphComponent's own
 *     worldToViewCoordinates + viewToPageCoordinates transforms inside the browser.
 *
 * Key design principle:
 *   ALL steps of a gesture are collected first (resolving world→pixel coordinates
 *   asynchronously), then dispatched as a SINGLE driver.actions().perform() call.
 *   Splitting mouseDown / mousemove / mouseUp across separate perform() calls breaks
 *   gesture recognition in yFiles because the W3C Actions API treats each perform()
 *   as an independent input source session, so the pointer "teleports" rather than
 *   dragging continuously.
 */

import { Button, Key, Origin, type WebDriver } from 'selenium-webdriver'
import { type PointLike, worldToPageCoordinates } from './graph-util.js'

export type ModifierKey = 'Shift' | 'Control' | 'Alt' | 'Meta' | 'ControlOrMeta'

// A resolved action descriptor — the Selenium equivalent of wdio's plain action objects.
type ResolvedAction =
  | { type: 'pointerMove'; x: number; y: number; duration: number }
  | { type: 'pointerDown'; button: Button }
  | { type: 'pointerUp'; button: Button }
  | { type: 'keyDown'; key: string }
  | { type: 'keyUp'; key: string }
  | { type: 'pause'; duration: number }
  | { type: 'scroll'; x: number; y: number; deltaX: number; deltaY: number }

// A pending step is an async function that resolves world coordinates and
// returns zero or more ResolvedActions to append to the gesture chain.
type PendingStep = (driver: WebDriver) => Promise<ResolvedAction[]>

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
  private readonly _pending: PendingStep[] = []

  /**
   * Click at the specified location.
   */
  click(location: PointLike, button = 0, offset?: PointLike, modifier?: ModifierKey): this {
    return this.moveTo(location, offset)
      .mouseDown(button, modifier)
      .wait(10)
      .mouseUp(button, modifier)
  }

  /**
   * Drag from one location to another.
   */
  drag(
    from: PointLike,
    to: PointLike,
    button = 0,
    offset?: PointLike,
    modifier?: ModifierKey
  ): this {
    return this.moveTo(from, offset)
      .mouseDown(button, modifier)
      .moveTo(to, offset)
      .mouseUp(button, modifier)
  }

  /**
   * Move the mouse cursor to a world coordinate.
   * A non-zero duration on the pointerMove tick causes chromedriver to fire
   * intermediate mousemove events during the transition — the Selenium
   * equivalent of Playwright's { steps: 5 } option — so that yFiles gesture
   * recognisers receive enough events to track the pointer path reliably.
   */
  moveTo(location: PointLike, offset?: PointLike): this {
    this._pending.push(async (driver) => {
      const page = await worldToPageCoordinates(driver, location)
      const x = Math.round(page.x + (offset?.x ?? 0))
      const y = Math.round(page.y + (offset?.y ?? 0))
      return [{ type: 'pointerMove', x, y, duration: 50 }]
    })
    return this
  }

  /**
   * Press and hold a mouse button.
   */
  mouseDown(button = 0, modifier?: ModifierKey): this {
    this.modifierDown(modifier)
    this._pending.push(async (_driver) => [{ type: 'pointerDown', button: toButton(button) }])
    this.modifierUp(modifier)
    return this
  }

  /**
   * Release a mouse button.
   */
  mouseUp(button = 0, modifier?: ModifierKey): this {
    this.modifierDown(modifier)
    this._pending.push(async (_driver) => [{ type: 'pointerUp', button: toButton(button) }])
    this.modifierUp(modifier)
    return this
  }

  /**
   * Scroll the mouse wheel.
   */
  mouseWheel(
    deltaX: number,
    deltaY = 0,
    location?: PointLike,
    offset?: PointLike,
    modifier?: ModifierKey
  ): this {
    this.modifierDown(modifier)
    this._pending.push(async (driver) => {
      let x = 0
      let y = 0
      if (location) {
        const converted = await worldToPageCoordinates(driver, location)
        x = Math.round(converted.x + (offset?.x ?? 0))
        y = Math.round(converted.y + (offset?.y ?? 0))
      }
      return [{ type: 'scroll', x, y, deltaX, deltaY }]
    })
    this.modifierUp(modifier)
    return this
  }

  /**
   * Hold down a modifier key.
   */
  modifierDown(key?: ModifierKey): this {
    if (key) {
      this._pending.push(async (_driver) => [{ type: 'keyDown', key: toSeleniumKey(key) }])
    }
    return this
  }

  /**
   * Release a modifier key.
   */
  modifierUp(key?: ModifierKey): this {
    if (key) {
      this._pending.push(async (_driver) => [{ type: 'keyUp', key: toSeleniumKey(key) }])
    }
    return this
  }

  /**
   * Wait for a specified duration.
   */
  wait(duration: number): this {
    this._pending.push(async (_driver) => [{ type: 'pause', duration }])
    return this
  }

  /**
   * Hover over a location.
   */
  hover(location: PointLike, duration = 500, offset?: PointLike): this {
    return this.moveTo(location, offset).wait(duration)
  }

  /**
   * Right-click (context menu).
   */
  contextMenu(location: PointLike, offset?: PointLike): this {
    return this.moveTo(location, offset).mouseDown(2).mouseUp(2)
  }

  /**
   * Execute all queued actions against the given driver.
   *
   * Phase 1 – resolve: iterate pending steps, converting world coordinates to
   * viewport pixels.  This produces a flat list of ResolvedAction descriptors
   * in the correct order.
   *
   * Phase 2 – dispatch: all actions are fed into a single driver.actions() chain
   * and dispatched with one perform() call. Selenium's Actions class manages
   * separate pointer/keyboard/wheel input sources internally and synchronizes
   * them with pause ticks, so mixing move/press/scroll/keyDown in one chain is
   * fully supported. 'scroll' actions use Actions.scroll()
   */
  async perform(driver: WebDriver): Promise<void> {
    // Phase 1: resolve all pending steps into a flat action list
    const allActions: ResolvedAction[] = []
    for (const step of this._pending) {
      const resolved = await step(driver)
      allActions.push(...resolved)
    }

    // Phase 2: build and dispatch a single actions chain
    let chain = driver.actions({ async: true })
    for (const action of allActions) {
      switch (action.type) {
        case 'pointerMove':
          chain = chain.move({
            x: action.x,
            y: action.y,
            origin: Origin.VIEWPORT,
            duration: action.duration
          })
          break
        case 'pointerDown':
          chain = chain.press(action.button)
          break
        case 'pointerUp':
          chain = chain.release(action.button)
          break
        case 'keyDown':
          chain = chain.keyDown(action.key)
          break
        case 'keyUp':
          chain = chain.keyUp(action.key)
          break
        case 'pause':
          chain = chain.pause(action.duration)
          break
        case 'scroll':
          // Actions.scroll(x, y, deltaX, deltaY, origin) is available in
          // Selenium 4 but not yet typed in @types/selenium-webdriver
          ;(chain as any).scroll(action.x, action.y, action.deltaX, action.deltaY, Origin.VIEWPORT)
          break
      }
    }
    await chain.perform()
  }
}

function toButton(button: number): Button {
  if (button === 2) {
    return Button.RIGHT
  }
  if (button === 1) {
    return Button.MIDDLE
  }
  return Button.LEFT
}

function toSeleniumKey(modifier: ModifierKey): string {
  switch (modifier) {
    case 'Shift':
      return Key.SHIFT
    case 'Control':
      return Key.CONTROL
    case 'Alt':
      return Key.ALT
    case 'Meta':
      return Key.META
    case 'ControlOrMeta':
      return Key.CONTROL
  }
}
