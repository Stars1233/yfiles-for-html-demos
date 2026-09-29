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
  type IInputModeContext,
  type ILookup,
  INode,
  type IPort,
  IPortCandidate,
  IPortCandidateProvider,
  IPortLocationModel,
  IPortLocationModelParameter,
  type IPortOwner,
  type Point
} from '@yfiles/yfiles'
import { getNodeElevationForGraph } from '../core/nodeElevation'
import { getProjectedHeightTranslation } from '../core/Pseudo3DProjection'
import type { Pseudo3DContext } from '../core/Pseudo3DContext'
import { getEdgeZAtLayoutPoint } from '../edge/terrain'

/** Wraps a port candidate so its feedback is shown on the projected terrain. */
class ProjectedPortCandidate extends BaseClass(IPortCandidate) {
  readonly original: IPortCandidate
  private readonly context: Pseudo3DContext

  constructor(original: IPortCandidate, context: Pseudo3DContext) {
    super()
    this.original = original
    this.context = context
  }

  get candidateTag(): any {
    return this.original.candidateTag
  }

  get validity() {
    return this.original.validity
  }

  get owner(): IPortOwner {
    return this.original.owner
  }

  get port(): IPort | null {
    return this.original.port
  }

  get locationParameter(): IPortLocationModelParameter {
    const projectionOwner = getProjectionOwner(this.original)
    return new ProjectedLocationParameter(
      this.original.locationParameter,
      projectionOwner,
      this.context
    )
  }

  createPort(inputModeContext: IInputModeContext): IPort {
    // The graph must retain ordinary 2D coordinates. Only the feedback
    // parameter is projected; the original candidate owns port creation.
    return this.original.createPort(inputModeContext)
  }

  getPortCandidateAt(inputModeContext: IInputModeContext, location: Point): IPortCandidate {
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
  private readonly projectedModel: IPortLocationModel
  private readonly owner: IPortOwner
  private readonly context: Pseudo3DContext
  readonly original: IPortLocationModelParameter

  constructor(original: IPortLocationModelParameter, owner: IPortOwner, context: Pseudo3DContext) {
    super()
    this.original = original
    this.owner = owner
    this.context = context
    this.projectedModel = new ProjectedLocationModel(original.model, owner, context)
  }

  get model(): IPortLocationModel {
    return this.projectedModel
  }

  clone(): this {
    return new ProjectedLocationParameter(this.original.clone(), this.owner, this.context) as this
  }
}

class ProjectedLocationModel extends BaseClass(IPortLocationModel) {
  readonly original: IPortLocationModel
  readonly owner: IPortOwner
  readonly context: Pseudo3DContext

  constructor(original: IPortLocationModel, owner: IPortOwner, context: Pseudo3DContext) {
    super()
    this.original = original
    this.owner = owner
    this.context = context
  }

  createParameter(owner: IPortOwner, location: Point): IPortLocationModelParameter {
    const baseLocation = location.subtract(
      getProjectedElevationOffset(owner, location, this.context)
    )
    return new ProjectedLocationParameter(
      this.original.createParameter(owner, baseLocation),
      owner,
      this.context
    )
  }

  getContext(port: IPort): ILookup {
    return this.original.getContext(port)
  }

  getLocation(port: IPort, locationParameter: IPortLocationModelParameter): Point {
    const parameter =
      locationParameter instanceof ProjectedLocationParameter
        ? locationParameter.original
        : locationParameter
    const baseLocation = this.original.getLocation(port, parameter)
    return baseLocation.add(getProjectedElevationOffset(this.owner, baseLocation, this.context))
  }
}

function wrapCandidate(candidate: IPortCandidate, context: Pseudo3DContext): IPortCandidate {
  return candidate instanceof ProjectedPortCandidate
    ? candidate
    : new ProjectedPortCandidate(candidate, context)
}

function unwrapCandidate(candidate: IPortCandidate): IPortCandidate {
  return candidate instanceof ProjectedPortCandidate ? candidate.original : candidate
}

function getProjectionOwner(candidate: IPortCandidate): IPortOwner {
  // Existing-port candidates can expose a different logical owner while the
  // port itself still identifies the node whose elevation must be projected.
  return candidate.port?.owner ?? candidate.owner
}

function getProjectedElevationOffset(
  owner: IPortOwner,
  baseLocation: Point,
  context: Pseudo3DContext
): Point {
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

export function wrapPortCandidateProvider(
  provider: IPortCandidateProvider,
  context: Pseudo3DContext
): IPortCandidateProvider {
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

export function wrapReconnectionPortCandidateProvider(
  provider: IEdgeReconnectionPortCandidateProvider,
  context: Pseudo3DContext
): IEdgeReconnectionPortCandidateProvider {
  return IEdgeReconnectionPortCandidateProvider.create({
    getSourcePortCandidates: (inputModeContext) =>
      wrapAll(provider.getSourcePortCandidates(inputModeContext), context),
    getTargetPortCandidates: (inputModeContext) =>
      wrapAll(provider.getTargetPortCandidates(inputModeContext), context)
  })
}

function wrapAll(
  candidates: IEnumerable<IPortCandidate>,
  context: Pseudo3DContext
): IEnumerable<IPortCandidate> {
  return IEnumerable.from(Array.from(candidates, (candidate) => wrapCandidate(candidate, context)))
}
