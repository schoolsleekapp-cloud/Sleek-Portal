
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
export const NIGERIAN_SUBJECTS = [
    "Mathematics", "English Language", "Basic Science", "Basic Technology", 
    "Civic Education", "Social Studies", "Agricultural Science", "Home Economics",
    "Christian Religious Studies", "Islamic Religious Studies", "Physical & Health Education",
    "Computer Science", "Business Studies", "French", "Cultural & Creative Arts",
    "History", "Geography", "Physics", "Chemistry", "Biology", "Economics", 
    "Government", "Literature-in-English", "Commerce", "Financial Accounting", "Further Mathematics"
];

export const NIGERIAN_CLASSES = [
    "Creche", "Pre-Nursery", "Nursery 1", "Nursery 2", "Nursery 3",
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"
];

export const AFFECTIVE_DOMAINS = ["Punctuality", "Neatness", "Politeness", "Honesty", "Attentiveness", "Self Control", "Obedience", "Spirit of Cooperation"];
export const PSYCHOMOTOR_DOMAINS = ["Handwriting", "Fluency", "Games/Sports", "Handling Tools", "Drawing/Painting", "Musical Skills"];
export const COGNITIVE_DOMAINS = ["Knowledge", "Understanding", "Application", "Analysis", "Evaluation", "Creativity"];

const COLOR_PALETTES = [
    { name: 'Midnight Blue', hex: '#1e3a8a' },
    { name: 'Emerald Green', hex: '#064e3b' },
    { name: 'Red', hex: '#7f1d1d' },
    { name: 'Purple', hex: '#581c87' },
    { name: 'Black', hex: '#000000' }
];

