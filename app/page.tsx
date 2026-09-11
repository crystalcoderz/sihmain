import { getState } from '@/lib/db'
import ConsoleApp from '@/src/App'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const initial = await getState()
  return <ConsoleApp initial={initial} />
}
