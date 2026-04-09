import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Zap, ShieldCheck, UserPlus, ClipboardCheck, 
  CreditCard, MessageSquare, Star, ArrowRight,
  MonitorCheck, Settings, Users
} from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import LandingFooter from '../components/LandingFooter';

const Workflow = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const adminSteps = [
    { title: t('workflow_step_verification'), desc: t('workflow_step_verification_desc'), icon: <ShieldCheck /> },
    { title: t('workflow_step_monitoring'), desc: t('workflow_step_monitoring_desc'), icon: <MonitorCheck /> },
    { title: t('workflow_step_resolution'), desc: t('workflow_step_resolution_desc'), icon: <MessageSquare /> },
    { title: t('workflow_step_analytics'), desc: t('workflow_step_analytics_desc'), icon: <Zap /> }
  ];

  const userFlow = [
    { title: t('workflow_step_registration'), desc: t('workflow_step_registration_desc'), icon: <UserPlus /> },
    { title: t('workflow_step_match'), desc: t('workflow_step_match_desc'), icon: <Users /> },
    { title: t('workflow_step_execution'), desc: t('workflow_step_execution_desc'), icon: <ClipboardCheck /> },
    { title: t('workflow_step_completion'), desc: t('workflow_step_completion_desc'), icon: <Star /> }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-admin-content text-slate-900 dark:text-admin-text transition-colors duration-300">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-blue-600">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
            {t('workflow_hero_title')} <span className="opacity-50">{t('workflow_hero_highlight')}</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            {t('workflow_hero_subtitle')}
          </p>
        </div>
      </section>

      {/* Admin Flow Section */}
      <section className="py-24 px-6 border-b border-slate-100 dark:border-admin-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
             <div className="space-y-4">
                <h2 className="text-4xl font-black">{t('workflow_admin_title')}</h2>
                <p className="text-slate-500 dark:text-admin-text-muted">{t('workflow_admin_desc')}</p>
             </div>
             <div className="px-6 py-2 bg-slate-100 dark:bg-admin-card rounded-full text-xs font-bold uppercase tracking-widest border border-slate-200 dark:border-admin-border">
                {t('workflow_admin_badge')}
             </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {adminSteps.map((step, idx) => (
              <div key={idx} className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-admin-card/50 border border-slate-100 dark:border-admin-border group hover:bg-white dark:hover:bg-admin-card hover:shadow-2xl transition-all">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-admin-content border border-slate-100 dark:border-admin-border flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                   {step.icon}
                </div>
                <h3 className="font-black text-xl mb-3">{step.title}</h3>
                <p className="text-sm text-slate-500 dark:text-admin-text-muted leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Journey Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-50/30 dark:bg-blue-900/5 -skew-x-12 translate-x-1/2" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row-reverse justify-between items-end mb-16 gap-6">
             <div className="space-y-4 md:text-right">
                <h2 className="text-4xl font-black">{t('workflow_user_title')}</h2>
                <p className="text-slate-500 dark:text-admin-text-muted">{t('workflow_user_desc')}</p>
             </div>
             <div className="px-6 py-2 bg-blue-600 text-white rounded-full text-xs font-bold uppercase tracking-widest">
                {t('workflow_user_badge')}
             </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {userFlow.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="p-8 rounded-[2.5rem] bg-white dark:bg-admin-card border border-slate-200 dark:border-admin-border group hover:shadow-2xl transition-all relative z-10">
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center font-black italic">
                    {idx + 1}
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6 text-blue-600">
                    {step.icon}
                  </div>
                  <h3 className="font-black text-xl mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-admin-text-muted leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-slate-200 dark:bg-admin-border -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto bg-slate-900 dark:bg-white rounded-[3rem] p-12 text-center space-y-8 shadow-2xl">
          <h2 className="text-3xl font-black text-white dark:text-slate-900">{t('workflow_cta_title')}</h2>
          <p className="text-slate-400 dark:text-slate-500 max-w-lg mx-auto">{t('workflow_cta_desc')}</p>
          <button 
             onClick={() => navigate('/login')}
            className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all active:scale-95 inline-flex items-center gap-2"
          >
            {t('workflow_cta_btn')} <ArrowRight size={20} />
          </button>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default Workflow;
