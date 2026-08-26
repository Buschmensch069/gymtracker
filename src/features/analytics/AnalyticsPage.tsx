import { PageHeader } from '../../components/layout/PageHeader'
import { useUnitPreference } from '../../hooks/useSettings'
import { ConsistencyChart } from './ConsistencyChart'
import { ExerciseProgressSection } from './ExerciseProgressSection'
import { PRList } from './PRList'
import { TonnageChart } from './TonnageChart'
import { useAnalyticsData } from './useAnalyticsData'
import { WeeklyMuscleSetsChart } from './WeeklyMuscleSetsChart'

export function AnalyticsPage() {
  const data = useAnalyticsData()
  const [unit] = useUnitPreference()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Analytics" />
      <div className="flex-1 scroll-touch px-4 py-4">
        {data === undefined ? null : (
          <div className="space-y-8 pb-4">
            <Section title="Weekly Sets by Muscle Group" subtitle="Last 8 weeks · working sets only">
              <WeeklyMuscleSetsChart data={data} />
            </Section>

            <Section title="Estimated 1RM">
              <ExerciseProgressSection data={data} unit={unit} />
            </Section>

            <Section title="Tonnage per Workout">
              <TonnageChart data={data} unit={unit} />
            </Section>

            <Section title="Consistency" subtitle="Workouts per week · last 12 weeks">
              <ConsistencyChart data={data} />
            </Section>

            <Section title="Personal Records">
              <PRList data={data} unit={unit} />
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}
