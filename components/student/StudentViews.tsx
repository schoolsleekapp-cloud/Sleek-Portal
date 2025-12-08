import React, { useState, useEffect, useRef } from 'react';
import { FileText, GraduationCap, Calendar, CreditCard, CheckCircle, Lock, User, Clock, AlertCircle, BookOpen, Search, ArrowLeft, Unlock, Loader, PlayCircle, History, List, Plus, X, Upload } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile, Exam, AttendanceRecord, Result, LessonNote, ResultToken, SchoolInfo, ExamSubmission, FeePayment } from '../../types';
import { Button } from '../Button';
import { Card } from '../Card';
import { StatCard } from '../StatCard';
import { Badge } from '../Badge';
import { Input } from '../Input';
import { ResultPreviewModal } from '../teacher/TeacherViews';

interface Props {
    user: UserProfile;
    view?: string;
    setView?: (v: string) => void;
    showNotification?: (msg: string, type: 'info' | 'success' | 'error') => void;
}

export const StudentDashboard: React.FC<Props> = ({ user, view, setView }) => {
    if (view === 'home' && setView) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Student Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={FileText} label="Active Exams" value="Start Now" color="blue" onClick={() => setView('cbt')} />
                    <StatCard icon={GraduationCap} label="Latest GPA" value="Check Result" color="emerald" onClick={() => setView('results')} />
                    <StatCard icon={BookOpen} label="Lesson Notes" value="View Notes" color="orange" onClick={() => setView('lesson-notes')} />
                    <StatCard icon={Calendar} label="Attendance" value="View History" color="purple" onClick={() => setView('attendance')} />
                </div>
                <Card>
                    <h3 className="font-bold mb-4">Welcome back, {user.fullName}</h3>
                    <p className="text-gray-600">Use the navigation menu to access your exams, check your results, or view your attendance history.</p>
                </Card>
            </div>
        );
    }
    return null;
};

export const StudentLessonNotes: React.FC<Props> = ({ user, showNotification }) => {
    const [accessCode, setAccessCode] = useState('');
    const [note, setNote] = useState<LessonNote | null>(null);
    const [loading, setLoading] = useState(false);

    const findNote = async () => {
        if (!accessCode) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'lesson_notes'), where('accessCode', '==', accessCode.toUpperCase().trim()));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setNote(snap.docs[0].data() as LessonNote);
            } else {
                showNotification?.('Invalid Note Code', 'error');
                setNote(null);
            }
        } catch (e: any) {
            showNotification?.('Error fetching note', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (note) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <Button variant="secondary" onClick={() => { setNote(null); setAccessCode(''); }}><ArrowLeft size={16}/> Back to Search</Button>
                <Card>
                    <div className="border-b pb-4 mb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-indigo-900">{note.topic}</h1>
                                <p className="text-gray-500">{note.subject} • {note.classLevel}</p>
                            </div>
                            <Badge color="blue">{note.accessCode}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">By {note.creatorName}</p>
                    </div>
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: note.content }}></div>
                </Card>
            </div>
        );
    }

    return (
        <Card className="max-w-md mx-auto mt-10 text-center py-12">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Lesson Note Access</h2>
            <p className="text-gray-500 mb-8">Enter the unique code provided by your teacher to access the lesson note.</p>
            
            <div className="flex flex-col gap-4">
                <div className="relative">
                    <input 
                        type="text" 
                        value={accessCode} 
                        onChange={(e) => setAccessCode(e.target.value)} 
                        className="w-full border-2 border-gray-200 p-4 rounded-xl uppercase tracking-widest text-center font-bold text-xl focus:border-orange-500 focus:outline-none transition-colors" 
                        placeholder="CODE-123"
                    />
                </div>
                <Button onClick={findNote} className="w-full py-4 text-lg bg-orange-600 hover:bg-orange-700 text-white" disabled={loading}>
                    {loading ? 'Searching...' : 'Access Note'}
                </Button>
            </div>
        </Card>
    );
};