// Result Preview Component (Shared)
export const ResultPreviewModal = ({ data, schoolInfo, studentPhoto, parentPhone, onClose }: { data: Result, schoolInfo: SchoolInfo | null, studentPhoto?: string | null, parentPhone?: string | null, onClose: () => void }) => {
    const handlePrint = () => {
         window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:h-auto print:shadow-none print:w-full print:max-w-none print:rounded-none">
                
                {/* Header - Sticky */}
                <div className="flex justify-between items-center p-4 border-b bg-gray-50 z-20 shrink-0 print:hidden">
                    <h3 className="font-bold text-gray-800">Result Preview</h3>
                    <div className="flex gap-2">
                        <Button onClick={handlePrint} variant="primary"><Download size={16}/> Print / PDF</Button>
                        <Button onClick={onClose} variant="secondary"><X size={16}/> Close</Button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-8 md:p-12 print:p-0 print:overflow-visible flex-1" style={{ color: data.colorTheme || '#000' }}>
                   {/* Report Header */}
                   <div className="flex justify-between items-start border-b-4 pb-4 mb-6" style={{ borderColor: data.colorTheme }}>
                       <div className="flex items-center gap-4">
                           {schoolInfo?.logo && <img src={schoolInfo.logo} alt="Logo" className="w-24 h-24 object-contain" />}
                           <div>
                               <h1 className="text-3xl font-bold uppercase">{schoolInfo?.name || 'School Name'}</h1>
                               <p className="text-sm">{schoolInfo?.address || 'School Address'}</p>
                               <p className="text-sm">{schoolInfo?.phone} | {schoolInfo?.website}</p>
                           </div>
                       </div>
                       <div className="text-right">
                           <h2 className="text-2xl font-bold uppercase">Student Report Card</h2>
                           <p className="font-bold text-lg">{data.term} | {data.session}</p>
                       </div>
                   </div>

                   {/* Student Info */}
                   <div className="flex gap-6 mb-8 bg-gray-50 p-4 rounded-xl border print:bg-transparent print:border-gray-300">
                       <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden border-2 border-white shadow-sm print:border-gray-400">
                           {studentPhoto ? (
                               <img src={studentPhoto} className="w-full h-full object-cover" alt="Student" />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={32}/></div>
                           )}
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 flex-1">
                           <div>
                               <p className="text-xs uppercase opacity-60 font-bold">Student Name</p>
                               <p className="font-bold text-lg">{data.studentName}</p>
                           </div>
                            <div>
                               <p className="text-xs uppercase opacity-60 font-bold">Class</p>
                               <p className="font-bold">{data.className}</p>
                           </div>
                           <div>
                               <p className="text-xs uppercase opacity-60 font-bold">Admission No</p>
                               <p className="font-bold font-mono">{data.studentId}</p>
                           </div>
                           <div>
                               <p className="text-xs uppercase opacity-60 font-bold">Position</p>
                               <p className="font-bold">{data.position || 'N/A'}</p>
                           </div>
                           <div>
                               <p className="text-xs uppercase opacity-60 font-bold">Total Students</p>
                               <p className="font-bold">{data.totalStudents || 'N/A'}</p>
                           </div>
                            <div>
                               <p className="text-xs uppercase opacity-60 font-bold">Attendance</p>
                               <p className="font-bold">{data.attendance?.present || 0} / {data.attendance?.total || 0}</p>
                           </div>
                       </div>
                   </div>

                   {/* Scores Table */}
                   <table className="w-full text-left border-collapse mb-8">
                       <thead>
                           <tr style={{ backgroundColor: data.colorTheme, color: '#fff' }}>
                               <th className="p-3 border border-white/20">Subject</th>
                               <th className="p-3 border border-white/20 w-16 text-center">CA 1</th>
                               <th className="p-3 border border-white/20 w-16 text-center">CA 2</th>
                               <th className="p-3 border border-white/20 w-16 text-center">CA 3</th>
                               <th className="p-3 border border-white/20 w-16 text-center">Exam</th>
                               <th className="p-3 border border-white/20 w-16 text-center">Total</th>
                               <th className="p-3 border border-white/20 w-16 text-center">Grade</th>
                               <th className="p-3 border border-white/20 w-24 text-center">Remark</th>
                           </tr>
                       </thead>
                       <tbody>
                           {data.subjects && data.subjects.map((s: any, i: number) => {
                               const score = s.total;
                               let grade = 'F';
                               let remark = 'Fail';
                               if (score >= 75) { grade = 'A'; remark = 'Excellent'; }
                               else if (score >= 65) { grade = 'B'; remark = 'Very Good'; }
                               else if (score >= 50) { grade = 'C'; remark = 'Good'; }
                               else if (score >= 40) { grade = 'D'; remark = 'Fair'; }
                               else if (score >= 0) { grade = 'E'; remark = 'Poor'; }
                               
                               return (
                                   <tr key={i} className="border-b border-gray-200">
                                       <td className="p-2 border-x font-medium">{s.name}</td>
                                       <td className="p-2 border-x text-center">{s.ca1 || '-'}</td>
                                       <td className="p-2 border-x text-center">{s.ca2 || '-'}</td>
                                       <td className="p-2 border-x text-center">{s.ca3 || '-'}</td>
                                       <td className="p-2 border-x text-center">{s.exam || '-'}</td>
                                       <td className="p-2 border-x text-center font-bold">{s.total}</td>
                                       <td className={`p-2 border-x text-center font-bold ${grade === 'F' ? 'text-red-600' : 'text-green-600'}`}>{grade}</td>
                                       <td className="p-2 border-x text-center text-xs">{remark}</td>
                                   </tr>
                               );
                           })}
                       </tbody>
                   </table>

                   {/* Domains & Remarks Footer */}
                   <div className="grid grid-cols-2 gap-8 break-inside-avoid">
                       <div className="space-y-4">
                           <h3 className="font-bold border-b pb-1">Cognitive & Behavioral</h3>
                           <div className="grid grid-cols-2 gap-x-4 text-sm">
                               {Object.entries(data.domains || {}).map(([k, v]) => (
                                   <div key={k} className="flex justify-between border-b border-dotted py-1">
                                       <span>{k}</span>
                                       <span className="font-bold">{v}</span>
                                   </div>
                               ))}
                               {Object.entries(data.cognitive || {}).map(([k, v]) => (
                                   <div key={k} className="flex justify-between border-b border-dotted py-1">
                                       <span>{k}</span>
                                       <span className="font-bold">{v}</span>
                                   </div>
                               ))}
                           </div>
                       </div>
                       
                       <div className="space-y-6">
                           <div className="bg-gray-50 p-4 rounded border print:bg-transparent print:border-gray-300">
                               <p className="text-xs font-bold uppercase mb-1">Class Teacher's Remark</p>
                               <p className="italic font-serif">{data.remarks?.teacher || 'No remark'}</p>
                           </div>
                           <div className="bg-gray-50 p-4 rounded border print:bg-transparent print:border-gray-300">
                               <p className="text-xs font-bold uppercase mb-1">Principal's Remark</p>
                               <p className="italic font-serif">{data.remarks?.principal || 'No remark'}</p>
                           </div>
                           
                           <div className="flex justify-between items-end mt-8 pt-8 border-t-2 border-black">
                                <div className="text-center">
                                    <p className="text-xs uppercase">Class Teacher Signature</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs uppercase">Principal Signature</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs uppercase">Date</p>
                                    <p className="font-bold">{data.createdAt?.toDate?.().toLocaleDateString()}</p>
                                </div>
                           </div>
                       </div>
                   </div>
                </div>
            </div>
        </div>
    );
};

