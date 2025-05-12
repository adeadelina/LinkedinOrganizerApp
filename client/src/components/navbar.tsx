import React from 'react';
import { Link } from 'wouter';

export function Navbar() {
  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="ml-auto flex items-center space-x-4">
          {/* Add other navbar items here if needed */}
        </div>
      </div>
    </nav>
  );
}