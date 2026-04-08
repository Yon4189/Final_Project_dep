import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      navigate('/admin');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-white dark:bg-admin-content text-slate-900 dark:text-admin-text transition-colors duration-300">
      <LandingNavbar />

      {/* Hero Section */}
      <section className="pt-40 pb-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} /> System Command Center
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1]">
              Manage the Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Service Markets.</span>
            </h1>
            <p className="text-slate-500 dark:text-admin-text-muted text-lg max-w-xl leading-relaxed">
              The HB_SFS Admin Panel provides absolute control over the home-based service ecosystem. 
              Verify providers, track growth, and ensures a safe experience for every customer.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:scale-105 transition-all shadow-2xl active:scale-95"
              >
                Access Dashboard
              </button>
              <Link 
                to="/about"
                className="px-8 py-4 bg-white dark:bg-transparent border border-slate-200 dark:border-admin-border text-slate-800 dark:text-white font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95"
              >
                Learn More
              </Link>
            </div>
          </div>
          <div className="relative animate-in fade-in slide-in-from-right duration-1000">
             <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-[3rem] opacity-20 blur-3xl" />
             <div className="relative bg-slate-100 dark:bg-admin-card rounded-[3rem] border border-slate-200 dark:border-admin-border shadow-2xl overflow-hidden aspect-video flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-blue-500/40 mb-6">
                    <ShieldCheck className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Secure Admin Ops</h3>
                  <p className="text-slate-500 dark:text-admin-text-muted">Encrypted. Real-time. Professional.</p>
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
              <div className="text-4xl font-black text-blue-600">Verified</div>
              <p className="text-slate-500 dark:text-admin-text-muted font-bold uppercase tracking-widest text-xs">Trust as standard</p>
              <p className="text-sm">Every service provider undergoes a rigorous identity and skill verification process.</p>
            </div>
            <div className="space-y-4 text-center p-8 bg-white dark:bg-admin-card rounded-[2rem] shadow-sm">
              <div className="text-4xl font-black text-indigo-600">Real-time</div>
              <p className="text-slate-500 dark:text-admin-text-muted font-bold uppercase tracking-widest text-xs">Live Monitoring</p>
              <p className="text-sm">Track bookings, disputes, and payments as they happen across the system.</p>
            </div>
            <div className="space-y-4 text-center p-8 bg-white dark:bg-admin-card rounded-[2rem] shadow-sm">
              <div className="text-4xl font-black text-purple-600">Secure</div>
              <p className="text-slate-500 dark:text-admin-text-muted font-bold uppercase tracking-widest text-xs">Platform Integrity</p>
              <p className="text-sm">Advanced encryption and role-based access control protecting all system data.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access to subpages */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-12">
          <h2 className="text-4xl font-black tracking-tight">Explore the System</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Link to="/about" className="group p-12 bg-white dark:bg-admin-card border border-slate-200 dark:border-admin-border rounded-[3rem] hover:shadow-2xl transition-all text-left space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Info size={24} />
              </div>
              <h3 className="text-2xl font-black">Our Mission</h3>
              <p className="text-slate-500 dark:text-admin-text-muted leading-relaxed">Discover why we are building HB_SFS and how we aim to revolutionize local service markets.</p>
              <div className="flex items-center gap-2 text-blue-600 font-bold group-hover:gap-4 transition-all pt-4"> Read Story <ArrowRight size={18} /></div>
            </Link>
            <Link to="/workflow" className="group p-12 bg-white dark:bg-admin-card border border-slate-200 dark:border-admin-border rounded-[3rem] hover:shadow-2xl transition-all text-left space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Zap size={24} />
              </div>
              <h3 className="text-2xl font-black">Operational Flow</h3>
              <p className="text-slate-500 dark:text-admin-text-muted leading-relaxed">See the technical and operational steps that make our marketplace function flawlessly.</p>
              <div className="flex items-center gap-2 text-indigo-600 font-bold group-hover:gap-4 transition-all pt-4"> View Workflow <ArrowRight size={18} /></div>
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default Home;
