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
export const companyData = {
  nodes: [
    {
      id: 0,
      name: 'Big Data Group',
      nodeType: 'Dual Resident',
      units: 500.0,
      jurisdiction: 'UK/EU',
      taxStatus: 'Taxable',
      currency: 'GBP/EUR'
    },
    {
      id: 1,
      name: 'Investment Capital',
      nodeType: 'Corporation',
      units: 100.0,
      jurisdiction: 'US',
      taxStatus: 'Taxable',
      currency: 'USD'
    },
    {
      id: 2,
      name: 'Capital',
      nodeType: 'Branch',
      units: 200,
      jurisdiction: 'US',
      taxStatus: 'Taxable',
      currency: 'USD'
    },
    {
      id: 3,
      name: 'Connect Partner',
      jurisdiction: 'UK',
      nodeType: 'RCTB',
      taxStatus: 'Pass through',
      currency: 'GBP',
      units: 50
    },
    {
      id: 4,
      name: 'Monster Inc',
      nodeType: 'Corporation',
      jurisdiction: 'Germany',
      taxStatus: 'Taxable',
      currency: 'EUR',
      units: 800.0
    },
    {
      id: 5,
      name: 'Micro Group',
      nodeType: 'Trust',
      jurisdiction: 'Spain',
      taxStatus: 'Taxable',
      currency: 'EUR'
    },
    {
      id: 6,
      name: 'Anon Investment',
      nodeType: 'Third Party',
      jurisdiction: 'US',
      taxStatus: 'Taxable',
      currency: 'USD'
    },
    { id: 7, name: 'Eric Joplin', nodeType: 'Individual', jurisdiction: 'US' },
    { id: 8, name: 'Melissa Barner', nodeType: 'Individual', jurisdiction: 'Germany' },
    {
      id: 9,
      name: 'International Group',
      nodeType: 'PE_Risk',
      jurisdiction: 'Italy',
      taxStatus: 'Taxable',
      currency: 'EUR',
      units: 2.0
    },
    {
      id: 10,
      name: 'Limited Trust',
      nodeType: 'Trust',
      jurisdiction: 'US',
      taxStatus: 'Taxable',
      currency: 'USD'
    },
    {
      id: 11,
      name: 'Large Scale Trust',
      nodeType: 'Trust',
      jurisdiction: 'UK',
      taxStatus: 'Taxable',
      currency: 'GBP'
    },
    {
      id: 12,
      name: 'Investment Group Inc',
      nodeType: 'Corporation',
      jurisdiction: 'India',
      taxStatus: 'Taxable',
      currency: 'INR',
      units: 200.0
    },
    {
      id: 13,
      name: 'Service Group Inc',
      nodeType: 'Corporation',
      jurisdiction: 'Mexico',
      taxStatus: 'Taxable',
      currency: 'MXN',
      units: 3.0
    },
    {
      id: 15,
      name: 'Family Trust',
      nodeType: 'Trust',
      jurisdiction: 'Germany',
      taxStatus: 'Taxable',
      currency: 'EUR'
    }
  ],
  edges: [
    { id: 1, type: 'Hierarchy', ownership: 0.6, sourceId: 0, targetId: 2 },
    { id: 2, type: 'Hierarchy', ownership: 0.4, sourceId: 0, targetId: 1 },
    { id: 3, type: 'Hierarchy', ownership: 0.7, sourceId: 1, targetId: 3 },
    { id: 4, type: 'Hierarchy', ownership: 0.6, sourceId: 2, targetId: 3 },
    { id: 5, type: 'Hierarchy', ownership: 0.4, sourceId: 4, targetId: 0 },
    { id: 6, type: 'Hierarchy', ownership: 0.4, sourceId: 5, targetId: 1 },
    { id: 7, type: 'Hierarchy', ownership: 0.5, sourceId: 6, targetId: 0 },
    { id: 9, type: 'Relation', sourceId: 1, targetId: 2 },
    { id: 10, type: 'Hierarchy', ownership: 0.3, sourceId: 7, targetId: 4 },
    { id: 11, type: 'Hierarchy', ownership: 0.3, sourceId: 8, targetId: 9 },
    { id: 12, type: 'Hierarchy', ownership: 0.6, sourceId: 9, targetId: 2 },
    { id: 13, type: 'Hierarchy', ownership: 0.3, sourceId: 9, targetId: 6 },
    { id: 14, type: 'Hierarchy', ownership: 0.5, sourceId: 9, targetId: 10 },
    { id: 15, type: 'Hierarchy', ownership: 0.3, sourceId: 10, targetId: 2 },
    { id: 17, type: 'Hierarchy', ownership: 0.4, sourceId: 11, targetId: 4 },
    { id: 18, type: 'Hierarchy', ownership: 0.4, sourceId: 3, targetId: 12 },
    { id: 19, type: 'Hierarchy', ownership: 0.5, sourceId: 3, targetId: 13 },
    { id: 21, type: 'Hierarchy', ownership: 0.2, sourceId: 15, targetId: 9 },
    { id: 22, type: 'Relation', sourceId: 7, targetId: 6 },
    { id: 24, type: 'Hierarchy', ownership: 0.2, sourceId: 11, targetId: 3 },
    { id: 25, type: 'Hierarchy', ownership: 0.2, sourceId: 8, targetId: 6 },
    { id: 27, type: 'Relation', sourceId: 15, targetId: 2 }
  ]
}
