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
import {
  BundledEdgeRouter,
  BundledEdgeRouterData,
  BundledEdgeRouterStrategy,
  Class,
  type GraphComponent,
  type ILayoutAlgorithm,
  type LayoutData
} from '@yfiles/yfiles'

import { LayoutConfiguration } from './LayoutConfiguration'
import {
  ComponentAttribute,
  EnumValuesAttribute,
  LabelAttribute,
  MinMaxAttribute,
  OptionGroup,
  OptionGroupAttribute,
  TypeAttribute
} from '@yfiles/demo-app/demo-option-editor'

/**
 * Configuration options for the layout algorithm of the same name.
 */
export const BundledEdgeRouterConfig = (Class as any)('BundledEdgeRouterConfig', {
  $extends: LayoutConfiguration,

  _meta: {
    LayoutGroup: [
      new LabelAttribute('General'),
      new OptionGroupAttribute('RootGroup', 10),
      new TypeAttribute(OptionGroup)
    ],
    descriptionText: [
      new OptionGroupAttribute('DescriptionGroup', 10),
      new ComponentAttribute('html-block'),
      new TypeAttribute(String)
    ],
    strategy: [
      new LabelAttribute(
        'Bundling Strategy',
        '#/api/BundledEdgeRouterStrategy#BundledEdgeRouterStrategy-property-strategy'
      ),
      new OptionGroupAttribute('LayoutGroup', 20),
      new EnumValuesAttribute([
        ['Spanner', BundledEdgeRouterStrategy.SPANNER],
        ['Voronoi', BundledEdgeRouterStrategy.VORONOI]
      ]),
      new TypeAttribute(Number)
    ],
    edgeBundlingStrengthItem: [
      new LabelAttribute(
        'Bundling Strength',
        '#/api/EdgeBundling#EdgeBundling-property-bundlingStrength'
      ),
      new OptionGroupAttribute('LayoutGroup', 30),
      new MinMaxAttribute(0, 1.0, 0.01),
      new ComponentAttribute('slider'),
      new TypeAttribute(Number)
    ]
  },

  /**
   * Setup default values for various configuration parameters.
   */
  constructor: function () {
    // @ts-ignore This is part of the old-school yFiles class definition used here
    LayoutConfiguration.call(this)
    const router = new BundledEdgeRouter()
    this.strategy = router.strategy
    this.edgeBundlingStrengthItem = 0.85
    this.title = 'Bundled Edge Router'
  },

  /**
   * Creates and configures a layout.
   * @param graphComponent The {@link GraphComponent} to apply the
   *   configuration on.
   * @returns The configured layout algorithm.
   */
  createConfiguredLayout: function (graphComponent: GraphComponent): ILayoutAlgorithm {
    const router = new BundledEdgeRouter()
    router.strategy = this.strategy
    router.edgeBundling.bundlingStrength = this.edgeBundlingStrengthItem
    return router
  },

  /**
   * Creates and configures the layout data.
   * @returns The configured layout data.
   */
  createConfiguredLayoutData: function (
    graphComponent: GraphComponent,
    layout: BundledEdgeRouter
  ): LayoutData {
    return new BundledEdgeRouterData()
  },

  /** @type {OptionGroup} */
  LayoutGroup: null,

  /** @type {string} */
  descriptionText: {
    get: function (): string {
      return (
        "<p style='margin-top:0'>The bundled edge routing algorithm merges the common parts of multiple " +
        'edges to increase the readability of dense graph drawings. </p>'
      )
    }
  },

  /** @type {number} */
  strategy: BundledEdgeRouterStrategy.SPANNER,

  /** @type {number} */
  edgeBundlingStrengthItem: 0.8
})
