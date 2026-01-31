
import React from 'react';
import { SiteConfig } from '../../types';

interface PublicAboutProps {
    config: SiteConfig;
}

export function PublicAbout({ config }: PublicAboutProps) {
    return (
        <section className="py-24 px-6 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto space-y-32">
                {/* Intro */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8 animate-in slide-in-from-left duration-700">
                        <div className="inline-block px-4 py-1 bg-stone-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-[#800020]">La Nostra Filosofia</div>
                        <h2 className="font-serif text-4xl md:text-6xl font-black text-[#1c1917] leading-none italic">{config.aboutTitle}</h2>
                        <p className="text-xl text-[#57534e] leading-relaxed font-light">{config.aboutText}</p>
                        <div className="grid grid-cols-2 gap-8 pt-4">
                            <div className="border-l-4 border-[#800020] pl-6">
                                <div className="text-4xl font-serif font-black text-[#1c1917]">100%</div>
                                <div className="text-xs font-black uppercase text-stone-400 tracking-widest">Grani Siciliani</div>
                            </div>
                            <div className="border-l-4 border-[#800020] pl-6">
                                <div className="text-4xl font-serif font-black text-[#1c1917]">48h</div>
                                <div className="text-xs font-black uppercase text-stone-400 tracking-widest">Lievitazione</div>
                            </div>
                        </div>
                    </div>
                    <div className="relative group animate-in slide-in-from-right duration-700">
                        <div className="absolute -inset-4 bg-[#800020] rounded-[48px] rotate-3 group-hover:rotate-0 transition-transform opacity-10"></div>
                        <img src={config.aboutImage} alt="Storia" className="relative rounded-[40px] shadow-2xl w-full h-[600px] object-cover" />
                    </div>
                </div>

                {/* Seconda Sezione */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="relative lg:order-1 order-2">
                        <div className="absolute -inset-4 bg-[#800020] rounded-[48px] -rotate-3 group-hover:rotate-0 transition-transform opacity-10"></div>
                        <img src={config.aboutImage2} alt="Passione" className="relative rounded-[40px] shadow-2xl w-full h-[600px] object-cover" />
                    </div>
                    <div className="space-y-8 lg:order-2 order-1 text-right flex flex-col items-end">
                        <h2 className="font-serif text-4xl md:text-6xl font-black text-[#1c1917] leading-none italic">{config.aboutTitle2}</h2>
                        <p className="text-xl text-[#57534e] leading-relaxed font-light">{config.aboutText2}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
