import Link from 'next/link'
import { Menu, Plus, CheckSquare, LogOut } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Logo } from './Logo'
import { AnnouncementNotification } from './AnnouncementNotification'
import { FeedbackNotification } from './FeedbackNotification'
import { useState, useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'
import { useRouter } from 'next/router'
import { useRole } from '@/hooks/useRole'

export function Navigation() {
  const { user, signOut } = useContext(AuthContext)
  const router = useRouter()
  const { isAdmin } = useRole()

  if (!user) {
    return null
  }
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const SecondaryMenu = () => (
    <div id="secondary-menu" className="flex flex-col space-y-4">
      <Link id="categories-link" href="/categories" className="text-sm" onClick={() => setOpen(false)}>
        Gérer les catégories
      </Link>
      <Link id="configuration-link" href="/configuration" className="text-sm" onClick={() => setOpen(false)}>
        Configuration
      </Link>
      <Link id="feedback-link" href="/feedback" className="text-sm" onClick={() => setOpen(false)}>
        Donner une rétroaction
      </Link>
      {isAdmin() && (
        <>
          <Link id="announcements-admin-link" href="/admin/announcements" className="text-sm" onClick={() => setOpen(false)}>
            Gestion des annonces
          </Link>
          <Link id="feedback-admin-link" href="/admin/feedback" className="text-sm flex items-center gap-2" onClick={() => setOpen(false)}>
            Gestion des retours
            <FeedbackNotification />
          </Link>
          <Link id="keep-alive-link" href="/admin/keep-alive" className="text-sm" onClick={() => setOpen(false)}>
            Keep-Alive Admin
          </Link>
          <Link id="debug-user-link" href="/debug-user" className="text-sm" onClick={() => setOpen(false)}>
            Debug Utilisateur
          </Link>
        </>
      )}
      <button id="signout-btn" onClick={handleSignOut} className="text-sm text-left text-destructive">
        Déconnexion
      </button>
    </div>
  )

  const SheetWithTitle = () => (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button id="menu-trigger" variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent id="menu-sheet">
        <SheetTitle id="menu-title">Menu</SheetTitle>
        <SheetDescription id="menu-description" className="sr-only">
          Menu de navigation principal
        </SheetDescription>
        <div id="menu-content" className="mt-8">
          <SecondaryMenu />
        </div>
      </SheetContent>
    </Sheet>
  )

  return (
    <>
      {/* Desktop Navigation */}
      <nav id="desktop-nav" className="hidden lg:flex items-center justify-between mb-8 mx-auto max-w-[1400px] px-8 py-4 app-header">
        <div id="desktop-nav-links" className="flex items-center space-x-2">
          <Link id="desktop-logo-link" href="/" className="mr-6">
            <Logo />
          </Link>

          <Link id="desktop-active-tasks-link" href="/tasks" className="nav-link focus-ring">
            Tâches actives
          </Link>
          <Link id="desktop-completed-tasks-link" href="/tasks/completed" className="nav-link focus-ring">
            Tâches terminées
          </Link>
          <Link id="desktop-new-task-link" href="/tasks/add" className="nav-link focus-ring">
            Nouvelle tâche
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <AnnouncementNotification />
          <SheetWithTitle />
        </div>
      </nav>

      {/* Tablet Navigation */}
      <nav id="tablet-nav" className="hidden md:flex lg:hidden items-center justify-between mb-8 mx-auto max-w-[1400px] px-8 py-4 app-header">
        <Link id="tablet-logo-link" href="/" className="mr-4">
          <Logo />
        </Link>
        <div id="tablet-nav-actions" className="flex items-center space-x-4">
          <Link id="tablet-add-task-link" href="/tasks/add">
            <Button id="tablet-add-task-btn" variant="ghost" size="icon" className="focus-ring">
              <Plus className="h-6 w-6" />
            </Button>
          </Link>
          <Link id="tablet-completed-tasks-link" href="/tasks/completed">
            <Button id="tablet-completed-tasks-btn" variant="ghost" size="icon" className="focus-ring">
              <CheckSquare className="h-6 w-6" />
            </Button>
          </Link>
          <AnnouncementNotification />
          <SheetWithTitle />
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav id="mobile-nav" className="md:hidden flex items-center justify-between mb-8 mx-auto max-w-[1400px] px-4 py-4 app-header">
        <Link id="mobile-logo-link" href="/" className="mr-4">
          <Logo />
        </Link>
        <div className="flex items-center space-x-2">
          <AnnouncementNotification />
          <SheetWithTitle />
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-center space-x-8 shadow-lg">
        <Link id="mobile-add-task-link" href="/tasks/add">
          <Button id="mobile-add-task-btn" variant="ghost" size="icon" className="focus-ring">
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
        <Link id="mobile-completed-tasks-link" href="/tasks/completed">
          <Button id="mobile-completed-tasks-btn" variant="ghost" size="icon" className="focus-ring">
            <CheckSquare className="h-6 w-6" />
          </Button>
        </Link>
      </div>
    </>
  )
}