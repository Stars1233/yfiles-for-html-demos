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
'use client'
import dynamic from 'next/dynamic'
import React, { useCallback, useState } from 'react'
import '@fontsource/material-symbols-outlined/300.css'

// render the graph component and its provider only client side
const ClientSideGraph = dynamic(() => import('@/app/components/ClientSideGraph'), {
  ssr: false,
  loading: () => <div className={'main-loader'}></div>
})

export interface NodeData {
  id: number
  name: string
}

export interface EdgeData {
  fromNode: number
  toNode: number
}

export interface GraphData {
  nodesSource: NodeData[]
  edgesSource: EdgeData[]
}

const INITIAL_GRAPH_DATA = {
  nodesSource: [
    { id: 0, name: 'Node 0' },
    { id: 1, name: 'Node 1' },
    { id: 2, name: 'Node 2' }
  ],
  edgesSource: [
    { fromNode: 0, toNode: 1 },
    { fromNode: 0, toNode: 2 }
  ]
}

export default function Home() {
  const [graphData, setGraphData] = useState(INITIAL_GRAPH_DATA)

  const addNode = useCallback(() => {
    const newIdx = graphData.nodesSource.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1
    const parentNodeIdx = Math.floor(Math.random() * graphData.nodesSource.length)
    setGraphData((prevGraphData) => {
      const nodesSource = prevGraphData.nodesSource.concat({ id: newIdx, name: `Node ${newIdx}` })

      // Create an edge if the graph was not empty
      let edgesSource = prevGraphData.edgesSource
      if (parentNodeIdx > -1) {
        edgesSource = prevGraphData.edgesSource.concat({
          fromNode: nodesSource[parentNodeIdx].id,
          toNode: newIdx
        })
      }

      return { nodesSource, edgesSource }
    })
  }, [graphData, setGraphData])

  const removeNode = useCallback(() => {
    setGraphData((prevGraphData) => {
      const randomNodeIdx = Math.floor(Math.random() * prevGraphData.nodesSource.length)
      const newNodesSource = [...prevGraphData.nodesSource]
      newNodesSource.splice(randomNodeIdx, 1)

      const nodeId = prevGraphData.nodesSource[randomNodeIdx].id
      const newEdgesSource = prevGraphData.edgesSource.filter(
        (edge) => edge.fromNode !== nodeId && edge.toNode !== nodeId
      )
      return { nodesSource: newNodesSource, edgesSource: newEdgesSource }
    })
  }, [setGraphData])

  const resetData = useCallback(() => {
    setGraphData(INITIAL_GRAPH_DATA)
  }, [setGraphData])

  return (
    <main id="root">
      <div className="app">
        <div className="demo-header">
          <a
            href="https://www.yfiles.com/the-yfiles-sdk/web/yfiles-for-html"
            className="y-logo"
            target="_blank"
            title="yFiles Product Page"
          ></a>
          <span className="material-symbols-outlined demo-overview">chevron_right</span>
          <a href="../../../README.html" target="_blank" rel="noopener noreferrer">
            Demos
          </a>
          <span className="material-symbols-outlined demo-overview">chevron_right</span>
          <span>Next.js Demo</span>
        </div>
        <ClientSideGraph
          graphData={graphData}
          onResetData={resetData}
          addNode={addNode}
          removeNode={removeNode}
        />
      </div>
    </main>
  )
}
