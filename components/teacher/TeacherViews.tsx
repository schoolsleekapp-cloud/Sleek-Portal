import React, { useState, useEffect, useRef } from 'react';
import { FileText, Edit, Calendar, IdCard, Plus, Clock, User, LogIn, LogOut, Camera, X, CheckCircle, Keyboard, Download, Sparkles, Image as ImageIcon, PenTool, Type, Trash2, Printer, ChevronDown, Save, Eye, Settings, Search, Loader, Palette, List, ArrowLeft, School, Activity, BookOpen, Share2, Upload, FileUp, Filter, RefreshCw, Smartphone, Trash, WifiOff, CloudOff, AlertCircle, MessageCircle } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, limit, updateDoc, doc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { db } from '../../services/firebase';
import { UserProfile, Exam, Question, AttendanceRecord, SchoolInfo, Result, LessonNote, ExamSubmission } from '../../types';
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

export const ResultPreviewModal = ({ data, schoolInfo, studentPhoto, onClose }: { data: any, schoolInfo: SchoolInfo | null, studentPhoto?: string | null, onClose: () => void }) => {
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

export const TeacherDashboard: React.FC<Props> = ({ user, view, setView }) => {
    if (view === 'home' && setView) {
        return (
            <div className="space-y-6">
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
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);

    // Form State
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [term, setTerm] = useState('1st Term');
    const [session, setSession] = useState('2024/2025');
    const [className, setClassName] = useState('');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [domains, setDomains] = useState<Record<string, string>>({});
    const [cognitive, setCognitive] = useState<Record<string, string>>({});
    const [attendance, setAttendance] = useState({ present: 0, total: 0 });
    const [remarks, setRemarks] = useState({ teacher: '', principal: '' });
    const [position, setPosition] = useState('');

    useEffect(() => {
        // Fetch Students
        const q = query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('role', '==', 'student'));
        const unsub = onSnapshot(q, (snap) => {
            setStudents(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)));
        });

        // Fetch School Info (for preview)
        if (user.schoolId) {
            getDoc(doc(db, 'schools', user.schoolId)).then(snap => {
                if (snap.exists()) setSchoolInfo(snap.data() as SchoolInfo);
            });
        }

        return () => unsub();
    }, [user.schoolId]);

    // Fetch History when mode changes
    useEffect(() => {
        if (mode === 'history') {
            const q = user.role === 'admin' 
                ? query(collection(db, 'results'), where('schoolId', '==', user.schoolId), limit(50))
                : query(collection(db, 'results'), where('creatorId', '==', user.uniqueId), limit(50));
                
            getDocs(q).then(snap => {
                const data = snap.docs.map(d => ({id: d.id, ...d.data()} as Result));
                // Client side sort by date desc
                data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setHistory(data);
            });
        }
    }, [mode, user.uniqueId, user.schoolId, user.role]);

    const handleAddSubject = () => {
        setSubjects([...subjects, { name: '', ca1: 0, ca2: 0, ca3: 0, exam: 0, total: 0 }]);
    };

    const updateSubject = (index: number, field: string, value: any) => {
        const newSubjects = [...subjects];
        newSubjects[index][field] = value;
        // Auto calc total
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
            if (s.total >= 75) totalPoints += 4.0; // A
            else if (s.total >= 65) totalPoints += 3.0; // B
            else if (s.total >= 50) totalPoints += 2.0; // C
            else if (s.total >= 40) totalPoints += 1.0; // D
            else totalPoints += 0; // F
        });
        return (totalPoints / subjects.length).toFixed(2);
    };

    const handleSaveResult = async () => {
        if (!selectedStudent || !className || subjects.length === 0) {
            showNotification?.("Please select a student, class and add at least one subject.", "error");
            return;
        }

        setLoading(true);
        try {
            const studentProfile = students.find(s => s.uniqueId === selectedStudent);
            
            const resultData: Result = {
                studentId: selectedStudent,
                studentName: studentProfile?.fullName || 'Unknown',
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
                createdAt: serverTimestamp(),
                colorTheme: COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)].hex
            };

            await addDoc(collection(db, 'results'), resultData);
            showNotification?.("Result compiled and saved successfully!", "success");
            
            // Reset crucial fields to allow next entry
            setSubjects([]);
            setRemarks({ teacher: '', principal: '' });
            setDomains({});
            setCognitive({});
            setAttendance({ present: 0, total: 0 });
            
        } catch (e: any) {
            console.error(e);
            showNotification?.("Error saving result: " + e.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadResult = (r: Result) => {
        // Populate form with existing result data to edit (creating a NEW copy technically, unless we add ID handling for updates)
        // For simplicity, we just load data to create a new revision or similar.
        setSelectedStudent(r.studentId);
        setTerm(r.term);
        setSession(r.session);
        setClassName(r.className);
        setPosition(r.position || '');
        setSubjects(r.subjects);
        setDomains(r.domains || {});
        setCognitive(r.cognitive || {});
        setAttendance(r.attendance || {present:0, total:0});
        setRemarks(r.remarks);
        setMode('create');
        showNotification?.("Result loaded into form. Modify and save as new version.", "info");
    };

    if (viewResult) {
        return <ResultPreviewModal 
            data={viewResult} 
            schoolInfo={schoolInfo} 
            studentPhoto={students.find(s => s.uniqueId === viewResult.studentId)?.photoBase64}
            onClose={() => setViewResult(null)} 
        />;
    }

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Result Compilation</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setMode('create')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'create' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                    >
                        Create New
                    </button>
                    <button 
                        onClick={() => setMode('history')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'history' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                    >
                        View History
                    </button>
                </div>
            </div>

            {mode === 'history' ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
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
                                        <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => handleLoadResult(r)}>Load to Edit</Button>
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No history found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Student & Term Info */}
                    <div className="grid md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                            <select 
                                className="w-full p-2 border rounded-lg bg-white"
                                value={selectedStudent}
                                onChange={e => setSelectedStudent(e.target.value)}
                            >
                                <option value="">-- Choose Student --</option>
                                {students.map(s => <option key={s.id} value={s.uniqueId}>{s.fullName} ({s.uniqueId})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Class Level</label>
                            <input className="w-full p-2 border rounded-lg" value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. JSS 1" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                                <select className="w-full p-2 border rounded-lg bg-white" value={term} onChange={e => setTerm(e.target.value)}>
                                    <option>1st Term</option>
                                    <option>2nd Term</option>
                                    <option>3rd Term</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                                <input className="w-full p-2 border rounded-lg" value={session} onChange={e => setSession(e.target.value)} placeholder="2024/2025" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Position (Optional)</label>
                            <input className="w-full p-2 border rounded-lg" value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. 5th" />
                        </div>
                    </div>

                    {/* Subjects */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-gray-700">Subject Scores</h3>
                            <Button onClick={handleAddSubject} variant="secondary" className="text-xs"><Plus size={14}/> Add Subject</Button>
                        </div>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 font-bold">
                                    <tr>
                                        <th className="p-2 min-w-[150px]">Subject</th>
                                        <th className="p-2 w-16 text-center">CA 1</th>
                                        <th className="p-2 w-16 text-center">CA 2</th>
                                        <th className="p-2 w-16 text-center">CA 3</th>
                                        <th className="p-2 w-16 text-center">Exam</th>
                                        <th className="p-2 w-16 text-center">Total</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {subjects.map((sub, i) => (
                                        <tr key={i}>
                                            <td className="p-2">
                                                <input 
                                                    list="subjects-list"
                                                    className="w-full p-1 border rounded"
                                                    value={sub.name} 
                                                    onChange={e => updateSubject(i, 'name', e.target.value)}
                                                    placeholder="Select or Type..."
                                                />
                                            </td>
                                            <td className="p-2"><input type="number" className="w-full p-1 border rounded text-center" value={sub.ca1} onChange={e => updateSubject(i, 'ca1', e.target.value)} /></td>
                                            <td className="p-2"><input type="number" className="w-full p-1 border rounded text-center" value={sub.ca2} onChange={e => updateSubject(i, 'ca2', e.target.value)} /></td>
                                            <td className="p-2"><input type="number" className="w-full p-1 border rounded text-center" value={sub.ca3} onChange={e => updateSubject(i, 'ca3', e.target.value)} /></td>
                                            <td className="p-2"><input type="number" className="w-full p-1 border rounded text-center" value={sub.exam} onChange={e => updateSubject(i, 'exam', e.target.value)} /></td>
                                            <td className="p-2 text-center font-bold bg-gray-50">{sub.total}</td>
                                            <td className="p-2 text-center"><button onClick={() => removeSubject(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <datalist id="subjects-list">
                                {NIGERIAN_SUBJECTS.map(s => <option key={s} value={s} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Domains */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="border rounded-lg p-4">
                            <h3 className="font-bold text-gray-700 border-b pb-2 mb-3 text-xs uppercase">Cognitive</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {COGNITIVE_DOMAINS.map(d => (
                                    <div key={d} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">{d}</span>
                                        <input type="number" min="1" max="5" className="w-12 p-1 border rounded text-center" value={cognitive[d] || ''} onChange={e => setCognitive({...cognitive, [d]: e.target.value})} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border rounded-lg p-4">
                            <h3 className="font-bold text-gray-700 border-b pb-2 mb-3 text-xs uppercase">Affective</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {AFFECTIVE_DOMAINS.map(d => (
                                    <div key={d} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">{d}</span>
                                        <input type="number" min="1" max="5" className="w-12 p-1 border rounded text-center" value={domains[d] || ''} onChange={e => setDomains({...domains, [d]: e.target.value})} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border rounded-lg p-4">
                            <h3 className="font-bold text-gray-700 border-b pb-2 mb-3 text-xs uppercase">Psychomotor</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {PSYCHOMOTOR_DOMAINS.map(d => (
                                    <div key={d} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">{d}</span>
                                        <input type="number" min="1" max="5" className="w-12 p-1 border rounded text-center" value={domains[d] || ''} onChange={e => setDomains({...domains, [d]: e.target.value})} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Attendance & Remarks */}
                    <div className="grid md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl">
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-700">Attendance</h3>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500">Days Present</label>
                                    <input type="number" className="w-full p-2 border rounded" value={attendance.present} onChange={e => setAttendance({...attendance, present: parseInt(e.target.value)})} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500">Total Days</label>
                                    <input type="number" className="w-full p-2 border rounded" value={attendance.total} onChange={e => setAttendance({...attendance, total: parseInt(e.target.value)})} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-700">Remarks</h3>
                            <div>
                                <label className="text-xs text-gray-500">Class Teacher's Remark</label>
                                <input className="w-full p-2 border rounded" value={remarks.teacher} onChange={e => setRemarks({...remarks, teacher: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Principal's Remark</label>
                                <input className="w-full p-2 border rounded" value={remarks.principal} onChange={e => setRemarks({...remarks, principal: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleSaveResult} className="w-full md:w-auto px-8 py-3 text-lg" disabled={loading}>
                            {loading ? 'Processing...' : <><Save size={18}/> Compile & Save Result</>}
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};

export const TeacherAttendance: React.FC<Props> = ({ user, showNotification }) => {
    const [scannedId, setScannedId] = useState('');
    const [manualId, setManualId] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lastMarked, setLastMarked] = useState<{name: string, phone: string | null, type: string, time: string} | null>(null);

    const markAttendance = async (studentId: string, type: 'in' | 'out') => {
        setLoading(true);
        setLastMarked(null);
        try {
            // Verify student exists and belongs to school
            const q = query(collection(db, 'users'), where('uniqueId', '==', studentId), where('schoolId', '==', user.schoolId));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                showNotification?.('Student not found!', 'error');
                setLoading(false);
                return;
            }

            const student = snap.docs[0].data() as UserProfile;

            await addDoc(collection(db, 'attendance'), {
                studentId: student.uniqueId,
                studentName: student.fullName,
                schoolId: user.schoolId,
                type,
                timestamp: serverTimestamp(),
                recordedBy: user.uniqueId,
                recordedByName: user.fullName,
                guardianName: student.parentPhone ? 'Parent Alerted' : null,
                guardianPhone: student.parentPhone
            });

            const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            showNotification?.(`Marked ${type.toUpperCase()} for ${student.fullName}`, 'success');
            setLastMarked({
                name: student.fullName, 
                phone: student.parentPhone, 
                type: type.toUpperCase(), 
                time: timeNow
            });

            setManualId('');
            setScannedId('');
            setShowScanner(false);
        } catch (e: any) {
            showNotification?.('Error marking attendance', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-xl mx-auto">
            <h2 className="text-xl font-bold mb-6 text-center">Class Attendance Register</h2>
            
            {/* Last Marked Notification Action */}
            {lastMarked && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between animate-in slide-in-from-top-4">
                    <div>
                        <p className="font-bold text-green-800">{lastMarked.name} marked {lastMarked.type}</p>
                        <p className="text-xs text-green-600">at {lastMarked.time}</p>
                    </div>
                    {lastMarked.phone && (
                        <Button 
                            variant="success" 
                            className="text-sm py-1 px-3 bg-green-600 hover:bg-green-700 text-white flex gap-2"
                            onClick={() => sendWhatsapp(lastMarked.phone, `School Attendance Alert:\nYour ward ${lastMarked.name} has clocked ${lastMarked.type} at ${lastMarked.time}.`)}
                        >
                            <MessageCircle size={16}/> Notify Parent
                        </Button>
                    )}
                </div>
            )}
            
            {showScanner ? (
                <QRScanner 
                    onScan={(val) => markAttendance(val, 'in')} 
                    onClose={() => setShowScanner(false)} 
                />
            ) : (
                <div className="space-y-6">
                    <Button onClick={() => setShowScanner(true)} className="w-full py-8 text-lg flex flex-col items-center gap-2">
                        <Camera size={32}/> Scan Student ID Card
                    </Button>
                    
                    <div className="relative border-t border-gray-200 pt-6">
                         <p className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-sm text-gray-400">OR MANUAL ENTRY</p>
                         <div className="flex gap-2">
                             <input 
                                className="flex-1 border rounded-lg px-4"
                                placeholder="Enter Student ID (e.g. STU-12345)"
                                value={manualId}
                                onChange={e => setManualId(e.target.value.toUpperCase())}
                             />
                         </div>
                         <div className="grid grid-cols-2 gap-4 mt-4">
                             <Button onClick={() => markAttendance(manualId, 'in')} variant="success" disabled={!manualId || loading}>
                                 Mark Clock IN
                             </Button>
                             <Button onClick={() => markAttendance(manualId, 'out')} variant="danger" disabled={!manualId || loading}>
                                 Mark Clock OUT
                             </Button>
                         </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export const TeacherLessonNotes: React.FC<Props> = ({ user, showNotification }) => {
    const [notes, setNotes] = useState<LessonNote[]>([]);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<LessonNote>>({});

    useEffect(() => {
        const q = query(collection(db, 'lesson_notes'), where('creatorId', '==', user.uniqueId));
        const unsub = onSnapshot(q, (snap) => {
            setNotes(snap.docs.map(d => ({id: d.id, ...d.data()} as LessonNote)));
        });
        return () => unsub();
    }, [user.uniqueId]);

    const handleSave = async () => {
        if (!formData.topic || !formData.content) return;
        try {
            const code = Math.random().toString(36).substr(2, 6).toUpperCase();
            await addDoc(collection(db, 'lesson_notes'), {
                ...formData,
                schoolId: user.schoolId,
                creatorId: user.uniqueId,
                creatorName: user.fullName,
                accessCode: code,
                createdAt: serverTimestamp()
            });
            setEditing(false);
            setFormData({});
            showNotification?.(`Note created! Access Code: ${code}`, 'success');
        } catch (e) {
            showNotification?.('Error saving note', 'error');
        }
    };

    if (editing) {
        return (
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Create Lesson Note</h3>
                    <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
                <div className="space-y-4">
                    <Input label="Topic" value={formData.topic || ''} onChange={e => setFormData({...formData, topic: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Subject" value={formData.subject || ''} onChange={e => setFormData({...formData, subject: e.target.value})} />
                        <Input label="Class" value={formData.classLevel || ''} onChange={e => setFormData({...formData, classLevel: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Content (HTML Supported)</label>
                        <textarea 
                            className="w-full h-64 border rounded-lg p-3 font-mono text-sm"
                            value={formData.content || ''}
                            onChange={e => setFormData({...formData, content: e.target.value})}
                            placeholder="Type content or paste HTML..."
                        ></textarea>
                    </div>
                    <Button onClick={handleSave} className="w-full">Publish Note</Button>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">My Lesson Notes</h2>
                <Button onClick={() => setEditing(true)}><Plus size={16}/> Create Note</Button>
            </div>
            <div className="space-y-4">
                {notes.map(note => (
                    <div key={note.id} className="border p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <h3 className="font-bold">{note.topic}</h3>
                            <p className="text-sm text-gray-500">{note.subject} • {note.classLevel}</p>
                        </div>
                        <div className="text-right">
                            <Badge color="orange">{note.accessCode}</Badge>
                            <p className="text-xs text-gray-400 mt-1">{note.createdAt?.toDate?.().toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
                {notes.length === 0 && <p className="text-center text-gray-400">No notes created.</p>}
            </div>
        </Card>
    );
};