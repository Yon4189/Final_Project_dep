import React from 'react';
import { Globe, Github, Linkedin, Mail } from 'lucide-react';
import logo from '../assets/logo.jpg';

const LandingFooter = () => {
  const developerInfo = [
    { name: 'Addisu', role: 'Full Stack Developer' },
    { name: 'Developer Team', role: 'Backend & Security' }
  ];

  return (
    <footer className="bg-slate-900 text-white py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-16 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center">
                <img src={logo} alt="HB_SFS Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-black tracking-tighter">HB_SFS</span>
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
            <h4 className="text-lg font-bold">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors">
                 <Globe size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors">
                 <Github size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors">
                 <Linkedin size={18} />
              </a>
              <a href="mailto:contact@hbsfs.com" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors">
                 <Mail size={18} />
              </a>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-bold uppercase tracking-widest">
          <p>&copy; 2026 HB_SFS. All rights reserved.</p>
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
