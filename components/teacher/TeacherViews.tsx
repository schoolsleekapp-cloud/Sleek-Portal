
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Edit, Calendar, IdCard, Plus, Clock, User, LogIn, LogOut, Camera, X, CheckCircle, Keyboard, Download, Sparkles, Image as ImageIcon, PenTool, Type, Trash2, Printer, ChevronDown, Save, Eye, Settings, Search, Loader, Palette, List, ArrowLeft, School, Activity, BookOpen, Share2, Upload, FileUp, Filter, RefreshCw, Smartphone, Trash, WifiOff, CloudOff, AlertCircle, MessageCircle, ChevronRight, Calculator, UserCheck, Megaphone } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, limit, updateDoc, doc, getDoc, deleteDoc, orderBy, increment } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { db } from '../../services/firebase';
import { UserProfile, Exam, Question, AttendanceRecord, SchoolInfo, Result, LessonNote, ExamSubmission, Announcement } from '../../types';
import { Button } from '../Button';
import { Card } from '../Card';
import { StatCard } from '../StatCard';
import { Input } from '../Input';
import { SearchFilterBar } from '../SearchFilterBar';
import { Badge } from '../Badge';
import { QRScanner } from '../QRScanner';
import { ExamEditor } from '../ExamEditor';
import { ExamPrintView } from '../ExamPrintView';

interface Props {
    user: UserProfile;
    view?: string;
    setView?: (v: string) => void;
    showNotification?: (msg: string, type: 'info' | 'success' | 'error') => void;
}

// --- Constants ---
const NIGERIAN_SUBJECTS = [
    "Mathematics", "English Language", "Basic Science", "Basic Technology", 
    "Civic Education", "Social Studies", "Agricultural Science", "Home Economics",
    "Christian Religious Studies", "Islamic Religious Studies", "Physical & Health Education",
    "Computer Science", "Business Studies", "French", "Cultural & Creative Arts",
    "History", "Geography", "Physics", "Chemistry", "Biology", "Economics", 
    "Government", "Literature-in-English", "Commerce", "Financial Accounting", "Further Mathematics"
];

const NIGERIAN_CLASSES = [
    "Creche", "Pre-Nursery", "Nursery 1", "Nursery 2", "Nursery 3",
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"
];

const AFFECTIVE_DOMAINS = ["Punctuality", "Neatness", "Politeness", "Honesty", "Attentiveness", "Self Control", "Obedience", "Spirit of Cooperation"];
const PSYCHOMOTOR_DOMAINS = ["Handwriting", "Fluency", "Games/Sports", "Handling Tools", "Drawing/Painting", "Musical Skills"];
const COGNITIVE_DOMAINS = ["Knowledge", "Understanding", "Application", "Analysis", "Evaluation", "Creativity"];

const COLOR_PALETTES = [
    { name: 'Midnight Blue', hex: '#1e3a8a' },
    { name: 'Emerald Green', hex: '#047857' },
    { name: 'Crimson Red', hex: '#b91c1c' },
    { name: 'Royal Purple', hex: '#6d28d9' },
    { name: 'Burnt Orange', hex: '#c2410c' },
    { name: 'Slate Black', hex: '#111827' },
    { name: 'Teal Blue', hex: '#0f766e' },
    { name: 'Golden Brown', hex: '#854d0e' },
    { name: 'Deep Violet', hex: '#4c1d95' },
    { name: 'Charcoal Gray', hex: '#374151' },
    { name: 'Forest Green', hex: '#14532d' },
    { name: 'Navy', hex: '#172554' },
    { name: 'Maroon', hex: '#7f1d1d' },
    { name: 'Magenta', hex: '#831843' }
];

const getGrade = (score: number) => {
    if (score >= 75) return { grade: 'A', remark: 'EXCELLENT' };
    if (score >= 65) return { grade: 'B', remark: 'VERY GOOD' };
    if (score >= 50) return { grade: 'C', remark: 'GOOD' };
    if (score >= 40) return { grade: 'D', remark: 'FAIR' };
    return { grade: 'F', remark: 'FAIL' };
};

const sendWhatsapp = (phone: string | null | undefined, text: string) => {
    if (!phone) {
        alert("No parent phone number linked to this student.");
        return;
    }
    const number = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
};