// Teacher Dashboard
export const TeacherDashboard: React.FC<Props> = ({ user, view, setView }) => {
    if (view === 'home' && setView) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h2>
                    <Badge color="purple">ID: {user.uniqueId}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={FileText} label="Manage Exams" value="Exam Hub" color="blue" onClick={() => setView('exams')} />
                    <StatCard icon={Edit} label="Student Grading" value="Result Sheet" color="emerald" onClick={() => setView('grading')} />
                    <StatCard icon={BookOpen} label="Lesson Notes" value="Create Note" color="orange" onClick={() => setView('lesson-notes')} />
                    <StatCard icon={Calendar} label="Class Attendance" value="Mark Register" color="purple" onClick={() => setView('attendance')} />
                </div>
                <Card>
                    <h3 className="font-bold mb-4">Quick Actions</h3>
                    <div className="flex gap-4">
                        <Button onClick={() => setView('exams')} variant="secondary">Create Assessment</Button>
                        <Button onClick={() => setView('grading')} variant="secondary">Compute Results</Button>
                        <Button onClick={() => setView('cbt-results')} variant="secondary">View CBT Scores</Button>
                    </div>
                </Card>
            </div>
        );
    }
    return null;
};

// Teacher Exams
export const TeacherExams: React.FC<Props> = ({ user, showNotification }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'preview' | 'print'>('list');
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);

    useEffect(() => {
        // Fetch School Info for print view
        if (user.schoolId) {
            getDoc(doc(db, 'schools', user.schoolId)).then(snap => {
                if(snap.exists()) setSchoolInfo(snap.data() as SchoolInfo);
            });
        }
    }, [user.schoolId]);

    useEffect(() => {
        // Modified query to remove orderBy to avoid index error
        const q = query(
            collection(db, 'exams'), 
            where('creatorId', '==', user.uniqueId)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({id: d.id, ...d.data()} as Exam));
            // Sort client-side
            data.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
            setExams(data);
        });
        return () => unsub();
    }, [user.uniqueId]);

    const handleSaveExam = async (exam: Partial<Exam>) => {
        try {
            const payload = {
                ...exam,
                creatorId: user.uniqueId,
                creatorName: user.fullName,
                schoolId: user.schoolId,
                status: 'pending', // Always pending review initially
                code: `EX-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                createdAt: serverTimestamp()
            };
            
            if (exam.id) {
                // Update
                await updateDoc(doc(db, 'exams', exam.id), { ...exam, status: 'pending' });
                showNotification?.("Exam updated and sent for review.", "success");
            } else {
                // Create
                await addDoc(collection(db, 'exams'), payload);
                // Award points for creating exam
                await updateDoc(doc(db, 'users', user.id), { points: increment(5) });
                showNotification?.("Exam created! Wait for Admin approval.", "success");
            }
            setMode('list');
        } catch (e: any) {
            console.error(e);
            showNotification?.("Error saving exam", "error");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'exams', id));
            showNotification?.("Exam deleted", "success");
        } catch (e) {
            showNotification?.("Error deleting exam", "error");
        }
    };

    if (mode === 'create' || (mode === 'edit' && selectedExam)) {
        return (
            <ExamEditor 
                user={user} 
                initialExam={selectedExam || undefined} 
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
                <Button onClick={() => { setSelectedExam(null); setMode('create'); }}>
                    <Plus size={18}/> Create New Exam
                </Button>
            </div>
            
            <div className="grid gap-4">
                {exams.map(exam => (
                    <div key={exam.id} className="border p-4 rounded-xl flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                            <h3 className="font-bold text-lg">{exam.title}</h3>
                            <p className="text-sm text-gray-500">{exam.classLevel} • {exam.subject}</p>
                            <div className="flex gap-2 mt-1">
                                <Badge color={exam.status === 'approved' ? 'green' : exam.status === 'review' ? 'red' : 'yellow'}>
                                    {exam.status.toUpperCase()}
                                </Badge>
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">Code: {exam.code}</span>
                            </div>
                            {exam.adminFeedback && (
                                <p className="text-xs text-red-500 mt-1 italic">Feedback: {exam.adminFeedback}</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => { setSelectedExam(exam); setMode('print'); }}>
                                <Eye size={16}/>
                            </Button>
                            <Button variant="ghost" onClick={() => { setSelectedExam(exam); setMode('edit'); }}>
                                <Edit size={16}/>
                            </Button>
                            <Button variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(exam.id)}>
                                <Trash2 size={16}/>
                            </Button>
                        </div>
                    </div>
                ))}
                {exams.length === 0 && <p className="text-center py-8 text-gray-400">No exams created yet.</p>}
            </div>
        </Card>
    );
};

// Teacher Attendance
export const TeacherAttendance: React.FC<Props> = ({ user, showNotification }) => {
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('role', '==', 'student'));
        getDocs(q).then(snap => {
            setStudents(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)));
        });
    }, [user.schoolId]);

    const markAttendance = async (student: UserProfile, type: 'in' | 'out') => {
        setLoading(true);
        try {
            await addDoc(collection(db, 'attendance'), {
                studentId: student.uniqueId,
                studentName: student.fullName,
                schoolId: user.schoolId,
                type,
                timestamp: serverTimestamp(),
                recordedBy: user.uniqueId,
                recordedByName: user.fullName,
                guardianName: null,
                guardianPhone: student.parentPhone
            });
            showNotification?.(`${type.toUpperCase()} marked for ${student.fullName}`, 'success');
        } catch (e) {
            showNotification?.('Error marking attendance', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <Card>
            <h2 className="text-xl font-bold text-gray-800 mb-6">Class Register</h2>
            <SearchFilterBar onSearch={setSearchTerm} placeholder="Search student..." />
            
            <div className="space-y-2">
                {filteredStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                                {student.fullName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold">{student.fullName}</h3>
                                <p className="text-xs text-gray-500">{student.uniqueId}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="success" 
                                className="bg-green-600 text-white px-3 py-1 text-xs" 
                                onClick={() => markAttendance(student, 'in')}
                                disabled={loading}
                            >
                                Clock IN
                            </Button>
                            <Button 
                                variant="danger" 
                                className="bg-red-600 text-white px-3 py-1 text-xs"
                                onClick={() => markAttendance(student, 'out')}
                                disabled={loading}
                            >
                                Clock OUT
                            </Button>
                        </div>
                    </div>
                ))}
                {filteredStudents.length === 0 && <p className="text-center text-gray-400">No students found.</p>}
            </div>
        </Card>
    );
};

// Teacher Lesson Notes
export const TeacherLessonNotes: React.FC<Props> = ({ user, showNotification }) => {
    const [notes, setNotes] = useState<LessonNote[]>([]);
    const [form, setForm] = useState<Partial<LessonNote>>({
        topic: '', subject: '', classLevel: 'Primary 1', content: ''
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'lesson_notes'), where('creatorId', '==', user.uniqueId));
        const unsub = onSnapshot(q, (snap) => {
            setNotes(snap.docs.map(d => ({id: d.id, ...d.data()} as LessonNote)));
        });
        return () => unsub();
    }, [user.uniqueId]);

    const handleSave = async () => {
        if (!form.topic || !form.content) return;
        try {
            const code = `NOTE-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            await addDoc(collection(db, 'lesson_notes'), {
                ...form,
                creatorId: user.uniqueId,
                creatorName: user.fullName,
                schoolId: user.schoolId,
                accessCode: code,
                createdAt: serverTimestamp()
            });
            showNotification?.(`Note Created! Access Code: ${code}`, 'success');
            setForm({ topic: '', subject: '', classLevel: 'Primary 1', content: '' });
            setIsEditing(false);
        } catch (e) {
            showNotification?.('Error creating note', 'error');
        }
    };

    if (isEditing) {
        return (
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg">New Lesson Note</h2>
                    <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
                <div className="space-y-4">
                    <Input label="Topic" value={form.topic || ''} onChange={e => setForm({...form, topic: e.target.value})} />
                    <Input label="Subject" value={form.subject || ''} onChange={e => setForm({...form, subject: e.target.value})} />
                    <div>
                        <label className="block text-sm font-medium mb-1">Class Level</label>
                        <select className="w-full border rounded p-2" value={form.classLevel} onChange={e => setForm({...form, classLevel: e.target.value})}>
                            {NIGERIAN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Content (HTML supported)</label>
                        <textarea 
                            className="w-full h-40 border rounded p-2" 
                            value={form.content} 
                            onChange={e => setForm({...form, content: e.target.value})}
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
                <h2 className="text-xl font-bold text-gray-800">My Lesson Notes</h2>
                <Button onClick={() => setIsEditing(true)}><Plus size={16}/> Create Note</Button>
            </div>
            <div className="space-y-4">
                {notes.map(note => (
                    <div key={note.id} className="border p-4 rounded-lg hover:shadow-sm">
                        <div className="flex justify-between">
                            <h3 className="font-bold">{note.topic}</h3>
                            <Badge color="blue">{note.accessCode}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{note.classLevel} • {note.subject}</p>
                    </div>
                ))}
                {notes.length === 0 && <p className="text-center text-gray-400">No notes created yet.</p>}
            </div>
        </Card>
    );
};

// Teacher CBT Results
export const TeacherCBTResults: React.FC<Props> = ({ user, showNotification }) => {
    const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);

    useEffect(() => {
        const fetchSubs = async () => {
             const examsQ = query(collection(db, 'exams'), where('creatorId', '==', user.uniqueId));
             const examSnap = await getDocs(examsQ);
             const examIds = examSnap.docs.map(d => d.id);
             
             if (examIds.length === 0) return;

             const subsQ = query(collection(db, 'exam_submissions'), where('examId', 'in', examIds.slice(0, 10))); // Limit to 10 exams for IN query
             const subSnap = await getDocs(subsQ);
             setSubmissions(subSnap.docs.map(d => ({id: d.id, ...d.data()} as ExamSubmission)));
        };
        fetchSubs();
    }, [user.uniqueId]);

    return (
        <Card>
            <h2 className="text-xl font-bold text-gray-800 mb-6">CBT Exam Results</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3">Student</th>
                            <th className="p-3">Exam Title</th>
                            <th className="p-3">Score</th>
                            <th className="p-3">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.map(sub => (
                            <tr key={sub.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{sub.studentName}</td>
                                <td className="p-3">{sub.examTitle}</td>
                                <td className="p-3 font-bold">{sub.score} / {sub.total}</td>
                                <td className="p-3 text-gray-500">{sub.timestamp?.toDate?.().toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {submissions.length === 0 && <p className="p-8 text-center text-gray-400">No submissions found for your exams.</p>}
            </div>
        </Card>
    );
};

// Teacher Grading
export const TeacherGrading: React.FC<Props> = ({ user, showNotification }) => {
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [previousResults, setPreviousResults] = useState<Result[]>([]);
    const [viewMode, setViewMode] = useState<'search' | 'history' | 'edit'>('search');
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
    const [previewResult, setPreviewResult] = useState<Result | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form Data
    const [formData, setFormData] = useState<Partial<Result>>({
        term: '1st Term',
        session: '2024/2025',
        subjects: [],
        domains: {},
        cognitive: {},
        remarks: { teacher: '', principal: '' },
        attendance: { present: 0, total: 100 },
        colorTheme: '#1e3a8a'
    });

    useEffect(() => {
        if (user.schoolId) {
            getDoc(doc(db, 'schools', user.schoolId)).then(snap => {
                if(snap.exists()) setSchoolInfo(snap.data() as SchoolInfo);
            });
        }
    }, [user.schoolId]);

    useEffect(() => {
        const q = query(collection(db, 'users'), where('schoolId', '==', user.schoolId), where('role', '==', 'student'));
        const unsub = onSnapshot(q, (snap) => {
            setStudents(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)));
        });
        return () => unsub();
    }, [user.schoolId]);

    useEffect(() => {
        if (!selectedStudent) return;
        const q = query(collection(db, 'results'), where('studentId', '==', selectedStudent.uniqueId));
        getDocs(q).then(snap => {
            const data = snap.docs.map(d => ({id: d.id, ...d.data()} as Result));
            data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setPreviousResults(data);
        });
    }, [selectedStudent, viewMode]);

    const handleCreateNew = () => {
        if (!selectedStudent) {
            showNotification?.("Please select a student first.", "error");
            return;
        }
        
        // Remove ID to ensure create mode
        const { id, ...rest } = formData;
        
        setFormData({
            studentId: selectedStudent.uniqueId,
            studentName: selectedStudent.fullName,
            schoolId: user.schoolId,
            className: 'Primary 1',
            term: '1st Term',
            session: '2024/2025',
            subjects: NIGERIAN_SUBJECTS.slice(0, 5).map(s => ({ name: s, ca1: 0, ca2: 0, ca3: 0, exam: 0, total: 0 })),
            domains: {},
            cognitive: {},
            remarks: { teacher: '', principal: '' },
            attendance: { present: 95, total: 100 },
            colorTheme: '#1e3a8a',
            cumulativeScore: 0,
            gpa: '0.0'
        });
        setViewMode('edit');
    };

    const handleEdit = (res: Result) => {
        setFormData(res);
        setViewMode('edit');
    };

    const handleSaveResult = async () => {
        if (!selectedStudent) {
             showNotification?.('Student not selected', 'error');
             return;
        }
        if (!formData.subjects || formData.subjects.length === 0) {
             showNotification?.('Please add at least one subject', 'error');
             return;
        }

        setIsSaving(true);

        // Calculate Totals
        let grandTotal = 0;
        const updatedSubjects = formData.subjects.map((s: any) => {
            const total = (parseInt(s.ca1)||0) + (parseInt(s.ca2)||0) + (parseInt(s.ca3)||0) + (parseInt(s.exam)||0);
            grandTotal += total;
            return { ...s, total };
        });

        const gpa = (grandTotal / (updatedSubjects.length * 100) * 5).toFixed(2);

        // Ensure we don't send undefined ID to addDoc
        const { id, ...cleanData } = formData;

        const payload = {
            ...cleanData,
            subjects: updatedSubjects,
            cumulativeScore: grandTotal,
            gpa,
            createdAt: formData.createdAt || serverTimestamp(),
            creatorId: user.uniqueId 
        };

        try {
            if (formData.id) {
                await updateDoc(doc(db, 'results', formData.id), payload);
                showNotification?.('Result updated successfully', 'success');
            } else {
                await addDoc(collection(db, 'results'), payload);
                showNotification?.('New Result created successfully', 'success');
            }
            setViewMode('history');
        } catch (e: any) {
            console.error(e);
            showNotification?.('Error saving result: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const updateSubject = (index: number, field: string, value: string) => {
        const newSubs = [...(formData.subjects || [])];
        newSubs[index] = { ...newSubs[index], [field]: value };
        setFormData({ ...formData, subjects: newSubs });
    };

    const filteredStudents = students.filter(s => 
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.uniqueId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (previewResult) {
        return (
            <ResultPreviewModal 
                data={previewResult}
                schoolInfo={schoolInfo}
                studentPhoto={selectedStudent?.photoBase64}
                parentPhone={selectedStudent?.parentPhone}
                onClose={() => setPreviewResult(null)}
            />
        );
    }

    if (viewMode === 'edit') {
        return (
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">{formData.id ? 'Edit Result' : 'Create New Result'}</h2>
                    <Button variant="secondary" onClick={() => setViewMode('history')}>Cancel</Button>
                </div>

                <div className="space-y-6">
                    {/* Header Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Student</label>
                            <p className="font-bold">{formData.studentName}</p>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase">Class</label>
                             <select className="w-full bg-white border rounded p-1 text-sm" value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})}>
                                {NIGERIAN_CLASSES.map(c => <option key={c}>{c}</option>)}
                             </select>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase">Term</label>
                             <input className="w-full bg-white border rounded p-1 text-sm" value={formData.term} onChange={e => setFormData({...formData, term: e.target.value})} />
                        </div>
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase">Session</label>
                             <input className="w-full bg-white border rounded p-1 text-sm" value={formData.session} onChange={e => setFormData({...formData, session: e.target.value})} />
                        </div>
                    </div>

                    {/* Subjects Grid */}
                    <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600 font-bold">
                                <tr>
                                    <th className="p-3">Subject</th>
                                    <th className="p-3 w-16">CA 1</th>
                                    <th className="p-3 w-16">CA 2</th>
                                    <th className="p-3 w-16">CA 3</th>
                                    <th className="p-3 w-16">Exam</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {formData.subjects?.map((s: any, i: number) => (
                                    <tr key={i}>
                                        <td className="p-2">
                                            <input className="w-full border-none focus:ring-0 font-medium" value={s.name} onChange={e => updateSubject(i, 'name', e.target.value)} />
                                        </td>
                                        <td className="p-2"><input type="number" className="w-full border rounded p-1 text-center" value={s.ca1} onChange={e => updateSubject(i, 'ca1', e.target.value)} /></td>
                                        <td className="p-2"><input type="number" className="w-full border rounded p-1 text-center" value={s.ca2} onChange={e => updateSubject(i, 'ca2', e.target.value)} /></td>
                                        <td className="p-2"><input type="number" className="w-full border rounded p-1 text-center" value={s.ca3} onChange={e => updateSubject(i, 'ca3', e.target.value)} /></td>
                                        <td className="p-2"><input type="number" className="w-full border rounded p-1 text-center" value={s.exam} onChange={e => updateSubject(i, 'exam', e.target.value)} /></td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => {
                                                const newSubs = formData.subjects?.filter((_, idx) => idx !== i);
                                                setFormData({...formData, subjects: newSubs});
                                            }} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="p-2 bg-gray-50 border-t flex justify-center">
                            <button onClick={() => setFormData({...formData, subjects: [...(formData.subjects||[]), {name: 'New Subject', ca1:0, ca2:0, ca3:0, exam:0, total:0}]})} className="text-sm font-bold text-indigo-600 flex items-center gap-1">
                                <Plus size={16}/> Add Subject
                            </button>
                        </div>
                    </div>

                    {/* Domains & Remarks */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="font-bold border-b pb-1">Cognitive & Affective Domains</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-60 overflow-y-auto pr-2">
                                {[...COGNITIVE_DOMAINS, ...AFFECTIVE_DOMAINS, ...PSYCHOMOTOR_DOMAINS].map(d => (
                                    <div key={d} className="flex justify-between items-center text-xs">
                                        <span>{d}</span>
                                        <select 
                                            className="border rounded p-1"
                                            value={formData.domains?.[d] || formData.cognitive?.[d] || '3'}
                                            onChange={e => {
                                                if (COGNITIVE_DOMAINS.includes(d)) {
                                                     setFormData({ ...formData, cognitive: { ...formData.cognitive || {}, [d]: e.target.value } });
                                                } else {
                                                     setFormData({ ...formData, domains: { ...formData.domains || {}, [d]: e.target.value } });
                                                }
                                            }}
                                        >
                                            {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold border-b pb-1">Remarks & Settings</h4>
                            <Input label="Teacher's Remark" value={formData.remarks?.teacher || ''} onChange={e => setFormData({...formData, remarks: {...formData.remarks, teacher: e.target.value} as any})} />
                            <Input label="Principal's Remark" value={formData.remarks?.principal || ''} onChange={e => setFormData({...formData, remarks: {...formData.remarks, principal: e.target.value} as any})} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Attendance (Present)" type="number" value={String(formData.attendance?.present)} onChange={e => setFormData({...formData, attendance: {...formData.attendance, present: parseInt(e.target.value)} as any})} />
                                <Input label="Total Days" type="number" value={String(formData.attendance?.total)} onChange={e => setFormData({...formData, attendance: {...formData.attendance, total: parseInt(e.target.value)} as any})} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color Theme</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_PALETTES.map(p => (
                                        <button 
                                            key={p.hex} 
                                            onClick={() => setFormData({...formData, colorTheme: p.hex})}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${formData.colorTheme === p.hex ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: p.hex }}
                                            title={p.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 border-t pt-4">
                        <Button variant="secondary" onClick={() => setViewMode('history')}>Cancel</Button>
                        <Button onClick={handleSaveResult} disabled={isSaving} className="shadow-lg shadow-indigo-200">
                             {isSaving ? 'Saving Result...' : 'Save Result Sheet'}
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    if (viewMode === 'history' && selectedStudent) {
        return (
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setViewMode('search')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{selectedStudent.fullName}</h2>
                            <p className="text-sm text-gray-500">Academic History</p>
                        </div>
                    </div>
                    <Button onClick={handleCreateNew}><Plus size={16}/> Create New Result</Button>
                </div>

                <div className="space-y-4">
                    {previousResults.map(res => (
                        <div key={res.id} className="p-4 border rounded-xl hover:shadow-md transition-all flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800">{res.term} - {res.session}</h3>
                                <p className="text-sm text-gray-500">{res.className}</p>
                                <div className="flex gap-2 mt-1">
                                    <Badge color="blue">GPA: {res.gpa}</Badge>
                                    <Badge color="green">Total: {res.cumulativeScore}</Badge>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => setPreviewResult(res)}>
                                    <Eye size={16}/> Preview
                                </Button>
                                <Button variant="secondary" onClick={() => handleEdit(res)}><Edit size={16}/> Edit</Button>
                            </div>
                        </div>
                    ))}
                    {previousResults.length === 0 && <p className="text-center py-8 text-gray-400">No results found for this student.</p>}
                </div>
            </Card>
        );
    }

    // Default: Search View
    return (
        <Card>
            <h2 className="text-xl font-bold text-gray-800 mb-6">Student Results & Grading</h2>
            <SearchFilterBar onSearch={setSearchTerm} placeholder="Search student to grade..." />
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm">
                        <tr>
                            <th className="p-4">Student Name</th>
                            <th className="p-4">ID</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedStudent(s); setViewMode('history'); }}>
                                <td className="p-4 font-bold text-gray-800">{s.fullName}</td>
                                <td className="p-4 font-mono text-gray-500">{s.uniqueId}</td>
                                <td className="p-4">
                                    <Button variant="secondary" className="px-3 py-1 text-xs">View History</Button>
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
