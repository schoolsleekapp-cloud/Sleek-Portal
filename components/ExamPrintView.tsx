import React, { useState } from 'react';
import { Download, X, Loader } from 'lucide-react';
import { Button } from './Button';
import { Exam, SchoolInfo } from '../types';

interface ExamPrintViewProps {
    exam: Exam;
    schoolInfo: SchoolInfo | null;
    onClose: () => void;
}

declare const html2pdf: any;

export const ExamPrintView: React.FC<ExamPrintViewProps> = ({ exam, schoolInfo, onClose }) => {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = () => {
        setDownloading(true);
        const element = document.getElementById('exam-paper');
        const opt = {
            margin:       [10, 10, 15, 10], // top, left, bottom, right (mm)
            filename:     `${exam.title.replace(/\s+/g, '_')}_${exam.classLevel.replace(/\s+/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };

        if (typeof html2pdf !== 'undefined') {
            html2pdf().set(opt).from(element).save().then(() => {
                setDownloading(false);
            }).catch((err: any) => {
                console.error(err);
                setDownloading(false);
                alert("Error downloading PDF");
            });
        } else {
            alert("PDF generator not loaded. Please refresh.");
            setDownloading(false);
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen text-black fixed inset-0 z-50 overflow-y-auto">
            {/* Control Bar */}
            <div className="fixed top-0 left-0 right-0 bg-white shadow-md p-4 flex justify-between items-center z-50 no-print">
                <h2 className="font-bold text-gray-700">Exam Preview</h2>
                <div className="flex gap-2">
                     <Button onClick={handleDownload} variant="primary" disabled={downloading}>
                         {downloading ? <Loader className="animate-spin" size={16}/> : <Download size={16}/>} 
                         {downloading ? ' Generating PDF...' : ' Download PDF'}
                     </Button>
                     <Button onClick={onClose} variant="secondary"><X size={16}/> Close</Button>
                </div>
            </div>

            {/* Paper Container - Centered and scaled for viewing */}
            <div className="pt-24 pb-12 flex justify-center">
                <div 
                    className="bg-white shadow-2xl p-12 min-h-[297mm] w-[210mm] relative box-border" 
                    id="exam-paper"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
                        <div className="flex items-center gap-4">
                            {schoolInfo?.logo && (
                                <img src={schoolInfo.logo} className="w-20 h-20 object-contain" alt="Logo" crossOrigin="anonymous" />
                            )}
                            <div>
                                <h1 className="text-2xl font-bold uppercase leading-tight">{schoolInfo?.name || 'School Name'}</h1>
                                <p className="text-sm">{schoolInfo?.address}</p>
                                <p className="text-sm font-bold mt-1 bg-gray-100 inline-block px-1 rounded">{exam.term} Examination {exam.session}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <h2 className="text-xl font-bold uppercase text-indigo-900">{exam.subject}</h2>
                             <p className="font-semibold text-lg">{exam.classLevel}</p>
                             <p className="font-mono text-sm">Time: {exam.durationMinutes} Mins</p>
                        </div>
                    </div>
                    
                    <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-100">
                        <p className="text-sm"><span className="font-bold">General Instructions:</span> {exam.instructions}</p>
                    </div>

                    {/* Grouped Questions */}
                    {['objective', 'theory', 'comprehension'].map((type) => {
                        const qs = exam.questions.filter(q => q.type === type);
                        if (qs.length === 0) return null;
                        const config = exam.config as any;
                        const instruction = config?.[type]?.instruction || '';

                        return (
                            <div key={type} className="mb-8 section-container">
                                <div className="mb-4 border-b border-gray-300 pb-2 break-after-avoid">
                                    <h3 className="font-bold uppercase text-lg inline-block mr-4">{type} Section</h3>
                                    {instruction && <span className="text-sm italic text-gray-600">({instruction})</span>}
                                </div>
                                
                                <div className="space-y-6">
                                    {qs.map((q, i) => (
                                        <div key={i} className="break-inside-avoid question-block">
                                            <div className="flex gap-2">
                                                <span className="font-bold">{i+1}.</span>
                                                <div className="flex-1">
                                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: q.text }}></div>
                                                    {q.image && <img src={q.image} className="max-h-40 my-2 border border-gray-300 block" crossOrigin="anonymous" alt="Question resource" />}
                                                    
                                                    {type === 'objective' && (
                                                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">
                                                            {q.options?.map((opt, idx) => (
                                                                <div key={idx} className="flex gap-2 items-baseline">
                                                                    <span className="font-bold text-sm">{String.fromCharCode(65+idx)}.</span>
                                                                    <span className="text-sm">{opt}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {(type === 'theory' || type === 'comprehension') && (
                                                        <div className="mt-8 border-b border-gray-300 border-dashed w-full h-8"></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    <div className="mt-12 pt-4 border-t border-black flex justify-between text-xs text-gray-500">
                        <span>Teacher: {exam.creatorName}</span>
                        <span>Generated by SleekPortal</span>
                    </div>
                </div>
            </div>
        </div>
    );
};