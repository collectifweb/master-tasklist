import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="logo-text hover:opacity-90 transition-all duration-200 focus-ring">
      <span className="font-bold">MASTER</span>{' '}
      <span className="font-normal">TASKLIST</span>
    </Link>
  )
}