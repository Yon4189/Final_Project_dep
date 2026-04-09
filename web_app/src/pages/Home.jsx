import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, ShieldCheck, Zap, Users,
  LineChart, CheckCircle2, Info, Github,
  Linkedin, Mail, Globe, Sparkles
} from 'lucide-react';
import logo from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';
import LandingNavbar from '../components/LandingNavbar';
import LandingFooter from '../components/LandingFooter';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      navigate('/admin');
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col fixed inset-0 bg-white dark:bg-admin-content text-slate-900 dark:text-admin-text transition-colors duration-300">
      <div className="shrink-0 relative z-50">
        <LandingNavbar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Hero Section */}
        <section className="pt-20 pb-32 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
              <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1]">
                {t('hero_title_prefix')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">{t('hero_title_highlight')}</span>
              </h1>
              <p className="text-slate-500 dark:text-admin-text-muted text-lg max-w-xl leading-relaxed">
                {t('hero_subtitle')}
              </p>

            </div>
            <div className="relative animate-in fade-in slide-in-from-right duration-1000">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-[3rem] opacity-20 blur-3xl" />
              <div className="relative bg-slate-100 dark:bg-admin-card rounded-[3rem] border border-slate-200 dark:border-admin-border shadow-2xl overflow-hidden aspect-video flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-blue-500/40 mb-6">
                    <ShieldCheck className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-2">{t('secure_admin_ops')}</h3>
                  <p className="text-slate-500 dark:text-admin-text-muted">{t('secure_admin_ops_desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Statistics / Highlight */}
        <section className="py-24 bg-slate-50 dark:bg-admin-card/30 border-y border-slate-100 dark:border-admin-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-4 text-center p-8 bg-white dark:bg-admin-card rounded-[2rem] shadow-sm">
                <div className="text-4xl font-black text-blue-600">{t('stat_verified')}</div>
                <p className="text-slate-500 dark:text-admin-text-muted font-bold uppercase tracking-widest text-xs">{t('stat_trust')}</p>
                <p className="text-sm">{t('stat_verified_desc')}</p>
              </div>
              <div className="space-y-4 text-center p-8 bg-white dark:bg-admin-card rounded-[2rem] shadow-sm">
                <div className="text-4xl font-black text-indigo-600">{t('stat_realtime')}</div>
                <p className="text-slate-500 dark:text-admin-text-muted font-bold uppercase tracking-widest text-xs">{t('stat_live')}</p>
                <p className="text-sm">{t('stat_realtime_desc')}</p>
              </div>
              <div className="space-y-4 text-center p-8 bg-white dark:bg-admin-card rounded-[2rem] shadow-sm">
                <div className="text-4xl font-black text-purple-600">{t('stat_secure')}</div>
                <p className="text-slate-500 dark:text-admin-text-muted font-bold uppercase tracking-widest text-xs">{t('stat_integrity')}</p>
                <p className="text-sm">{t('stat_secure_desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access to subpages */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto text-center space-y-12">
            <h2 className="text-4xl font-black tracking-tight">{t('explore_system')}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Link to="/about" className="group p-12 bg-white dark:bg-admin-card border border-slate-200 dark:border-admin-border rounded-[3rem] hover:shadow-2xl transition-all text-left space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <Info size={24} />
                </div>
                <h3 className="text-2xl font-black">{t('our_mission')}</h3>
                <p className="text-slate-500 dark:text-admin-text-muted leading-relaxed">{t('our_mission_desc')}</p>
                <div className="flex items-center gap-2 text-blue-600 font-bold group-hover:gap-4 transition-all pt-4"> {t('read_story')} <ArrowRight size={18} /></div>
              </Link>
              <Link to="/workflow" className="group p-12 bg-white dark:bg-admin-card border border-slate-200 dark:border-admin-border rounded-[3rem] hover:shadow-2xl transition-all text-left space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <Zap size={24} />
                </div>
                <h3 className="text-2xl font-black">{t('operational_flow')}</h3>
                <p className="text-slate-500 dark:text-admin-text-muted leading-relaxed">{t('operational_flow_desc')}</p>
                <div className="flex items-center gap-2 text-indigo-600 font-bold group-hover:gap-4 transition-all pt-4"> {t('view_workflow')} <ArrowRight size={18} /></div>
              </Link>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </div>
  );
};

export default Home;
