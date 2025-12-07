
import React, { useState, useRef, useEffect } from 'react';
import { FileText, Plus, Sparkles, Image as ImageIcon, PenTool, Trash2, Edit, X, Save, Settings, AlertCircle, Circle, Square, Triangle, Upload, Link } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { UserProfile, Exam, Question, LessonNote } from '../types';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { Badge } from './Badge';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

// --- Helper Components ---

const DrawingCanvas = ({ onSave, onClose }: { onSave: (dataUrl: string) => void, onClose: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000000';
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }, []);

    const startDrawing = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
        const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
        const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
        
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);

    const clearCanvas = () => {
         const canvas = canvasRef.current;
         if (!canvas) return;
         const ctx = canvas.getContext('2d');
         if (ctx) {
             ctx.fillStyle = '#ffffff';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
         }
    };

    const drawShape = (shape: 'rect' | 'circle' | 'triangle' | 'cylinder' | 'cube') => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (shape === 'rect') {
            ctx.rect(cx - 50, cy - 35, 100, 70);
        } else if (shape === 'circle') {
            ctx.arc(cx, cy, 50, 0, 2 * Math.PI);
        } else if (shape === 'triangle') {
            ctx.moveTo(cx, cy - 50);
            ctx.lineTo(cx + 50, cy + 50);
            ctx.lineTo(cx - 50, cy + 50);
            ctx.closePath();
        } else if (shape === 'cylinder') {
            // Draw Ellipse top
            ctx.ellipse(cx, cy - 40, 40, 15, 0, 0, 2 * Math.PI);
            ctx.moveTo(cx - 40, cy - 40);
            ctx.lineTo(cx - 40, cy + 40);
            // Bottom curve
            ctx.ellipse(cx, cy + 40, 40, 15, 0, 0, Math.PI);
            ctx.lineTo(cx + 40, cy - 40);
        } else if (shape === 'cube') {
            const s = 50;
            ctx.rect(cx - s/2, cy - s/2, s, s);
            ctx.moveTo(cx - s/2, cy - s/2);
            ctx.lineTo(cx - s/2 + 20, cy - s/2 - 20);
            ctx.lineTo(cx + s/2 + 20, cy - s/2 - 20);
            ctx.lineTo(cx + s/2, cy - s/2);
            
            ctx.moveTo(cx + s/2 + 20, cy - s/2 - 20);
            ctx.lineTo(cx + s/2 + 20, cy + s/2 - 20);
            ctx.lineTo(cx + s/2, cy + s/2);
        }

        ctx.stroke();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-4 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Draw Diagram / Shape</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                
                {/* Shape Toolbar */}
                <div className="flex gap-2 mb-2 p-2 bg-gray-50 rounded-lg overflow-x-auto">
                    <button onClick={() => drawShape('rect')} className="p-2 hover:bg-gray-200 rounded flex flex-col items-center text-xs"><Square size={18}/> Rect</button>
                    <button onClick={() => drawShape('circle')} className="p-2 hover:bg-gray-200 rounded flex flex-col items-center text-xs"><Circle size={18}/> Circle</button>
                    <button onClick={() => drawShape('triangle')} className="p-2 hover:bg-gray-200 rounded flex flex-col items-center text-xs"><Triangle size={18}/> Triangle</button>
                    <button onClick={() => drawShape('cylinder')} className="p-2 hover:bg-gray-200 rounded flex flex-col items-center text-xs"><div className="w-4 h-4 border border-gray-600 rounded-b-md rounded-t-[50%]"></div> Cyl</button>
                    <button onClick={() => drawShape('cube')} className="p-2 hover:bg-gray-200 rounded flex flex-col items-center text-xs"><div className="w-4 h-4 border border-gray-600 skew-x-12"></div> Cube</button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden touch-none">
                    <canvas 
                        ref={canvasRef} 
                        className="w-full bg-white cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>
                <div className="flex justify-between mt-4">
                    <Button variant="secondary" onClick={clearCanvas}>Clear</Button>
                    <Button onClick={() => onSave(canvasRef.current?.toDataURL() || '')}>Insert Drawing</Button>
                </div>
            </div>
        </div>
    );
};

