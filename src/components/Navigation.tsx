import Link from 'next/link'
import { Menu, Plus, CheckSquare, LogOut } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Logo } from './Logo'
import { useState, useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'
import { useRouter } from 'next/router'

export function Navigation() {
  const { user, signOut } = useContext(AuthContext)
  const router = useRouter()

  if (!user) {
    return null
  }
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const SecondaryMenu = () => (
    <div className="flex flex-col space-y-4">
      <Link href="/categories" className="text-sm" onClick={() => setOpen(false)}>
        Gérer les catégories
      </Link>
      <Link href="/configuration" className="text-sm" onClick={() => setOpen(false)}>
        Configuration
      </Link>
      <Link href="/admin/keep-alive" className="text-sm" onClick={() => setOpen(false)}>
        Keep-Alive Admin
      </Link>
      <button onClick={handleSignOut} className="text-sm text-left text-destructive">
        Déconnexion
      </button>
    </div>
  )

  const SheetWithTitle = () => (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle>Menu</SheetTitle>
        <div className="mt-8">
          <SecondaryMenu />
        </div>
      </SheetContent>
    </Sheet>
  )

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center justify-between mb-8 mx-auto max-w-[1400px] px-8">
        <div className="flex items-center space-x-4">
          <Link href="/" className="mr-4">
            <Logo />
          </Link>
          <Link href="/" className="nav-link">
            Tâches actives
          </Link>
          <Link href="/tasks/completed" className="nav-link">
            Tâches terminées
          </Link>
          <Link href="/tasks/add" className="nav-link">
            Nouvelle tâche
          </Link>
        </div>
        <SheetWithTitle />
      </nav>

      {/* Tablet Navigation */}
      <nav className="hidden md:flex lg:hidden items-center justify-between mb-8 mx-auto max-w-[1400px] px-8">
        <Link href="/" className="mr-4">
          <Logo />
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/tasks/add">
            <Button variant="ghost" size="icon">
              <Plus className="h-6 w-6" />
            </Button>
          </Link>
          <Link href="/tasks/completed">
            <Button variant="ghost" size="icon">
              <CheckSquare className="h-6 w-6" />
            </Button>
          </Link>
          <SheetWithTitle />
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden flex items-center justify-between mb-8 mx-auto max-w-[1400px] px-4">
        <Link href="/" className="mr-4">
          <Logo />
        </Link>
        <SheetWithTitle />
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-center space-x-8">
        <Link href="/tasks/add">
          <Button variant="ghost" size="icon">
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
        <Link href="/tasks/completed">
          <Button variant="ghost" size="icon">
            <CheckSquare className="h-6 w-6" />
          </Button>
        </Link>
      </div>
    </>
  )
}