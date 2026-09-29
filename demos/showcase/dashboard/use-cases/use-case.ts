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
import type { VIEW_REGISTRY, ViewId } from '../components/views/view-registry'
import type { DashboardData } from '../types'

/**
 * Maps view IDs to their corresponding component instances.
 * Only includes views declared in the use case's viewIds array.
 * Provides type-safe access to configured view components.
 *
 * @template TIds - Union of view ID strings declared by the use case
 */
export type ResolvedViews<TIds extends ViewId> = {
  [K in TIds]: ReturnType<(typeof VIEW_REGISTRY)[K]>
}

/**
 * UseCase Interface
 *
 * Defines a complete dashboard configuration for a specific domain (electricity, healthcare, etc.).
 * Declares which views are visible, loads the dataset, and configures each view's behavior.
 * TypeScript ensures only declared views are accessible in configureViews.
 *
 * @template TViewIds - Union of view ID strings this use case displays
 */
export interface UseCase<TViewIds extends ViewId = ViewId> {
  /** Unique identifier for the use case (e.g., 'electricity', 'healthcare') */
  id: string

  /** Display label shown in UI (e.g., 'Electricity Network') */
  label: string

  /**
   * Array of view IDs to display in the dashboard.
   * Only these views will be instantiated and shown.
   * Example: ['legend', 'topology', 'pie', 'properties']
   */
  viewIds: TViewIds[]

  /**
   * Loads and returns the complete dashboard dataset.
   * Called once when use case is activated.
   *
   * @returns DashboardData with nodes and edges
   */
  loadData(): DashboardData

  /**
   * Configures behavior of each view declared in viewIds.
   * Set style providers, filters, event handlers, and other view-specific settings.
   *
   * @param views - Resolved map of view instances with correct types
   */
  configureViews(views: ResolvedViews<TViewIds>): void
}
