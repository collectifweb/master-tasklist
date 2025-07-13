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
    <div id="secondary-menu" className="flex flex-col space-y-2">
      <Link 
        id="categories-link" 
        href="/categories" 
        className="mobile-nav-item text-base hover:bg-accent hover:text-accent-foreground rounded-md transition-colors" 
        onClick={() => setOpen(false)}
      >
        Gérer les catégories
      </Link>
      <Link 
        id="configuration-link" 
        href="/configuration" 
        className="mobile-nav-item text-base hover:bg-accent hover:text-accent-foreground rounded-md transition-colors" 
        onClick={() => setOpen(false)}
      >
        Configuration
      </Link>
      <Link 
        id="feedback-link" 
        href="/feedback" 
        className="mobile-nav-item text-base hover:bg-accent hover:text-accent-foreground rounded-md transition-colors" 
        onClick={() => setOpen(false)}
      >
        Donner une rétroaction
      </Link>
      {isAdmin() && (
        <>
          <Link 
            id="announcements-admin-link" 
            href="/admin/announcements" 
            className="mobile-nav-item text-base hover:bg-accent hover:text-accent-foreground rounded-md transition-colors" 
            onClick={() => setOpen(false)}
          >
            Gestion des annonces
          </Link>
          <Link 
            id="feedback-admin-link" 
            href="/admin/feedback" 
            className="mobile-nav-item text-base flex items-center gap-2 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors" 
            onClick={() => setOpen(false)}
          >
            Gestion des retours
            <FeedbackNotification />
          </Link>
          <Link 
            id="keep-alive-link" 
            href="/admin/keep-alive" 
            className="mobile-nav-item text-base hover:bg-accent hover:text-accent-foreground rounded-md transition-colors" 
            onClick={() => setOpen(false)}
          >
            Keep-Alive Admin
          </Link>
          <Link 
            id="debug-user-link" 
            href="/debug-user" 
            className="mobile-nav-item text-base hover:bg-accent hover:text-accent-foreground rounded-md transition-colors" 
            onClick={() => setOpen(false)}
          >
            Debug Utilisateur
          </Link>
        </>
      )}
      <button 
        id="signout-btn" 
        onClick={handleSignOut} 
        className="mobile-nav-item text-base text-left text-destructive hover:bg-destructive/10 rounded-md transition-colors"
      >
        Déconnexion
      </button>
    </div>
  )

  const SheetWithTitle = () => (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button id="menu-trigger" variant="ghost" className="mobile-touch-target p-2">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent id="menu-sheet" className="w-[300px] sm:w-[400px]">
        <SheetTitle id="menu-title" className="text-lg font-semibold">Menu</SheetTitle>
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
      <div id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t mobile-bottom-nav">
        <div className="flex justify-center items-center px-4 py-3 space-x-12">
          <Link id="mobile-add-task-link" href="/tasks/add" className="flex flex-col items-center space-y-1">
            <Button id="mobile-add-task-btn" variant="ghost" className="mobile-touch-target p-3 rounded-full">
              <Plus className="h-6 w-6" />
            </Button>
            <span className="text-xs text-muted-foreground">Nouvelle</span>
          </Link>
          <Link id="mobile-tasks-link" href="/tasks" className="flex flex-col items-center space-y-1">
            <Button id="mobile-tasks-btn" variant="ghost" className="mobile-touch-target p-3 rounded-full">
              <CheckSquare className="h-6 w-6" />
            </Button>
            <span className="text-xs text-muted-foreground">Actives</span>
          </Link>
          <Link id="mobile-completed-tasks-link" href="/tasks/completed" className="flex flex-col items-center space-y-1">
            <Button id="mobile-completed-tasks-btn" variant="ghost" className="mobile-touch-target p-3 rounded-full">
              <CheckSquare className="h-6 w-6 opacity-60" />
            </Button>
            <span className="text-xs text-muted-foreground">Terminées</span>
          </Link>
        </div>
      </div>
    </>
  )
}