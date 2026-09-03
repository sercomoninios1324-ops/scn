

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, Laptop, Settings } from 'lucide-react';
import { ScnLogo } from './ScnLogo';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isAdminLoggedIn: boolean;
  onLogout: () => void;
}

export default function Navbar({ currentPage, setCurrentPage, isAdminLoggedIn, onLogout }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
      
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const navLinks = [
    { name: 'Inicio', id: 'home' },
    { name: 'Productos', id: 'products' },
    { name: 'Guía de compra', id: 'guide' },
    { name: 'Contacto', id: 'contact' },
  ];

  return (
    <header id="header-nav" className="sticky top-0 z-50 w-full border-b border-scn-border bg-scn-bg-general/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        
        <div 
          id="logo-scn"
          onClick={() => setCurrentPage('home')} 
          className="flex cursor-pointer items-center space-x-2.5"
        >
          <ScnLogo size={42} />
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg leading-tight tracking-tight text-scn-text-title">
              SCN
            </span>
            <span className="text-xs font-medium tracking-wider uppercase text-scn-text-secondary">
              Seamos como niños
            </span>
          </div>
        </div>

        
        <nav id="desktop-nav" className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <button
              id={`nav-link-${link.id}`}
              key={link.id}
              onClick={() => setCurrentPage(link.id)}
              className={`font-sans text-sm font-medium transition-colors hover:text-scn-primary cursor-pointer ${
                currentPage === link.id
                  ? 'text-scn-primary font-semibold'
                  : 'text-scn-text-normal'
              }`}
            >
              {link.name}
            </button>
          ))}
          {isAdminLoggedIn && (
            <button
              id="nav-link-admin"
              onClick={() => setCurrentPage('admin')}
              className={`flex items-center space-x-1.5 font-sans text-sm font-medium text-amber-500 hover:text-amber-600 cursor-pointer ${
                currentPage === 'admin' ? 'font-bold underline decoration-2' : ''
              }`}
            >
              <Settings size={15} />
              <span>Panel Admin</span>
            </button>
          )}
        </nav>

        
        <div className="hidden md:flex items-center space-x-4">
          <button
            id="theme-toggle-desktop"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-scn-border bg-scn-bg-card text-scn-text-normal transition-colors hover:bg-scn-bg-section cursor-pointer"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {isAdminLoggedIn && (
            <button
              id="admin-logout-btn"
              onClick={onLogout}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Cerrar Sesión
            </button>
          )}
        </div>

        
        <div className="flex md:hidden items-center space-x-2">
          <button
            id="theme-toggle-mobile"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-scn-border bg-scn-bg-card text-scn-text-normal transition-colors hover:bg-scn-bg-section"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <button
            id="mobile-menu-toggle"
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-scn-border bg-scn-bg-card text-scn-text-normal transition-colors hover:bg-scn-bg-section"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      
      {isOpen && (
        <div id="mobile-menu-container" className="md:hidden border-t border-scn-border bg-scn-bg-general/95 backdrop-blur-md">
          <div className="space-y-1 px-4 py-3 sm:px-6">
            {navLinks.map((link) => (
              <button
                id={`mobile-nav-link-${link.id}`}
                key={link.id}
                onClick={() => {
                  setCurrentPage(link.id);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-base font-medium transition-all ${
                  currentPage === link.id
                    ? 'bg-scn-primary/10 text-scn-primary font-semibold'
                    : 'text-scn-text-normal hover:bg-scn-bg-section hover:text-scn-text-title'
                }`}
              >
                {link.name}
              </button>
            ))}
            {isAdminLoggedIn && (
              <button
                id="mobile-nav-link-admin"
                onClick={() => {
                  setCurrentPage('admin');
                  setIsOpen(false);
                }}
                className={`flex w-full items-center space-x-2 px-3 py-2.5 rounded-lg text-base font-medium text-amber-500 hover:bg-scn-bg-section ${
                  currentPage === 'admin' ? 'bg-amber-500/10 font-bold' : ''
                }`}
              >
                <Settings size={18} />
                <span>Panel Administrador</span>
              </button>
            )}
            
            {isAdminLoggedIn && (
              <div className="border-t border-scn-border pt-4 pb-2">
                <button
                  id="mobile-logout-btn"
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                  className="block w-full text-center px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
