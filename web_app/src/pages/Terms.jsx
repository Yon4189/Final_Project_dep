import React from 'react';
import { useTranslation } from 'react-i18next';
import LandingNavbar from '../components/LandingNavbar';
import LandingFooter from '../components/LandingFooter';

const Terms = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col fixed inset-0 bg-white dark:bg-admin-content text-slate-900 dark:text-admin-text transition-colors duration-300">
      <div className="shrink-0 relative z-50">
        <LandingNavbar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-20">
        <section className="pt-24 pb-32 px-6">
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
            <h1 className="text-5xl font-black tracking-tight">{t('terms_title')}</h1>
            <p className="text-slate-500 dark:text-admin-text-muted text-lg">
              {t('terms_last_updated')}: {new Date().toLocaleDateString()}
            </p>
            <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>{t('terms_intro')}</p>
              
              <h2 className="text-2xl font-bold mt-8 text-slate-900 dark:text-white">{t('terms_sec1_title')}</h2>
              <p>{t('terms_sec1_content')}</p>

              <h2 className="text-2xl font-bold mt-8 text-slate-900 dark:text-white">{t('terms_sec2_title')}</h2>
              <p>{t('terms_sec2_content')}</p>

              <h2 className="text-2xl font-bold mt-8 text-slate-900 dark:text-white">{t('terms_sec3_title')}</h2>
              <p>{t('terms_sec3_content')}</p>
            </div>
          </div>
        </section>
        <LandingFooter />
      </div>
    </div>
  );
};

export default Terms;
