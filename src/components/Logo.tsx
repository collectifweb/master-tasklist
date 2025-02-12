import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-90 transition-opacity">
      MASTER TASKLIST
    </Link>
  )
}