import React from 'react';
import LandingNavbar from '../components/LandingNavbar';
import LandingFooter from '../components/LandingFooter';

const Privacy = () => {
  return (
    <div className="flex flex-col fixed inset-0 bg-white dark:bg-admin-content text-slate-900 dark:text-admin-text transition-colors duration-300">
      <div className="shrink-0 relative z-50">
        <LandingNavbar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-10">
        <section className="pt-10 pb-32 px-6">
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
            <h1 className="text-5xl font-black tracking-tight">Privacy Policy</h1>
            <p className="text-slate-500 dark:text-admin-text-muted text-lg">
              Effective Date: {new Date().toLocaleDateString()}
            </p>
            <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>At Ethio HandyMan, we prioritize the protection and confidentiality of your personal information. This Privacy Policy details how we collect, use, and safeguard your data.</p>
              
              <h2 className="text-2xl font-bold mt-8 text-slate-900 dark:text-white">1. Information Collection</h2>
              <p>We require certain personal details such as identity documents, phone numbers, and location data specifically to verify providers and ensure marketplace safety.</p>

              <h2 className="text-2xl font-bold mt-8 text-slate-900 dark:text-white">2. Data Security</h2>
              <p>Your details are secured using industry-standard encryption. We restrict internal data access to verified administrative personnel only.</p>

              <h2 className="text-2xl font-bold mt-8 text-slate-900 dark:text-white">3. Third Party Sharing</h2>
              <p>We do not sell or lease your data to third parties. Minimal essential data is shared between customers and providers only upon booking confirmation to facilitate the service.</p>
            </div>
          </div>
        </section>
        <LandingFooter />
      </div>
    </div>
  );
};

export default Privacy;
