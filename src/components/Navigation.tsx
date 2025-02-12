import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Menu, ListTodo, CheckSquare, Plus, Home, FolderTree } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Logo from './Logo';

const Navigation = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => router.pathname === path;

  const menuItems = [
    { href: '/tasks', label: 'Tâches actives', icon: ListTodo },
    { href: '/tasks/completed', label: 'Tâches terminées', icon: CheckSquare },
    { href: '/tasks/add', label: 'Nouvelle tâche', icon: Plus },
    { href: '/categories', label: 'Gérer les catégories', icon: FolderTree },
  ];

  const mobileMenuItems = [
    { href: '/tasks', label: 'Tâches actives', icon: ListTodo },
    { href: '/tasks/add', label: 'Nouvelle tâche', icon: Plus },
    { href: '/tasks/completed', label: 'Tâches terminées', icon: CheckSquare },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-4 mb-8">
        {menuItems.map(({ href, label }) => (
          <Button
            key={href}
            variant={isActive(href) ? 'default' : 'ghost'}
            asChild
          >
            <Link href={href}>{label}</Link>
          </Button>
        ))}
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="fixed top-0 left-0 right-0 p-4 flex items-center justify-between bg-background z-50 border-b">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="py-4">
                <Logo />
              </div>
              <div className="space-y-4">
                {menuItems.map(({ href, label, icon: Icon }) => (
                  <Button
                    key={href}
                    variant={isActive(href) ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => {
                      router.push(href);
                      setIsOpen(false);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Logo />
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
          <div className="flex justify-around p-2">
            {mobileMenuItems.map(({ href, icon: Icon }) => (
              <Button
                key={href}
                variant="ghost"
                size="icon"
                className={isActive(href) ? 'text-primary' : ''}
                onClick={() => router.push(href)}
              >
                <Icon className="h-6 w-6" />
              </Button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export { Navigation };