// Shared helpers for the recurrence "rule + exceptions" model.
//
// A recurring occurrence is NOT a stored row — it's generated from a rule
// (recurring_tasks) for a given date. To let the client act on one occurrence
// (complete / skip / move / edit) we give it a synthetic id that encodes the
// series id and the occurrence's own date. Server actions decode it and write a
// row in recurring_exceptions instead of mutating a task row.
//
//   one-off task      -> id is the real tasks.id (integer, as a string)
//   recurring occ.    -> id is  "r:<recurring_task_id>:<occurrence_date>"

export const OCC_PREFIX = 'r:'

export function makeOccId(recurringTaskId: string, occurrenceDate: string): string {
  return `${OCC_PREFIX}${recurringTaskId}:${occurrenceDate}`
}

export function parseOccId(
  id: string,
): { recurringTaskId: string; occurrenceDate: string } | null {
  if (!id.startsWith(OCC_PREFIX)) return null
  const rest = id.slice(OCC_PREFIX.length)
  // recurring_task_id is a uuid (contains hyphens), occurrence_date is trailing
  // YYYY-MM-DD — split on the LAST colon.
  const i = rest.lastIndexOf(':')
  if (i < 0) return null
  return { recurringTaskId: rest.slice(0, i), occurrenceDate: rest.slice(i + 1) }
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export type RecurringRule = {
  id: string
  title: string
  bucket: 'must_do' | 'nice_to_have'
  task_type: string | null
  description: string | null
  recurrence_day: number
  frequency: 'weekly' | 'daily'
  starts_on: string | null
  ends_on: string | null
}

export type RecurringException = {
  recurring_task_id: string
  occurrence_date: string
  completed_date: string | null
  skipped_date: string | null
  moved_to_date: string | null
  title: string | null
  description: string | null
  task_type: string | null
}

export type ExpandedOccurrence = {
  id: string
  title: string
  bucket: 'must_do' | 'nice_to_have'
  due_date: string
  recurring_task_id: string
  completed_date: string | null
  skipped_date: string | null
  category: null
  task_type: string | null
  description: string | null
}

// Expand a set of rules over [windowStart, windowEnd] (inclusive, YYYY-MM-DD)
// and overlay any exceptions. Each generated occurrence gets a synthetic id
// keyed on the rule + its occurrence date, so completing one doesn't touch the
// others.
export function expandRules(
  rules: RecurringRule[],
  exceptions: RecurringException[],
  windowStart: string,
  windowEnd: string,
): ExpandedOccurrence[] {
  const exByKey = new Map<string, RecurringException>()
  for (const ex of exceptions) {
    exByKey.set(`${ex.recurring_task_id}:${ex.occurrence_date}`, ex)
  }

  const out: ExpandedOccurrence[] = []
  const start = new Date(windowStart + 'T12:00:00')
  const end = new Date(windowEnd + 'T12:00:00')

  for (const r of rules) {
    const cur = new Date(start)
    while (cur <= end) {
      const ds = toDateStr(cur)
      cur.setDate(cur.getDate() + 1)

      if (r.starts_on && ds < r.starts_on) continue
      if (r.ends_on && ds > r.ends_on) continue
      if (r.frequency === 'weekly' && new Date(ds + 'T12:00:00').getDay() !== r.recurrence_day) {
        continue
      }
      // daily: every date in range

      const ex = exByKey.get(`${r.id}:${ds}`)
      out.push({
        id: makeOccId(r.id, ds),
        title: ex?.title ?? r.title,
        bucket: r.bucket,
        due_date: ex?.moved_to_date ?? ds,
        recurring_task_id: r.id,
        completed_date: ex?.completed_date ?? null,
        skipped_date: ex?.skipped_date ?? null,
        category: null,
        task_type: ex?.task_type ?? r.task_type,
        description: ex?.description ?? r.description,
      })
    }
  }
  return out
}

// Expand rules for the display window [windowStart, windowEnd], PLUS carry
// forward missed recurring occurrences the same way one-off tasks carry: a
// recurring task you didn't complete keeps showing as overdue until you resolve
// it, instead of silently vanishing once its date passes.
//
// Expansion runs from `carryStart` (e.g. 60 days back) so pre-window occurrences
// are visible. For each rule we surface at most ONE overdue occurrence — the
// most recent still-open one before the window — so a daily rule can't flood the
// list with weeks of misses (and legacy pre-migration completions, which live on
// old task rows rather than exceptions, stay collapsed away).
//
// Retired series (ends_on before the window) are never carried — retiring a
// recurring task means "stop nagging me", not "resurface every past miss".
export function expandRulesWithCarry(
  rules: RecurringRule[],
  exceptions: RecurringException[],
  carryStart: string,
  windowStart: string,
  windowEnd: string,
): ExpandedOccurrence[] {
  const all = expandRules(rules, exceptions, carryStart, windowEnd)

  const inWindow = all.filter(o => o.due_date >= windowStart)

  const retired = new Set(
    rules.filter(r => r.ends_on && r.ends_on < windowStart).map(r => r.id),
  )

  // Most-recent still-open occurrence per rule, strictly before the window.
  const carried = new Map<string, ExpandedOccurrence>()
  for (const o of all) {
    if (o.due_date >= windowStart) continue
    if (o.completed_date || o.skipped_date) continue
    if (retired.has(o.recurring_task_id)) continue
    const prev = carried.get(o.recurring_task_id)
    if (!prev || o.due_date > prev.due_date) carried.set(o.recurring_task_id, o)
  }

  return [...inWindow, ...carried.values()]
}
