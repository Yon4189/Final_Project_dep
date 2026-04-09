import React from 'react';
import { Linkedin, Mail, Phone, Send } from 'lucide-react';
import logo from '../assets/logo.jpg';

const LandingFooter = () => {
  const developerInfo = [
    { name: 'Yonas', role: 'Frontend web developer' },
    { name: 'Natnayel', role: 'Backend developer' },
    { name: 'Yoseph', role: 'Frontend mobile developer' }
  ];

  return (
    <footer className="bg-slate-900 text-white py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-16 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center">
                <img src={logo} alt="Ethio HandyMan Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-black tracking-tighter">Ethio HandyMan</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Empowering local economies through secure and reliable home-based service connections.
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="text-lg font-bold">Developers</h4>
            <div className="space-y-4">
              {developerInfo.map((dev, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="font-bold text-blue-400">{dev.name}</span>
                  <span className="text-slate-400 text-xs">{dev.role}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-lg font-bold">Contact Us</h4>
            <div className="space-y-3 text-slate-400 text-sm">
              <p className="flex items-center gap-3">
                <Mail size={16} className="text-blue-400" />
                <a href="mailto:animawabate@gmail.com" className="hover:text-white transition-colors">animawabate@gmail.com</a>
              </p>
              <p className="flex items-center gap-3">
                <Phone size={16} className="text-blue-400" />
                <a href="tel:+251927061530" className="hover:text-white transition-colors">+251 9 27 06 15 30</a>
              </p>
            </div>
            <div className="flex gap-4 pt-2">
              <a href="https://t.me/Yon_4189" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-400 transition-colors" title="Telegram">
                <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
              </a>
              <a href="https://www.linkedin.com/in/yonas-abate-5877063b6" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors" title="LinkedIn">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-bold uppercase tracking-widest">
          <p>&copy; 2026 Ethio HandyMan. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
