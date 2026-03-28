'use client';

import { PackageSearch } from 'lucide-react';

export default function CatalogPage() {
  return (
    <div className="flex-1 flex flex-col bg-background">

      {/* Empty State */}
      <div className="flex-1 flex items-center justify-center px-4 pb-24">
        <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <PackageSearch className="w-9 h-9 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            No items yet
          </h3>
          <p className="text-text-muted text-sm max-w-sm mx-auto leading-relaxed">
            Your item catalog will appear here. Start recording sales to automatically build your product catalog.
          </p>
        </div>
      </div>
    </div>
  );
}