export const StudentCBT: React.FC<Props> = ({ user, showNotification }) => {
    const [examCode, setExamCode] = useState('');
    const [activeExam, setActiveExam] = useState(false);
    const [examData, setExamData] = useState<Exam | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0); // Seconds
    const [timerActive, setTimerActive] = useState(false);
    const [history, setHistory] = useState<ExamSubmission[]>([]);

    // Refs to avoid stale closures in setTimeout/Interval
    const answersRef = useRef(answers);
    const examDataRef = useRef(examData);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        examDataRef.current = examData;
    }, [examData]);

    // Fetch History
    useEffect(() => {
        const fetchHistory = async () => {
            // Remove orderBy to prevent index errors. Sort client-side.
            const q = query(collection(db, 'exam_submissions'), where('studentId', '==', user.uniqueId));
            try {
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({id: d.id, ...d.data()} as ExamSubmission));
                // Sort descending by timestamp
                data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                setHistory(data.slice(0, 20)); // Limit client-side
            } catch (e) {
                console.error(e);
            }
        };
        fetchHistory();
    }, [user.uniqueId, submitted]); // Refresh on submit

    // Timer Logic
    useEffect(() => {
        let interval: any = null;
        if (activeExam && timerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleSubmit(); // Auto submit
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeExam, timerActive, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startExam = async () => {
        if (!examCode) return;
        try {
            const q = query(collection(db, 'exams'), where('code', '==', examCode.toUpperCase().trim()), where('schoolId', '==', user.schoolId));
            const snap = await getDocs(q);
            if (snap.empty) {
                showNotification?.('Invalid Exam Code or Exam not for your school', 'error');
            } else {
                const data = snap.docs[0].data() as Exam;
                if (data.status !== 'approved') {
                     showNotification?.('This exam has not been approved by the admin yet.', 'error');
                     return;
                }
                // Check if already taken
                const subQ = query(collection(db, 'exam_submissions'), where('studentId', '==', user.uniqueId), where('examId', '==', data.id || snap.docs[0].id));
                const subSnap = await getDocs(subQ);
                if (!subSnap.empty) {
                     showNotification?.('You have already taken this exam.', 'info');
                     return;
                }

                setExamData({ ...data, id: snap.docs[0].id });
                setTimeLeft(data.durationMinutes * 60);
                setActiveExam(true);
                setTimerActive(true);
                setAnswers({}); // Reset answers
            }
        } catch (e: any) {
            showNotification?.('Error accessing exams: ' + e.message, 'error');
        }
    };

    const handleSubmit = async () => {
        setTimerActive(false); // Stop timer
        const currentExamData = examDataRef.current;
        const currentAnswers = answersRef.current;

        if (!currentExamData) return;
        
        let calculatedScore = 0;
        let totalScorable = 0;

        currentExamData.questions.forEach((q) => {
            if (q.type === 'objective') {
                totalScorable++;
                if (currentAnswers[q.id] === q.correct) calculatedScore++;
            }
        });

        setScore(calculatedScore);
        
        try {
            await addDoc(collection(db, 'exam_submissions'), {
                studentId: user.uniqueId,
                studentName: user.fullName,
                examId: currentExamData.id,
                examTitle: currentExamData.title,
                score: calculatedScore,
                total: totalScorable,
                answers: currentAnswers, // Store the answers for teacher grading
                theoryScore: 0, // Initialize theory score
                schoolId: user.schoolId,
                timestamp: serverTimestamp()
            });
            setSubmitted(true);
            setActiveExam(false);
        } catch (e: any) {
            console.error("Error saving submission", e);
            if (showNotification) showNotification('Error saving results to database', 'error');
        }
    };

    if (submitted && examData) {
        return (
            <Card className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Exam Submitted!</h2>
                <p className="text-lg text-gray-600">You scored <span className="font-bold text-indigo-600">{score}</span> on the objective section.</p>
                <p className="text-sm text-gray-400 mt-2">Theory answers have been submitted for teacher grading.</p>
                <Button className="mt-6 mx-auto" onClick={() => { setActiveExam(false); setSubmitted(false); setExamCode(''); }}>Back to Portal</Button>
            </Card>
        );
    }

    if (activeExam && examData) {
        // Group Questions
        const objectives = examData.questions.filter(q => q.type === 'objective');
        const theory = examData.questions.filter(q => q.type === 'theory');
        const comprehension = examData.questions.filter(q => q.type === 'comprehension');

        return (
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Fixed Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-md border-b-4 border-indigo-600 sticky top-0 z-30">
                    <div>
                        <h2 className="font-bold text-xl text-gray-800 line-clamp-1">{examData.title}</h2>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                             <span className="flex items-center gap-1"><FileText size={12}/> {examData.subject}</span>
                             <span className="flex items-center gap-1 font-mono">{objectives.length} Obj • {theory.length + comprehension.length} Theory</span>
                        </div>
                    </div>
                    <div className={`mt-2 md:mt-0 px-4 py-1.5 rounded-lg font-bold font-mono text-lg shadow-inner ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                        {formatTime(timeLeft)}
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 text-blue-800 text-sm">
                    <strong>General Instructions:</strong> {examData.instructions}
                </div>

                {/* Objective Section */}
                {objectives.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                            <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">SECTION A</span>
                            <h3 className="font-bold text-gray-700">Objective Questions</h3>
                        </div>
                        {examData.config?.objective?.instruction && (
                            <p className="text-sm italic text-gray-500 bg-gray-50 p-2 rounded">{examData.config.objective.instruction}</p>
                        )}
                        
                        <div className="grid gap-6">
                            {objectives.map((q, idx) => (
                                <Card key={q.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-3">
                                         <span className="bg-gray-100 text-gray-600 min-w-[30px] h-[30px] rounded-full flex items-center justify-center font-bold text-sm">
                                             {idx + 1}
                                         </span>
                                         <div className="w-full">
                                             <div className="font-medium text-gray-800 mb-3 text-lg" dangerouslySetInnerHTML={{__html: q.text}}></div>
                                             {q.image && (
                                                 <img src={q.image} alt="Question Diagram" className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200 mb-4" />
                                             )}
                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                 {q.options?.map((opt, oIdx) => (
                                                     <label key={oIdx} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${answers[q.id] === opt ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                         <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${answers[q.id] === opt ? 'border-indigo-600' : 'border-gray-300'}`}>
                                                             {answers[q.id] === opt && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}
                                                         </div>
                                                         <span className="text-gray-700 text-sm"><span className="font-bold mr-1">{String.fromCharCode(65+oIdx)}.</span> {opt}</span>
                                                         <input 
                                                             type="radio" 
                                                             name={`q-${q.id}`} 
                                                             className="hidden"
                                                             onChange={() => setAnswers({...answers, [q.id]: opt})}
                                                         />
                                                     </label>
                                                 ))}
                                             </div>
                                         </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Theory Section */}
                {(theory.length > 0 || comprehension.length > 0) && (
                    <div className="space-y-4 pt-4">
                         <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                            <span className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded">SECTION B</span>
                            <h3 className="font-bold text-gray-700">Theory & Comprehension</h3>
                        </div>
                        {examData.config?.theory?.instruction && (
                            <p className="text-sm italic text-gray-500 bg-gray-50 p-2 rounded">{examData.config.theory.instruction}</p>
                        )}

                        <div className="space-y-6">
                            {[...comprehension, ...theory].map((q, idx) => (
                                <Card key={q.id} className="border border-orange-100 shadow-sm">
                                    <div className="flex items-start gap-3">
                                         <span className="bg-orange-50 text-orange-600 min-w-[30px] h-[30px] rounded-full flex items-center justify-center font-bold text-sm">
                                             {idx + 1}
                                         </span>
                                         <div className="w-full">
                                             <div className="font-medium text-gray-800 mb-3 text-lg" dangerouslySetInnerHTML={{__html: q.text}}></div>
                                             {q.image && (
                                                 <img src={q.image} alt="Question Diagram" className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200 mb-4" />
                                             )}
                                             <textarea 
                                                className="w-full mt-2 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 min-h-[150px] font-sans text-sm leading-relaxed"
                                                placeholder="Type your detailed answer here..."
                                                onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                                             ></textarea>
                                         </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md p-4 border-t shadow-lg flex justify-end px-8 z-20">
                     <Button onClick={handleSubmit} variant="primary" className="px-8 py-3 text-lg shadow-xl bg-indigo-600 hover:bg-indigo-700">Submit Exam Now</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Card className="max-w-md mx-auto mt-6 text-center py-10">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <PlayCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Start New Assessment</h2>
                <p className="text-gray-500 mb-8 text-sm">Enter the exam code provided by your invigilator.</p>
                
                <div className="flex flex-col gap-4">
                    <input 
                        type="text" 
                        value={examCode} 
                        onChange={(e) => setExamCode(e.target.value)} 
                        className="w-full border-2 border-gray-200 p-4 rounded-xl uppercase tracking-[0.2em] text-center font-bold text-2xl focus:border-indigo-500 focus:outline-none transition-colors" 
                        placeholder="XYZ-123"
                    />
                    <Button onClick={startExam} className="w-full py-4 text-lg font-bold shadow-lg shadow-indigo-200">Start Exam</Button>
                </div>
            </Card>

            {/* Exam History Table */}
            <div className="max-w-4xl mx-auto">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><History size={18}/> My Exam History</h3>
                <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                                <tr>
                                    <th className="p-4 font-medium">Exam Title</th>
                                    <th className="p-4 font-medium">Date Taken</th>
                                    <th className="p-4 font-medium">Obj Score</th>
                                    <th className="p-4 font-medium">Theory Score</th>
                                    <th className="p-4 font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium text-gray-800">{sub.examTitle}</td>
                                        <td className="p-4 text-gray-500">{sub.timestamp?.toDate?.().toLocaleString()}</td>
                                        <td className="p-4 text-gray-600">{sub.score} / {sub.total}</td>
                                        <td className="p-4 text-gray-600">{sub.theoryScore || '-'}</td>
                                        <td className="p-4">
                                            <Badge color="blue" >
                                                {sub.score + (sub.theoryScore || 0)}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-400 italic">No exams taken yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export const StudentResults: React.FC<Props> = ({ user, showNotification }) => {
    const [token, setToken] = useState('');
    const [unlockedResultIds, setUnlockedResultIds] = useState<string[]>([]);
    const [results, setResults] = useState<Result[]>([]);
    const [selectedResult, setSelectedResult] = useState<Result | null>(null);
    const [checking, setChecking] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);

    // Fetch School Info for Result Header
    useEffect(() => {
        const fetchSchool = async () => {
            if (user.schoolId) {
                try {
                    const docRef = doc(db, 'schools', user.schoolId);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        setSchoolInfo(snap.data() as SchoolInfo);
                    }
                } catch (e) { console.error("Error fetching school", e); }
            }
        };
        fetchSchool();
    }, [user.schoolId]);

    // Fetch all results for this student
    useEffect(() => {
        const fetchResultsAndTokens = async () => {
            try {
                // 1. Fetch Results
                const qResults = query(collection(db, 'results'), where('studentId', '==', user.uniqueId));
                const snapResults = await getDocs(qResults);
                const resultsData = snapResults.docs.map(d => ({ id: d.id, ...d.data() } as Result));
                
                // Sort results by date descending
                resultsData.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setResults(resultsData);

                // 2. Fetch Unlocked Tokens
                const qTokens = query(collection(db, 'result_tokens'), where('usedBy', '==', user.uniqueId));
                const snapTokens = await getDocs(qTokens);
                const usedTokens = snapTokens.docs.map(d => d.data() as ResultToken);
                
                // Extract unlocked result IDs
                const unlocked = usedTokens.map(t => t.usedFor || '').filter(id => id !== '');
                setUnlockedResultIds(unlocked);

            } catch (e: any) {
                console.error("Error fetching results/tokens", e);
                showNotification?.("Error fetching academic history.", "error");
            }
        };
        fetchResultsAndTokens();
    }, [user.uniqueId]);

    const unlockResult = async () => {
        if (!token.trim()) return;
        if (!selectedResult) return;

        setChecking(true);
        try {
            // Find token
            const q = query(collection(db, 'result_tokens'), where('token', '==', token.trim()));
            const snap = await getDocs(q);

            if (snap.empty) {
                showNotification?.("Invalid Result Token.", "error");
                setChecking(false);
                return;
            }

            const tokenDoc = snap.docs[0];
            const tokenData = tokenDoc.data() as ResultToken;

            if (tokenData.status === 'active') {
                // Activate it
                await updateDoc(doc(db, 'result_tokens', tokenDoc.id), {
                    status: 'used',
                    usedBy: user.uniqueId,
                    usedByName: user.fullName,
                    usedFor: selectedResult.id,
                    usedForLabel: `${selectedResult.session} ${selectedResult.term}`,
                    usedAt: serverTimestamp()
                });
                
                setUnlockedResultIds(prev => [...prev, selectedResult.id!]);
                showNotification?.("Result Unlocked Successfully!", "success");
                setViewMode('detail'); 
                setToken(''); 
            } else {
                // Already used
                if (tokenData.usedBy === user.uniqueId && tokenData.usedFor === selectedResult.id) {
                    showNotification?.("Token verified. Opening result...", "success");
                    if (!unlockedResultIds.includes(selectedResult.id!)) {
                        setUnlockedResultIds(prev => [...prev, selectedResult.id!]);
                    }
                    setViewMode('detail');
                } else {
                    showNotification?.("This token has already been used for another result or by another student.", "error");
                }
            }

        } catch (e: any) {
            console.error(e);
            showNotification?.("Error verifying token: " + e.message, "error");
        } finally {
            setChecking(false);
        }
    };

    if (viewMode === 'detail' && selectedResult) {
        return (
            <ResultPreviewModal 
                data={selectedResult}
                schoolInfo={schoolInfo}
                studentPhoto={user.photoBase64}
                onClose={() => { setViewMode('list'); setSelectedResult(null); }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Academic History</h2>
            <p className="text-gray-500">View your terminal results. Locked results require a scratch card PIN to access.</p>
            
            {results.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                    <p className="text-gray-400">No results have been uploaded for you yet.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {results.map((res) => {
                        const isUnlocked = unlockedResultIds.includes(res.id!);
                        return (
                            <Card key={res.id} className={`flex flex-col md:flex-row justify-between items-center gap-4 transition-all ${selectedResult?.id === res.id ? 'ring-2 ring-indigo-500' : ''}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-gray-800">{res.term}</h3>
                                        <span className="text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-600">{res.session}</span>
                                    </div>
                                    <p className="text-sm text-gray-500">{res.className}</p>
                                </div>
                                
                                {selectedResult?.id === res.id && !isUnlocked ? (
                                    <div className="w-full md:w-auto flex flex-col md:flex-row gap-2 animate-in fade-in slide-in-from-right-4">
                                        <input 
                                            value={token}
                                            onChange={e => setToken(e.target.value)}
                                            placeholder="Enter Scratch Card PIN"
                                            className="border-2 border-indigo-100 rounded-lg px-4 py-2 text-center font-mono tracking-widest focus:border-indigo-500 focus:outline-none"
                                        />
                                        <Button onClick={unlockResult} disabled={checking}>
                                            {checking ? <Loader size={16} className="animate-spin"/> : <Unlock size={16}/>} Unlock
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        {isUnlocked ? (
                                            <>
                                                <div className="text-right mr-4 hidden md:block">
                                                    <span className="block font-bold text-lg text-emerald-600">{res.gpa} GPA</span>
                                                    <span className="text-xs text-gray-400">Unlocked</span>
                                                </div>
                                                <Button variant="secondary" onClick={() => { setSelectedResult(res); setViewMode('detail'); }}>
                                                    <FileText size={16}/> View Full Result
                                                </Button>
                                            </>
                                        ) : (
                                            <Button 
                                                className="bg-gray-800 text-white hover:bg-gray-900" 
                                                onClick={() => { setSelectedResult(res); setToken(''); }}
                                            >
                                                <Lock size={16}/> Unlock Result
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const StudentAttendance: React.FC<Props> = ({ user }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);

    useEffect(() => {
        const fetchAtt = async () => {
            try {
                const q = query(
                    collection(db, 'attendance'), 
                    where('studentId', '==', user.uniqueId), 
                );
                const snap = await getDocs(q);
                const sortedRecords = snap.docs.map(d => ({id: d.id, ...d.data()} as AttendanceRecord))
                    .sort((a, b) => (b.timestamp?.toDate().getTime() || 0) - (a.timestamp?.toDate().getTime() || 0));
                    
                setRecords(sortedRecords);
            } catch (e) {
                console.error("Error fetching attendance", e);
            }
        };
        fetchAtt();
    }, [user.uniqueId]);

    const groupedRecords: Record<string, AttendanceRecord[]> = {};
    records.forEach(r => {
        if (!r.timestamp) return;
        const dateKey = r.timestamp.toDate().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        if (!groupedRecords[dateKey]) groupedRecords[dateKey] = [];
        groupedRecords[dateKey].push(r);
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">My Attendance Calendar</h2>
                <Badge color="purple">Total: {records.length}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(groupedRecords).length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-400">No attendance records found.</div>
                ) : (
                    Object.entries(groupedRecords).map(([date, dailyRecords]) => (
                        <Card key={date} className="relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                            <div className="pl-3">
                                <h3 className="font-bold text-gray-800 mb-3 text-lg border-b pb-2">{date}</h3>
                                <div className="space-y-3">
                                    {dailyRecords.map(rec => (
                                        <div key={rec.id} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <Badge color={rec.type === 'in' ? 'green' : 'red'}>
                                                    {rec.type === 'in' ? 'IN' : 'OUT'}
                                                </Badge>
                                                <span className="font-mono text-gray-600">{rec.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">By: {rec.recordedByName || 'Teacher'}</p>
                                                {rec.guardianName && <p className="text-[10px] text-gray-400 italic">via {rec.guardianName.split(' ')[0]}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export const StudentFees: React.FC<Props> = ({ user, showNotification }) => {
    const [payments, setPayments] = useState<FeePayment[]>([]);
    const [showUpload, setShowUpload] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        type: 'Tuition Fee',
        term: '1st Term',
        session: '2024/2025',
        receiptBase64: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const q = query(
                    collection(db, 'fee_payments'), 
                    where('studentId', '==', user.uniqueId),
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({id: d.id, ...d.data()} as FeePayment));
                // Sort client side
                data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setPayments(data);
            } catch (e) {
                console.error("Error fetching fees", e);
            }
        };
        fetchPayments();
    }, [user.uniqueId, loading]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.size > 800000) { // 800KB limit
            showNotification?.('File size too large. Max 800KB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setFormData(prev => ({ ...prev, receiptBase64: event.target?.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!formData.amount || !formData.receiptBase64) {
            showNotification?.('Amount and Receipt are required', 'error');
            return;
        }
        setLoading(true);
        try {
            await addDoc(collection(db, 'fee_payments'), {
                studentId: user.uniqueId,
                studentName: user.fullName,
                schoolId: user.schoolId,
                amount: formData.amount,
                paymentType: formData.type,
                term: formData.term,
                session: formData.session,
                receiptBase64: formData.receiptBase64,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            showNotification?.('Payment record submitted for approval', 'success');
            setShowUpload(false);
            setFormData({ ...formData, amount: '', receiptBase64: '' });
        } catch (e: any) {
            showNotification?.('Error submitting payment', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {showUpload && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800">Record New Payment</h3>
                            <button onClick={() => setShowUpload(false)}><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Payment Type</label>
                                    <select className="w-full p-2 border rounded-lg bg-white text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                        <option>Tuition Fee</option>
                                        <option>Exam Fee</option>
                                        <option>Uniform Fee</option>
                                        <option>Books/Materials</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <Input label="Amount" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" type="number" className="mb-0" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Term" value={formData.term} onChange={e => setFormData({...formData, term: e.target.value})} className="mb-0"/>
                                <Input label="Session" value={formData.session} onChange={e => setFormData({...formData, session: e.target.value})} className="mb-0"/>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Upload Receipt Image</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                                >
                                    {formData.receiptBase64 ? (
                                        <div className="text-center">
                                            <img src={formData.receiptBase64} className="h-24 mx-auto mb-2 object-contain" alt="Receipt"/>
                                            <span className="text-xs text-green-600 font-bold">Image Selected</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload size={24} className="text-gray-400 mb-2"/>
                                            <span className="text-sm text-gray-500">Click to upload image</span>
                                        </>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload}/>
                                </div>
                            </div>

                            <Button onClick={handleSubmit} disabled={loading} className="w-full">{loading ? 'Submitting...' : 'Submit Payment Record'}</Button>
                        </div>
                    </Card>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Fee Payment History</h2>
                <Button onClick={() => setShowUpload(true)}><Plus size={16}/> Record Payment</Button>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 border-b">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Term</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {payments.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-gray-500">{p.createdAt?.toDate?.().toLocaleDateString()}</td>
                                    <td className="p-4 font-medium text-gray-800">{p.paymentType}</td>
                                    <td className="p-4 font-bold text-gray-800">{p.amount}</td>
                                    <td className="p-4 text-gray-600">{p.term}</td>
                                    <td className="p-4">
                                        <Badge color={p.status === 'approved' ? 'green' : p.status === 'rejected' ? 'red' : 'yellow'}>
                                            {p.status.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        {p.receiptBase64 && (
                                            <a href={p.receiptBase64} download={`Receipt_${p.id}.png`} className="text-indigo-600 hover:underline text-xs flex items-center gap-1">
                                                <FileText size={12}/> View
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {payments.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No payment records found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};