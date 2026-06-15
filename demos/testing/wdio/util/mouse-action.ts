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
import { getItemWorldLocation, getPageCoordinates } from './graph-util'

export type PointLike = { x: number; y: number }
export type PointLikeArgs =
  | PointLike
  | { _nodeIndex?: number; _edgeIndex?: number; _labelIndex?: number }
export type ModifierKeys = 'Shift' | 'Control' | 'Alt' | 'Meta' | 'ControlOrMeta'

/**
 * Creates a new MouseAction builder.
 */
export function mouseAction() {
  return new MouseAction()
}

/**
 * A convenience class for building complex mouse and keyboard interactions with a fluent API.
 */
class MouseAction {
  private static instances = 0

  private readonly actionBuilders: ((
    resolve: (p: PointLikeArgs) => Promise<PointLike>
  ) => Promise<void>)[] = []
  // noinspection IncrementDecrementResultUsedJS
  private readonly id = MouseAction.instances++
  private readonly actions: any[] = []

  /**
   * Click at the specified location.
   */
  click(location: PointLikeArgs, button = 0, offset?: PointLike, modifier?: ModifierKeys) {
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
  ) {
    return this.moveTo(from, offset)
      .mouseDown(button, modifier)
      .moveTo(to, offset)
      .mouseUp(button, modifier)
  }

  /**
   * Move mouse to the specified location.
   */
  moveTo(location: PointLikeArgs, offset?: PointLike) {
    this.actionBuilders.push(async (resolve) => {
      const actualLocation = await resolve(location)
      const x = Math.floor(actualLocation.x + (offset?.x ?? 0))
      const y = Math.floor(actualLocation.y + (offset?.y ?? 0))
      this.actions.push({ type: 'pointerMove', duration: 0, x, y })
    })
    return this
  }

  /**
   * Press and hold a mouse button.
   */
  mouseDown(button = 0, modifiers?: ModifierKeys) {
    if (modifiers) {
      this.modifierDown(modifiers)
    }
    this.actionBuilders.push(async () => {
      this.actions.push({ type: 'pointerDown', button })
    })
    return this
  }

  /**
   * Release a mouse button.
   */
  mouseUp(button = 0, modifiers?: ModifierKeys) {
    this.actionBuilders.push(async () => {
      this.actions.push({ type: 'pointerUp', button })
    })
    if (modifiers) {
      this.modifierUp(modifiers)
    }
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
  ) {
    if (modifier) {
      this.modifierDown(modifier)
    }
    this.actionBuilders.push(async (resolve) => {
      let x = 0
      let y = 0
      if (location) {
        const actualLocation = await resolve(location)
        x = Math.floor(actualLocation.x + (offset?.x ?? 0))
        y = Math.floor(actualLocation.y + (offset?.y ?? 0))
        // Move pointer to target location so the event reaches the right element
        this.actions.push({ type: 'pointerMove', duration: 0, x, y })
      }
      this.actions.push({ type: 'scroll', x, y, deltaX, deltaY, duration: 0 })
    })
    if (modifier) {
      this.modifierUp(modifier)
    }
    return this
  }

  /**
   * Hold down a modifier key.
   */
  modifierDown(key?: ModifierKeys) {
    if (key) {
      this.actionBuilders.push(async () => {
        this.actions.push({ type: 'keyDown', value: this.mapModifierKey(key) })
      })
    }
    return this
  }

  /**
   * Release a modifier key.
   */
  modifierUp(key?: ModifierKeys) {
    if (key) {
      this.actionBuilders.push(async () => {
        this.actions.push({ type: 'keyUp', value: this.mapModifierKey(key) })
      })
    }
    return this
  }

  /**
   * Wait for a specified duration.
   */
  wait(duration: number) {
    this.actionBuilders.push(async () => {
      this.actions.push({ type: 'pause', duration })
    })
    return this
  }

  /**
   * Hover over a location.
   */
  hover(location: PointLikeArgs, duration = 500, offset?: PointLike) {
    return this.moveTo(location, offset).wait(duration)
  }

  /**
   * Right-click (context menu).
   */
  contextMenu(location: PointLikeArgs, offset?: PointLike) {
    return this.moveTo(location, offset).mouseDown(2).mouseUp(2)
  }

  private mapModifierKey(key: ModifierKeys): string {
    switch (key) {
      case 'Shift':
        return '\uE008'
      case 'Control':
      case 'ControlOrMeta':
        return '\uE009'
      case 'Alt':
        return '\uE00A'
      case 'Meta':
        return '\uE03D'
      default:
        return key
    }
  }

  /**
   * Resolves passed GraphComponent world-coordinate location as page location.
   */
  private async resolveLocation(location: PointLikeArgs): Promise<PointLike> {
    if (
      typeof (location as any)._nodeIndex === 'number' ||
      typeof (location as any)._edgeIndex === 'number' ||
      typeof (location as any)._labelIndex === 'number'
    ) {
      const point = await getItemWorldLocation(location as any)
      return await getPageCoordinates(point)
    } else {
      return await getPageCoordinates(location as any)
    }
  }

  /**
   * Execute all queued actions.
   */
  async perform() {
    // Build all actions in order
    for (const builder of this.actionBuilders) {
      await builder((loc) => this.resolveLocation(loc))
    }

    // The WebDriver protocol requires separate action chains per input source type
    // (pointer, key, wheel). We pad each chain with 'pause' at positions where
    // another chain has an action, so all chains stay synchronized.
    const pointerChain: any[] = []
    const keyChain: any[] = []
    const wheelChain: any[] = []

    const hasKeyActions = this.actions.some((a) => a.type === 'keyDown' || a.type === 'keyUp')
    const hasWheelActions = this.actions.some((a) => a.type === 'scroll')

    for (const action of this.actions) {
      const isKey = action.type === 'keyDown' || action.type === 'keyUp'
      const isWheel = action.type === 'scroll'

      if (isKey) {
        pointerChain.push({ type: 'pause', duration: 0 })
        keyChain.push(action)
        if (hasWheelActions) {
          wheelChain.push({ type: 'pause', duration: 0 })
        }
      } else if (isWheel) {
        pointerChain.push({ type: 'pause', duration: 0 })
        if (hasKeyActions) {
          keyChain.push({ type: 'pause', duration: 0 })
        }
        wheelChain.push(action)
      } else {
        pointerChain.push(action)
        if (hasKeyActions) {
          keyChain.push({ type: 'pause', duration: 0 })
        }
        if (hasWheelActions) {
          wheelChain.push({ type: 'pause', duration: 0 })
        }
      }
    }

    const actionSources: any[] = [
      {
        type: 'pointer',
        parameters: { pointerType: 'mouse' },
        id: `mouse-${this.id}`,
        actions: pointerChain
      }
    ]

    if (hasKeyActions) {
      actionSources.push({ type: 'key', id: `keyboard-${this.id}`, actions: keyChain })
    }

    if (hasWheelActions) {
      actionSources.push({ type: 'wheel', id: `wheel-${this.id}`, actions: wheelChain })
    }

    await browser.performActions(actionSources)
  }
}
