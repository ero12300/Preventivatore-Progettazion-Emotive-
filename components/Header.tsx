
import React from 'react';
import { NavProps, AppView } from '../types';

const Header: React.FC<NavProps> = ({ currentView, setView }) => {
  const logoLetters = ['E', 'M', 'O', 'T', 'I', 'V', 'E'];

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-[#050505]/98 border-b border-white/5 h-20 md:h-24 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto h-full flex justify-between items-center px-3 sm:px-4 md:px-12">
        
        {/* Branding Group */}
        <div 
          className="cursor-pointer flex items-center gap-3 sm:gap-5 md:gap-8 group h-full py-3 md:py-4"
          onClick={() => setView(AppView.HOME)}
        >
          <div className="flex flex-col items-center justify-between h-full py-1">
            <div className="flex flex-col items-center">
              {logoLetters.map((char, i) => (
                <span 
                  key={i} 
                  className="text-[10px] md:text-[11px] font-black leading-[0.9] text-white group-hover:text-brand-gold transition-colors duration-300 select-none"
                >
                  {char}
                </span>
              ))}
            </div>
            <div className="w-1.5 h-1.5 bg-brand-gold"></div>
          </div>
          
          <div className="h-10 w-px bg-white/10 hidden sm:block"></div>
          
          <div className="hidden sm:flex flex-col justify-center">
            <p className="text-[10px] font-black tracking-[0.6em] uppercase text-white group-hover:text-brand-gold transition-all duration-500">
              Format — Concept
            </p>
            <p className="text-[7px] font-medium tracking-[0.3em] uppercase text-white/30 mt-1">
              Architectural Strategy
            </p>
          </div>
        </div>
        
        <nav className="flex items-center space-x-3 sm:space-x-5 md:space-x-12">
          <button
            onClick={() => setView(AppView.ADMIN_PRICING)}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all hidden md:block"
          >
            Admin
          </button>
          {currentView !== AppView.HOME && (
            <button 
              onClick={() => setView(AppView.HOME)}
              className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 hover:text-white transition-all hidden md:block"
            >
              Home
            </button>
          )}
          
          <button 
            onClick={() => setView(AppView.CREATE_QUOTE)}
            className="btn-emotive-primary !px-4 sm:!px-7 md:!px-10 !py-3 md:!py-4 !text-[10px] sm:!text-[11px] !tracking-[0.12em] sm:!tracking-[0.16em] md:!tracking-[0.2em]"
          >
            Crea Preventivo
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
