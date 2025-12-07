import React from 'react';
import { School, GraduationCap, BookOpen, Users, ArrowRight, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (role: string) => void;
  onSuperAdmin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onSuperAdmin }) => (
  <div className="min-h-screen flex flex-col bg-slate-50">
    {/* Navigation */}
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600 p-2 rounded-lg">
                    <School className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                    Sleek<span className="text-indigo-600">Portal</span>
                </span>
            </div>
            <button 
                onClick={onSuperAdmin} 
                className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
                <ShieldCheck size={16} /> Admin Access
            </button>
        </div>
    </nav>

    {/* Hero Section */}
    <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="text-center max-w-4xl mx-auto mb-16">
                <h1 className="text-5xl sm:text-7xl font-extrabold text-slate-900 mb-8 tracking-tight leading-tight">
                    The Future of <br/>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        School Management
                    </span>
                </h1>
                <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                    A unified platform for exams, results, attendance, and administration. 
                    Simple, fast, and built for modern education.
                </p>
            </div>

            {/* Portal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Student Card */}
                <div 
                    onClick={() => onNavigate('student')} 
                    className="group cursor-pointer bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-500/10 border border-slate-100 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                            <GraduationCap className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Student Portal</h3>
                        <p className="text-slate-500 mb-6">Take CBT exams, check real-time results, and track your academic progress.</p>
                        <span className="inline-flex items-center text-blue-600 font-bold group-hover:gap-2 transition-all">
                            Login Now <ArrowRight size={18} className="ml-1" />
                        </span>
                    </div>
                </div>

                {/* Teacher Card */}
                <div 
                    onClick={() => onNavigate('teacher')} 
                    className="group cursor-pointer bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-500/10 border border-slate-100 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                            <BookOpen className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Teacher Portal</h3>
                        <p className="text-slate-500 mb-6">Manage assessments, grade students, and record attendance effortlessly.</p>
                        <span className="inline-flex items-center text-emerald-600 font-bold group-hover:gap-2 transition-all">
                            Login Now <ArrowRight size={18} className="ml-1" />
                        </span>
                    </div>
                </div>

                {/* Admin Card */}
                <div 
                    onClick={() => onNavigate('admin')} 
                    className="group cursor-pointer bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-purple-500/10 border border-slate-100 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-600/20 group-hover:scale-110 transition-transform">
                            <Users className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Administrator</h3>
                        <p className="text-slate-500 mb-6">Complete control over users, school configurations, and system data.</p>
                        <span className="inline-flex items-center text-purple-600 font-bold group-hover:gap-2 transition-all">
                            Login Now <ArrowRight size={18} className="ml-1" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </main>
    
    <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
            <p>&copy; 2025 Sleek School Portal. All rights reserved.</p>
        </div>
    </footer>
  </div>
);