export const ResultPreviewModal = ({ data, schoolInfo, studentPhoto, parentPhone, onClose }: { data: any, schoolInfo: SchoolInfo | null, studentPhoto?: string | null, parentPhone?: string | null, onClose: () => void }) => {
    const [downloading, setDownloading] = useState(false);
    const themeColor = data.colorTheme || '#1e3a8a';

    const handleDownload = () => {
        setDownloading(true);
        // @ts-ignore
        if (typeof html2pdf === 'undefined') {
            alert("PDF Library not loaded. Please refresh.");
            setDownloading(false);
            return;
        }

        const element = document.getElementById('result-sheet');
        const opt = {
            margin: 0,
            filename: `${data.studentName.replace(/\s+/g, '_')}_Result.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => setDownloading(false));
    };

    const handleShare = () => {
        if (!parentPhone) {
            alert("No parent phone number available for this student.");
            return;
        }
        const text = `*Result Notification from ${schoolInfo?.name || 'School'}*\n\nStudent: ${data.studentName}\nClass: ${data.className}\nSession: ${data.session} (${data.term})\n\nOverall Score: ${data.cumulativeScore}\nGPA: ${data.gpa}\n\nPlease login to the school portal to view and download the detailed result sheet.`;
        sendWhatsapp(parentPhone, text);
    };

    const RatingBar = ({ value }: { value: number }) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <div 
                    key={star} 
                    className={`h-2.5 w-6 rounded-sm transition-all border border-gray-100 ${star <= value ? 'opacity-100' : 'opacity-20'}`}
                    style={{ backgroundColor: star <= value ? themeColor : '#e5e7eb' }}
                />
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto flex justify-center py-10">
            <div className="relative w-full max-w-[210mm] min-h-screen">
                <div className="sticky top-4 left-0 right-0 mx-auto w-[90%] bg-white shadow-xl p-4 flex justify-between items-center z-50 rounded-xl mb-8">
                    <h2 className="font-bold text-gray-800">Result Preview</h2>
                    <div className="flex gap-2">
                        {parentPhone && (
                            <Button onClick={handleShare} variant="success" className="bg-green-600 hover:bg-green-700 text-white">
                                <MessageCircle size={16}/> Share to WhatsApp
                            </Button>
                        )}
                        <Button onClick={handleDownload} variant="primary" disabled={downloading}>
                            {downloading ? 'Generating...' : <><Download size={16}/> Download PDF</>}
                        </Button>
                        <Button onClick={onClose} variant="secondary"><X size={16}/> Close</Button>
                    </div>
                </div>

                <div id="result-sheet" className="bg-white w-[210mm] min-h-[297mm] mx-auto shadow-2xl text-black relative overflow-hidden box-border">
                    <div style={{ backgroundColor: themeColor }} className="h-4 w-full"></div>

                    <div className="p-10 pb-4">
                        <div className="flex gap-6 items-start mb-8 border-b-2 pb-6" style={{ borderColor: themeColor }}>
                            {schoolInfo?.logo ? (
                                <img src={schoolInfo.logo} className="w-28 h-28 object-contain" alt="Logo"/>
                            ) : (
                                <div className="w-28 h-28 bg-gray-100 flex items-center justify-center text-gray-300"><School size={40}/></div>
                            )}
                            
                            <div className="flex-1 text-center pt-2">
                                <h1 className="text-3xl font-black uppercase tracking-wider mb-1" style={{ color: themeColor }}>{schoolInfo?.name || 'SCHOOL NAME'}</h1>
                                <p className="text-sm font-medium text-gray-600 mb-1">{schoolInfo?.address || 'School Address Location, State'}</p>
                                <div className="flex justify-center gap-4 text-xs font-bold text-gray-500 mb-3">
                                    <span>{schoolInfo?.phone || '0800-000-0000'}</span>
                                    <span>•</span>
                                    <span>{schoolInfo?.website || 'www.school.com'}</span>
                                </div>
                                <div className="inline-block px-8 py-1.5 rounded-full text-white text-sm font-bold uppercase tracking-widest shadow-sm" style={{ backgroundColor: themeColor }}>
                                    Student Terminal Report
                                </div>
                            </div>

                            <div className="w-28 h-28 bg-gray-100 border-2 border-gray-200 rounded-lg overflow-hidden relative shadow-sm">
                                {studentPhoto ? (
                                    <img src={studentPhoto} className="w-full h-full object-cover" alt="Student" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-2">No Photo</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <School size={100} color={themeColor} />
                            </div>
                            <div className="grid grid-cols-3 gap-y-4 gap-x-8 text-sm relative z-10">
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Student Name</p>
                                    <p className="font-bold text-gray-800 text-lg uppercase">{data.studentName} <span className="text-gray-400 font-medium text-sm ml-2">({data.studentId})</span></p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Attendance</p>
                                    <p className="font-bold text-gray-800 flex items-center gap-2">
                                        <Activity size={16} color={themeColor}/> 
                                        {data.attendance?.present || 0} / {data.attendance?.total || 0} Days
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Class</p>
                                    <p className="font-bold text-gray-800">{data.className}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Session</p>
                                    <p className="font-bold text-gray-800">{data.session}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Term</p>
                                    <p className="font-bold text-gray-800">{data.term}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Position in Class</p>
                                    <p className="font-bold text-gray-800">{data.position || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="font-bold text-sm uppercase mb-3 border-b pb-1 flex justify-between" style={{ color: themeColor, borderColor: themeColor }}>
                                <span>Academic Performance</span>
                                <span className="text-xs opacity-60">Grading System: Nigerian Standard</span>
                            </h3>
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr style={{ backgroundColor: themeColor }} className="text-white">
                                        <th className="p-3 text-left rounded-tl-lg">SUBJECTS</th>
                                        <th className="p-3 text-center w-14">CA 1</th>
                                        <th className="p-3 text-center w-14">CA 2</th>
                                        <th className="p-3 text-center w-14">CA 3</th>
                                        <th className="p-3 text-center w-14">Exam</th>
                                        <th className="p-3 text-center w-14 font-bold">Total</th>
                                        <th className="p-3 text-center w-12">Grade</th>
                                        <th className="p-3 text-left w-24 rounded-tr-lg">Remark</th>
                                    </tr>
                                </thead>
                                <tbody className="border-x border-b border-gray-200">
                                    {data.subjects.map((s: any, i: number) => {
                                        const stats = getGrade(s.total);
                                        return (
                                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-2.5 font-bold text-gray-700 pl-3">{s.name}</td>
                                                <td className="p-2.5 text-center text-gray-600">{s.ca1}</td>
                                                <td className="p-2.5 text-center text-gray-600">{s.ca2}</td>
                                                <td className="p-2.5 text-center text-gray-600">{s.ca3}</td>
                                                <td className="p-2.5 text-center text-gray-600">{s.exam}</td>
                                                <td className="p-2.5 text-center font-bold text-gray-800 bg-gray-50">{s.total}</td>
                                                <td className={`p-2.5 text-center font-bold ${stats.grade === 'F' ? 'text-red-600' : 'text-emerald-700'}`}>{stats.grade}</td>
                                                <td className="p-2.5 text-xs font-medium text-gray-500">{stats.remark}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold border-x border-b border-gray-200">
                                        <td className="p-3 text-right text-gray-600">OVERALL PERFORMANCE</td>
                                        <td colSpan={4}></td>
                                        <td className="p-3 text-center text-gray-800 text-lg">{data.cumulativeScore}</td>
                                        <td colSpan={2} className="p-3 text-center text-indigo-700">GPA: {data.gpa}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="grid grid-cols-3 gap-6 mb-8">
                             <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/30">
                                <h3 className="font-bold text-xs uppercase mb-3 pb-1 border-b" style={{ color: themeColor, borderColor: themeColor }}>Cognitive Ability</h3>
                                <div className="space-y-2">
                                    {COGNITIVE_DOMAINS.map((d, i) => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
                                                <span>{d}</span>
                                                <span>{data.cognitive?.[d] || 0}</span>
                                            </div>
                                            <RatingBar value={parseInt(data.cognitive?.[d] || '0')} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/30">
                                <h3 className="font-bold text-xs uppercase mb-3 pb-1 border-b" style={{ color: themeColor, borderColor: themeColor }}>Affective Domain</h3>
                                <div className="space-y-2">
                                    {AFFECTIVE_DOMAINS.map((d, i) => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
                                                <span>{d}</span>
                                                <span>{data.domains?.[d] || 0}</span>
                                            </div>
                                            <RatingBar value={parseInt(data.domains?.[d] || '0')} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/30">
                                <h3 className="font-bold text-xs uppercase mb-3 pb-1 border-b" style={{ color: themeColor, borderColor: themeColor }}>Psychomotor Skills</h3>
                                <div className="space-y-2">
                                    {PSYCHOMOTOR_DOMAINS.map((d, i) => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
                                                <span>{d}</span>
                                                <span>{data.domains?.[d] || 0}</span>
                                            </div>
                                            <RatingBar value={parseInt(data.domains?.[d] || '0')} />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 text-[8px] text-gray-400 italic text-center border-t pt-2">
                                    Rating Scale: 5-Excellent, 4-Very Good, 3-Good, 2-Fair, 1-Poor
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-xl p-6 bg-gray-50/50 space-y-6">
                            <div className="flex gap-4 items-start">
                                <div className="w-32 pt-1 font-bold text-xs uppercase text-gray-500">Class Teacher</div>
                                <div className="flex-1">
                                    <p className="text-sm font-serif italic text-gray-800 mb-2">"{data.remarks.teacher}"</p>
                                    <div className="w-48 border-b border-gray-300"></div>
                                    <p className="text-[10px] text-gray-400 mt-1">Signature & Date</p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="w-32 pt-1 font-bold text-xs uppercase text-gray-500">Principal</div>
                                <div className="flex-1">
                                    <p className="text-sm font-serif italic text-gray-800 mb-2">"{data.remarks.principal}"</p>
                                    <div className="w-48 border-b border-gray-300"></div>
                                    <p className="text-[10px] text-gray-400 mt-1">Signature & Date</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: themeColor }} className="absolute bottom-0 w-full h-8 flex items-center justify-center text-white/80 text-[10px]">
                        Generated via SleekPortal System • {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TeacherAttendance: React.FC<Props> = ({ user, showNotification }) => {
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('role', '==', 'student'));
        const unsub = onSnapshot(q, (snap) => {
            setStudents(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)));
        });
        return () => unsub();
    }, [user.schoolId]);

    const handleMark = async (student: UserProfile, type: 'in' | 'out') => {
        setLoadingMap(prev => ({...prev, [student.id]: true}));
        try {
            await addDoc(collection(db, 'attendance'), {
                studentId: student.uniqueId,
                studentName: student.fullName,
                schoolId: user.schoolId,
                type,
                timestamp: serverTimestamp(),
                recordedBy: user.uniqueId,
                recordedByName: user.fullName,
                guardianName: null, // Could be filled if we had more info
                guardianPhone: student.parentPhone
            });
            showNotification?.(`Marked ${student.fullName} ${type === 'in' ? 'Present' : 'Signed Out'}`, 'success');
        } catch (e: any) {
            console.error(e);
            showNotification?.('Failed to mark attendance', 'error');
        } finally {
            setLoadingMap(prev => ({...prev, [student.id]: false}));
        }
    };

    const handleScan = (data: string) => {
        setShowScanner(false);
        setSearchTerm(data);
        showNotification?.('Student ID Scanned', 'success');
    };

    const filteredStudents = students.filter(s => 
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.uniqueId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card>
            {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
            
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Class Attendance Register</h2>
                <Badge color="blue">{filteredStudents.length} Students</Badge>
            </div>
            
            <div className="flex gap-3 mb-6">
                <div className="flex-1">
                    <SearchFilterBar 
                        onSearch={setSearchTerm} 
                        value={searchTerm}
                        placeholder="Search student name or ID..." 
                        className="mb-0"
                    />
                </div>
                <Button 
                    onClick={() => setShowScanner(true)} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-[46px] w-[46px] p-0 flex items-center justify-center rounded-xl shadow-sm"
                    title="Scan Student ID"
                >
                    <Camera size={20}/>
                </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="p-4">Student</th>
                            <th className="p-4">ID</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800">{s.fullName}</td>
                                <td className="p-4 text-gray-500 font-mono">{s.uniqueId}</td>
                                <td className="p-4 flex justify-center gap-3">
                                    <Button 
                                        onClick={() => handleMark(s, 'in')} 
                                        variant="success" 
                                        className="py-1 px-4 text-xs"
                                        disabled={loadingMap[s.id]}
                                    >
                                        Mark Present
                                    </Button>
                                    <Button 
                                        onClick={() => handleMark(s, 'out')} 
                                        variant="danger" 
                                        className="py-1 px-4 text-xs"
                                        disabled={loadingMap[s.id]}
                                    >
                                        Clock Out
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredStudents.length === 0 && <div className="p-8 text-center text-gray-400">No students found.</div>}
            </div>
        </Card>
    );
};

export const TeacherDashboard: React.FC<Props> = ({ user, view, setView }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                // Fetch recent announcements for teachers
                // Removed orderBy/limit to avoid composite index error
                const q = query(
                    collection(db, 'announcements'), 
                    where('target', 'array-contains', 'teacher')
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({id: d.id, ...d.data()} as Announcement));
                
                // Sort client side
                data.sort((a, b) => {
                    const tA = a.createdAt?.seconds || 0;
                    const tB = b.createdAt?.seconds || 0;
                    return tB - tA;
                });
                
                setAnnouncements(data.slice(0, 3));
            } catch (e) {
                console.error("Error fetching announcements", e);
            }
        };
        fetchAnnouncements();
    }, []);

    if (view === 'home' && setView) {
        return (
            <div className="space-y-6">
                {announcements.length > 0 && (
                    <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg">
                        <h3 className="font-bold flex items-center gap-2 mb-3"><Megaphone size={18}/> Admin Announcements</h3>
                        <div className="space-y-2">
                            {announcements.map(ann => (
                                <div key={ann.id} className="bg-white/10 p-3 rounded-lg text-sm border border-white/10">
                                    <p>{ann.message}</p>
                                    <p className="text-xs opacity-60 mt-1">{ann.createdAt?.toDate?.().toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <h2 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={FileText} label="Manage Exams" value="Create / Edit" color="blue" onClick={() => setView('exams')} />
                    <StatCard icon={CheckCircle} label="CBT Results" value="View Scores" color="purple" onClick={() => setView('cbt-results')} />
                    <StatCard icon={Edit} label="Results & Grading" value="Report Sheets" color="emerald" onClick={() => setView('grading')} />
                    <StatCard icon={Calendar} label="Attendance" value="Mark Register" color="orange" onClick={() => setView('attendance')} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="font-bold mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                             <Button variant="secondary" className="w-full justify-start" onClick={() => setView('exams')}><Plus size={16}/> Create New Assessment</Button>
                             <Button variant="secondary" className="w-full justify-start" onClick={() => setView('cbt-results')}><Eye size={16}/> Monitor Exam Progress</Button>
                        </div>
                    </Card>
                    <Card>
                         <h3 className="font-bold mb-4">Recent Activity</h3>
                         <p className="text-gray-500 text-sm">No recent activity to show.</p>
                    </Card>
                </div>
            </div>
        );
    }
    return null;
};

// ... Rest of the file unchanged (TeacherExams, TeacherCBTResults, TeacherGrading, TeacherLessonNotes) ...
export const TeacherExams: React.FC<Props> = ({ user, showNotification }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [mode, setMode] = useState<'list' | 'editor' | 'preview' | 'print'>('list');
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);

    useEffect(() => {
        // Fetch School Info
         if (user.schoolId) {
             getDoc(doc(db, 'schools', user.schoolId)).then(snap => {
                 if (snap.exists()) setSchoolInfo(snap.data() as SchoolInfo);
             });
         }
        // Fetch Exams
        const q = query(
            collection(db, 'exams'), 
            where('schoolId', '==', user.schoolId)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({id: d.id, ...d.data()} as Exam));
            // Filter locally for creator if needed, or if user is teacher
            const myExams = user.role === 'teacher' ? data.filter(e => e.creatorId === user.uniqueId) : data;
            myExams.sort((a,b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
            setExams(myExams);
        });
        return () => unsub();
    }, [user.schoolId, user.uniqueId, user.role]);

    const handleSaveExam = async (examData: Partial<Exam>) => {
        try {
            const code = Math.random().toString(36).substr(2, 6).toUpperCase();
            const dataToSave = {
                ...examData,
                schoolId: user.schoolId,
                creatorId: user.uniqueId,
                creatorName: user.fullName,
                createdAt: serverTimestamp(),
                code: examData.code || code,
                status: 'pending' // Default to pending approval
            };

            if (examData.id) {
                 await updateDoc(doc(db, 'exams', examData.id), { ...examData, status: 'pending' }); // Re-submit for approval on edit
                 showNotification?.('Exam updated and submitted for approval!', 'success');
            } else {
                 await addDoc(collection(db, 'exams'), dataToSave);
                 showNotification?.('Exam created and submitted for approval!', 'success');
            }
            setMode('list');
            setSelectedExam(null);
        } catch (e: any) {
            showNotification?.('Error saving exam: ' + e.message, 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this exam?')) {
            try {
                await deleteDoc(doc(db, 'exams', id));
                showNotification?.('Exam deleted successfully', 'success');
            } catch (e: any) {
                showNotification?.('Error deleting exam', 'error');
            }
        }
    };

    if (mode === 'editor') {
        return (
            <ExamEditor 
                initialExam={selectedExam || undefined} 
                user={user} 
                onSave={handleSaveExam} 
                onCancel={() => { setMode('list'); setSelectedExam(null); }} 
            />
        );
    }

    if (mode === 'print' && selectedExam) {
        return <ExamPrintView exam={selectedExam} schoolInfo={schoolInfo} onClose={() => setMode('list')} />;
    }

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">My Exams</h2>
                <Button onClick={() => { setSelectedExam(null); setMode('editor'); }}>
                    <Plus size={18}/> Create New Exam
                </Button>
            </div>
            
            <div className="space-y-4">
                {exams.map(exam => (
                    <div key={exam.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                         <div>
                             <div className="flex items-center gap-2">
                                 <h3 className="font-bold text-lg text-gray-800">{exam.title}</h3>
                                 <Badge color="blue">{exam.code}</Badge>
                                 <Badge color={exam.status === 'approved' ? 'green' : exam.status === 'review' ? 'red' : 'yellow'}>{exam.status}</Badge>
                             </div>
                             <p className="text-sm text-gray-500">{exam.subject} • {exam.classLevel} • {exam.questions.length} Questions</p>
                             {exam.status === 'review' && exam.adminFeedback && (
                                 <p className="text-xs text-red-600 mt-1"><strong>Feedback:</strong> {exam.adminFeedback}</p>
                             )}
                         </div>
                         <div className="flex gap-2">
                             <Button variant="secondary" className="px-3" onClick={() => { setSelectedExam(exam); setMode('print'); }} title="Preview/Print">
                                 <Printer size={16}/>
                             </Button>
                             <Button variant="secondary" className="px-3" onClick={() => { setSelectedExam(exam); setMode('editor'); }} title="Edit">
                                 <Edit size={16}/>
                             </Button>
                             <Button variant="danger" className="px-3" onClick={() => handleDelete(exam.id)} title="Delete">
                                 <Trash2 size={16}/>
                             </Button>
                         </div>
                    </div>
                ))}
                {exams.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                        No exams created yet. Click "Create New Exam" to get started.
                    </div>
                )}
            </div>
        </Card>
    );
};

export const TeacherCBTResults: React.FC<Props> = ({ user, showNotification }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
    const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);
    const [selectedExamData, setSelectedExamData] = useState<Exam | null>(null);

    // Fetch Exams
    useEffect(() => {
        const q = query(
            collection(db, 'exams'), 
            where('schoolId', '==', user.schoolId)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({id: d.id, ...d.data()} as Exam));
            // Show all exams for teacher to monitor, or filter by creator?
            // Usually teachers invigilate, so seeing all approved exams is good.
            setExams(data.filter(e => e.status === 'approved'));
        });
        return () => unsub();
    }, [user.schoolId]);

    // Fetch Submissions (Real-time)
    useEffect(() => {
        if (!selectedExamId) {
            setSubmissions([]);
            setSelectedExamData(null);
            return;
        }
        
        // Get Exam Data for Modal
        const exam = exams.find(e => e.id === selectedExamId);
        setSelectedExamData(exam || null);

        // Remove orderBy('timestamp', 'desc') to fix index error. Sort client side.
        const q = query(
            collection(db, 'exam_submissions'),
            where('examId', '==', selectedExamId)
        );

        const unsub = onSnapshot(q, async (snap) => {
            const data: any[] = [];
            // Fetch student parent phone for whatsapp sharing
            for (const d of snap.docs) {
                 const sub = {id: d.id, ...d.data()} as ExamSubmission;
                 // Ideally this would be joined, but simple fetch for now if missing
                 const userQ = query(collection(db, 'users'), where('uniqueId', '==', sub.studentId));
                 const userSnap = await getDocs(userQ);
                 const parentPhone = !userSnap.empty ? userSnap.docs[0].data().parentPhone : null;
                 data.push({...sub, parentPhone});
            }

            // Sort by timestamp descending
            data.sort((a, b) => {
                const tA = a.timestamp?.seconds ?? 0;
                const tB = b.timestamp?.seconds ?? 0;
                return tB - tA;
            });
            setSubmissions(data);
        });

        return () => unsub();
    }, [selectedExamId, exams]);

    const updateTheoryScore = async (id: string, newScore: string) => {
        const numScore = parseInt(newScore) || 0;
        try {
            await updateDoc(doc(db, 'exam_submissions', id), {
                theoryScore: numScore
            });
        } catch (e) {
            console.error(e);
            showNotification?.('Error updating score', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">CBT Exam Reports</h2>
                        <p className="text-gray-500 text-sm">Monitor results and grade theory questions in real-time.</p>
                    </div>
                    <div className="w-full md:w-64">
                        <select 
                            className="w-full p-2 border rounded-lg"
                            value={selectedExamId}
                            onChange={(e) => setSelectedExamId(e.target.value)}
                        >
                            <option value="">Select an Exam...</option>
                            {exams.map(e => (
                                <option key={e.id} value={e.id}>{e.title} ({e.classLevel})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedExamId ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                                <tr>
                                    <th className="p-4">Student Name</th>
                                    <th className="p-4 text-center">Obj Score</th>
                                    <th className="p-4 text-center">Theory Score (Editable)</th>
                                    <th className="p-4 text-center">Total Score</th>
                                    <th className="p-4">Date Submitted</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {submissions.map((sub: any) => (
                                    <tr 
                                        key={sub.id} 
                                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedSubmission(sub)}
                                    >
                                        <td className="p-4 font-bold text-gray-800">{sub.studentName}</td>
                                        <td className="p-4 text-center font-mono">{sub.score} / {sub.total}</td>
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="number" 
                                                className="w-20 p-1 border rounded text-center focus:ring-2 focus:ring-indigo-500"
                                                defaultValue={sub.theoryScore || 0}
                                                onBlur={(e) => updateTheoryScore(sub.id!, e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="p-4 text-center font-bold text-indigo-700 text-lg">
                                            {sub.score + (sub.theoryScore || 0)}
                                        </td>
                                        <td className="p-4 text-gray-500">{sub.timestamp?.toDate?.().toLocaleString()}</td>
                                        <td className="p-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="secondary" className="px-2 py-1 text-xs">View Details</Button>
                                            {sub.parentPhone && (
                                                <Button 
                                                    variant="success" 
                                                    className="px-2 py-1 text-xs bg-green-500 text-white" 
                                                    onClick={() => sendWhatsapp(sub.parentPhone, `Exam Result Notification:\nStudent: ${sub.studentName}\nExam: ${sub.examTitle}\nScore: ${sub.score + (sub.theoryScore || 0)}`)}
                                                    title="Share Result on WhatsApp"
                                                >
                                                    <MessageCircle size={14}/>
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {submissions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-400">No submissions found for this exam.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
                        Select an exam above to view student results.
                    </div>
                )}
            </Card>

            {/* Grading Modal */}
            {selectedSubmission && selectedExamData && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <div>
                                <h3 className="font-bold text-lg">{selectedSubmission.studentName}</h3>
                                <p className="text-xs text-gray-500">{selectedSubmission.examTitle}</p>
                            </div>
                            <button onClick={() => setSelectedSubmission(null)} className="p-1 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <div className="overflow-y-auto p-6 space-y-6">
                            {selectedExamData.questions.map((q, idx) => {
                                const studentAnswer = selectedSubmission.answers[q.id];
                                const isCorrect = q.type === 'objective' && studentAnswer === q.correct;
                                
                                return (
                                    <div key={q.id} className="border-b pb-4 last:border-0">
                                        <div className="flex gap-2 mb-2">
                                            <span className="font-bold text-gray-500">{idx + 1}.</span>
                                            <div className="flex-1">
                                                <div dangerouslySetInnerHTML={{__html: q.text}} className="font-medium text-gray-800"/>
                                                {q.image && <img src={q.image} className="h-32 mt-2 border rounded" alt="Q"/>}
                                            </div>
                                        </div>
                                        
                                        <div className="ml-6 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <p className="text-xs font-bold uppercase text-gray-400 mb-1">Student Answer:</p>
                                            <p className={`text-sm ${isCorrect ? 'text-green-700 font-bold' : q.type === 'objective' ? 'text-red-600' : 'text-gray-800'}`}>
                                                {studentAnswer || <span className="italic text-gray-400">No Answer</span>}
                                            </p>
                                            
                                            {q.type === 'objective' && !isCorrect && (
                                                <p className="text-xs text-green-600 mt-2"><strong>Correct Answer:</strong> {q.correct}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-between items-center">
                            <div>
                                <span className="text-sm font-bold text-gray-600">Total Score: </span>
                                <span className="text-xl font-bold text-indigo-600">{selectedSubmission.score + (selectedSubmission.theoryScore || 0)}</span>
                            </div>
                            <Button onClick={() => setSelectedSubmission(null)}>Close Review</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const TeacherGrading: React.FC<Props> = ({ user, showNotification }) => {
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [mode, setMode] = useState<'create' | 'history'>('create');
    const [history, setHistory] = useState<Result[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewResult, setViewResult] = useState<Result | null>(null);
    const [previewData, setPreviewData] = useState<Result | null>(null);
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);

    // Search & Scan State
    const [searchQuery, setSearchQuery] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [studentProfile, setStudentProfile] = useState<UserProfile | null>(null);

    // Form State
    const [term, setTerm] = useState('1st Term');
    const [session, setSession] = useState('2024/2025');
    const [className, setClassName] = useState('');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [domains, setDomains] = useState<Record<string, string>>({});
    const [cognitive, setCognitive] = useState<Record<string, string>>({});
    const [attendance, setAttendance] = useState({ present: 0, total: 0 });
    const [remarks, setRemarks] = useState({ teacher: '', principal: '' });
    const [position, setPosition] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLOR_PALETTES[0].hex);

    useEffect(() => {
        // Fetch All Students once (Optimized for small-medium schools)
        // For larger schools, this should be a real-time search query
        const q = query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('role', '==', 'student'));
        const unsub = onSnapshot(q, (snap) => {
            setStudents(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)));
        });

        // Fetch School Info
        if (user.schoolId) {
            getDoc(doc(db, 'schools', user.schoolId)).then(snap => {
                if (snap.exists()) setSchoolInfo(snap.data() as SchoolInfo);
            });
        }

        return () => unsub();
    }, [user.schoolId]);

    // History Loader
    useEffect(() => {
        if (mode === 'history') {
            const q = user.role === 'admin' 
                ? query(collection(db, 'results'), where('schoolId', '==', user.schoolId), limit(50))
                : query(collection(db, 'results'), where('creatorId', '==', user.uniqueId), limit(50));
                
            getDocs(q).then(snap => {
                const data = snap.docs.map(d => ({id: d.id, ...d.data()} as Result));
                data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setHistory(data);
            });
        }
    }, [mode, user.uniqueId, user.schoolId, user.role]);

    const handleSelectStudent = (idOrName: string) => {
        // Try exact match on ID first, then loose on name
        const match = students.find(s => s.uniqueId.toUpperCase() === idOrName.toUpperCase()) 
                   || students.find(s => s.fullName.toLowerCase().includes(idOrName.toLowerCase()));

        if (match) {
            setStudentProfile(match);
            setSearchQuery('');
            // Auto-fill available data?
            showNotification?.(`Selected ${match.fullName}`, 'success');
        } else {
            showNotification?.('Student not found!', 'error');
        }
    };

    const handleScan = (data: string) => {
        setShowScanner(false);
        handleSelectStudent(data);
    };

    const handleAddSubject = () => {
        setSubjects([...subjects, { name: '', ca1: 0, ca2: 0, ca3: 0, exam: 0, total: 0 }]);
    };

    const updateSubject = (index: number, field: string, value: any) => {
        const newSubjects = [...subjects];
        newSubjects[index][field] = value;
        const s = newSubjects[index];
        s.total = (parseInt(s.ca1)||0) + (parseInt(s.ca2)||0) + (parseInt(s.ca3)||0) + (parseInt(s.exam)||0);
        setSubjects(newSubjects);
    };

    const removeSubject = (index: number) => {
        setSubjects(subjects.filter((_, i) => i !== index));
    };

    const calculateGPA = () => {
        if (subjects.length === 0) return "0.00";
        let totalPoints = 0;
        subjects.forEach(s => {
            if (s.total >= 75) totalPoints += 4.0;
            else if (s.total >= 65) totalPoints += 3.0;
            else if (s.total >= 50) totalPoints += 2.0;
            else if (s.total >= 40) totalPoints += 1.0;
            else totalPoints += 0;
        });
        return (totalPoints / subjects.length).toFixed(2);
    };

    const buildResultObject = (): Result | null => {
        if (!studentProfile || !className || subjects.length === 0) {
            showNotification?.("Please select a student, enter class and add subjects.", "error");
            return null;
        }

        return {
            studentId: studentProfile.uniqueId,
            studentName: studentProfile.fullName,
            schoolId: user.schoolId,
            term,
            session,
            className,
            position,
            subjects,
            domains,
            cognitive,
            attendance,
            remarks,
            cumulativeScore: subjects.reduce((acc, curr) => acc + curr.total, 0),
            gpa: calculateGPA(),
            creatorId: user.uniqueId,
            createdAt: serverTimestamp(), // Will be overwritten by DB on save, but valid for preview type
            colorTheme: selectedColor
        };
    };

    const handlePreview = () => {
        const res = buildResultObject();
        if (res) setPreviewData(res);
    };

    const handleSaveResult = async () => {
        const resultData = buildResultObject();
        if (!resultData) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'results'), resultData);

            // --- STUDENT POINTS LOGIC ---
            // 1st = 10pts, 2nd = 9pts ... 6th = 5pts
            const posMatch = position.match(/(\d+)/);
            if (posMatch && studentProfile?.id) {
                const rank = parseInt(posMatch[0]);
                let pointsToAdd = 0;
                if (rank === 1) pointsToAdd = 10;
                else if (rank === 2) pointsToAdd = 9;
                else if (rank === 3) pointsToAdd = 8;
                else if (rank === 4) pointsToAdd = 7;
                else if (rank === 5) pointsToAdd = 6;
                else if (rank === 6) pointsToAdd = 5;

                if (pointsToAdd > 0) {
                    await updateDoc(doc(db, 'users', studentProfile.id), {
                        points: increment(pointsToAdd)
                    });
                }
            }

            showNotification?.("Result compiled and saved successfully!", "success");
            
            // Reset crucial fields
            setSubjects([]);
            setRemarks({ teacher: '', principal: '' });
            setDomains({});
            setCognitive({});
            setAttendance({ present: 0, total: 0 });
            setStudentProfile(null);
            
        } catch (e: any) {
            console.error(e);
            showNotification?.("Error saving result: " + e.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadResult = (r: Result) => {
        const student = students.find(s => s.uniqueId === r.studentId);
        if (student) setStudentProfile(student);
        
        setTerm(r.term);
        setSession(r.session);
        setClassName(r.className);
        setPosition(r.position || '');
        setSubjects(r.subjects);
        setDomains(r.domains || {});
        setCognitive(r.cognitive || {});
        setAttendance(r.attendance || {present:0, total:0});
        setRemarks(r.remarks);
        setSelectedColor(r.colorTheme || COLOR_PALETTES[0].hex);
        setMode('create');
        showNotification?.("Result loaded into form. Modify and save as new version.", "info");
    };

    if (viewResult || previewData) {
        return <ResultPreviewModal 
            data={viewResult || previewData} 
            schoolInfo={schoolInfo} 
            studentPhoto={studentProfile?.photoBase64 || students.find(s => s.uniqueId === viewResult?.studentId)?.photoBase64}
            parentPhone={studentProfile?.parentPhone || students.find(s => s.uniqueId === viewResult?.studentId)?.parentPhone}
            onClose={() => { setViewResult(null); setPreviewData(null); }} 
        />;
    }

    return (
        <div className="space-y-6">
            {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
            
            {/* Header / Mode Switch */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Result Compilation</h2>
                    <p className="text-sm text-gray-500">Compile and publish student terminal results.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto">
                    <button 
                        onClick={() => setMode('create')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'create' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                    >
                        New Entry
                    </button>
                    <button 
                        onClick={() => setMode('history')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'history' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                    >
                        History
                    </button>
                </div>
            </div>

            {mode === 'history' ? (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="p-3">Student</th>
                                    <th className="p-3">Term / Session</th>
                                    <th className="p-3">Class</th>
                                    <th className="p-3">GPA</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">{r.studentName}</td>
                                        <td className="p-3 text-gray-500">{r.term} - {r.session}</td>
                                        <td className="p-3">{r.className}</td>
                                        <td className="p-3 font-bold text-indigo-600">{r.gpa}</td>
                                        <td className="p-3 flex gap-2">
                                            <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setViewResult(r)}>Preview</Button>
                                            <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => handleLoadResult(r)}>Edit</Button>
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No history found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column: Student & Info */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Student Selector Card */}
                        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 relative">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><User size={18}/> Student Profile</h3>
                            
                            {!studentProfile ? (
                                <div className="space-y-4">
                                    <div className="flex gap-2 items-center">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input 
                                                className="w-full pl-9 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                                placeholder="Enter Name or ID..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <Button onClick={() => setShowScanner(true)} className="px-3 py-2.5" variant="secondary" title="Scan ID">
                                            <Camera size={18}/>
                                        </Button>
                                    </div>
                                    
                                    {/* Filtered Dropdown Preview */}
                                    {searchQuery && (
                                        <div className="max-h-40 overflow-y-auto border rounded-lg bg-white shadow-sm absolute w-full z-10 left-0 top-24">
                                            {students.filter(s => s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || s.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()))
                                                .map(s => (
                                                    <div 
                                                        key={s.id} 
                                                        onClick={() => handleSelectStudent(s.uniqueId)}
                                                        className="p-2 hover:bg-indigo-50 cursor-pointer text-sm border-b last:border-0"
                                                    >
                                                        <p className="font-bold">{s.fullName}</p>
                                                        <p className="text-xs text-gray-500">{s.uniqueId}</p>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center relative">
                                    <button 
                                        onClick={() => setStudentProfile(null)}
                                        className="absolute top-0 right-0 p-1 text-gray-400 hover:text-red-500"
                                    >
                                        <X size={16}/>
                                    </button>
                                    <div className="w-16 h-16 bg-indigo-100 rounded-full mx-auto mb-3 overflow-hidden border-2 border-white shadow-md">
                                        {studentProfile.photoBase64 ? (
                                            <img src={studentProfile.photoBase64} alt="Student" className="w-full h-full object-cover"/>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-xl">
                                                {studentProfile.fullName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 leading-tight">{studentProfile.fullName}</h3>
                                    <p className="text-xs text-gray-500 font-mono mb-2">{studentProfile.uniqueId}</p>
                                    <Badge color="blue">Selected</Badge>
                                </div>
                            )}
                        </Card>

                        {/* Exam Meta Data */}
                        <Card>
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar size={18}/> Academic Session</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Class Level</label>
                                    <select 
                                        className="w-full p-2 border rounded-lg bg-white text-sm"
                                        value={className}
                                        onChange={e => setClassName(e.target.value)}
                                    >
                                        <option value="">Select Class...</option>
                                        {NIGERIAN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Term</label>
                                        <select className="w-full p-2 border rounded-lg bg-white text-sm" value={term} onChange={e => setTerm(e.target.value)}>
                                            <option>1st Term</option>
                                            <option>2nd Term</option>
                                            <option>3rd Term</option>
                                        </select>
                                    </div>
                                    <Input label="Session" value={session} onChange={e => setSession(e.target.value)} placeholder="2024/2025" className="mb-0" />
                                </div>
                                <Input label="Position (Optional)" value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. 5th" className="mb-0" />
                                
                                <div className="mt-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Theme Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLOR_PALETTES.map(p => (
                                            <button 
                                                key={p.hex}
                                                onClick={() => setSelectedColor(p.hex)}
                                                className={`w-6 h-6 rounded-full border-2 transition-all ${selectedColor === p.hex ? 'border-gray-800 scale-110 ring-2 ring-gray-300' : 'border-transparent hover:scale-105'}`}
                                                style={{ backgroundColor: p.hex }}
                                                title={p.name}
                                                type="button"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Action Buttons (Desktop sticky) */}
                        <div className="hidden lg:flex flex-col gap-3 sticky top-6">
                            <Button onClick={handlePreview} variant="secondary" className="w-full py-3 shadow-sm">
                                <Eye size={18}/> Preview Result
                            </Button>
                            <Button onClick={handleSaveResult} variant="primary" disabled={loading} className="w-full py-3 shadow-lg shadow-indigo-200">
                                {loading ? <Loader className="animate-spin" size={18}/> : <Save size={18}/>} Save & Publish
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: Subjects & Domains */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Subject Entry */}
                        <Card className="overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calculator size={18}/> Subject Scores</h3>
                                <Button onClick={handleAddSubject} variant="secondary" className="text-xs"><Plus size={14}/> Add Row</Button>
                            </div>
                            
                            <div className="overflow-x-auto -mx-6 px-6 pb-2">
                                <table className="w-full min-w-[600px] text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                                        <tr>
                                            <th className="p-3 w-1/3">Subject</th>
                                            <th className="p-3 w-14 text-center">CA1</th>
                                            <th className="p-3 w-14 text-center">CA2</th>
                                            <th className="p-3 w-14 text-center">CA3</th>
                                            <th className="p-3 w-14 text-center">Exam</th>
                                            <th className="p-3 w-14 text-center">Total</th>
                                            <th className="p-3 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {subjects.map((sub, i) => (
                                            <tr key={i} className="group hover:bg-gray-50">
                                                <td className="p-2">
                                                    <input 
                                                        list="subjects-list"
                                                        className="w-full p-1.5 border rounded focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                                        value={sub.name} 
                                                        onChange={e => updateSubject(i, 'name', e.target.value)}
                                                        placeholder="Subject..."
                                                    />
                                                </td>
                                                <td className="p-2"><input type="number" className="w-full p-1.5 border rounded text-center text-sm" value={sub.ca1} onChange={e => updateSubject(i, 'ca1', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" className="w-full p-1.5 border rounded text-center text-sm" value={sub.ca2} onChange={e => updateSubject(i, 'ca2', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" className="w-full p-1.5 border rounded text-center text-sm" value={sub.ca3} onChange={e => updateSubject(i, 'ca3', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" className="w-full p-1.5 border rounded text-center text-sm" value={sub.exam} onChange={e => updateSubject(i, 'exam', e.target.value)} /></td>
                                                <td className="p-2 text-center font-bold bg-gray-50 text-gray-700 rounded text-sm">{sub.total}</td>
                                                <td className="p-2 text-center">
                                                    <button onClick={() => removeSubject(i)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {subjects.length === 0 && <div className="text-center py-8 text-gray-400 italic text-sm">No subjects added yet. Click "Add Row".</div>}
                                <datalist id="subjects-list">
                                    {NIGERIAN_SUBJECTS.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>
                        </Card>

                        {/* Grading Assessment Section (Redesigned) */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                             <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><UserCheck size={18}/> Grading Assessment</h3>
                             </div>
                             
                             <div className="p-6 grid md:grid-cols-2 gap-8">
                                {/* Left Column: Cognitive & Affective */}
                                <div className="space-y-6">
                                    {/* Cognitive Domain */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pb-1 border-b">Cognitive Domain</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {COGNITIVE_DOMAINS.map(d => (
                                                <div key={d} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                    <span className="text-[10px] sm:text-xs font-medium text-gray-600 truncate mr-2" title={d}>{d}</span>
                                                    <input 
                                                        type="number" min="1" max="5" 
                                                        className="w-8 h-6 sm:w-10 sm:h-7 p-1 border rounded text-center text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
                                                        value={cognitive[d] || ''} 
                                                        onChange={e => setCognitive({...cognitive, [d]: e.target.value})} 
                                                        placeholder="-"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Affective Domain */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pb-1 border-b">Affective Domain</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {AFFECTIVE_DOMAINS.map(d => (
                                                <div key={d} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                    <span className="text-[10px] sm:text-xs font-medium text-gray-600 truncate mr-2" title={d}>{d}</span>
                                                    <input 
                                                        type="number" min="1" max="5" 
                                                        className="w-8 h-6 sm:w-10 sm:h-7 p-1 border rounded text-center text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
                                                        value={domains[d] || ''} 
                                                        onChange={e => setDomains({...domains, [d]: e.target.value})} 
                                                        placeholder="-"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Psychomotor & Attendance */}
                                <div className="space-y-6">
                                    {/* Psychomotor Domain */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pb-1 border-b">Psychomotor Skills</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {PSYCHOMOTOR_DOMAINS.map(d => (
                                                <div key={d} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                    <span className="text-[10px] sm:text-xs font-medium text-gray-600 truncate mr-2" title={d}>{d}</span>
                                                    <input 
                                                        type="number" min="1" max="5" 
                                                        className="w-8 h-6 sm:w-10 sm:h-7 p-1 border rounded text-center text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
                                                        value={domains[d] || ''} 
                                                        onChange={e => setDomains({...domains, [d]: e.target.value})} 
                                                        placeholder="-"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Attendance Compact */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 pb-1 border-b">Attendance</h4>
                                        <div className="flex gap-4">
                                            <div className="flex-1 bg-indigo-50 p-2 rounded-lg border border-indigo-100 flex justify-between items-center">
                                                <span className="text-xs text-indigo-800 font-medium">Present</span>
                                                <input 
                                                    type="number" 
                                                    className="w-12 h-7 p-1 border rounded text-center text-xs font-bold"
                                                    value={attendance.present} 
                                                    onChange={e => setAttendance({...attendance, present: parseInt(e.target.value)})}
                                                />
                                            </div>
                                            <div className="flex-1 bg-gray-50 p-2 rounded-lg border border-gray-100 flex justify-between items-center">
                                                <span className="text-xs text-gray-600 font-medium">Total</span>
                                                <input 
                                                    type="number" 
                                                    className="w-12 h-7 p-1 border rounded text-center text-xs font-bold"
                                                    value={attendance.total} 
                                                    onChange={e => setAttendance({...attendance, total: parseInt(e.target.value)})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* Remarks */}
                        <Card>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><MessageCircle size={16}/> Remarks</h3>
                            <div className="space-y-3">
                                <input className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Class Teacher's Remark" value={remarks.teacher} onChange={e => setRemarks({...remarks, teacher: e.target.value})} />
                                <input className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Principal's Remark" value={remarks.principal} onChange={e => setRemarks({...remarks, principal: e.target.value})} />
                            </div>
                        </Card>

                        {/* Mobile Action Buttons */}
                        <div className="flex lg:hidden gap-3 pb-8">
                            <Button onClick={handlePreview} variant="secondary" className="flex-1 py-3 shadow-sm">
                                <Eye size={18}/> Preview
                            </Button>
                            <Button onClick={handleSaveResult} variant="primary" disabled={loading} className="flex-1 py-3 shadow-lg shadow-indigo-200">
                                {loading ? <Loader className="animate-spin" size={18}/> : <Save size={18}/>} Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const TeacherLessonNotes: React.FC<Props> = ({ user, showNotification }) => {
    const [notes, setNotes] = useState<LessonNote[]>([]);
    const [mode, setMode] = useState<'list' | 'editor'>('list');
    const [currentNote, setCurrentNote] = useState<Partial<LessonNote>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'lesson_notes'), where('creatorId', '==', user.uniqueId));
        const unsub = onSnapshot(q, (snap) => {
             setNotes(snap.docs.map(d => ({id: d.id, ...d.data()} as LessonNote)));
        });
        return () => unsub();
    }, [user.uniqueId]);

    const handleSave = async () => {
        if (!currentNote.topic || !currentNote.content) {
            showNotification?.('Topic and Content are required', 'error');
            return;
        }
        setLoading(true);
        try {
            const code = currentNote.accessCode || Math.random().toString(36).substr(2, 6).toUpperCase();
            const noteData = {
                topic: currentNote.topic,
                subject: currentNote.subject || 'General',
                classLevel: currentNote.classLevel || 'General',
                content: currentNote.content,
                accessCode: code,
                schoolId: user.schoolId,
                creatorId: user.uniqueId,
                creatorName: user.fullName,
                createdAt: serverTimestamp()
            };

            if (currentNote.id) {
                await updateDoc(doc(db, 'lesson_notes', currentNote.id), noteData);
                showNotification?.('Note updated successfully', 'success');
            } else {
                await addDoc(collection(db, 'lesson_notes'), noteData);
                showNotification?.('Note created successfully', 'success');
            }
            setMode('list');
            setCurrentNote({});
        } catch (e: any) {
             showNotification?.('Error saving note', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this note?')) return;
        try {
            await deleteDoc(doc(db, 'lesson_notes', id));
            showNotification?.('Note deleted', 'success');
        } catch(e) { showNotification?.('Error deleting', 'error'); }
    };

    if (mode === 'editor') {
        return (
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">{currentNote.id ? 'Edit Note' : 'New Lesson Note'}</h2>
                    <Button variant="secondary" onClick={() => { setMode('list'); setCurrentNote({}); }}><X size={18}/></Button>
                </div>
                <div className="space-y-4">
                    <Input label="Topic" value={currentNote.topic || ''} onChange={e => setCurrentNote({...currentNote, topic: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Subject" value={currentNote.subject || ''} onChange={e => setCurrentNote({...currentNote, subject: e.target.value})} />
                        <Input label="Class" value={currentNote.classLevel || ''} onChange={e => setCurrentNote({...currentNote, classLevel: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML Supported)</label>
                        <textarea 
                            className="w-full h-64 border rounded-lg p-4 font-mono text-sm" 
                            value={currentNote.content || ''} 
                            onChange={e => setCurrentNote({...currentNote, content: e.target.value})}
                            placeholder="Type your lesson content here..."
                        ></textarea>
                    </div>
                    <Button onClick={handleSave} disabled={loading} className="w-full">
                        {loading ? 'Saving...' : 'Save Lesson Note'}
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">My Lesson Notes</h2>
                <Button onClick={() => setMode('editor')}><Plus size={18}/> Create Note</Button>
            </div>
            <div className="space-y-4">
                {notes.map(note => (
                    <div key={note.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{note.topic}</h3>
                            <p className="text-sm text-gray-500">{note.subject} • {note.classLevel}</p>
                            <Badge color="blue" className="mt-2 inline-block">Code: {note.accessCode}</Badge>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => { setCurrentNote(note); setMode('editor'); }}><Edit size={16}/></Button>
                            <Button variant="danger" onClick={() => handleDelete(note.id!)}><Trash2 size={16}/></Button>
                        </div>
                    </div>
                ))}
                {notes.length === 0 && <div className="text-center py-10 text-gray-400">No notes created yet.</div>}
            </div>
        </Card>
    );
};
