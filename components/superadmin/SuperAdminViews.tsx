
import React, { useState, useEffect } from 'react';
import { School, Users, GraduationCap, LayoutDashboard, Building2, Key, Plus, CheckCircle, XCircle, Printer, Ticket, Download, Loader, RefreshCw, Square, CheckSquare, Search, Filter, ArrowUpDown, Trash2, Megaphone, Send } from 'lucide-react';
import { collection, query, getDocs, where, addDoc, serverTimestamp, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile, SchoolInfo, AccessCode, ResultToken, Announcement } from '../../types';
import { Card } from '../Card';
import { SearchFilterBar } from '../SearchFilterBar';
import { Badge } from '../Badge';
import { Button } from '../Button';

interface SuperAdminDashboardProps {
    showNotification?: (msg: string, type: 'info' | 'success' | 'error') => void;
}

declare const QRCode: any;
declare const html2pdf: any;

// Render QR Code inside the hidden print view
const TokenCard: React.FC<{ token: ResultToken }> = ({ token }) => {
    const [qrUrl, setQrUrl] = useState('');
    
    useEffect(() => {
        if (typeof QRCode !== 'undefined' && token.token) {
            try {
                QRCode.toDataURL(token.token, { width: 100, margin: 0, errorCorrectionLevel: 'H' }, (err: any, url: string) => {
                    if (!err) setQrUrl(url);
                });
            } catch (e) { console.error("QR Gen Error", e); }
        }
    }, [token.token]);

    const formattedToken = token.token ? (token.token.match(/.{1,4}/g)?.join(' ') || token.token) : '####';

    return (
        <div className="border-2 border-dashed border-gray-800 p-2 rounded-lg flex flex-col items-center justify-between h-[55mm] w-full bg-white break-inside-avoid relative box-border">
            <div className="text-center w-full border-b border-gray-300 pb-1 mb-1">
                <h3 className="font-bold text-[10px] uppercase text-black">SleekPortal Result Card</h3>
                <p className="text-[8px] text-gray-600">Scan to verify or enter PIN</p>
            </div>
            
            <div className="flex gap-2 items-center w-full px-1 flex-1 justify-center">
                {qrUrl ? (
                    <img src={qrUrl} className="w-14 h-14 object-contain" alt="QR" />
                ) : (
                    <div className="w-14 h-14 bg-gray-100 border flex items-center justify-center text-[6px]">Loading QR</div>
                )}
                <div className="flex-1 text-center flex flex-col justify-center">
                    <p className="text-[7px] uppercase tracking-wider text-gray-500 mb-0.5">PIN Number</p>
                    {/* Explicit text-black to ensure visibility in PDF */}
                    <p className="font-mono font-black text-xl tracking-widest leading-none text-black select-all">{formattedToken}</p>
                </div>
            </div>

            <div className="w-full flex justify-between items-end mt-1 pt-1 border-t border-gray-300">
                <div className="text-left">
                    <p className="text-[6px] text-gray-500">Serial No.</p>
                    <p className="text-[9px] font-mono font-bold text-black">{token.serial}</p>
                </div>
                <p className="text-[7px] font-bold text-black uppercase">VALID FOR 1 CHECK</p>
            </div>
        </div>
    );
};

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ showNotification }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'schools' | 'teachers' | 'students' | 'codes' | 'result_tokens' | 'announcements'>('overview');
    const [schools, setSchools] = useState<SchoolInfo[]>([]);
    const [teachers, setTeachers] = useState<UserProfile[]>([]);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
    
    // Result Token States
    const [resultTokens, setResultTokens] = useState<ResultToken[]>([]);
    const [filteredTokens, setFilteredTokens] = useState<ResultToken[]>([]);
    const [tokensLoading, setTokensLoading] = useState(false);
    const [generateQty, setGenerateQty] = useState(50);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Print/Download States
    const [tokensToPrint, setTokensToPrint] = useState<ResultToken[]>([]);
    const [printBatchId, setPrintBatchId] = useState<string>('');

    // Announcement States
    const [announcementMsg, setAnnouncementMsg] = useState('');
    const [targetAudience, setTargetAudience] = useState<string[]>(['admin', 'teacher', 'student']);

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterValue, setFilterValue] = useState('');
    
    // Result Token Filtering
    const [tokenSearch, setTokenSearch] = useState('');
    const [tokenStatusFilter, setTokenStatusFilter] = useState('all');
    const [tokenSort, setTokenSort] = useState('date_desc');

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Schools
            const schoolsSnap = await getDocs(collection(db, 'schools'));
            setSchools(schoolsSnap.docs.map(d => d.data() as SchoolInfo));

            // Fetch Teachers
            const teachersQ = query(collection(db, 'users'), where('role', '==', 'teacher'));
            const teachersSnap = await getDocs(teachersQ);
            setTeachers(teachersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));

            // Fetch Students
            const studentsQ = query(collection(db, 'users'), where('role', '==', 'student'));
            const studentsSnap = await getDocs(studentsQ);
            setStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));

            // Fetch Access Codes
            const codesQ = query(collection(db, 'access_codes'), orderBy('createdAt', 'desc'));
            const codesSnap = await getDocs(codesQ);
            setAccessCodes(codesSnap.docs.map(d => ({ id: d.id, ...d.data() } as AccessCode)));

        } catch (error: any) {
            console.error("Error fetching super admin data", error);
            if (showNotification) showNotification('Error fetching data. Check permissions.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchResultTokens = async () => {
        setTokensLoading(true);
        try {
            // Fetch more tokens to allow client side filtering to work better
            const q = query(collection(db, 'result_tokens'), orderBy('createdAt', 'desc'), limit(500));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ResultToken));
            setResultTokens(data);
            applyTokenFilters(data, tokenSearch, tokenStatusFilter, tokenSort);
        } catch (error) {
            console.error(error);
        } finally {
            setTokensLoading(false);
        }
    };

    const applyTokenFilters = (data: ResultToken[], search: string, status: string, sort: string) => {
        let result = [...data];

        // Search
        if (search) {
            const lower = search.toLowerCase();
            result = result.filter(t => 
                t.token.includes(lower) || 
                t.serial.toLowerCase().includes(lower) ||
                (t.usedByName && t.usedByName.toLowerCase().includes(lower))
            );
        }

        // Filter
        if (status !== 'all') {
            result = result.filter(t => t.status === status);
        }

        // Sort
        result.sort((a, b) => {
            if (sort === 'date_desc') {
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            } else if (sort === 'date_asc') {
                return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
            } else if (sort === 'serial') {
                return a.serial.localeCompare(b.serial);
            }
            return 0;
        });

        setFilteredTokens(result);
    };

    // Effect to re-filter when dependencies change
    useEffect(() => {
        applyTokenFilters(resultTokens, tokenSearch, tokenStatusFilter, tokenSort);
    }, [tokenSearch, tokenStatusFilter, tokenSort, resultTokens]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab === 'result_tokens') fetchResultTokens();
    }, [activeTab]);

    // -- Token Selection Logic --
    const toggleSelectToken = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAllTokens = () => {
        if (selectedIds.size === filteredTokens.length && filteredTokens.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTokens.map(t => t.id)));
        }
    };

    // -- Generation Logic --
    const generateAccessCode = async () => {
        setGenerating(true);
        const newCode = 'AC-' + Math.random().toString(36).substr(2, 4).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        
        try {
            const docRef = await addDoc(collection(db, 'access_codes'), {
                code: newCode,
                status: 'active',
                generatedBy: 'SuperAdmin',
                createdAt: serverTimestamp()
            });
            
            const newCodeObj: AccessCode = {
                id: docRef.id,
                code: newCode,
                status: 'active',
                generatedBy: 'SuperAdmin',
                createdAt: { toDate: () => new Date() } as any
            };

            setAccessCodes(prev => [newCodeObj, ...prev]);
            if (showNotification) showNotification('Access Code Generated Successfully', 'success');
        } catch (error: any) {
            console.error("Error generating code", error);
            if (showNotification) showNotification('Failed to generate code: ' + error.message, 'error');
        } finally {
            setGenerating(false);
        }
    };

    const generateResultTokens = async () => {
        setGenerating(true);
        const batchId = new Date().getTime().toString();
        
        const tokensToCreate: any[] = [];
        
        try {
            const promises = [];
            for (let i = 0; i < generateQty; i++) {
                // Generate 12-digit numeric PIN
                const pin = Math.floor(100000000000 + Math.random() * 900000000000).toString();
                const serial = `SN-${batchId.substr(8)}-${(i+1).toString().padStart(3, '0')}`;
                
                const tokenData: any = {
                    token: pin,
                    serial: serial,
                    status: 'active',
                    batchId: batchId,
                    generatedBy: 'SuperAdmin',
                    createdAt: serverTimestamp()
                };
                
                promises.push(addDoc(collection(db, 'result_tokens'), tokenData));
                tokensToCreate.push({ ...tokenData, createdAt: { seconds: Date.now()/1000 } });
            }
            
            await Promise.all(promises);
            fetchResultTokens(); // Refresh list to include new ones
            showNotification?.(`${generateQty} Tokens Generated Successfully!`, 'success');
            
            // Automatically prompt to download this new batch
            // We find the new tokens from the fetched list or use local construction for speed
            // For simplicity, we filter the just created ones from state after refresh, or just print what we made
            const createdTokensWithIds = tokensToCreate.map((t, idx) => ({ id: `new-${idx}`, ...t }));
            setTokensToPrint(createdTokensWithIds);
            setPrintBatchId(batchId);
            
            // Trigger download automatically after a brief delay for rendering
            setTimeout(() => {
                downloadPDF('token-print-sheet', `New_Batch_${batchId}.pdf`);
            }, 2000);

        } catch (e: any) {
            console.error(e);
            showNotification?.('Error generating tokens', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleAnnouncement = async () => {
        if (!announcementMsg.trim()) return;
        setGenerating(true);
        try {
            await addDoc(collection(db, 'announcements'), {
                message: announcementMsg,
                target: targetAudience,
                author: 'SuperAdmin',
                createdAt: serverTimestamp()
            });
            showNotification?.('Announcement Published Successfully!', 'success');
            setAnnouncementMsg('');
        } catch (e: any) {
             showNotification?.('Failed to publish', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const downloadPDF = (elementId: string, filename: string) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        const opt = {
            margin: 5,
            filename: filename,
            image: { type: 'jpeg', quality: 1.0 }, // Maximum quality
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (typeof html2pdf !== 'undefined') {
            html2pdf().set(opt).from(element).save().then(() => {
                // Clear print selection after download
                setTokensToPrint([]); 
            });
        } else {
            alert('PDF Library not loaded');
        }
    };

    const handleDownloadSelected = () => {
        if (selectedIds.size === 0) return;
        
        const selected = resultTokens.filter(t => selectedIds.has(t.id));
        setTokensToPrint(selected);
        setPrintBatchId(`Selected_${selected.length}`);
        
        // Wait for render
        setTimeout(() => {
            downloadPDF('token-print-sheet', `Batch_Tokens_${selected.length}.pdf`);
        }, 1500);
    };

    const handleDownloadSingle = (token: ResultToken) => {
        setTokensToPrint([token]);
        setTimeout(() => {
            const element = document.getElementById('single-token-hidden-print');
            if (!element) return;
            const opt = {
                margin: 10,
                filename: `Token_${token.serial}.pdf`,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a6', orientation: 'portrait' }
            };
            if (typeof html2pdf !== 'undefined') {
                html2pdf().set(opt).from(element).save().then(() => setTokensToPrint([]));
            }
        }, 500);
    };

    // --- Filtering Logic for other tabs ---
    const filterData = (data: any[]) => {
        return data.filter(item => {
            const matchesSearch = Object.values(item).some(
                val => val && String(val).toLowerCase().includes(searchTerm.toLowerCase())
            );
            // Example filter: if filtering by School ID
            const matchesFilter = filterValue ? item.schoolId === filterValue : true;
            return matchesSearch && matchesFilter;
        });
    };

    const filteredSchools = filterData(schools);
    const filteredTeachers = filterData(teachers);
    const filteredStudents = filterData(students);
    const filteredCodes = accessCodes.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase()));

    // Generate school filter options for users
    const schoolFilterOptions = schools.map(s => ({ label: s.name, value: s.schoolId }));

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button 
            onClick={() => { setActiveTab(id); setSearchTerm(''); setFilterValue(''); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-transparent'}`}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Dashboard Data...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Super Admin Portal</h1>
                    <p className="text-gray-500 mt-1">Global System Overview & Management</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto">
                <TabButton id="overview" label="Overview" icon={LayoutDashboard} />
                <TabButton id="announcements" label="Announcements" icon={Megaphone} />
                <TabButton id="codes" label="Access Codes" icon={Key} />
                <TabButton id="result_tokens" label="Result Tokens" icon={Ticket} />
                <TabButton id="schools" label="All Schools" icon={Building2} />
                <TabButton id="teachers" label="Teachers Registry" icon={Users} />
                <TabButton id="students" label="Student Registry" icon={GraduationCap} />
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-indigo-100 font-medium mb-1">Total Schools</p>
                                    <h3 className="text-4xl font-bold">{schools.length}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl"><Building2 className="w-8 h-8 text-white"/></div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-xl">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-emerald-100 font-medium mb-1">Total Teachers</p>
                                    <h3 className="text-4xl font-bold">{teachers.length}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl"><Users className="w-8 h-8 text-white"/></div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 rounded-2xl text-white shadow-xl">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-blue-100 font-medium mb-1">Total Students</p>
                                    <h3 className="text-4xl font-bold">{students.length}</h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl"><GraduationCap className="w-8 h-8 text-white"/></div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-2xl text-white shadow-xl">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-orange-100 font-medium mb-1">Access Codes</p>
                                    <h3 className="text-4xl font-bold">{accessCodes.filter(c => c.status === 'active').length} <span className="text-sm font-normal opacity-75">Active</span></h3>
                                </div>
                                <div className="p-3 bg-white/20 rounded-xl"><Key className="w-8 h-8 text-white"/></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'announcements' && (
                    <Card>
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Megaphone size={20}/> Publish Announcement</h2>
                        <div className="space-y-4 max-w-2xl">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                <textarea 
                                    className="w-full border rounded-lg p-3 h-32 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Type your announcement here..."
                                    value={announcementMsg}
                                    onChange={e => setAnnouncementMsg(e.target.value)}
                                ></textarea>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                                <div className="flex gap-4">
                                    {['admin', 'teacher', 'student'].map(role => (
                                        <label key={role} className="flex items-center gap-2 cursor-pointer border p-2 rounded hover:bg-gray-50">
                                            <input 
                                                type="checkbox" 
                                                checked={targetAudience.includes(role)}
                                                onChange={() => {
                                                    if (targetAudience.includes(role)) {
                                                        setTargetAudience(targetAudience.filter(r => r !== role));
                                                    } else {
                                                        setTargetAudience([...targetAudience, role]);
                                                    }
                                                }}
                                                className="w-4 h-4 text-indigo-600 rounded"
                                            />
                                            <span className="capitalize">{role}s</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <Button 
                                onClick={handleAnnouncement} 
                                disabled={generating || !announcementMsg.trim() || targetAudience.length === 0}
                                className="w-full"
                            >
                                {generating ? 'Publishing...' : 'Publish Announcement'}
                            </Button>
                        </div>
                    </Card>
                )}

                {activeTab === 'result_tokens' && (
                    <div className="space-y-6">
                        {/* Generator Card */}
                        <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white border-none">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <h2 className="text-2xl font-bold flex items-center gap-2"><Ticket /> Generate Result Tokens</h2>
                                    <p className="text-gray-400 mt-1">Generate scratch card PINs for students to check results.</p>
                                </div>
                                <div className="flex items-center gap-4 bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                                    <input 
                                        type="number" 
                                        value={generateQty} 
                                        onChange={e => setGenerateQty(parseInt(e.target.value))}
                                        className="bg-transparent text-white border border-white/20 rounded-lg px-4 py-2 w-24 text-center font-bold focus:ring-2 ring-indigo-500 outline-none"
                                        min="1" max="500"
                                    />
                                    <Button onClick={generateResultTokens} variant="primary" disabled={generating} className="whitespace-nowrap">
                                        {generating ? <Loader className="animate-spin" size={18}/> : <Plus size={18}/>} Generate Batch
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Hidden Printable Area for Batch - Use absolute positioning offscreen instead of hidden for better PDF gen compatibility */}
                        <div id="token-print-sheet" style={{ position: 'absolute', left: '-10000px', top: 0, width: '210mm' }} className="bg-white">
                            <div className="grid grid-cols-4 gap-2 p-4">
                                {tokensToPrint.map(token => (
                                    <TokenCard key={token.id} token={token} />
                                ))}
                            </div>
                        </div>

                        {/* Hidden Printable Area for Single Token */}
                        <div id="single-token-hidden-print" style={{ position: 'absolute', left: '-10000px', top: 0, width: '100mm' }} className="bg-white p-4">
                            {tokensToPrint.length === 1 && <TokenCard token={tokensToPrint[0]} />}
                        </div>

                        {/* All Generated Tokens List */}
                        <Card>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <h3 className="font-bold text-lg text-gray-800">Token Management</h3>
                                <div className="flex gap-2">
                                    {selectedIds.size > 0 && (
                                        <Button onClick={handleDownloadSelected} variant="primary" className="bg-indigo-600 text-white">
                                            <Download size={16}/> Download Selected ({selectedIds.size})
                                        </Button>
                                    )}
                                    <Button variant="secondary" onClick={fetchResultTokens} className="px-3">
                                        <RefreshCw size={16}/> Refresh
                                    </Button>
                                </div>
                            </div>

                            {/* Search & Filter Bar */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="md:col-span-2 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
                                    <input 
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Search PIN, Serial or Student..."
                                        value={tokenSearch}
                                        onChange={e => setTokenSearch(e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
                                    <select 
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg appearance-none bg-white"
                                        value={tokenStatusFilter}
                                        onChange={e => setTokenStatusFilter(e.target.value)}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="used">Used</option>
                                    </select>
                                </div>
                                <div className="relative">
                                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
                                    <select 
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg appearance-none bg-white"
                                        value={tokenSort}
                                        onChange={e => setTokenSort(e.target.value)}
                                    >
                                        <option value="date_desc">Newest First</option>
                                        <option value="date_asc">Oldest First</option>
                                        <option value="serial">Serial Number</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-3 w-10">
                                                <button onClick={toggleSelectAllTokens} className="text-gray-500 hover:text-indigo-600">
                                                    {selectedIds.size === filteredTokens.length && filteredTokens.length > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}
                                                </button>
                                            </th>
                                            <th className="p-3">Serial</th>
                                            <th className="p-3">Token PIN</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Used By</th>
                                            <th className="p-3">Date Generated</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredTokens.map(token => (
                                            <tr key={token.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(token.id) ? 'bg-indigo-50/50' : ''}`}>
                                                <td className="p-3">
                                                    <button onClick={() => toggleSelectToken(token.id)} className="text-gray-400 hover:text-indigo-600">
                                                        {selectedIds.has(token.id) ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18}/>}
                                                    </button>
                                                </td>
                                                <td className="p-3 font-mono text-xs text-gray-600">{token.serial}</td>
                                                <td className="p-3 font-mono font-bold tracking-wider text-gray-800">
                                                    {token.token}
                                                </td>
                                                <td className="p-3">
                                                    {token.status === 'used' ? (
                                                        <Badge color="red">USED</Badge>
                                                    ) : (
                                                        <Badge color="green">ACTIVE</Badge>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    {token.status === 'used' ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-700 text-xs">{token.usedByName}</span>
                                                            <span className="text-[10px] text-gray-400">{token.usedAt?.toDate?.().toLocaleDateString()}</span>
                                                            <span className="text-[10px] text-indigo-500">{token.usedForLabel}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-gray-500 text-xs">{token.createdAt?.toDate?.().toLocaleDateString()}</td>
                                                <td className="p-3 text-center">
                                                    <Button variant="secondary" className="px-2 py-1 h-auto text-xs" onClick={() => handleDownloadSingle(token)}>
                                                        <Download size={14}/> PDF
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredTokens.length === 0 && <p className="text-center py-8 text-gray-400">No tokens found.</p>}
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'codes' && (
                    <Card>
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Registration Access Codes</h2>
                                <p className="text-sm text-gray-500">Generate codes for schools to register on the platform.</p>
                            </div>
                            <Button onClick={generateAccessCode} variant="primary" disabled={generating}>
                                {generating ? 'Generating...' : <><Plus size={18} /> Generate New Code</>}
                            </Button>
                        </div>
                        <SearchFilterBar onSearch={setSearchTerm} placeholder="Search codes..." />
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                        <th className="p-4 font-medium">Access Code</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium">Generated Date</th>
                                        <th className="p-4 font-medium">Used By School</th>
                                        <th className="p-4 font-medium">Used Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCodes.map((code) => (
                                        <tr key={code.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-mono font-bold text-indigo-600 text-lg">{code.code}</td>
                                            <td className="p-4">
                                                {code.status === 'active' ? (
                                                    <Badge color="green"><span className="flex items-center gap-1"><CheckCircle size={12}/> Active</span></Badge>
                                                ) : (
                                                    <Badge color="gray"><span className="flex items-center gap-1"><XCircle size={12}/> Used</span></Badge>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">{code.createdAt?.toDate ? code.createdAt.toDate().toLocaleDateString() : 'Just now'}</td>
                                            <td className="p-4 text-gray-800 font-medium">{code.usedBySchoolName || '-'}</td>
                                            <td className="p-4 text-gray-500 text-sm">{code.usedAt?.toDate ? code.usedAt.toDate().toLocaleDateString() : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredCodes.length === 0 && <p className="text-center p-8 text-gray-400">No codes found.</p>}
                        </div>
                    </Card>
                )}

                {activeTab === 'schools' && (
                    <Card>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Registered Schools</h2>
                            <Badge color="blue">{filteredSchools.length} Schools</Badge>
                        </div>
                        <SearchFilterBar onSearch={setSearchTerm} placeholder="Search schools by name or ID..." />
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                        <th className="p-4 font-medium">School Name</th>
                                        <th className="p-4 font-medium">School ID</th>
                                        <th className="p-4 font-medium">Address</th>
                                        <th className="p-4 font-medium">Phone</th>
                                        <th className="p-4 font-medium">Date Registered</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSchools.map((school, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-semibold text-gray-800">{school.name}</td>
                                            <td className="p-4"><Badge color="purple">{school.schoolId}</Badge></td>
                                            <td className="p-4 text-gray-600 text-sm max-w-[200px] truncate">{school.address || 'N/A'}</td>
                                            <td className="p-4 text-gray-600 text-sm">{school.phone || 'N/A'}</td>
                                            <td className="p-4 text-gray-500 text-sm">{school.createdAt?.toDate ? school.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredSchools.length === 0 && <p className="text-center p-8 text-gray-400">No schools found.</p>}
                        </div>
                    </Card>
                )}

                {activeTab === 'teachers' && (
                    <Card>
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Teachers Directory</h2>
                            <Badge color="green">{filteredTeachers.length} Teachers</Badge>
                        </div>
                        <SearchFilterBar 
                            onSearch={setSearchTerm} 
                            onFilterChange={setFilterValue}
                            filterOptions={schoolFilterOptions}
                            placeholder="Search by name, ID or email..." 
                        />
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                        <th className="p-4 font-medium">Full Name</th>
                                        <th className="p-4 font-medium">Unique ID</th>
                                        <th className="p-4 font-medium">Email</th>
                                        <th className="p-4 font-medium">School ID</th>
                                        <th className="p-4 font-medium">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTeachers.map((teacher, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="p-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                    {teacher.fullName.charAt(0)}
                                                </div>
                                                <span className="font-semibold text-gray-800">{teacher.fullName}</span>
                                            </td>
                                            <td className="p-4 font-mono text-sm text-gray-600">{teacher.uniqueId}</td>
                                            <td className="p-4 text-gray-600">{teacher.email}</td>
                                            <td className="p-4"><Badge color="gray">{teacher.schoolId}</Badge></td>
                                            <td className="p-4"><Badge color="orange">{teacher.points || 0}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             {filteredTeachers.length === 0 && <p className="text-center p-8 text-gray-400">No teachers found.</p>}
                        </div>
                    </Card>
                )}

                {activeTab === 'students' && (
                    <Card>
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Students Directory</h2>
                            <Badge color="blue">{filteredStudents.length} Students</Badge>
                        </div>
                        <SearchFilterBar 
                            onSearch={setSearchTerm} 
                            onFilterChange={setFilterValue}
                            filterOptions={schoolFilterOptions}
                            placeholder="Search by name, ID or parent phone..." 
                        />
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStudents.map((student, i) => (
                                <div key={i} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-gray-50/50">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {student.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{student.fullName}</h3>
                                            <p className="text-xs text-gray-500">{student.uniqueId}</p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <div className="flex justify-between">
                                            <span>School:</span>
                                            <span className="font-medium">{student.schoolId}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Parent:</span>
                                            <span className="font-medium">{student.parentPhone}</span>
                                        </div>
                                        <div className="flex justify-between border-t pt-1 mt-1">
                                            <span className="text-orange-600 font-bold">Points:</span>
                                            <span className="font-bold bg-orange-100 text-orange-700 px-2 rounded-full text-xs">{student.points || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredStudents.length === 0 && <p className="text-center p-8 text-gray-400">No students found.</p>}
                    </Card>
                )}
            </div>
        </div>
    );
};
