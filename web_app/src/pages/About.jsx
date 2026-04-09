import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Users, Target, Heart, Award, 
  ShieldCheck, Globe, Rocket, ArrowRight 
} from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import LandingFooter from '../components/LandingFooter';

const About = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white dark:bg-admin-content text-slate-900 dark:text-admin-text transition-colors duration-300">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-slate-50 dark:bg-admin-card/20">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            {t('about_mission_title')} <span className="text-blue-600">{t('about_mission_connect')}</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-admin-text-muted max-w-2xl mx-auto leading-relaxed">
            {t('about_mission_desc')}
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">
            <div className="space-y-8">
              <h2 className="text-4xl font-black">{t('about_empower_title')}</h2>
              <p className="text-lg text-slate-500 dark:text-admin-text-muted leading-relaxed">
                {t('about_empower_desc')}
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                 <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/20">
                    <Target className="text-blue-600 mb-4" size={32} />
                    <h4 className="font-bold text-lg mb-2">{t('about_efficiency')}</h4>
                    <p className="text-sm text-slate-500">{t('about_efficiency_desc')}</p>
                 </div>
                 <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/20">
                    <ShieldCheck className="text-indigo-600 mb-4" size={32} />
                    <h4 className="font-bold text-lg mb-2">{t('about_trust')}</h4>
                    <p className="text-sm text-slate-500">{t('about_trust_desc')}</p>
                 </div>
              </div>
            </div>
            <div className="relative group">
               <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-20 blur-3xl group-hover:opacity-30 transition-opacity"></div>
               <div className="relative bg-slate-100 dark:bg-admin-card aspect-square rounded-[3rem] p-12 flex items-center justify-center border border-slate-200 dark:border-admin-border overflow-hidden shadow-2xl">
                   <div className="text-center">
                      <Users className="w-24 h-24 text-blue-500 animate-pulse mx-auto mb-6" />
                      <h3 className="text-2xl font-black">{t('about_community_first')}</h3>
                   </div>
               </div>
            </div>
          </div>

          <div className="text-center max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl font-black">{t('about_vision_title')}</h2>
            <p className="text-lg text-slate-500 dark:text-admin-text-muted leading-relaxed">
               {t('about_vision_desc')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8">
               <div className="space-y-2">
                  <div className="text-4xl font-black text-blue-600 italic">2026</div>
                  <div className="text-sm font-bold uppercase tracking-widest opacity-50">{t('about_stat_established')}</div>
               </div>
               <div className="space-y-2">
                  <div className="text-4xl font-black text-blue-600 italic">100%</div>
                  <div className="text-sm font-bold uppercase tracking-widest opacity-50">{t('about_stat_secure')}</div>
               </div>
               <div className="space-y-2">
                  <div className="text-4xl font-black text-blue-600 italic">24/7</div>
                  <div className="text-sm font-bold uppercase tracking-widest opacity-50">{t('about_stat_monitoring')}</div>
               </div>
               <div className="space-y-2">
                  <div className="text-4xl font-black text-blue-600 italic">{t('about_stat_limitless')}</div>
                  <div className="text-sm font-bold uppercase tracking-widest opacity-50">{t('about_stat_potential')}</div>
               </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default About;
