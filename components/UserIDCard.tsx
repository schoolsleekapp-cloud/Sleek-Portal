import React, { useRef, useEffect, useCallback, useState } from 'react';
import { User, Download, Share2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile, SchoolInfo } from '../types';
import { Button } from './Button';
import { Card } from './Card';

interface UserIDCardProps {
  user: UserProfile;
  schoolInfo: SchoolInfo | null;
  showNotification: (msg: string, type: 'info' | 'success' | 'error') => void;
}

declare const QRCode: any; // Global from CDN

export const UserIDCard: React.FC<UserIDCardProps> = ({ user, schoolInfo, showNotification }) => {
    const photoInputRef = useRef<HTMLInputElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    // Generate Real QR Code
    useEffect(() => {
        if (typeof QRCode !== 'undefined' && canvasRef.current && user.uniqueId) {
            QRCode.toDataURL(user.uniqueId, { 
                width: 200,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, (err: any, url: string) => {
                if (!err) setQrDataUrl(url);
            });
        }
    }, [user.uniqueId]);
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 800000) { 
            showNotification("Photo too large. Max size is 800KB.", 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Image = event.target?.result as string;
            try {
                const docRef = doc(db, 'users', user.id);
                await updateDoc(docRef, { photoBase64: base64Image });
                showNotification('Photo uploaded successfully!', 'success');
            } catch (error) {
                console.error("Error uploading photo:", error);
                showNotification('Failed to upload photo.', 'error');
            }
        };
        reader.readAsDataURL(file);
    };

    // Helper to draw rounded rects compatible with all browsers
    const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };

    const downloadIDCard = useCallback(async () => {
        if (!cardRef.current) return;
        
        const width = 1011; // 3.37 inch * 300 DPI
        const height = 638; // 2.125 inch * 300 DPI
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Draw Background
        const grad = ctx.createLinearGradient(0, 0, width, height);
        if (user.role === 'student') {
            grad.addColorStop(0, '#1e40af'); // blue-800
            grad.addColorStop(1, '#3b82f6'); // blue-500
        } else if (user.role === 'teacher') {
            grad.addColorStop(0, '#065f46'); // emerald-800
            grad.addColorStop(1, '#10b981'); // emerald-500
        } else {
            grad.addColorStop(0, '#4c1d95'); // violet-800
            grad.addColorStop(1, '#8b5cf6'); // violet-500
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        
        // 2. Add Pattern Overlay (Simple geometric)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.arc(width, 0, 400, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, height, 300, 0, Math.PI * 2);
        ctx.fill();

        // Helper to load image
        const loadImage = (src: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => resolve(new Image()); // fallback
                img.src = src;
            });
        };

        // 3. Draw School Logo (If exists)
        if (schoolInfo?.logo) {
            try {
                const logoImg = await loadImage(schoolInfo.logo);
                // Draw logo in top right, semi-transparent or white container
                ctx.save();
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(width - 80, 80, 60, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
                
                // Draw image
                ctx.drawImage(logoImg, width - 120, 40, 80, 80);
                ctx.restore();
            } catch (e) { console.log('Logo draw failed', e); }
        }

        // 4. Header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(schoolInfo?.name || 'Sleek School Portal', 50, 60);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '24px Inter, sans-serif';
        ctx.fillText('OFFICIAL IDENTITY CARD', 50, 95);

        // 5. White Card Body
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        drawRoundedRect(ctx, 40, 130, width - 80, height - 170, 20);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 6. Draw Content
        try {
            // Photo
            const photoSrc = user.photoBase64 || "https://placehold.co/300x300/e2e8f0/64748b?text=Photo";
            const photoImg = await loadImage(photoSrc);
            
            // Draw Photo Container
            ctx.save();
            drawRoundedRect(ctx, 80, 170, 220, 220, 15);
            ctx.clip();
            ctx.drawImage(photoImg, 80, 170, 220, 220);
            ctx.restore();
            
            // Photo Border
            ctx.lineWidth = 4;
            ctx.strokeStyle = user.role === 'student' ? '#3b82f6' : user.role === 'teacher' ? '#10b981' : '#8b5cf6';
            drawRoundedRect(ctx, 80, 170, 220, 220, 15);
            ctx.stroke();

            // Text Details
            ctx.fillStyle = '#1f2937'; // gray-800
            ctx.font = 'bold 42px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(user.fullName, 340, 210);

            ctx.fillStyle = user.role === 'student' ? '#2563eb' : user.role === 'teacher' ? '#059669' : '#7c3aed';
            ctx.font = 'bold 28px Inter, sans-serif';
            ctx.fillText(user.role.toUpperCase(), 340, 250);

            // ID Field
            ctx.fillStyle = '#6b7280'; // gray-500
            ctx.font = '24px Inter, sans-serif';
            ctx.fillText('ID Number:', 340, 310);
            ctx.fillStyle = '#111827'; // gray-900
            ctx.font = 'bold 32px monospace';
            ctx.fillText(user.uniqueId, 340, 345);

            // Footer / Contact
            if (user.role === 'student' && user.parentPhone) {
                ctx.fillStyle = '#6b7280';
                ctx.font = '20px Inter, sans-serif';
                ctx.fillText('Emergency Contact:', 340, 385);
                ctx.fillStyle = '#374151';
                ctx.fillText(user.parentPhone, 540, 385);
            }

            // QR Code
            if (qrDataUrl) {
                const qrImg = await loadImage(qrDataUrl);
                ctx.drawImage(qrImg, width - 260, height - 260, 180, 180);
                
                ctx.font = '14px Inter, sans-serif';
                ctx.fillStyle = '#6b7280';
                ctx.textAlign = 'center';
                ctx.fillText('Scan to Verify', width - 170, height - 60);
            }

            // Export
            const link = document.createElement('a');
            link.download = `${user.fullName.replace(/\s/g, '_')}_ID_Card.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showNotification('ID Card downloaded successfully!', 'success');

        } catch (e) {
            console.error(e);
            showNotification('Error generating ID card image', 'error');
        }

    }, [user, schoolInfo, qrDataUrl, showNotification]);

    // UI Theme Config
    const theme = {
        student: { bg: 'bg-gradient-to-br from-blue-600 to-indigo-700', border: 'border-blue-200', text: 'text-blue-700', label: 'bg-blue-100' },
        teacher: { bg: 'bg-gradient-to-br from-emerald-600 to-teal-700', border: 'border-emerald-200', text: 'text-emerald-700', label: 'bg-emerald-100' },
        admin: { bg: 'bg-gradient-to-br from-violet-600 to-purple-700', border: 'border-purple-200', text: 'text-purple-700', label: 'bg-purple-100' },
        superadmin: { bg: 'bg-gray-800', border: 'border-gray-200', text: 'text-gray-700', label: 'bg-gray-100' }
    }[user.role] || { bg: 'bg-gray-600', border: '', text: '', label: '' };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">My Digital ID</h2>
                    <p className="text-gray-500">Official identification for school access and exams.</p>
                </div>
                <Button onClick={downloadIDCard} variant="primary">
                    <Download size={18} /> Download ID Card
                </Button>
            </div>
            
            {/* ID Card Display Area */}
            <div className="flex justify-center p-4 sm:p-8 bg-gray-100 rounded-2xl overflow-hidden shadow-inner">
                
                {/* The Card */}
                <div ref={cardRef} className={`relative w-full max-w-[500px] aspect-[1.586] rounded-2xl shadow-2xl overflow-hidden text-white ${theme.bg} transition-all duration-300 hover:scale-[1.02]`}>
                    
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                    
                    {/* Logo Overlay */}
                    {schoolInfo?.logo && (
                        <div className="absolute top-4 right-4 bg-white/20 p-2 rounded-full backdrop-blur-sm z-20">
                            <img src={schoolInfo.logo} className="w-10 h-10 object-contain" alt="Logo"/>
                        </div>
                    )}

                    {/* Card Content */}
                    <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                        {/* Header */}
                        <div className="flex justify-between items-start pr-12">
                            <div>
                                <h3 className="font-bold text-lg sm:text-xl opacity-95">{schoolInfo?.name || 'Sleek School Portal'}</h3>
                                <p className="text-[10px] sm:text-xs opacity-75 uppercase tracking-widest mt-1">Official Identity Card</p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex items-end gap-4 mt-4">
                            {/* Photo */}
                            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-xl p-1 shadow-lg shrink-0">
                                {user.photoBase64 ? (
                                    <img src={user.photoBase64} alt="Profile" className="w-full h-full object-cover rounded-lg bg-gray-200" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                        <User size={32} />
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 pb-1">
                                <h2 className="text-xl sm:text-2xl font-bold truncate leading-tight mb-1">{user.fullName}</h2>
                                <span className={`inline-block px-2 py-0.5 bg-white text-xs sm:text-sm font-bold uppercase rounded ${theme.text.replace('text-', 'text-')}`}>
                                    {user.role}
                                </span>
                                <div className="mt-2 sm:mt-3">
                                    <p className="text-[10px] sm:text-xs opacity-70 uppercase">ID Number</p>
                                    <p className="font-mono text-base sm:text-lg font-bold tracking-wide">{user.uniqueId}</p>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="hidden sm:block bg-white p-1 rounded-lg shrink-0">
                                {qrDataUrl ? (
                                    <img src={qrDataUrl} alt="QR" className="w-20 h-20" />
                                ) : (
                                    <div className="w-20 h-20 bg-gray-200 animate-pulse"></div>
                                )}
                            </div>
                        </div>

                        {/* Footer (Mobile Only QR fallback or extra info) */}
                        <div className="mt-auto pt-4 flex justify-between items-end sm:hidden">
                             <div className="text-[10px] opacity-80">
                                 {user.role === 'student' && user.parentPhone && <p>Emergency: {user.parentPhone}</p>}
                             </div>
                             <div className="bg-white p-1 rounded-lg shrink-0">
                                {qrDataUrl ? (
                                    <img src={qrDataUrl} alt="QR" className="w-12 h-12" />
                                ) : (
                                    <div className="w-12 h-12 bg-gray-200"></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Photo Upload Section */}
            <Card className="max-w-xl mx-auto">
                 <div className="flex items-center gap-4 mb-4">
                     <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                         <User size={24} />
                     </div>
                     <div>
                         <h3 className="font-bold text-gray-800">Update Profile Photo</h3>
                         <p className="text-sm text-gray-500">This photo will appear on your ID card and profile.</p>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-4">
                     <label className="flex-1 cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors">
                            <span className="text-sm font-medium text-gray-600 mb-2">Click to upload image</span>
                            <span className="text-xs text-gray-400">JPEG, PNG (Max 800KB)</span>
                            <input 
                                type="file" 
                                ref={photoInputRef} 
                                accept="image/png, image/jpeg" 
                                onChange={handlePhotoChange} 
                                className="hidden"
                            />
                        </div>
                     </label>
                 </div>
            </Card>

            {/* Canvas Ref for QR Generation (Hidden) */}
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
    );
};