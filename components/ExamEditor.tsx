import React, { useState, useRef, useEffect } from 'react';
import { FileText, Plus, Sparkles, Image as ImageIcon, PenTool, Trash2, Edit, X, Save, Settings, AlertCircle, Circle, Square, Triangle, Upload, Link, Loader } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { UserProfile, Exam, Question } from '../types';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { Badge } from './Badge';

// --- Drawing Canvas Component ---
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

    const getPos = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: any) => {
        setIsDrawing(true);
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.closePath();
    };

    const clearCanvas = () => {
         const canvas = canvasRef.current;
         const ctx = canvas?.getContext('2d');
         if (canvas && ctx) {
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

    const handleSave = () => {
        if (canvasRef.current) {
            onSave(canvasRef.current.toDataURL('image/png'));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-4 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Draw Diagram</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                
                <div className="border rounded-lg overflow-hidden bg-gray-100 touch-none">
                    <canvas 
                        ref={canvasRef}
                        className="w-full h-auto cursor-crosshair bg-white"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    ></canvas>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 items-center">
                    <Button variant="secondary" onClick={clearCanvas} className="text-xs">Clear</Button>
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                    <button onClick={() => drawShape('rect')} className="p-2 hover:bg-gray-100 rounded" title="Rectangle"><Square size={16}/></button>
                    <button onClick={() => drawShape('circle')} className="p-2 hover:bg-gray-100 rounded" title="Circle"><Circle size={16}/></button>
                    <button onClick={() => drawShape('triangle')} className="p-2 hover:bg-gray-100 rounded" title="Triangle"><Triangle size={16}/></button>
                    <button onClick={() => drawShape('cylinder')} className="p-2 hover:bg-gray-100 rounded text-xs font-bold border px-2">Cyl</button>
                    <button onClick={() => drawShape('cube')} className="p-2 hover:bg-gray-100 rounded text-xs font-bold border px-2">Cube</button>
                    
                    <div className="flex-1"></div>
                    <Button variant="primary" onClick={handleSave}>Insert Drawing</Button>
                </div>
            </div>
        </div>
    );
};

// --- Main Exam Editor Component ---

interface ExamEditorProps {
    user: UserProfile;
    initialExam?: Exam;
    onSave: (exam: Partial<Exam>) => void;
    onCancel: () => void;
}

export const ExamEditor: React.FC<ExamEditorProps> = ({ user, initialExam, onSave, onCancel }) => {
    const [examData, setExamData] = useState<Partial<Exam>>(initialExam || {
        title: '',
        subject: '',
        classLevel: 'Primary 1',
        term: '1st Term',
        session: '2024/2025',
        instructions: 'Answer all questions.',
        durationMinutes: 60,
        questions: [],
        config: {
            objective: { instruction: 'Choose the correct option.' },
            theory: { instruction: 'Answer in detail.' }
        }
    });

    const [activeTab, setActiveTab] = useState<'details' | 'questions'>('details');
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showDrawing, setShowDrawing] = useState(false);
    const [currentQIndex, setCurrentQIndex] = useState<number | null>(null);

    const handleAddQuestion = (type: 'objective' | 'theory' | 'comprehension') => {
        const newQ: Question = {
            id: Date.now().toString(),
            type,
            text: '',
            options: type === 'objective' ? ['', '', '', ''] : undefined,
            correct: type === 'objective' ? '' : undefined,
            maxScore: 1
        };
        setExamData({ ...examData, questions: [...(examData.questions || []), newQ] });
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQs = [...(examData.questions || [])];
        newQs[index] = { ...newQs[index], [field]: value };
        setExamData({ ...examData, questions: newQs });
    };

    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const newQs = [...(examData.questions || [])];
        if (newQs[qIndex].options) {
            const newOpts = [...newQs[qIndex].options!];
            newOpts[optIndex] = value;
            newQs[qIndex] = { ...newQs[qIndex], options: newOpts };
            setExamData({ ...examData, questions: newQs });
        }
    };

    const removeQuestion = (index: number) => {
        const newQs = (examData.questions || []).filter((_, i) => i !== index);
        setExamData({ ...examData, questions: newQs });
    };

    const handleDrawingSave = (dataUrl: string) => {
        if (currentQIndex !== null) {
            updateQuestion(currentQIndex, 'image', dataUrl);
        }
        setShowDrawing(false);
        setCurrentQIndex(null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                updateQuestion(index, 'image', evt.target?.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // --- AI Generation Logic ---
    const generateQuestions = async () => {
        if (!aiTopic.trim()) return;
        setIsGenerating(true);

        try {
            // Safely access API key, fallback to empty string if undefined (handled by check below)
            const apiKey = process.env.API_KEY || '';
            
            if (!apiKey) {
                alert("API Key missing. Please set VITE_API_KEY in your Vercel environment variables.");
                setIsGenerating(false);
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            
            const prompt = `Generate 5 objective questions for ${examData.classLevel} students on the topic: "${aiTopic}". 
            Subject is ${examData.subject}. 
            Format the output strictly as a JSON array of objects with keys: "text" (string), "options" (array of 4 strings), "correct" (string, matching one option).
            Do not include markdown code blocks. Just the raw JSON.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json'
                }
            });

            const responseText = response.text;
            if (!responseText) throw new Error("No response from AI");
            
            // Clean up if model still adds markdown
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const generatedQs = JSON.parse(cleanJson);

            const newQuestions = generatedQs.map((q: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                type: 'objective',
                text: q.text,
                options: q.options,
                correct: q.correct,
                maxScore: 1
            }));

            setExamData({
                ...examData,
                questions: [...(examData.questions || []), ...newQuestions]
            });
            setShowAiModal(false);
            setAiTopic('');

        } catch (error) {
            console.error("AI Gen Error", error);
            alert("Failed to generate questions. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* AI Modal */}
            {showAiModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2"><Sparkles className="text-indigo-600"/> Generate Questions with AI</h3>
                            <button onClick={() => setShowAiModal(false)}><X size={20}/></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Gemini will generate 5 objective questions based on your topic.</p>
                        <Input 
                            label="Topic or Concept" 
                            placeholder="e.g. Photosynthesis, Algebra, World War II"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                        />
                        <Button 
                            onClick={generateQuestions} 
                            disabled={isGenerating} 
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 border-none"
                        >
                            {isGenerating ? <><Loader className="animate-spin" size={16}/> Generating...</> : <><Sparkles size={16}/> Generate Questions</>}
                        </Button>
                    </Card>
                </div>
            )}

            {/* Drawing Modal */}
            {showDrawing && (
                <DrawingCanvas onSave={handleDrawingSave} onClose={() => setShowDrawing(false)} />
            )}

            {/* Header / Nav */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{initialExam ? 'Edit Exam' : 'Create New Exam'}</h2>
                    <div className="flex gap-2 mt-2">
                         <button 
                            onClick={() => setActiveTab('details')}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${activeTab === 'details' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Exam Details
                        </button>
                        <button 
                            onClick={() => setActiveTab('questions')}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${activeTab === 'questions' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Questions ({examData.questions?.length || 0})
                        </button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onCancel}><X size={16}/> Cancel</Button>
                    <Button onClick={() => onSave(examData)} variant="primary" className="bg-indigo-600 hover:bg-indigo-700">
                        <Save size={16}/> Save Exam
                    </Button>
                </div>
            </div>

            {activeTab === 'details' && (
                <Card>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Input label="Exam Title" value={examData.title || ''} onChange={e => setExamData({...examData, title: e.target.value})} placeholder="e.g. 1st Term Mathematics Assessment" />
                        <Input label="Subject" value={examData.subject || ''} onChange={e => setExamData({...examData, subject: e.target.value})} />
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Class Level</label>
                            <select className="w-full border p-2 rounded-lg" value={examData.classLevel} onChange={e => setExamData({...examData, classLevel: e.target.value})}>
                                {["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <Input label="Duration (Minutes)" type="number" value={String(examData.durationMinutes)} onChange={e => setExamData({...examData, durationMinutes: parseInt(e.target.value)})} />
                        
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium mb-1">General Instructions</label>
                             <textarea className="w-full border p-3 rounded-lg h-24" value={examData.instructions} onChange={e => setExamData({...examData, instructions: e.target.value})}></textarea>
                        </div>
                    </div>
                </Card>
            )}

            {activeTab === 'questions' && (
                <div className="space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-2 sticky top-0 bg-gray-50 p-2 z-10 rounded-lg border shadow-sm">
                        <Button onClick={() => handleAddQuestion('objective')} variant="secondary" className="text-xs"><Plus size={14}/> Add Objective</Button>
                        <Button onClick={() => handleAddQuestion('theory')} variant="secondary" className="text-xs"><Plus size={14}/> Add Theory</Button>
                        <div className="w-px h-8 bg-gray-300 mx-2"></div>
                        <Button onClick={() => setShowAiModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs border-none"><Sparkles size={14}/> Generate with AI</Button>
                    </div>

                    {/* Question List */}
                    <div className="space-y-6 pb-20">
                        {examData.questions?.map((q, idx) => (
                            <Card key={idx} className="relative group border border-gray-200 hover:border-indigo-300 transition-colors">
                                <div className="absolute right-4 top-4 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => removeQuestion(idx)} 
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-full" 
                                        title="Delete Question"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex flex-col gap-2 pt-2">
                                        <Badge color="gray">Q{idx + 1}</Badge>
                                        <Badge color={q.type === 'objective' ? 'blue' : 'orange'}>{q.type}</Badge>
                                    </div>
                                    
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <textarea 
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium" 
                                                placeholder="Enter question text..."
                                                value={q.text}
                                                onChange={e => updateQuestion(idx, 'text', e.target.value)}
                                                rows={2}
                                            ></textarea>
                                        </div>

                                        {/* Image Area */}
                                        <div className="flex gap-2 items-center">
                                            {q.image ? (
                                                <div className="relative inline-block border rounded p-1">
                                                    <img src={q.image} className="h-24 w-auto object-contain" alt="Question" />
                                                    <button onClick={() => updateQuestion(idx, 'image', undefined)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <label className="cursor-pointer px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-gray-50">
                                                        <ImageIcon size={14}/> Upload Image
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, idx)} />
                                                    </label>
                                                    <button 
                                                        onClick={() => { setCurrentQIndex(idx); setShowDrawing(true); }}
                                                        className="px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-gray-50"
                                                    >
                                                        <PenTool size={14}/> Draw Diagram
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Objective Options */}
                                        {q.type === 'objective' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                                {q.options?.map((opt, oIdx) => (
                                                    <div key={oIdx} className="flex items-center gap-2">
                                                        <div 
                                                            onClick={() => updateQuestion(idx, 'correct', opt)}
                                                            className={`w-6 h-6 rounded-full border flex items-center justify-center cursor-pointer ${q.correct === opt && opt !== '' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-500'}`}
                                                            title="Mark as Correct Answer"
                                                        >
                                                            {String.fromCharCode(65+oIdx)}
                                                        </div>
                                                        <input 
                                                            className={`flex-1 p-2 border rounded text-sm ${q.correct === opt && opt !== '' ? 'border-green-500 bg-green-50' : ''}`}
                                                            value={opt}
                                                            onChange={e => updateOption(idx, oIdx, e.target.value)}
                                                            placeholder={`Option ${String.fromCharCode(65+oIdx)}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                        
                        {examData.questions?.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                                <FileText size={48} className="mx-auto mb-4 opacity-50"/>
                                <p>No questions added yet.</p>
                                <div className="flex justify-center gap-2 mt-4">
                                    <Button onClick={() => handleAddQuestion('objective')} variant="secondary">Add Objective</Button>
                                    <Button onClick={() => setShowAiModal(true)} variant="primary">Generate with AI</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};