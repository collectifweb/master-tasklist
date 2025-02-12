import Link from 'next/link'

export default function Logo() {
  return (
    <Link href="/tasks" className="text-2xl font-bold tracking-tight hover:opacity-90 transition-opacity">
      MASTER TASKLIST
    </Link>
  )
}