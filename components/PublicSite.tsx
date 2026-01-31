
import React, { useState } from 'react';
import { Pizza, Lock } from 'lucide-react';
import { MenuItem, OrderItem, OrderType } from '../types';
import { PublicHero } from './public/PublicHero';
import { PublicAbout } from './public/PublicAbout';
import { PublicContact } from './public/PublicContact';
import { PublicFooter } from './public/PublicFooter';
import { OrderModal } from './public/OrderModal';

export function PublicSite({ db, cart, setCart, orderType, setOrderType, onSubmit, onStaffAccess, showNotify }: any) {
  const [activeSection, setActiveSection] = useState<'home' | 'about' | 'contacts'>('home');
  const [showSuccess, setShowSuccess] = useState(false);
  const { siteConfig } = db.settings;

  const scrollToSection = (id: 'home' | 'about' | 'contacts') => {
      setActiveSection(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderSubmit = (formData: any) => {
      onSubmit(formData);
      setShowSuccess(true);
      setOrderType(null); // Close modal
  };

  return (
      <div className="public-theme min-h-screen bg-[#fafaf9] text-[#1c1917] font-sans selection:bg-[#800020] selection:text-white">
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e7e5e4; border-radius: 10px; }
          `}</style>

          <header className="sticky top-0 z-40 bg-[#fafaf9]/80 backdrop-blur-md border-b border-[#e7e5e4] transition-all duration-300">
              <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                  <div className="flex items-center gap-2 cursor-pointer group" onClick={() => scrollToSection('home')}>
                      <div className="bg-[#800020] text-white p-2 rounded-xl shadow-lg group-hover:rotate-12 transition-transform"><Pizza size={24}/></div>
                      <span className="font-serif font-black text-xl tracking-tight uppercase">Pizza Flow</span>
                  </div>
                  
                  <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-[#57534e]">
                      {['home', 'about', 'contacts'].map(sec => (
                          <button 
                            key={sec} 
                            onClick={() => scrollToSection(sec as any)} 
                            className={`hover:text-[#800020] transition-colors relative ${activeSection === sec ? 'text-[#1c1917]' : ''}`}
                          >
                              {sec === 'home' ? 'Home' : sec === 'about' ? 'Chi Siamo' : 'Contatti'}
                              {activeSection === sec && <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#800020]"></div>}
                          </button>
                      ))}
                  </nav>

                  <button onClick={() => setOrderType('choose')} className="bg-[#1c1917] text-white px-6 py-3 rounded-full font-bold text-xs hover:bg-[#800020] transition-all shadow-lg active:scale-95 uppercase tracking-widest">
                      Ordina Ora
                  </button>
              </div>
          </header>

          <main className="animate-in fade-in duration-700 pb-20">
              {activeSection === 'home' && <PublicHero config={siteConfig} onOrderClick={() => setOrderType('choose')} />}
              {activeSection === 'about' && <PublicAbout config={siteConfig} />}
              {activeSection === 'contacts' && <PublicContact config={siteConfig} />}
          </main>

          <PublicFooter config={siteConfig} onStaffAccess={onStaffAccess} onNavigate={scrollToSection} />

          {/* ORDER MODAL */}
          {orderType && (
              <OrderModal 
                  db={db}
                  orderType={orderType}
                  setOrderType={setOrderType}
                  cart={cart}
                  setCart={setCart}
                  onSubmit={handleOrderSubmit}
                  showNotify={showNotify}
                  onClose={() => setOrderType(null)}
              />
          )}

          {/* SUCCESS MODAL */}
          {showSuccess && (
              <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
                  <div className="bg-white p-12 rounded-[56px] shadow-2xl max-w-sm text-center space-y-8 border-t-8 border-[#800020]">
                      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-inner"><Lock size={56}/></div>
                      <div>
                          <h3 className="text-3xl font-black italic uppercase mb-3 text-[#1c1917]">Ricevuto!</h3>
                          <p className="text-stone-500 font-medium leading-relaxed">
                            Controlla <strong className="text-green-600">WhatsApp</strong>.<br/>Ti invieremo la conferma tra pochissimi istanti.
                          </p>
                      </div>
                      <button onClick={() => setShowSuccess(false)} className="w-full py-6 bg-[#1c1917] text-white font-black rounded-[28px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all">Perfetto</button>
                  </div>
              </div>
          )}
      </div>
  );
}
