'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, Menu, X, LogOut, LayoutDashboard, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/integrations/supabase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={[
          'w-full max-w-5xl rounded-[30px] border transition-all duration-300',
          'bg-card/60 backdrop-blur-xl backdrop-saturate-150',
          isScrolled
            ? 'border-border/60 shadow-card bg-card/80'
            : 'border-border/30 shadow-soft',
        ].join(' ')}
      >
        <div className="px-5 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full gradient-accent flex items-center justify-center shadow-glow">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">EventSnap AI</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <a
              href="#demo"
              className="px-3.5 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
            >
              Demo
            </a>
            <a
              href="#"
              className="px-3.5 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
            >
              Features
            </a>
            <Link
              href="/pricing"
              className="px-3.5 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
            >
              Pricing
            </Link>

            <div className="w-px h-5 bg-border/50 mx-2" />

            <div className="flex items-center gap-2">
              <Button variant="hero" size="sm" className="rounded-full px-5" asChild>
                <Link href="/book-demo">Book a Demo</Link>
              </Button>

              {user ? (
                <>
                  {role === 'organizer' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link href="/dashboard">
                        <LayoutDashboard className="w-4 h-4 mr-1.5" />
                        Dashboard
                      </Link>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-9 h-9 rounded-full overflow-hidden border-2 border-border/50 hover:border-accent/50 bg-secondary/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                        {user.user_metadata?.avatar_url ? (
                          <img
                            src={user.user_metadata.avatar_url}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl mt-2">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.user_metadata?.full_name || 'My Account'}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="text-destructive cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 flex flex-col gap-1">
                <a
                  href="#demo"
                  className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Demo
                </a>
                <a
                  href="#"
                  className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
                >
                  Features
                </a>
                <Link
                  href="/pricing"
                  className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
                >
                  Pricing
                </Link>

                <div className="my-2 h-px bg-border/40" />

                <Button variant="hero" size="default" className="w-full rounded-xl" asChild>
                  <Link href="/book-demo">Book a Demo</Link>
                </Button>

                {user ? (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex items-center justify-center flex-shrink-0">
                        {user.user_metadata?.avatar_url ? (
                          <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium text-foreground truncate">{user.user_metadata?.full_name || 'My Account'}</span>
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-destructive text-destructive bg-white hover:bg-destructive hover:text-white transition-all flex-shrink-0"
                      >
                        <LogOut className="w-4 h-4" />
                        Log out
                      </button>
                    </div>
                    {role === 'organizer' && (
                      <Link
                        href="/dashboard"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-accent text-accent bg-white hover:bg-accent hover:text-white transition-all w-full"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                    )}
                  </div>
                ) : (
                  <Button variant="ghost" size="default" className="w-full rounded-xl mt-1" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
