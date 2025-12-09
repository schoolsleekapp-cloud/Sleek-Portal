
import React, { useState, useEffect, useRef } from 'react';
import { Users, Edit, Settings, Calendar, Download, FileText, CheckCircle, XCircle, AlertTriangle, Eye, Printer, Filter, GraduationCap, MessageCircle, CreditCard, X, Megaphone, Send, Search } from 'lucide-react';
import { collection, query, where, onSnapshot, limit, doc, updateDoc, getDoc, orderBy, addDoc, serverTimestamp, or } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile, SchoolInfo, AttendanceRecord, Exam, Result, FeePayment, Announcement, ChatMessage } from '../../types';
import { Card } from '../Card';
import { StatCard } from '../StatCard';
import { Badge } from '../Badge';
import { SearchFilterBar } from '../SearchFilterBar';
import { Button } from '../Button';
import { Input } from '../Input';
import { ExamPrintView } from '../ExamPrintView';
import { ExamEditor } from '../ExamEditor';
import { TeacherGrading } from '../teacher/TeacherViews';

interface Props {
    user: UserProfile;
    schoolInfo?: SchoolInfo | null;
    view?: string;
    setView?: (v: string) => void;
    showNotification?: (msg: string, type: 'info' | 'success' | 'error') => void;
}

const sendWhatsapp = (phone: string | null | undefined, text: string) => {
    if (!phone) {
        alert("No parent phone number linked to this student.");
        return;
    }
    const number = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
};

export const AdminDashboard: React.FC<Props> = ({ user, view, setView, schoolInfo }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                // Fetch recent announcements for admin
                // Removed orderBy/limit to avoid composite index requirement
                const q = query(
                    collection(db, 'announcements'), 
                    where('target', 'array-contains', 'admin')
                );
                // Use onSnapshot for real-time updates on dashboard
                const unsub = onSnapshot(q, (snap) => {
                     const data = snap.docs.map(d => ({id: d.id, ...d.data()} as Announcement));
                     
                     // Sort client-side
                     data.sort((a, b) => {
                        const tA = a.createdAt?.seconds || 0;
                        const tB = b.createdAt?.seconds || 0;
                        return tB - tA;
                     });
                     
                     setAnnouncements(data.slice(0, 3));
                });
                return () => unsub();
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
                        <h3 className="font-bold flex items-center gap-2 mb-3"><Megaphone size={18}/> Global Announcements</h3>
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

                <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Users size={120} />
                    </div>
                    <div className="relative z-10">
                        <Badge color="blue" className="bg-white/20 text-white mb-2 inline-block backdrop-blur-sm">Admin Portal</Badge>
                        <h2 className="text-3xl font-bold mb-2">{schoolInfo?.name || 'My School'}</h2>
                        <p className="opacity-80 flex items-center gap-2 font-mono text-sm bg-black/20 w-fit px-3 py-1 rounded-lg">
                            ID: {schoolInfo?.schoolId}
                        </p>
                        <div className="mt-6 flex gap-3">
                             <div className="bg-white/10 px-4 py-2 rounded-lg text-sm backdrop-blur-sm border border-white/10">
                                 Active Session: <span className="font-bold">2024/2025</span>
                             </div>
                        </div>
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard icon={Users} label="User Management" value="Directory" color="blue" onClick={() => setView('users')} />
                    <StatCard icon={MessageCircle} label="Messages" value="Open Chat" color="orange" onClick={() => setView('messages')} />
                    <StatCard icon={GraduationCap} label="Results Management" value="Student Results" color="green" onClick={() => setView('admin_results')} />
                    <StatCard icon={Calendar} label="Attendance Logs" value="View All" color="purple" onClick={() => setView('attendance')} />
                </div>
            </div>
        );
    }
    return null;
};

