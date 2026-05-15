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
import { type GraphComponent } from '@yfiles/yfiles'

describe('yfiles spec', () => {
  beforeEach(() => {
    // Set the viewport size, otherwise we'll get the mobile "first view" of the
    // testing application (see comment below), and that is basically the description panel.
    cy.viewport(1920, 1080)
  })

  it('should increase edge count by 1', () => {
    /**
     * We assume that the yFiles demo server is running.
     * If not, please start it with the appropriate script or change
     * the URL below to an application you would like to test.
     */
    cy.visit(
      new URL(
        'testing/application-under-test/index.html',
        Cypress.env('testingUrl') || 'http://localhost:4241/demos-ts/'
      ).href
    )

    cy.get('.loaded').should('exist')

    cy.window().then((win) => {
      const graphComponent = (win as Cypress.AUTWindow & { graphComponent: GraphComponent })
        .graphComponent

      expect(graphComponent, 'graphComponent').to.exist

      const startEdges = graphComponent.graph.edges.size

      cy.get('#create-edge').click()

      cy.then(() => {
        const endEdges = graphComponent.graph.edges.size
        expect(endEdges).to.equal(startEdges + 1)
      })
    })
  })
})
