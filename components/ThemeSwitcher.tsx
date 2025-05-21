'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';

export function ThemeSwitcher() {
  const { setTheme } = useTheme();

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => setTheme('light')}
        className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label="Set light theme"
      >
        <Sun className="h-5 w-5" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label="Set dark theme"
      >
        <Moon className="h-5 w-5" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label="Set system theme"
      >
        <Laptop className="h-5 w-5" />
      </button>
    </div>
  );
}
