import React from 'react';
import LandingNavbar from '../components/LandingNavbar';
import LandingFooter from '../components/LandingFooter';

const Terms = () => {
  return (
    <div className="flex flex-col fixed inset-0 bg-white dark:bg-admin-content text-slate-900 dark:text-admin-text transition-colors duration-300">
      <div className="shrink-0 relative z-50">
        <LandingNavbar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-10">
        <section className="pt-10 pb-32 px-6">
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
            <h1 className="text-5xl font-black tracking-tight">Terms of Service</h1>
            <p className="text-slate-500 dark:text-admin-text-muted text-lg">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
            <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>Welcome to Ethio HandyMan. By utilizing our marketplace and services, you agree strictly to the operational guidelines and terms listed below.</p>
              
              <h2 className="text-2xl font-bold mt-8 text-slate-900 dark:text-white">1. Platform Usage</h2>
              <p>Ethio HandyMan acts merely as a connection hub between verified service providers and local customers. Misuse of the platform for illegal activities will result in immediate suspension.</p>

              <h2 className="text-2xl font-bold mt-8 text-slate-900 dark:text-white">2. Provider Verification</h2>
              <p>All service providers must undergo strict administrative verification. False credentials or identity manipulation will lead to permanent bans and legal reporting.</p>

              <h2 className="text-2xl font-bold mt-8 text-slate-900 dark:text-white">3. Payments & Disputes</h2>
              <p>The platform facilitates secure payment tracking. In the event of a dispute, our Administration retains full final authority regarding resolution and potential penalty assignment.</p>
            </div>
          </div>
        </section>
        <LandingFooter />
      </div>
    </div>
  );
};

export default Terms;
