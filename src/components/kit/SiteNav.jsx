import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Phone Scanner', to: '/scan' },
  { label: 'Plans', to: '/plans' },
  { label: 'Support', to: '/support' }
];

const LOGO = 'https://media.base44.com/images/public/6a0db3181169f42924052c0d/650b247a7_amazon.PNG';

const desktopLink = ({ isActive }) =>
  cn('transition-colors hover:text-foreground', isActive ? 'font-semibold text-foreground' : 'text-muted-foreground');

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth
      .me()
      .then((me) => setUser(me || null))
      .catch(() => setUser(null));
  }, []);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" onClick={close} className="flex items-center gap-2.5">
          <img src={LOGO} alt="SIFT AI" className="h-7 w-auto rounded-sm object-contain" />
          <span className="font-heading text-sm font-bold tracking-tight sm:text-base">SIFT AI</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium lg:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={desktopLink}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Admin
                </Link>
              )}
              <Link to="/scanner" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                My device tools
              </Link>
              <Link to="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                My runs
              </Link>
              <Button size="sm" variant="outline" onClick={() => base44.auth.logout('/')}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Log in
              </Link>
              <Link to="/register">
                <Button size="sm">Create account</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={close}
                className={({ isActive }) =>
                  cn('border-b border-border/50 py-3 text-sm font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="flex flex-col gap-2 py-4">
              {user ? (
                <>
                  <Link to="/scanner" onClick={close}>
                    <Button variant="outline" className="w-full">
                      My device tools
                    </Button>
                  </Link>
                  <Link to="/dashboard" onClick={close}>
                    <Button variant="outline" className="w-full">
                      My runs
                    </Button>
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" onClick={close}>
                      <Button variant="outline" className="w-full">
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" className="w-full" onClick={() => base44.auth.logout('/')}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={close}>
                    <Button variant="outline" className="w-full">
                      Log in
                    </Button>
                  </Link>
                  <Link to="/register" onClick={close}>
                    <Button className="w-full">Create account</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}