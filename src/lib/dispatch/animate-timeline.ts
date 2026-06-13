import type { DispatchStageRecord } from './stage-tracker';
import { markTimelineRunning, markTimelineSuccess } from './client-timeline';

const STAGE_MS = 180;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reveal completed server stages one-by-one for smooth UI (no skipped spinners). */
export async function animateTimelineCompletion(
  initial: DispatchStageRecord[],
  finalStages: DispatchStageRecord[],
  onUpdate: (next: DispatchStageRecord[]) => void,
): Promise<DispatchStageRecord[]> {
  let current = initial.map((s) => ({ ...s, status: 'pending' as const }));
  onUpdate(current);

  for (const stage of initial) {
    const target = finalStages.find((f) => f.id === stage.id);
    if (!target || target.status === 'pending') continue;

    if (target.status === 'failed') {
      current = current.map((s) => (s.id === stage.id ? { ...s, ...target } : s));
      onUpdate(current);
      return current;
    }

    current = markTimelineRunning(current, stage.id);
    onUpdate(current);
    await sleep(STAGE_MS);

    current = markTimelineSuccess(current, stage.id);
    onUpdate(current);
    await sleep(STAGE_MS);
  }

  return current;
}
