import type { DispatchStageRecord, DispatchStageStatus } from "./stage-tracker"
import {
  AGREEMENT_SEND_STAGES,
  DOCUMENT_SEND_CLIENT_UPLOAD,
  DOCUMENT_SEND_SUCCESS,
  DOCUMENT_SEND_STAGES,
} from "./stage-tracker"

export function createDocumentSendTimeline(): DispatchStageRecord[] {
  return [
    { id: DOCUMENT_SEND_CLIENT_UPLOAD.id, label: DOCUMENT_SEND_CLIENT_UPLOAD.label, status: "pending" },
    ...DOCUMENT_SEND_STAGES.map((s) => ({ id: s.id, label: s.label, status: "pending" as DispatchStageStatus })),
    { id: DOCUMENT_SEND_SUCCESS.id, label: DOCUMENT_SEND_SUCCESS.label, status: "pending" },
  ]
}

export function patchTimelineStage(
  stages: DispatchStageRecord[],
  id: string,
  patch: Partial<DispatchStageRecord>,
): DispatchStageRecord[] {
  return stages.map((s) => (s.id === id ? { ...s, ...patch } : s))
}

export function markTimelineRunning(stages: DispatchStageRecord[], id: string): DispatchStageRecord[] {
  const now = new Date().toISOString()
  return patchTimelineStage(stages, id, { status: "running", startedAt: now, error: undefined })
}

export function markTimelineSuccess(stages: DispatchStageRecord[], id: string): DispatchStageRecord[] {
  const now = new Date().toISOString()
  return stages.map((s) => {
    if (s.id !== id) return s
    const durationMs = s.startedAt ? new Date(now).getTime() - new Date(s.startedAt).getTime() : undefined
    return { ...s, status: "success", completedAt: now, durationMs }
  })
}

export function markTimelineFailed(
  stages: DispatchStageRecord[],
  id: string,
  error: string,
): DispatchStageRecord[] {
  const now = new Date().toISOString()
  return patchTimelineStage(stages, id, {
    status: "failed",
    completedAt: now,
    error,
  })
}

export function createAgreementSendTimeline(): DispatchStageRecord[] {
  return AGREEMENT_SEND_STAGES.map((s) => ({
    id: s.id,
    label: s.label,
    status: "pending" as DispatchStageStatus,
  }))
}

export function mergeServerDispatchStages(
  stages: DispatchStageRecord[],
  serverStages: DispatchStageRecord[] | undefined,
): DispatchStageRecord[] {
  if (!serverStages?.length) return stages
  return stages.map((s) => {
    const remote = serverStages.find((r) => r.id === s.id)
    return remote ? { ...s, ...remote } : s
  })
}