// --- CHAT MODULE ---
export const AdminChat: React.FC<Props> = ({ user }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [search, setSearch] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Fetch potential chat users (Teachers & Students)
    useEffect(() => {
        const q = query(
            collection(db, 'users'), 
            where('schoolId', '==', user.schoolId),
            where('role', 'in', ['teacher', 'student']) 
        );
        const unsub = onSnapshot(q, (snap) => {
            setUsers(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)));
        });
        return () => unsub();
    }, [user.schoolId]);

    // Fetch Messages when a user is selected
    useEffect(() => {
        if (!selectedUser) return;
        
        // Complex Query: (sender=Me AND receiver=Them) OR (sender=Them AND receiver=Me)
        // Firestore OR queries are limited, so we usually just query all messages involving 'Me' and filter client side
        // OR better: Create a composite ID for conversation? 'adminID_userID'
        // For simplicity: Query where I am sender or receiver, then filter.
        
        const q = query(
             collection(db, 'messages'),
             or(
                 where('senderId', '==', user.uniqueId),
                 where('receiverId', '==', user.uniqueId)
             ),
             orderBy('timestamp', 'asc')
        );

        const unsub = onSnapshot(q, (snap) => {
            const allMsgs = snap.docs.map(d => ({id: d.id, ...d.data()} as ChatMessage));
            // Filter strictly for this conversation
            const convo = allMsgs.filter(m => 
                (m.senderId === user.uniqueId && m.receiverId === selectedUser.uniqueId) ||
                (m.senderId === selectedUser.uniqueId && m.receiverId === user.uniqueId)
            );
            setMessages(convo);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        return () => unsub();
    }, [selectedUser, user.uniqueId]);

    const sendMessage = async () => {
        if (!selectedUser || !newMessage.trim()) return;
        try {
            await addDoc(collection(db, 'messages'), {
                senderId: user.uniqueId,
                senderName: user.fullName,
                receiverId: selectedUser.uniqueId,
                receiverName: selectedUser.fullName, // store just in case
                text: newMessage,
                timestamp: serverTimestamp(),
                read: false
            });
            setNewMessage('');
        } catch (e) {
            console.error("Send failed", e);
        }
    };

    const filteredUsers = users.filter(u => u.fullName.toLowerCase().includes(search.toLowerCase()) || u.uniqueId.includes(search));

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* User List */}
            <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r bg-gray-50`}>
                <div className="p-4 border-b bg-white">
                    <h3 className="font-bold text-gray-800 mb-3">Chats</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
                        <input 
                            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg" 
                            placeholder="Search..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredUsers.map(u => (
                        <div 
                            key={u.id} 
                            onClick={() => setSelectedUser(u)}
                            className={`p-4 border-b cursor-pointer hover:bg-white transition-colors flex items-center gap-3 ${selectedUser?.id === u.id ? 'bg-white border-l-4 border-l-indigo-600' : ''}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${u.role === 'teacher' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                {u.fullName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{u.fullName}</p>
                                <p className="text-xs text-gray-500">{u.role} • {u.uniqueId}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`${!selectedUser ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-slate-50 relative`}>
                {!selectedUser ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <MessageCircle size={48} className="mb-4 opacity-50"/>
                        <p>Select a teacher or student to start chatting.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b bg-white flex items-center gap-3 shadow-sm z-10">
                            <button onClick={() => setSelectedUser(null)} className="md:hidden p-1 hover:bg-gray-100 rounded">
                                <X size={20}/>
                            </button>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${selectedUser.role === 'teacher' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                {selectedUser.fullName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{selectedUser.fullName}</h3>
                                <p className="text-xs text-gray-500">{selectedUser.role}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(msg => {
                                const isMe = msg.senderId === user.uniqueId;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 shadow-sm rounded-bl-none'}`}>
                                            <p>{msg.text}</p>
                                            <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 bg-white border-t flex gap-2">
                            <input 
                                className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            />
                            <button 
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                                className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                <Send size={20}/>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export const AdminFees: React.FC<Props> = ({ user, showNotification }) => {
    const [payments, setPayments] = useState<FeePayment[]>([]);
    const [filterStatus, setFilterStatus] = useState('pending');
    const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query(
            collection(db, 'fee_payments'), 
            where('schoolId', '==', user.schoolId)
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({id: d.id, ...d.data()} as FeePayment));
            data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setPayments(data);
        });
        return () => unsub();
    }, [user.schoolId]);

    const handleAction = async (status: 'approved' | 'rejected') => {
        if (!selectedPayment?.id) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'fee_payments', selectedPayment.id), { status });
            showNotification?.(`Payment ${status}`, 'success');
            setSelectedPayment(null);
        } catch (e: any) {
            showNotification?.('Error updating status', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filtered = payments.filter(p => filterStatus === 'all' ? true : p.status === filterStatus);

    return (
        <Card>
            {selectedPayment && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold">Review Payment</h3>
                            <button onClick={() => setSelectedPayment(null)}><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Student</p>
                                    <p className="font-bold text-lg">{selectedPayment.studentName}</p>
                                    <p className="text-sm text-gray-500">{selectedPayment.studentId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Amount</p>
                                    <p className="font-bold text-xl text-green-600">{selectedPayment.amount}</p>
                                    <p className="text-xs text-gray-500">{selectedPayment.paymentType}</p>
                                </div>
                            </div>
                            
                            <div className="border rounded-lg p-2 bg-gray-50">
                                <p className="text-xs text-gray-500 mb-2 text-center">Receipt Evidence</p>
                                <img src={selectedPayment.receiptBase64} alt="Receipt" className="w-full h-64 object-contain" />
                            </div>

                            <div className="flex gap-4 pt-2">
                                <Button onClick={() => handleAction('rejected')} variant="danger" className="flex-1" disabled={loading}>Reject</Button>
                                <Button onClick={() => handleAction('approved')} variant="success" className="flex-1" disabled={loading}>Approve Payment</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Fee Payment Requests</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['all', 'pending', 'approved', 'rejected'].map(s => (
                        <button 
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${filterStatus === s ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr>
                            <th className="p-4">Student</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium">{p.studentName}</td>
                                <td className="p-4 text-gray-600">{p.paymentType}</td>
                                <td className="p-4 font-bold text-gray-800">{p.amount}</td>
                                <td className="p-4 text-gray-500">{p.createdAt?.toDate?.().toLocaleDateString()}</td>
                                <td className="p-4">
                                    <Badge color={p.status === 'approved' ? 'green' : p.status === 'rejected' ? 'red' : 'yellow'}>
                                        {p.status.toUpperCase()}
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => setSelectedPayment(p)}>Review</Button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No payments found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

// Reuse TeacherGrading logic but exposed to Admin to edit any result
export const AdminResults: React.FC<Props> = ({ user, showNotification }) => {
    return (
        <div className="space-y-4">
             <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
                <p className="text-sm text-orange-700">
                    <strong>Admin Mode:</strong> You can create new results or edit any result generated by teachers in your school.
                    Use the "View My History" button (which in Admin mode shows ALL results) to select a result to modify.
                </p>
            </div>
             <TeacherGrading user={user} showNotification={showNotification} />
        </div>
    );
};

export const AdminExams: React.FC<Props> = ({ user, showNotification }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [mode, setMode] = useState<'list' | 'preview' | 'edit' | 'print'>('list');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [feedback, setFeedback] = useState('');
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);

    useEffect(() => {
        // Fetch Admin's School Info for printing headers
        if (user.schoolId) {
            getDoc(doc(db, 'schools', user.schoolId)).then(snap => {
                if (snap.exists()) setSchoolInfo(snap.data() as SchoolInfo);
            });
        }
    }, [user.schoolId]);

    useEffect(() => {
        // Query exams where schoolId matches admin's schoolId
        const q = query(collection(db, 'exams'), where('schoolId', '==', user.schoolId));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({id: d.id, ...d.data()} as Exam));
            data.sort((a,b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
            setExams(data);
        });
        return () => unsub();
    }, [user.schoolId]);

    const updateStatus = async (status: 'approved' | 'review') => {
        if (!selectedExam) return;
        
        // Enforce feedback if returning for review
        if (status === 'review' && !feedback.trim()) {
            showNotification?.('Please provide a reason for returning the exam in the feedback box.', 'error');
            return;
        }

        try {
            await updateDoc(doc(db, 'exams', selectedExam.id), {
                status,
                adminFeedback: feedback // Save feedback to the document
            });
            showNotification?.(`Exam ${status === 'approved' ? 'Approved' : 'Returned for Review'}`, 'success');
            setMode('list');
            setSelectedExam(null);
            setFeedback('');
        } catch (e: any) {
            showNotification?.('Error updating exam: ' + e.message, 'error');
        }
    };

    const handleSaveEdit = async (updatedExam: Partial<Exam>) => {
        if (!selectedExam) return;
        try {
            await updateDoc(doc(db, 'exams', selectedExam.id), {
                ...updatedExam,
            });
            showNotification?.('Exam updated successfully', 'success');
            setMode('list');
            setSelectedExam(null);
        } catch (e: any) {
             showNotification?.('Error updating exam: ' + e.message, 'error');
        }
    };

    const filteredExams = exams.filter(e => {
        const matchesSearch = (e.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                              (e.creatorName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                              (e.subject?.toLowerCase() || '').includes(searchTerm.toLowerCase());
                              
        const matchesStatus = filterStatus === 'all' 
            ? true 
            : (filterStatus === 'pending' ? (e.status === 'pending' || e.status === 'review') : e.status === 'approved');
            
        return matchesSearch && matchesStatus;
    });

    if (mode === 'print' && selectedExam) {
        return <ExamPrintView exam={selectedExam} schoolInfo={schoolInfo} onClose={() => setMode('preview')} />;
    }

    if (mode === 'edit' && selectedExam) {
        return (
            <ExamEditor 
                initialExam={selectedExam} 
                user={user} 
                onSave={handleSaveEdit} 
                onCancel={() => setMode('preview')} 
            />
        );
    }

    if (mode === 'preview' && selectedExam) {
        return (
            <div className="space-y-6">
                 <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 sticky top-0 z-20">
                     <Button variant="secondary" onClick={() => setMode('list')}>Back to List</Button>
                     <div className="flex gap-3">
                         <Button onClick={() => setMode('print')} variant="secondary">
                             <Download size={16}/> Download PDF
                         </Button>
                         <Button onClick={() => setMode('edit')} variant="secondary">
                             <Edit size={16}/> Edit Exam
                         </Button>
                         <Button onClick={() => updateStatus('approved')} variant="success">
                             <CheckCircle size={16}/> Approve
                         </Button>
                         <Button onClick={() => updateStatus('review')} variant="danger">
                             <AlertTriangle size={16}/> Return
                         </Button>
                     </div>
                 </div>

                 <div className="grid md:grid-cols-3 gap-6">
                     <div className="md:col-span-2 relative">
                        <div className="bg-white p-8 shadow rounded-lg min-h-[600px] border">
                             {/* Minimal Header */}
                             <div className="border-b-2 border-black pb-4 mb-6">
                                <h1 className="text-xl font-bold uppercase">{schoolInfo?.name}</h1>
                                <p className="font-bold">{selectedExam.term} - {selectedExam.session}</p>
                                <div className="flex justify-between mt-2">
                                    <h2 className="font-bold text-indigo-900">{selectedExam.subject}</h2>
                                    <p>{selectedExam.classLevel}</p>
                                </div>
                            </div>
                            
                            {/* Questions Preview Inline */}
                            {selectedExam.questions.map((q, i) => (
                                <div key={i} className="mb-4 border-b pb-4 last:border-0">
                                    <div className="flex gap-2">
                                        <span className="font-bold">{i+1}.</span>
                                        <div>
                                            <p className="font-medium">{q.text}</p>
                                            {q.type === 'objective' && (
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {q.options?.map((opt, idx) => (
                                                        <span key={idx} className={opt === q.correct ? "text-green-600 font-bold" : ""}>
                                                            {String.fromCharCode(65+idx)}. {opt}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                     
                     <div>
                         <Card className="sticky top-24">
                             <h3 className="font-bold text-lg mb-4 text-gray-800">Admin Actions</h3>
                             
                             <div className="space-y-4">
                                 <div>
                                     <p className="text-xs text-gray-500 uppercase font-bold mb-1">Status</p>
                                     <Badge color={selectedExam.status === 'approved' ? 'green' : selectedExam.status === 'review' ? 'red' : 'yellow'}>
                                        {selectedExam.status.toUpperCase()}
                                     </Badge>
                                 </div>
                                 <div>
                                     <p className="text-xs text-gray-500 uppercase font-bold mb-1">Creator (Teacher)</p>
                                     <p className="text-sm">{selectedExam.creatorName}</p>
                                 </div>

                                 <hr/>
                                 
                                 <div className="space-y-2">
                                     <label className="text-sm font-medium">Review Feedback</label>
                                     <p className="text-xs text-gray-500 mb-2">Required if returning for review.</p>
                                     <textarea 
                                        className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 min-h-[120px]" 
                                        rows={4}
                                        placeholder="Enter reason for rejection or required changes here..."
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                     ></textarea>
                                 </div>
                             </div>
                         </Card>
                     </div>
                 </div>
            </div>
        );
    }

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Exam Management</h2>
                    <p className="text-sm text-gray-500">View and manage exams created by teachers.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                     <button 
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterStatus === 'all' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilterStatus('pending')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterStatus === 'pending' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                    >
                        Pending
                    </button>
                    <button 
                        onClick={() => setFilterStatus('approved')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterStatus === 'approved' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                    >
                        Approved
                    </button>
                </div>
            </div>

            <SearchFilterBar 
                onSearch={setSearchTerm} 
                placeholder="Search by teacher name, exam title or subject..." 
            />

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm">
                        <tr>
                            <th className="p-4">Exam Title</th>
                            <th className="p-4">Class & Subject</th>
                            <th className="p-4">Creator</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredExams.map(exam => (
                            <tr key={exam.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium">{exam.title}</td>
                                <td className="p-4 text-sm text-gray-600">{exam.classLevel} <br/> <span className="text-xs opacity-75">{exam.subject}</span></td>
                                <td className="p-4 text-sm">{exam.creatorName}</td>
                                <td className="p-4">
                                    <Badge color={exam.status === 'approved' ? 'green' : exam.status === 'review' ? 'red' : 'yellow'}>
                                        {exam.status.toUpperCase()}
                                    </Badge>
                                </td>
                                <td className="p-4">
                                    <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => { setSelectedExam(exam); setMode('preview'); }}>
                                        <Eye size={14}/> Review
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredExams.length === 0 && <div className="p-8 text-center text-gray-400">No exams found matching your criteria.</div>}
            </div>
        </Card>
    );
};

export const AdminAttendance: React.FC<Props> = ({ user }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'attendance'), 
            where('schoolId', '==', user.schoolId),
            limit(100)
        );
        
        const unsub = onSnapshot(q, (snap) => {
            const fetchedRecords = snap.docs.map(d => ({id: d.id, ...d.data()} as AttendanceRecord));
            fetchedRecords.sort((a, b) => {
                const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
                const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
                return timeB - timeA;
            });
            setRecords(fetchedRecords);
            setLoading(false);
        });
        return () => unsub();
    }, [user.schoolId]);

    const filteredRecords = records.filter(r => 
        r.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">School Attendance Log</h2>
                    <p className="text-sm text-gray-500">Comprehensive view of all student clock-ins and outs</p>
                </div>
                <Button variant="secondary" onClick={() => window.print()}><Download size={16}/> Export Log</Button>
            </div>

            <SearchFilterBar onSearch={setSearchTerm} placeholder="Search student name or ID..." />

            <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <th className="p-4 font-medium">Student</th>
                            <th className="p-4 font-medium">Type</th>
                            <th className="p-4 font-medium">Date & Time</th>
                            <th className="p-4 font-medium">Guardian</th>
                            <th className="p-4 font-medium">Recorded By</th>
                            <th className="p-4 font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center">Loading records...</td></tr>
                        ) : filteredRecords.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400">No attendance records found.</td></tr>
                        ) : (
                            filteredRecords.map(rec => (
                                <tr key={rec.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <p className="font-bold text-gray-800">{rec.studentName}</p>
                                        <p className="text-xs text-gray-500 font-mono">{rec.studentId}</p>
                                    </td>
                                    <td className="p-4">
                                        <Badge color={rec.type === 'in' ? 'green' : 'red'}>{rec.type.toUpperCase()}</Badge>
                                    </td>
                                    <td className="p-4 text-gray-700">
                                        {rec.timestamp?.toDate().toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        {rec.guardianName ? (
                                            <div>
                                                <p className="font-medium text-gray-800">{rec.guardianName}</p>
                                                <p className="text-xs text-gray-500">{rec.guardianPhone}</p>
                                            </div>
                                        ) : <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        {rec.recordedByName || 'Teacher'}
                                    </td>
                                    <td className="p-4">
                                        {rec.guardianPhone && (
                                            <button 
                                                onClick={() => sendWhatsapp(rec.guardianPhone, `Attendance Alert: ${rec.studentName} marked ${rec.type.toUpperCase()} at ${rec.timestamp?.toDate().toLocaleTimeString()}`)}
                                                className="text-green-600 hover:bg-green-50 p-2 rounded-full"
                                                title="Resend WhatsApp Notification"
                                            >
                                                <MessageCircle size={18}/>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export const AdminUsers: React.FC<Props> = ({ user }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'users'), where('schoolId', '==', user.schoolId));
        const unsub = onSnapshot(q, (snap) => {
            setUsers(snap.docs.map(d => ({id: d.id, ...d.data()} as UserProfile)).filter(u => u.uniqueId !== user.uniqueId));
        }, (err) => {
            console.error("Error fetching users", err);
        });
        return () => unsub();
    }, [user.schoolId, user.uniqueId]);

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              u.uniqueId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter ? u.role === roleFilter : true;
        return matchesSearch && matchesRole;
    });

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-800">School Directory</h2>
                <Badge color="indigo">Total: {filteredUsers.length}</Badge>
            </div>
            
            <SearchFilterBar 
                onSearch={setSearchTerm} 
                onFilterChange={setRoleFilter}
                filterOptions={[
                    { label: 'Teachers', value: 'teacher' },
                    { label: 'Students', value: 'student' }
                ]}
                placeholder="Search name, ID..." 
            />

            <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm">
                        <tr>
                            <th className="p-4 font-medium">Profile</th>
                            <th className="p-4 font-medium">Role</th>
                            <th className="p-4 font-medium">Unique ID</th>
                            <th className="p-4 font-medium">Contact</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-medium text-gray-800 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'teacher' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {u.fullName.charAt(0)}
                                    </div>
                                    {u.fullName}
                                </td>
                                <td className="p-4"><Badge color={u.role === 'teacher' ? 'purple' : 'blue'}>{u.role}</Badge></td>
                                <td className="p-4 text-sm font-mono text-gray-500">{u.uniqueId}</td>
                                <td className="p-4 text-sm text-gray-500 flex items-center gap-3">
                                    <span>{u.email || u.parentPhone}</span>
                                    {u.parentPhone && (
                                        <button 
                                            onClick={() => sendWhatsapp(u.parentPhone!, u.fullName)} 
                                            className="text-green-600 hover:text-green-700 bg-green-50 p-1.5 rounded-full transition-colors" 
                                            title="Chat on WhatsApp"
                                        >
                                            <MessageCircle size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && <div className="p-8 text-center text-gray-400">No users found matching your criteria.</div>}
            </div>
        </Card>
    );
};
