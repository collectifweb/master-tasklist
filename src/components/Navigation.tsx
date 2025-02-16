import Link from 'next/link'
import { Menu, Plus, CheckSquare } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Logo } from './Logo'

export function Navigation() {
  const SecondaryMenu = () => (
    <div className="flex flex-col space-y-4">
      <Link href="/categories" className="text-sm">
        Gérer les catégories
      </Link>
      <Link href="/configuration" className="text-sm">
        Configuration
      </Link>
    </div>
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
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="mt-8">
              <SecondaryMenu />
            </div>
          </SheetContent>
        </Sheet>
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
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="mt-8">
                <SecondaryMenu />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden flex items-center justify-between mb-8 mx-auto max-w-[1400px] px-4">
        <Link href="/" className="mr-4">
          <Logo />
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="mt-8">
              <SecondaryMenu />
            </div>
          </SheetContent>
        </Sheet>
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