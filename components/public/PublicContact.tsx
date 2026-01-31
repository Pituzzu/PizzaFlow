
import React from 'react';
import { MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import { SiteConfig } from '../../types';

interface PublicContactProps {
    config: SiteConfig;
}

export function PublicContact({ config }: PublicContactProps) {
    return (
        <section className="py-24 px-6 bg-[#fafaf9]">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                <div className="space-y-12">
                    <div className="space-y-4">
                        <h2 className="font-serif text-5xl md:text-7xl font-black text-[#1c1917] italic">Vieni a Trovarci</h2>
                        <p className="text-xl text-stone-500 font-light">Un'esperienza di gusto nel cuore della città.</p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="group bg-white p-6 rounded-[32px] shadow-sm border border-stone-100 flex items-center gap-6 hover:shadow-lg transition-all">
                            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-[#800020] group-hover:bg-[#800020] group-hover:text-white transition-colors">
                                <MapPin size={28}/>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-1">Indirizzo</div>
                                <div className="text-xl font-bold text-[#1c1917]">{config.contactAddress}</div>
                            </div>
                        </div>

                        <div className="group bg-white p-6 rounded-[32px] shadow-sm border border-stone-100 flex items-center gap-6 hover:shadow-lg transition-all">
                            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-[#800020] group-hover:bg-[#800020] group-hover:text-white transition-colors">
                                <Phone size={28}/>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-1">Telefono</div>
                                <div className="text-xl font-bold text-[#1c1917]">{config.contactPhone}</div>
                            </div>
                        </div>

                        <div className="group bg-white p-6 rounded-[32px] shadow-sm border border-stone-100 flex items-center gap-6 hover:shadow-lg transition-all">
                            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-[#800020] group-hover:bg-[#800020] group-hover:text-white transition-colors">
                                <Mail size={28}/>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-1">Email</div>
                                <div className="text-xl font-bold text-[#1c1917]">{config.contactEmail}</div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.contactAddress)}`, '_blank')} 
                        className="w-full flex items-center justify-center gap-3 py-6 bg-[#1c1917] text-white rounded-[32px] font-black uppercase tracking-widest hover:bg-[#800020] transition-all shadow-2xl active:scale-95"
                    >
                        Vedi sulla Mappa <ExternalLink size={20}/>
                    </button>
                </div>

                <div className="bg-white p-4 rounded-[48px] shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 h-[600px]">
                    <div className="w-full h-full rounded-[40px] overflow-hidden bg-stone-200">
                        <iframe 
                            title="Mappa" 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            src={`https://www.google.com/maps?q=${encodeURIComponent(config.contactAddress)}&output=embed`}
                            style={{filter: 'grayscale(1) contrast(1.2) opacity(0.8)'}}
                        ></iframe>
                    </div>
                </div>
            </div>
        </section>
    );
}
