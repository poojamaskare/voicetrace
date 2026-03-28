'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell } from 'lucide-react';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Home', subtitle: 'Record and analyze your sales' },
  '/dashboard': { title: 'Dashboard', subtitle: 'Your sales performance at a glance' },
  '/catalog': { title: 'Catalog', subtitle: 'Manage your items and products' },
};

export default function Navbar() {
  const pathname = usePathname();
  const page = PAGE_TITLES[pathname] || { title: 'VoiceTrace', subtitle: '' };

  return (
    <header
      id="navbar"
      className="sticky top-0 z-30 w-full h-16 bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-8 shrink-0"
    >
      {/* Left — Page title (offset on mobile for hamburger) */}
      <div className="pl-12 md:pl-0">
        <h1 className="text-lg font-semibold text-text-primary leading-tight">
          {page.title}
        </h1>
        <p className="text-xs text-text-muted leading-tight hidden sm:block">
          {page.subtitle}
        </p>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          id="navbar-search"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-colors"
          aria-label="Search"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>

        {/* Notifications */}
        <button
          id="navbar-notifications"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-light transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          {/* Dot indicator */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold ml-1 cursor-pointer hover:shadow-md transition-shadow">
          V
        </div>
      </div>
    </header>
  );
}
