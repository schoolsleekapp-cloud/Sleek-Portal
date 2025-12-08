import React, { useState } from 'react';
import { X, Upload, Building2, Phone, Globe, Lock, School, GraduationCap, BookOpen, ShieldCheck, ArrowLeft, ScanLine } from 'lucide-react';
import { collection, doc, setDoc, getDoc, getDocs, query, where, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { QRScanner } from './QRScanner'; // Import Scanner

interface AuthPageProps {
  mode: string;
  role: string;
  setMode: (mode: string) => void;
  onBack: () => void;
  onSuccess: (profile: UserProfile) => void;
  showNotification: (msg: string, type: 'info' | 'success' | 'error') => void;
  isAuthReady: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, role, setMode, onBack, onSuccess, showNotification, isAuthReady }) => {
  const [formData, setFormData] = useState({
    loginId: '', 
    password: '',
    fullName: '',
    schoolName: '', 
    schoolId: '', 
    parentPhone: '', 
    qrCodeData: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolWebsite: '',
    accessCode: '',
    schoolLogo: ''
  });
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false); // State for scanner visibility
  
  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetInput, setResetInput] = useState('');

  // Helper for Theme Colors & Icons based on Role
  const getRoleTheme = (r: string) => {
      switch(r) {
          case 'student': 
            return { 
                gradient: 'from-blue-600 to-indigo-700', 
                bgLight: 'bg-blue-50', 
                text: 'text-blue-700', 
                icon: GraduationCap, 
                label: 'Student Portal',
                button: 'bg-blue-600 hover:bg-blue-700'
            };
          case 'teacher': 
            return { 
                gradient: 'from-emerald-600 to-teal-700', 
                bgLight: 'bg-emerald-50', 
                text: 'text-emerald-700', 
                icon: BookOpen, 
                label: 'Teacher Access',
                button: 'bg-emerald-600 hover:bg-emerald-700'
            };
          case 'admin': 
            return { 
                gradient: 'from-purple-600 to-violet-700', 
                bgLight: 'bg-purple-50', 
                text: 'text-purple-700', 
                icon: Building2, 
                label: 'School Administrator',
                button: 'bg-purple-600 hover:bg-purple-700'
            };
          case 'superadmin': 
            return { 
                gradient: 'from-slate-700 to-slate-900', 
                bgLight: 'bg-slate-50', 
                text: 'text-slate-700', 
                icon: ShieldCheck, 
                label: 'System Control',
                button: 'bg-slate-800 hover:bg-slate-900'
            };
          default: 
            return { 
                gradient: 'from-indigo-600 to-purple-600', 
                bgLight: 'bg-indigo-50', 
                text: 'text-indigo-700', 
                icon: School, 
                label: 'School Portal',
                button: 'bg-indigo-600 hover:bg-indigo-700'
            };
      }
  };

  const theme = getRoleTheme(role);

  const getIdLabel = (r: string, m: string) => {
    if (m === 'signup') {
        if (r === 'admin') return "School Administrator's Name";
        return 'Full Name';
    } 
    switch (r) {
      case 'student': return 'Student ID';
      case 'teacher': return 'Teacher ID or Email';
      case 'admin': return 'Admin ID or Email';
      case 'superadmin': return 'Email Address';
      default: return 'Login ID';
    }
  };

  const getEmailLabel = (r: string) => {
      return r === 'admin' ? 'School Email Address' : 'Email Address';
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 500000) {
            showNotification("Logo too large. Max 500KB", "error");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, schoolLogo: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleScanSuccess = async (scannedData: string) => {
      setShowScanner(false);
      setFormData(prev => ({ ...prev, loginId: scannedData }));
      
      // Auto-submit login with scanned data
      setLoading(true);
      try {
          const usersRef = collection(db, 'users');
          // Query directly for the ID
          let q = query(usersRef, where('uniqueId', '==', scannedData), where('role', '==', role));
          let querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
              throw new Error(`Invalid QR Code for ${role}. ID not found.`);
          }

          const userDoc = querySnapshot.docs[0];
          const profile = { id: userDoc.id, ...userDoc.data() } as UserProfile;
          
          showNotification('QR Login Successful', 'success');
          onSuccess(profile);
      } catch (error: any) {
          showNotification(error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetInput) {
        showNotification("Please enter your ID or Email", "error");
        return;
    }
    setLoading(true);
    try {
        let emailToSend = resetInput.trim();
        
        // Check if input looks like an email
        const isEmail = emailToSend.includes('@');
        
        if (isEmail) {
            // Lowercase email for consistency with Auth
            emailToSend = emailToSend.toLowerCase();
        } else {
             // If it's not an email, try to resolve ID to email from Firestore
             const usersRef = collection(db, 'users');
             const q = query(usersRef, where('uniqueId', '==', emailToSend.toUpperCase()), where('role', '==', role));
             const snap = await getDocs(q);
             
             if (snap.empty) {
                 throw new Error(`No ${role} account found with ID: ${emailToSend.toUpperCase()}`);
             }
             const userData = snap.docs[0].data();
             if (!userData.email || userData.email.endsWith('@temp-parent.com')) {
                 // Handle students who might not have a real email (simulated email for parents)
                 if (role === 'student') {
                    throw new Error("Student accounts use Parent Phone numbers and do not have emails. Please contact your School Admin to reset your password.");
                 }
                 throw new Error("This account does not have a linked email address. Please contact Admin.");
             }
             emailToSend = userData.email;
        }

        // Include ActionCodeSettings to ensure proper redirection
        const actionCodeSettings = {
            url: window.location.origin, // Redirects back to the app home page
            handleCodeInApp: false
        };

        await sendPasswordResetEmail(auth, emailToSend, actionCodeSettings);
        showNotification(`Password reset link sent to ${emailToSend}. Please check your inbox and spam folder.`, "success");
        setShowForgotPassword(false);
        setResetInput('');
    } catch (err: any) {
        console.error(err);
        if (err.code === 'auth/user-not-found') {
            showNotification("No registered user found with this email.", "error");
        } else {
            showNotification(err.message, "error");
        }
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isAuthReady) {
        showNotification("Portal is still initializing. Please wait.", 'error');
        setLoading(false);
        return;
    }

    try {
        if (mode === 'signup') {
            let uid = auth.currentUser?.uid || "user-" + Date.now().toString(36);
            let finalSchoolId = formData.schoolId.trim();
            let generatedUniqueId = "";
            let codeDocRef = null;

            if (role === 'admin') {
                const codesRef = collection(db, 'access_codes');
                const q = query(codesRef, where('code', '==', formData.accessCode.trim()));
                const querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                    throw new Error("Invalid Access Code. Please check and try again.");
                }
                const codeDoc = querySnapshot.docs[0];
                if (codeDoc.data().status === 'used') {
                    throw new Error("This Access Code has already been used.");
                }
                codeDocRef = doc(db, 'access_codes', codeDoc.id);
            }

            if (role === 'superadmin') {
                const userCredential = await createUserWithEmailAndPassword(auth, formData.loginId.trim(), formData.password);
                uid = userCredential.user.uid;
            } else {
                uid = auth.currentUser?.uid || uid;
            }

            if (role === 'admin') {
                finalSchoolId = "SCH-" + Math.random().toString(36).substr(2, 6).toUpperCase();
                generatedUniqueId = "ADM-" + Math.random().toString(36).substr(2, 5).toUpperCase();
                
                await setDoc(doc(db, 'schools', finalSchoolId), {
                    name: formData.schoolName,
                    schoolId: finalSchoolId,
                    adminId: generatedUniqueId,
                    createdAt: serverTimestamp(),
                    address: formData.schoolAddress,
                    phone: formData.schoolPhone,
                    website: formData.schoolWebsite,
                    logo: formData.schoolLogo,
                    accessCode: formData.accessCode
                });

                if (codeDocRef) {
                    await updateDoc(codeDocRef, {
                        status: 'used',
                        usedBySchoolId: finalSchoolId,
                        usedBySchoolName: formData.schoolName,
                        usedAt: serverTimestamp()
                    });
                }

            } else if (role === 'teacher') {
                generatedUniqueId = "TCH-" + Math.random().toString(36).substr(2, 5).toUpperCase();
                const schoolSnap = await getDoc(doc(db, 'schools', finalSchoolId));
                if (!schoolSnap.exists()) throw new Error("Invalid School ID.");
            } else if (role === 'student') {
                generatedUniqueId = "STU-" + Math.random().toString(36).substr(2, 5).toUpperCase();
                const schoolSnap = await getDoc(doc(db, 'schools', finalSchoolId));
                if (!schoolSnap.exists()) throw new Error("Invalid School ID.");
            } else {
                generatedUniqueId = 'GLOBAL_SA_ID';
                finalSchoolId = 'GLOBAL';
            }

            const newProfileData: Omit<UserProfile, 'id'> = {
                uid: uid,
                fullName: formData.fullName,
                // Normalize email to lowercase
                email: role === 'student' ? `${formData.parentPhone}@temp-parent.com` : formData.loginId.trim().toLowerCase(),
                parentPhone: role === 'student' ? formData.parentPhone : null,
                role: role as any,
                schoolId: finalSchoolId,
                uniqueId: generatedUniqueId,
                photoBase64: null,
                createdAt: serverTimestamp() as any,
            };

            const docRef = await addDoc(collection(db, 'users'), newProfileData);
            const finalProfile = { id: docRef.id, ...newProfileData } as UserProfile;
            
            showNotification(`Welcome! Your ID is: ${generatedUniqueId}`, 'success');
            onSuccess(finalProfile); 
            
        } else {
            if (role === 'superadmin') {
                const userCredential = await signInWithEmailAndPassword(auth, formData.loginId.trim(), formData.password);
                const profile: UserProfile = {
                    id: 'super-admin-session',
                    uid: userCredential.user.uid,
                    fullName: 'Super Administrator',
                    email: userCredential.user.email,
                    role: 'superadmin',
                    schoolId: 'GLOBAL',
                    uniqueId: 'GLOBAL_SA_ID',
                    parentPhone: null,
                    createdAt: serverTimestamp() as any
                };
                showNotification('Super Admin Authenticated Successfully', 'success');
                onSuccess(profile);
                setLoading(false);
                return;
            }

            const idToSearch = formData.loginId.trim(); 
            if (!idToSearch) throw new Error("Please enter your ID or scan the QR code.");

            const usersRef = collection(db, 'users');
            // Check for ID match (uppercase)
            let q = query(usersRef, where('uniqueId', '==', idToSearch.toUpperCase()), where('role', '==', role));
            let querySnapshot = await getDocs(q);

            // If ID match fails, check for email match (lowercase)
            if (querySnapshot.empty && role !== 'student') {
                const qEmail = query(usersRef, where('email', '==', idToSearch.toLowerCase()), where('role', '==', role));
                querySnapshot = await getDocs(qEmail);
            }

            if (querySnapshot.empty) {
                throw new Error(`${getIdLabel(role, mode)} or Role not found.`);
            }

            const userDoc = querySnapshot.docs[0];
            const profile = { id: userDoc.id, ...userDoc.data() } as UserProfile;
            
            showNotification('Login Successful', 'success');
            onSuccess(profile);
        }
        
    } catch (error: any) {
        showNotification(error.message || "Authentication failed", 'error');
        console.error("[CONSOLE_ERROR] Auth Error:", error);
    } finally {
        setLoading(false);
    }
  };

  const loginInputLabel = getIdLabel(role, mode);
  const idPlaceholder = role === 'student' ? 'STU-XXXXX' : role === 'teacher' ? 'TCH-XXXXX or Email' : 'ADM-XXXXX or Email';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      {showScanner && (
          <QRScanner onScan={handleScanSuccess} onClose={() => setShowScanner(false)} />
      )}
      
      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md relative shadow-2xl animate-in fade-in zoom-in duration-200">
                <button 
                    onClick={() => setShowForgotPassword(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={24} />
                </button>
                
                <div className="text-center mb-6">
                    <div className={`w-12 h-12 rounded-full ${theme.bgLight} flex items-center justify-center mx-auto mb-4`}>
                        <Lock className={`w-6 h-6 ${theme.text}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Reset Password</h3>
                    <p className="text-sm text-gray-500 mt-2">Enter your {role === 'student' ? 'Student ID' : role === 'teacher' ? 'Teacher ID' : 'ID'} or Email address. We'll send you a link to reset your password.</p>
                </div>

                <form onSubmit={handleForgotPassword}>
                    <Input 
                        label="ID or Email Address"
                        value={resetInput}
                        onChange={(e) => setResetInput(e.target.value)}
                        placeholder={role === 'student' ? 'STU-XXXX or email@example.com' : 'ID or email@example.com'}
                        required
                        className="mb-6"
                    />
                    <Button type="submit" className={`w-full ${theme.button}`} disabled={loading}>
                        {loading ? 'Sending Link...' : 'Send Reset Link'}
                    </Button>
                </form>
            </div>
        </div>
      )}

      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Visual Panel */}
        <div className={`hidden md:flex md:w-1/2 bg-gradient-to-br ${theme.gradient} p-12 flex-col justify-between text-white relative overflow-hidden`}>
            <div className="relative z-10">
                <button onClick={onBack} className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity mb-8">
                    <ArrowLeft size={20} />
                    <span className="font-medium">Back to Home</span>
                </button>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <theme.icon className="w-6 h-6" />
                    </div>
                    <span className="font-bold tracking-wide text-lg">SleekPortal</span>
                </div>
                <h1 className="text-4xl font-extrabold mb-6 leading-tight">
                    Welcome to your <br/> Digital Campus
                </h1>
                <p className="text-lg opacity-90 max-w-sm leading-relaxed">
                    A unified platform for exams, results, and school management. Sign in to access your customized dashboard.
                </p>
            </div>
            
            <div className="relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-lg mt-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <theme.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-xl">{theme.label}</p>
                        <p className="text-sm opacity-80">Secure Access Portal</p>
                    </div>
                </div>
            </div>

            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-black/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 bg-white relative overflow-y-auto max-h-[90vh] md:max-h-auto flex flex-col justify-center">
             <button onClick={onBack} className="md:hidden absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2">
                  <X size={24} />
             </button>

             <div className="max-w-md mx-auto w-full">
                  <div className="mb-8">
                       <h2 className={`text-3xl font-bold text-gray-900 mb-2`}>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
                       <p className="text-gray-500">
                          {mode === 'login' 
                              ? `Please enter your credentials to access the ${role} portal.` 
                              : `Fill in the details below to register as a new ${role}.`
                          }
                       </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                      {mode === 'signup' && (
                          <>
                              <Input 
                                  label={getIdLabel(role, mode)}
                                  value={formData.fullName} 
                                  onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                                  placeholder="Full Name"
                                  className="py-3"
                                  required 
                              />
                              
                              {role === 'student' ? (
                                   <Input 
                                      label="Parent Phone Number" 
                                      type="tel"
                                      value={formData.parentPhone} 
                                      onChange={(e) => setFormData({...formData, parentPhone: e.target.value})} 
                                      placeholder="e.g. +1234567890"
                                      className="py-3"
                                      required 
                                  />
                              ) : (
                                  <Input 
                                      label={getEmailLabel(role)}
                                      type="email"
                                      value={formData.loginId} 
                                      onChange={(e) => setFormData({...formData, loginId: e.target.value})} 
                                      placeholder="name@school.com"
                                      className="py-3"
                                      required 
                                  />
                              )}

                              {role === 'admin' && (
                                  <div className="space-y-4 pt-4 border-t border-gray-100">
                                       <div className={`p-3 rounded-lg text-sm font-medium ${theme.bgLight} ${theme.text}`}>School Information</div>
                                       
                                       <Input 
                                          label="School Name" 
                                          value={formData.schoolName} 
                                          onChange={(e) => setFormData({...formData, schoolName: e.target.value})} 
                                          placeholder="e.g. Springfield High School"
                                          className="py-3"
                                          required 
                                      />

                                       <div className="grid grid-cols-1 gap-4">
                                          <Input 
                                              label="Contact Phone" 
                                              type="tel"
                                              value={formData.schoolPhone} 
                                              onChange={(e) => setFormData({...formData, schoolPhone: e.target.value})} 
                                              placeholder="School Office Phone"
                                              className="py-3"
                                              required 
                                          />
                                          <Input 
                                              label="Access Code" 
                                              value={formData.accessCode} 
                                              onChange={(e) => setFormData({...formData, accessCode: e.target.value})} 
                                              placeholder="Provided by Super Admin"
                                              className="py-3"
                                              required 
                                          />
                                       </div>
                                       
                                       <Input 
                                          label="School Address" 
                                          value={formData.schoolAddress} 
                                          onChange={(e) => setFormData({...formData, schoolAddress: e.target.value})} 
                                          placeholder="Full Street Address"
                                          className="py-3"
                                          required 
                                      />
                                  </div>
                              )}
                          </>
                      )}
                      
                      {mode === 'login' && (
                          <div className="space-y-1">
                              <Input 
                                  label={loginInputLabel} 
                                  type={role === 'superadmin' ? "email" : "text"} 
                                  value={formData.loginId} 
                                  onChange={(e) => setFormData({...formData, loginId: e.target.value})} 
                                  placeholder={role === 'superadmin' ? "admin@example.com" : `${idPlaceholder}`}
                                  className="py-3"
                                  required 
                              />
                          </div>
                      )}

                      <div className="space-y-1">
                          <Input 
                              label="Password" 
                              type="password" 
                              value={formData.password} 
                              onChange={(e) => setFormData({...formData, password: e.target.value})} 
                              placeholder="••••••••"
                              className="py-3"
                              required 
                          />
                          {mode === 'login' && (
                              <div className="text-right">
                                  <button 
                                    type="button" 
                                    onClick={() => setShowForgotPassword(true)}
                                    className={`text-sm font-medium hover:underline ${theme.text}`}
                                  >
                                      Forgot Password?
                                  </button>
                              </div>
                          )}
                      </div>

                      {mode === 'signup' && role !== 'admin' && role !== 'superadmin' && (
                          <Input 
                              label="School ID" 
                              value={formData.schoolId} 
                              onChange={(e) => setFormData({...formData, schoolId: e.target.value})} 
                              placeholder="SCH-XXXXXX"
                              className="py-3"
                              required 
                          />
                      )}

                      <Button type="submit" variant="primary" className={`w-full py-3.5 text-base font-bold shadow-lg shadow-indigo-100 ${theme.button}`} disabled={loading || !isAuthReady}>
                          {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
                      </Button>
                      
                      {!isAuthReady && <p className="text-center text-xs text-red-500 bg-red-50 py-2 rounded">System initializing, please wait...</p>}
                  </form>

                  <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
                      {mode === 'login' && role !== 'superadmin' && (
                          <Button 
                              variant="ghost" 
                              className="w-full border border-gray-200 py-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors group" 
                              onClick={() => setShowScanner(true)}
                          >
                             <div className="p-1.5 bg-gray-100 rounded-md group-hover:bg-gray-200 transition-colors">
                                <ScanLine size={20} className="text-gray-600"/>
                             </div>
                             <span className="font-medium text-gray-600">Scan Login Card</span>
                          </Button>
                      )}

                      <div className="text-center">
                          <p className="text-sm text-gray-600">
                              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                              <button 
                                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} 
                                  className={`font-bold hover:underline ${theme.text}`}
                              >
                                  {mode === 'login' ? 'Sign Up' : 'Log In'}
                              </button>
                          </p>
                      </div>
                  </div>
             </div>
        </div>
      </div>
    </div>
  );
};