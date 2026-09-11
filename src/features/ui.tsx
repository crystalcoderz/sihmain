// Shared presentation helpers for the console feature pages.

export const riskClass = (value: string): string | undefined =>
  ({ LOW: 'low', MODERATE: 'moderate', MEDIUM: 'moderate', HIGH: 'high', CRITICAL: 'critical' } as Record<string, string>)[value]

export const statusClass = (value: string): string => value.toLowerCase().replaceAll(' ', '-')

export function Badge({ value }: { value: string }) {
  return <span className={`badge ${riskClass(value) ?? statusClass(value)}`}>{value}</span>
}

export const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

// Palette drawn from the control-room theme so charts stay on-brand.
export const chartPalette = {
  teal: '#2cd6ab',
  tealDeep: '#168f9b',
  amber: '#eec279',
  amberDeep: '#de9a26',
  red: '#ef8990',
  redDeep: '#dd5252',
  blue: '#63b5c8',
  grid: '#22456533',
  axis: '#8ca8be',
  surface: '#0c2038',
  border: '#28506c',
}
