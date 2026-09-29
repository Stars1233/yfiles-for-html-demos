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
  BaseClass,
  IEdge,
  IEdgeReconnectionPortCandidateProvider,
  IEnumerable,
  INode,
  IPortCandidate,
  IPortCandidateProvider,
  IPortLocationModel,
  IPortLocationModelParameter
} from '@yfiles/yfiles'
import { getNodeElevationForGraph } from '../core/nodeElevation'
import { getProjectedHeightTranslation } from '../core/Pseudo3DProjection'
import { getEdgeZAtLayoutPoint } from '../edge/terrain'

/** Wraps a port candidate so its feedback is shown on the projected terrain. */
class ProjectedPortCandidate extends BaseClass(IPortCandidate) {
  original
  context

  constructor(original, context) {
    super()
    this.original = original
    this.context = context
  }

  get candidateTag() {
    return this.original.candidateTag
  }

  get validity() {
    return this.original.validity
  }

  get owner() {
    return this.original.owner
  }

  get port() {
    return this.original.port
  }

  get locationParameter() {
    const projectionOwner = getProjectionOwner(this.original)
    return new ProjectedLocationParameter(
      this.original.locationParameter,
      projectionOwner,
      this.context
    )
  }

  createPort(inputModeContext) {
    // The graph must retain ordinary 2D coordinates. Only the feedback
    // parameter is projected; the original candidate owns port creation.
    return this.original.createPort(inputModeContext)
  }

  getPortCandidateAt(inputModeContext, location) {
    const projectionOwner = getProjectionOwner(this.original)
    const unprojectedLocation = location.subtract(
      getProjectedElevationOffset(projectionOwner, location, this.context)
    )
    return new ProjectedPortCandidate(
      this.original.getPortCandidateAt(inputModeContext, unprojectedLocation),
      this.context
    )
  }
}

class ProjectedLocationParameter extends BaseClass(IPortLocationModelParameter) {
  projectedModel
  owner
  context
  original

  constructor(original, owner, context) {
    super()
    this.original = original
    this.owner = owner
    this.context = context
    this.projectedModel = new ProjectedLocationModel(original.model, owner, context)
  }

  get model() {
    return this.projectedModel
  }

  clone() {
    return new ProjectedLocationParameter(this.original.clone(), this.owner, this.context)
  }
}

class ProjectedLocationModel extends BaseClass(IPortLocationModel) {
  original
  owner
  context

  constructor(original, owner, context) {
    super()
    this.original = original
    this.owner = owner
    this.context = context
  }

  createParameter(owner, location) {
    const baseLocation = location.subtract(
      getProjectedElevationOffset(owner, location, this.context)
    )
    return new ProjectedLocationParameter(
      this.original.createParameter(owner, baseLocation),
      owner,
      this.context
    )
  }

  getContext(port) {
    return this.original.getContext(port)
  }

  getLocation(port, locationParameter) {
    const parameter =
      locationParameter instanceof ProjectedLocationParameter
        ? locationParameter.original
        : locationParameter
    const baseLocation = this.original.getLocation(port, parameter)
    return baseLocation.add(getProjectedElevationOffset(this.owner, baseLocation, this.context))
  }
}

function wrapCandidate(candidate, context) {
  return candidate instanceof ProjectedPortCandidate
    ? candidate
    : new ProjectedPortCandidate(candidate, context)
}

function unwrapCandidate(candidate) {
  return candidate instanceof ProjectedPortCandidate ? candidate.original : candidate
}

function getProjectionOwner(candidate) {
  // Existing-port candidates can expose a different logical owner while the
  // port itself still identifies the node whose elevation must be projected.
  return candidate.port?.owner ?? candidate.owner
}

function getProjectedElevationOffset(owner, baseLocation, context) {
  let elevation = 0
  if (owner instanceof INode) {
    elevation = getNodeElevationForGraph(context.graph, owner)
  } else if (owner instanceof IEdge) {
    elevation = getEdgeZAtLayoutPoint(owner, context.graph, baseLocation)
  }

  return getProjectedHeightTranslation(
    context.graphComponent.projection,
    elevation,
    context.projectionState.inclination
  )
}

export function wrapPortCandidateProvider(provider, context) {
  return IPortCandidateProvider.create({
    getAllSourcePortCandidates: (inputModeContext) =>
      wrapAll(provider.getAllSourcePortCandidates(inputModeContext), context),
    getAllTargetPortCandidates: (inputModeContext) =>
      wrapAll(provider.getAllTargetPortCandidates(inputModeContext), context),
    getSourcePortCandidates: (inputModeContext, target) =>
      wrapAll(provider.getSourcePortCandidates(inputModeContext, unwrapCandidate(target)), context),
    getTargetPortCandidates: (inputModeContext, source) =>
      wrapAll(provider.getTargetPortCandidates(inputModeContext, unwrapCandidate(source)), context)
  })
}

export function wrapReconnectionPortCandidateProvider(provider, context) {
  return IEdgeReconnectionPortCandidateProvider.create({
    getSourcePortCandidates: (inputModeContext) =>
      wrapAll(provider.getSourcePortCandidates(inputModeContext), context),
    getTargetPortCandidates: (inputModeContext) =>
      wrapAll(provider.getTargetPortCandidates(inputModeContext), context)
  })
}

function wrapAll(candidates, context) {
  return IEnumerable.from(Array.from(candidates, (candidate) => wrapCandidate(candidate, context)))
}
