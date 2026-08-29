import type { ReactNode } from 'react'
import { ArrowUpDown, Flag, Hash, Minus, Plus, RefreshCw } from 'lucide-react'
import { ActionSheet, ActionSheetItem } from '../../components/ui/ActionSheet'
import type { RoutineUpdatePlan } from './routineUpdate'

interface UpdateRoutineSheetProps {
  plan: RoutineUpdatePlan
  /** Overwrite the routine's exercises/order/target sets, then finish. */
  onUpdate: () => void
  /** Finish and leave the routine alone. */
  onSkip: () => void
  /** Back out of finishing altogether. */
  onClose: () => void
}

/**
 * Offered on Finish when the session drifted from the routine it was started
 * from — the routine is a record of what I actually do, not a plan I'm meant
 * to obey, so it should follow the session rather than the other way round.
 *
 * A bottom ActionSheet rather than a full Sheet: it is a two-choice decision
 * with a short list of evidence above it, and it lands at the end of a workout
 * when the phone is already in one hand. Dismissing (Cancel / the scrim) is a
 * third answer, not a fourth: it returns to the workout without finishing it,
 * so a mis-tap on Finish can't cost the session.
 */
export function UpdateRoutineSheet({ plan, onUpdate, onSkip, onClose }: UpdateRoutineSheetProps) {
  return (
    <ActionSheet title={plan.routineName} onClose={onClose}>
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm text-slate-400">
          This session doesn&apos;t match the routine. Update the routine to what you just did?
        </p>
        <ul className="mt-3 max-h-52 scroll-touch space-y-1.5">
          {plan.addedNames.map((name) => (
            <ChangeLine key={`add-${name}`} icon={<Plus size={14} />} tone="text-emerald-400">
              Add {name}
            </ChangeLine>
          ))}
          {plan.removedNames.map((name) => (
            <ChangeLine key={`remove-${name}`} icon={<Minus size={14} />} tone="text-red-400">
              Remove {name}
            </ChangeLine>
          ))}
          {plan.setChanges.map((change) => (
            <ChangeLine
              key={`sets-${change.exerciseName}`}
              icon={<Hash size={14} />}
              tone="text-slate-400"
            >
              {change.exerciseName}{' '}
              <span className="tabular-nums text-slate-300">
                {change.from} → {change.to}
              </span>{' '}
              {change.to === 1 ? 'set' : 'sets'}
            </ChangeLine>
          ))}
          {plan.orderChanged && (
            <ChangeLine icon={<ArrowUpDown size={14} />} tone="text-slate-400">
              Exercise order changed
            </ChangeLine>
          )}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Rep ranges and rest timers are kept as they are.</p>
      </div>

      <ActionSheetItem onSelect={onUpdate} leading={<RefreshCw size={18} />}>
        Update Routine
      </ActionSheetItem>
      <ActionSheetItem onSelect={onSkip} leading={<Flag size={18} />}>
        Finish Without Updating
      </ActionSheetItem>
    </ActionSheet>
  )
}

function ChangeLine({
  icon,
  tone,
  children,
}: {
  icon: ReactNode
  tone: string
  children: ReactNode
}) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-200">
      <span className={`mt-0.5 shrink-0 ${tone}`}>{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  )
}