const EquationModal = ({ onInsert, onClose }: { onInsert: (text: string) => void, onClose: () => void }) => {
    const [eq, setEq] = useState('');
    
    // Simple mock preview since we can't easily render LaTeX without libraries
    // In a real app, use KaTeX or MathJax
    
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Insert Equation</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                
                <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Build your equation using these blocks or type raw:</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button onClick={() => setEq(eq + ' \\frac{x}{y} ')} className="px-2 py-1 bg-gray-100 rounded text-xs border hover:bg-gray-200">Fraction</button>
                        <button onClick={() => setEq(eq + ' \\sqrt{x} ')} className="px-2 py-1 bg-gray-100 rounded text-xs border hover:bg-gray-200">Sqrt</button>
                        <button onClick={() => setEq(eq + ' x^{2} ')} className="px-2 py-1 bg-gray-100 rounded text-xs border hover:bg-gray-200">Power</button>
                        <button onClick={() => setEq(eq + ' \\sum_{i=0}^{n} ')} className="px-2 py-1 bg-gray-100 rounded text-xs border hover:bg-gray-200">Sum</button>
                        <button onClick={() => setEq(eq + ' \\int_{a}^{b} ')} className="px-2 py-1 bg-gray-100 rounded text-xs border hover:bg-gray-200">Integral</button>
                    </div>
                    <textarea 
                        className="w-full border rounded p-3 font-mono text-sm" 
                        rows={3} 
                        value={eq} 
                        onChange={(e) => setEq(e.target.value)}
                        placeholder="e.g. E = mc^2"
                    ></textarea>
                </div>
                <div className="bg-gray-50 p-3 rounded mb-4 text-center border">
                    <p className="text-xs text-gray-400 uppercase font-bold">Preview (Raw Format)</p>
                    <p className="font-serif italic text-lg py-2">\( {eq} \)</p>
                </div>
                <Button onClick={() => onInsert(` \\( ${eq} \\) `)} className="w-full">Insert Equation</Button>
            </div>
        </div>
    );
};

