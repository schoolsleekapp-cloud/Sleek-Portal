
import React, { useState, useEffect } from 'react';
import { 
  School, LogOut, LayoutDashboard, IdCard, 
  FileText, GraduationCap, Calendar, CreditCard, 
  Edit, Users, Menu, ChevronRight, QrCode, BookOpen, CheckCircle, MessageCircle
} from 'lucide-react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile, SchoolInfo } from '../types';
import { UserIDCard } from './UserIDCard';
import { StudentDashboard, StudentCBT, StudentResults, StudentAttendance, StudentFees, StudentLessonNotes } from './student/StudentViews';
import { TeacherDashboard, TeacherExams, TeacherAttendance, TeacherGrading, TeacherLessonNotes, TeacherCBTResults } from './teacher/TeacherViews';
import { AdminDashboard, AdminUsers, AdminAttendance, AdminExams, AdminResults, AdminFees, AdminChat } from './admin/AdminViews';
import { SuperAdminDashboard } from './superadmin/SuperAdminViews';

interface DashboardProps {
    user: UserProfile;
    onLogout: () => void;
    showNotification: (msg: string, type: 'info' | 'success' | 'error') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, showNotification }) => {
    const [view, setView] = useState('home');
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
    const [currentUser, setCurrentUser] = useState<UserProfile>(user);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Sync user profile with Firestore in real-time
    useEffect(() => {
        if (!user.id) return;
        
        const docRef = doc(db, 'users', user.id);
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                // Merge updates into current user state
                setCurrentUser(prev => ({ ...prev, ...docSnap.data() } as UserProfile));
            }
        }, (error) => {
             // Ignore permission errors that might happen during logout/role switches
             if (error.code !== 'permission-denied') console.error("Error syncing profile:", error);
        });
        
        return () => unsub();
    }, [user.id]);

    // Fetch School Info
    useEffect(() => {
        if (currentUser.schoolId && currentUser.schoolId !== 'GLOBAL') {
            const fetchSchool = async () => {
                try {
                    const docRef = doc(db, 'schools', currentUser.schoolId);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        setSchoolInfo(snap.data() as SchoolInfo);
                    }
                } catch (e) { 
                    console.error("Error fetching school info", e);
                }
            };
            fetchSchool();
        }
    }, [currentUser.schoolId]);

    const renderContent = () => {
        switch(view) {
            case 'idcard': return <UserIDCard user={currentUser} schoolInfo={schoolInfo} showNotification={showNotification} />;
            case 'home':
                switch(currentUser.role) {
                    case 'student': return <StudentDashboard user={currentUser} view={view} setView={setView} />;
                    case 'teacher': return <TeacherDashboard user={currentUser} view={view} setView={setView} />;
                    case 'admin': return <AdminDashboard user={currentUser} view={view} setView={setView} schoolInfo={schoolInfo} />;
                    case 'superadmin': return <SuperAdminDashboard showNotification={showNotification} />;
                    default: return <div>Unknown Role</div>;
                }
            case 'cbt': return <StudentCBT user={currentUser} showNotification={showNotification} />;
            case 'results': return <StudentResults user={currentUser} showNotification={showNotification} />;
            case 'lesson-notes': 
                if (currentUser.role === 'teacher') return <TeacherLessonNotes user={currentUser} showNotification={showNotification} />;
                if (currentUser.role === 'student') return <StudentLessonNotes user={currentUser} showNotification={showNotification} />;
                return null;
            case 'attendance': 
                if (currentUser.role === 'student') return <StudentAttendance user={currentUser} />;
                if (currentUser.role === 'teacher') return <TeacherAttendance user={currentUser} showNotification={showNotification} />;
                if (currentUser.role === 'admin') return <AdminAttendance user={currentUser} showNotification={showNotification} />;
                return null;
            case 'fees': 
                if (currentUser.role === 'admin') return <AdminFees user={currentUser} showNotification={showNotification} />;
                return <StudentFees user={currentUser} showNotification={showNotification} />;
            case 'exams': 
                if (currentUser.role === 'admin') return <AdminExams user={currentUser} showNotification={showNotification} />;
                return <TeacherExams user={currentUser} showNotification={showNotification} />;
            case 'grading': return <TeacherGrading user={currentUser} showNotification={showNotification} />;
            case 'cbt-results': return <TeacherCBTResults user={currentUser} showNotification={showNotification} />;
            case 'admin_results': return <AdminResults user={currentUser} showNotification={showNotification} />;
            case 'users': return <AdminUsers user={currentUser} />;
            case 'messages': return <AdminChat user={currentUser} />;
            case 'settings': return <div className="p-8 bg-white rounded-xl shadow-sm">Settings panel (Placeholder)</div>;
            case 'schools': return <SuperAdminDashboard showNotification={showNotification} />;
            default: return <div>404: View Not Found</div>;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className={`w-72 bg-white border-r border-gray-100 z-30 flex flex-col fixed md:relative h-full transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                {/* Brand */}
                <div className="h-20 flex items-center px-6 border-b border-gray-50">
                    <div className="bg-indigo-600 p-1.5 rounded-lg mr-3">
                        <School className="text-white w-5 h-5"/>
                    </div>
                    <h1 className="font-bold text-xl text-slate-800">Sleek<span className="text-indigo-600">Portal</span></h1>
                    <button className="md:hidden ml-auto text-gray-400" onClick={() => setIsMobileMenuOpen(false)}><Menu size={20}/></button>
                </div>

                {/* Profile Widget */}
                <div className="p-6">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                                {currentUser.fullName.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <h2 className="font-bold text-slate-900 truncate text-sm">{currentUser.fullName}</h2>
                                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{currentUser.role}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            {schoolInfo && <p className="text-xs text-slate-500 truncate flex items-center gap-1"><School size={10}/> {schoolInfo.name}</p>}
                            <p className="text-xs text-slate-500 font-mono flex items-center gap-1"><IdCard size={10}/> {currentUser.uniqueId}</p>
                            {(currentUser.points || 0) > 0 && (
                                <p className="text-xs text-orange-600 font-bold flex items-center gap-1 bg-orange-50 w-fit px-1.5 rounded"><CheckCircle size={10}/> {currentUser.points} Pts</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                   <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-2">Main Menu</p>
                   <NavLinks role={currentUser.role} current={view} setView={(v) => { setView(v); setIsMobileMenuOpen(false); }} />
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-gray-50">
                    <button onClick={onLogout} className="flex items-center gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 w-full px-4 py-3 rounded-xl transition-all font-medium text-sm group">
                        <LogOut size={18} className="group-hover:rotate-12 transition-transform"/> Sign Out
                    </button>
                </div>
            </aside>
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-20">
                     <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600"><Menu size={24}/></button>
                    <span className="font-bold text-indigo-600 text-lg">SleekPortal</span>
                    
                    {/* Quick Access QR for Mobile */}
                    <button onClick={() => setView('idcard')} className="p-2 text-gray-500 hover:text-indigo-600">
                        <QrCode size={22} />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
                    {/* Overlay for mobile menu */}
                    {isMobileMenuOpen && (
                        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
                    )}
                    
                    <div className="max-w-6xl mx-auto">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

const NavLinks = ({ role, current, setView }: { role: string, current: string, setView: (id: string) => void }) => {
    const linkClass = (id: string) => `flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all text-sm font-medium ${current === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}`;
    
    const baseLinks = [
        { id: 'home', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'idcard', icon: IdCard, label: 'My Digital ID' },
    ];

    const roleSpecificLinks: any = {
        student: [
            { id: 'cbt', icon: FileText, label: 'CBT Exams' },
            { id: 'results', icon: GraduationCap, label: 'My Results' },
            { id: 'lesson-notes', icon: BookOpen, label: 'Lesson Notes' },
            { id: 'attendance', icon: Calendar, label: 'Attendance' },
            { id: 'fees', icon: CreditCard, label: 'Fees' }
        ],
        teacher: [
            { id: 'exams', icon: FileText, label: 'Exams' },
            { id: 'grading', icon: Edit, label: 'Grading' },
            { id: 'cbt-results', icon: CheckCircle, label: 'Exam Results' },
            { id: 'lesson-notes', icon: BookOpen, label: 'Lesson Notes' },
            { id: 'attendance', icon: Calendar, label: 'Attendance' },
        ],
        admin: [
            { id: 'exams', icon: FileText, label: 'Exam Management' },
            { id: 'admin_results', icon: GraduationCap, label: 'Results Management' },
            { id: 'fees', icon: CreditCard, label: 'Fee Payments' },
            { id: 'attendance', icon: Calendar, label: 'Attendance Logs' },
            { id: 'users', icon: Users, label: 'Directory' },
            { id: 'messages', icon: MessageCircle, label: 'Messages' },
            { id: 'settings', icon: Edit, label: 'Settings' },
        ],
        superadmin: [
            { id: 'schools', icon: School, label: 'Schools Registry' },
        ]
    };

    const links = [...baseLinks, ...(roleSpecificLinks[role] || [])];

    return (
        <>
            {links.map(link => (
                <div key={link.id} onClick={() => setView(link.id)} className={linkClass(link.id)}>
                    <div className="flex items-center gap-3">
                        <link.icon size={18} className={current === link.id ? 'opacity-100' : 'opacity-70'} />
                        <span>{link.label}</span>
                    </div>
                    {current === link.id && <ChevronRight size={14} className="opacity-50"/>}
                </div>
            ))}
        </>
    );
};