const MathToolbar = ({ onInsert, onEquation }: { onInsert: (symbol: string) => void, onEquation: () => void }) => {
    const symbols = [
        '√', 'π', 'θ', '∑', '∞', '∫', '≠', '≤', '≥', '±', '÷', '×', 
        '°', '∆', 'Ω', 'µ', '²', '³', '½', '⅓', '¼', '¾', 
        'α', 'β', 'γ', 'λ', 'φ', '≈', '≡', '⊥', '∥', '∠', '∩', '∪',
        '→', '←', '↔', '⇒', '⇔', '∈', '∉', '⊂', '⊃', '⊆', '⊇',
        '∂', '∇', '∀', '∃', '∅', '‰', '∴', '∵', '⊕', '⊗'
    ];
    return (
        <div className="mb-2">
            <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border border-gray-200 rounded-lg max-h-32 overflow-y-auto custom-scrollbar">
                <button 
                    onClick={onEquation}
                    className="w-auto px-2 h-8 flex items-center justify-center bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 text-indigo-700 font-bold text-xs"
                >
                    f(x) Eq
                </button>
                {symbols.map(s => (
                    <button 
                        key={s} 
                        onClick={() => onInsert(s)}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded hover:bg-gray-100 text-gray-700 font-serif"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
};

interface ExamEditorProps {
    initialExam?: Partial<Exam>;
    user: UserProfile;
    onSave: (exam: Partial<Exam>) => Promise<void>;
    onCancel: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix for Gemini API usage
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

export const ExamEditor: React.FC<ExamEditorProps> = ({ initialExam, user, onSave, onCancel }) => {
    const [examForm, setExamForm] = useState<Partial<Exam>>(initialExam || {
        title: '',
        subject: '',
        classLevel: 'Primary 1',
        term: '1st Term',
        session: '2024/2025',
        instructions: '',
        durationMinutes: 60,
        questions: [],
        status: 'pending',
        config: {
            objective: { instruction: 'Answer all questions in this section.' },
            theory: { instruction: 'Answer any 3 questions.' },
            comprehension: { instruction: 'Read the passage carefully and answer questions.' }
        }
    });

    const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({ 
        type: 'objective', 
        text: '', 
        options: ['', '', '', ''], 
        correct: '' 
    });
    
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [showDrawing, setShowDrawing] = useState(false);
    const [showEquation, setShowEquation] = useState(false);
    const [aiMode, setAiMode] = useState(false);
    const [lessonNote, setLessonNote] = useState('');
    const [lessonNoteCode, setLessonNoteCode] = useState('');
    const [aiConfig, setAiConfig] = useState({ count: 5, type: 'objective' });
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const classOptions = [
        "Nursery 1", "Nursery 2", "Reception", 
        "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
        "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"
    ];

    const fetchLessonNoteByCode = async () => {
        if (!lessonNoteCode) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'lesson_notes'), where('accessCode', '==', lessonNoteCode.toUpperCase().trim()));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const note = snap.docs[0].data() as LessonNote;
                // Strip HTML tags for clearer prompting
                const stripped = note.content.replace(/<[^>]*>?/gm, ' ');
                setLessonNote(prev => prev + `\n\nContent from Note (${lessonNoteCode}):\n` + stripped);
                alert("Lesson note content added to context!");
            } else {
                alert("Invalid Note Code");
            }
        } catch (e: any) {
            alert("Error fetching note: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let contentParts: any[] = [{ text: "Analyze this file and extract all key educational concepts, questions, and summaries to help generate exam questions." }];
            
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                const base64 = await fileToBase64(file);
                contentParts.push({ inlineData: { mimeType: file.type, data: base64 }});
            } else {
                const text = await file.text();
                contentParts = [{ text: "Extract content from this text file: \n" + text }];
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', // Using flash for multimodal
                contents: { parts: contentParts },
            });

            setLessonNote(prev => prev + `\n\nAnalyzed File Content:\n` + response.text);
            alert("File content analyzed and added to context!");
        } catch (e: any) {
            console.error(e);
            alert("Error analyzing file: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAI = async () => {
        if (!lessonNote.trim()) {
            alert('Please enter lesson notes, upload a file, or use a lesson code first.');
            return;
        }
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate ${aiConfig.count} ${aiConfig.type} questions for ${examForm.classLevel} students based on this context: "${lessonNote}". 
            Return strictly a JSON array of objects with keys: text, options (array of 4 strings if objective), correct (string). 
            Do not include markdown code blocks.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            
            const rawText = response.text;
            let questions = [];
            try {
                questions = JSON.parse(rawText);
            } catch (e) {
                const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '');
                questions = JSON.parse(cleaned);
            }

            const mappedQuestions = questions.map((q: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                type: aiConfig.type,
                text: q.text,
                options: q.options || [],
                correct: q.correct || '',
                maxScore: 1
            }));

            setExamForm(prev => ({
                ...prev,
                questions: [...(prev.questions || []), ...mappedQuestions]
            }));
            
            setAiMode(false);
        } catch (e: any) {
            console.error(e);
            alert('AI Generation failed: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const addOrUpdateQuestion = () => {
        if (!currentQuestion.text) return;
        
        const newQ = {
            ...currentQuestion,
            id: currentQuestion.id || Math.random().toString(36).substr(2, 9),
        } as Question;
        
        setExamForm(prev => {
            const qs = [...(prev.questions || [])];
            if (editingIndex !== null) {
                qs[editingIndex] = newQ;
            } else {
                qs.push(newQ);
            }
            return { ...prev, questions: qs };
        });
        
        setCurrentQuestion({ type: 'objective', text: '', options: ['', '', '', ''], correct: '' });
        setEditingIndex(null);
    };

    const editQuestion = (index: number) => {
        if (!examForm.questions) return;
        const q = examForm.questions[index];
        setCurrentQuestion(q);
        setEditingIndex(index);
    };

    const deleteQuestion = (index: number) => {
        setExamForm(prev => ({
            ...prev,
            questions: prev.questions?.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!examForm.title || !examForm.questions?.length) {
            alert('Please add title and at least one question.');
            return;
        }
        setLoading(true);
        try {
            await onSave(examForm);
        } catch (e: any) {
            alert('Error saving: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Admin Feedback Alert */}
            {examForm.status === 'review' && examForm.adminFeedback && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 shadow-sm rounded-r-lg animate-pulse">
                    <div className="flex items-start">
                        <AlertCircle className="text-red-500 w-5 h-5 mr-3 mt-0.5" />
                        <div>
                            <h3 className="text-red-800 font-bold">Returned for Review</h3>
                            <p className="text-red-700 text-sm mt-1">{examForm.adminFeedback}</p>
                            <p className="text-red-600 text-xs mt-2 italic">Please make the necessary corrections and save to resubmit.</p>
                        </div>
                    </div>
                </div>
            )}

            {showDrawing && <DrawingCanvas onSave={(data) => { setCurrentQuestion(prev => ({...prev, image: data})); setShowDrawing(false); }} onClose={() => setShowDrawing(false)} />}
            {showEquation && <EquationModal onInsert={(txt) => { setCurrentQuestion(prev => ({...prev, text: (prev.text || '') + txt})); setShowEquation(false); }} onClose={() => setShowEquation(false)} />}
            
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">{examForm.id ? 'Edit Exam' : 'Create New Exam'}</h2>
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            </div>

            <div className="grid md:grid-cols-12 gap-6">
                {/* Left Column: Details */}
                <div className="md:col-span-5 space-y-6">
                    <Card className="space-y-4">
                        <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><FileText size={16}/> Exam Details</h3>
                        <Input label="Title" value={examForm.title || ''} onChange={e => setExamForm({...examForm, title: e.target.value})} placeholder="e.g. Mid-Term Assessment" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Subject" value={examForm.subject || ''} onChange={e => setExamForm({...examForm, subject: e.target.value})} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                <select 
                                    className="w-full p-2 border rounded-lg bg-white"
                                    value={examForm.classLevel}
                                    onChange={e => setExamForm({...examForm, classLevel: e.target.value})}
                                >
                                    {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Term" value={examForm.term || ''} onChange={e => setExamForm({...examForm, term: e.target.value})} placeholder="e.g. 1st Term"/>
                            <Input label="Session" value={examForm.session || ''} onChange={e => setExamForm({...examForm, session: e.target.value})} placeholder="e.g. 2024/2025"/>
                        </div>
                        <Input label="Duration (Minutes)" type="number" value={String(examForm.durationMinutes)} onChange={e => setExamForm({...examForm, durationMinutes: parseInt(e.target.value)})} />
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">General Instructions</label>
                            <textarea 
                                className="w-full border rounded-lg p-2" 
                                rows={2}
                                value={examForm.instructions}
                                onChange={e => setExamForm({...examForm, instructions: e.target.value})}
                            ></textarea>
                        </div>
                    </Card>

                    <Card className="space-y-4">
                         <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><Settings size={16}/> Section Instructions</h3>
                         
                         {['objective', 'theory', 'comprehension'].map((type) => (
                             <div key={type}>
                                 <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">{type}</label>
                                 <input 
                                    className="w-full border rounded p-2 text-sm"
                                    placeholder={`Instructions for ${type} section...`}
                                    value={examForm.config?.[type as keyof typeof examForm.config]?.instruction || ''}
                                    onChange={(e) => {
                                        const newConfig = { ...examForm.config };
                                        if (!newConfig[type as keyof typeof examForm.config]) newConfig[type as keyof typeof examForm.config] = { instruction: '' };
                                        (newConfig as any)[type].instruction = e.target.value;
                                        setExamForm({ ...examForm, config: newConfig as any });
                                    }}
                                 />
                             </div>
                         ))}
                    </Card>
                </div>

                {/* Right Column: Questions */}
                <div className="md:col-span-7 space-y-6 flex flex-col h-full">
                    <Card className="flex-1 flex flex-col">
                        <div className="flex justify-between items-center border-b pb-2 mb-4">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2"><Plus size={16}/> Add / Edit Question</h3>
                            <button 
                                onClick={() => setAiMode(!aiMode)} 
                                className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors ${aiMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                <Sparkles size={14}/> {aiMode ? 'Manual Mode' : 'AI Generate'}
                            </button>
                        </div>

                        {aiMode ? (
                            <div className="space-y-4">
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                    <p className="text-sm text-indigo-800 font-medium mb-2">AI Question Generator</p>
                                    
                                    <div className="flex flex-col gap-3 mb-3">
                                        {/* File Upload for Notes */}
                                        <div className="flex gap-2">
                                            <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full text-xs" disabled={loading}>
                                                <Upload size={14}/> Upload Note (PDF/Img/Txt)
                                            </Button>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                accept=".txt, .pdf, image/*" 
                                                onChange={handleFileUpload} 
                                            />
                                        </div>

                                        {/* Lesson Code Input */}
                                        <div className="flex gap-2">
                                            <input 
                                                className="flex-1 border rounded p-2 text-sm" 
                                                placeholder="Enter Lesson Code (e.g. AB12)"
                                                value={lessonNoteCode}
                                                onChange={e => setLessonNoteCode(e.target.value)}
                                            />
                                            <Button onClick={fetchLessonNoteByCode} variant="secondary" className="text-xs" disabled={loading}>
                                                <Link size={14}/> Fetch
                                            </Button>
                                        </div>
                                    </div>

                                    <textarea 
                                        className="w-full h-32 border border-indigo-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500" 
                                        placeholder="Paste lesson text manually here..."
                                        value={lessonNote}
                                        onChange={e => setLessonNote(e.target.value)}
                                    ></textarea>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-24">
                                        <Input 
                                            label="Count" 
                                            type="number" 
                                            value={String(aiConfig.count)} 
                                            onChange={e => setAiConfig({...aiConfig, count: parseInt(e.target.value)})} 
                                            className="mb-0"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select 
                                            className="w-full p-2 border rounded-lg"
                                            value={aiConfig.type}
                                            onChange={e => setAiConfig({...aiConfig, type: e.target.value})}
                                        >
                                            <option value="objective">Objective</option>
                                            <option value="theory">Theory</option>
                                            <option value="comprehension">Comprehension</option>
                                        </select>
                                    </div>
                                </div>
                                <Button onClick={handleAI} disabled={loading} className="w-full">
                                    {loading ? 'Generating...' : 'Generate Questions'}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-2 mb-2 p-1 bg-gray-100 rounded-lg w-fit">
                                    {['objective', 'theory', 'comprehension'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => setCurrentQuestion(prev => ({...prev, type: t as any}))}
                                            className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${currentQuestion.type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>

                                <div>
                                    <MathToolbar 
                                        onInsert={(s) => setCurrentQuestion(prev => ({...prev, text: (prev.text || '') + s}))} 
                                        onEquation={() => setShowEquation(true)}
                                    />
                                    <textarea 
                                        className="w-full border rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-indigo-500 font-medium" 
                                        placeholder="Enter question text here..."
                                        value={currentQuestion.text}
                                        onChange={e => setCurrentQuestion(prev => ({...prev, text: e.target.value}))}
                                    ></textarea>
                                </div>

                                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                                    <button 
                                        onClick={() => setShowDrawing(true)}
                                        className="text-xs flex items-center gap-2 text-indigo-600 font-medium hover:underline"
                                    >
                                        <PenTool size={14}/> {currentQuestion.image ? 'Edit Drawing' : 'Insert Drawing'}
                                    </button>
                                    {currentQuestion.image && (
                                        <div className="relative group">
                                            <img src={currentQuestion.image} className="h-10 border rounded bg-white"/>
                                            <button 
                                                onClick={() => setCurrentQuestion(prev => ({...prev, image: undefined}))}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={10}/>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {currentQuestion.type === 'objective' && (
                                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Options (Select Correct Answer)</p>
                                        {currentQuestion.options?.map((opt, i) => (
                                            <div key={i} className="flex gap-3 items-center">
                                                <div className="flex items-center h-5">
                                                    <input 
                                                        type="radio" 
                                                        name="correct_opt" 
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                        checked={currentQuestion.correct === opt && opt !== ''} 
                                                        onChange={() => setCurrentQuestion(prev => ({...prev, correct: opt}))}
                                                    />
                                                </div>
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{String.fromCharCode(65+i)}</span>
                                                    <input 
                                                        className="w-full border rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                                        placeholder={`Option ${i+1}`}
                                                        value={opt}
                                                        onChange={e => {
                                                            const newOpts = [...(currentQuestion.options || [])];
                                                            newOpts[i] = e.target.value;
                                                            setCurrentQuestion(prev => ({...prev, options: newOpts}));
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Button onClick={addOrUpdateQuestion} className="w-full" variant="primary">
                                    {editingIndex !== null ? 'Update Question' : 'Add Question to Exam'}
                                </Button>
                                {editingIndex !== null && (
                                    <Button onClick={() => { setEditingIndex(null); setCurrentQuestion({ type: 'objective', text: '', options: ['', '', '', ''], correct: '' }); }} className="w-full" variant="ghost">
                                        Cancel Editing
                                    </Button>
                                )}
                            </div>
                        )}
                    </Card>

                    {/* Questions List */}
                    <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex-1 overflow-hidden flex flex-col">
                        <h3 className="font-bold text-gray-800 mb-2 flex items-center justify-between">
                            <span>Preview</span>
                            <Badge color="blue">{examForm.questions?.length || 0} Questions</Badge>
                        </h3>
                        <div className="space-y-3 overflow-y-auto pr-2 flex-1 custom-scrollbar">
                            {examForm.questions?.map((q, i) => (
                                <div key={i} className={`p-3 rounded-lg border group transition-all ${editingIndex === i ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-gray-50 border-gray-100 hover:bg-white hover:shadow-sm'}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-3">
                                            <span className="font-bold text-gray-400 text-sm mt-0.5">{i+1}.</span>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800 line-clamp-2">{q.text}</p>
                                                {q.image && <img src={q.image} className="h-10 mt-1 border rounded bg-white block" alt="drawing"/>}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{q.type}</span>
                                                    {q.type === 'objective' && <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Ans: {q.correct}</span>}
                                                </div>
                                                {/* Show options in preview */}
                                                {q.type === 'objective' && (
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pl-1 border-l-2 border-gray-200">
                                                        {q.options?.map((opt, idx) => (
                                                            <p key={idx} className="text-xs text-gray-600 truncate">
                                                                <span className="font-bold mr-1">{String.fromCharCode(65+idx)}.</span>{opt}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => editQuestion(i)}
                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                                                title="Edit"
                                            >
                                                <Edit size={14}/>
                                            </button>
                                            <button 
                                                onClick={() => deleteQuestion(i)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!examForm.questions || examForm.questions.length === 0) && (
                                <div className="text-center py-8 text-gray-400 text-sm italic">
                                    No questions added yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-6 right-6 flex gap-4 z-20">
                 <Button onClick={handleSave} className="shadow-xl px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
                     <Save size={18}/> {loading ? 'Saving...' : 'Save Exam & Request Approval'}
                 </Button>
            </div>
        </div>
    );
};
