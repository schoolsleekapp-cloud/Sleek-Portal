
// Use a generic interface for Timestamp to avoid hard dependency on firebase SDK in types
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

export interface UserProfile {
  id: string;
  uid: string;
  fullName: string;
  email: string | null;
  parentPhone: string | null;
  role: 'student' | 'teacher' | 'admin' | 'superadmin';
  schoolId: string;
  uniqueId: string;
  photoBase64?: string | null;
  createdAt: FirestoreTimestamp | any;
}

export interface SchoolInfo {
  name: string;
  schoolId: string;
  adminId: string;
  createdAt: FirestoreTimestamp | any;
  address?: string;
  phone?: string;
  website?: string;
  logo?: string;
  accessCode?: string;
}

export interface AccessCode {
  id: string;
  code: string;
  status: 'active' | 'used';
  generatedBy: string;
  createdAt: FirestoreTimestamp | any;
  usedBySchoolId?: string;
  usedBySchoolName?: string;
  usedAt?: FirestoreTimestamp | any;
}

export interface ResultToken {
  id: string;
  token: string; // The PIN
  serial: string; // Serial Number
  status: 'active' | 'used';
  batchId: string;
  generatedBy: string;
  createdAt: FirestoreTimestamp | any;
  usedBy?: string; // Student ID
  usedByName?: string;
  usedFor?: string; // Result ID
  usedForLabel?: string; // e.g. "JSS1 1st Term 2024"
  usedAt?: FirestoreTimestamp | any;
}

export interface Question {
  id: string;
  type: 'objective' | 'theory' | 'comprehension';
  text: string;
  image?: string; // Base64 or URL
  options?: string[]; // For objective
  correct?: string; // For objective
  maxScore?: number;
  // For comprehension
  passage?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  term?: string;
  session?: string;
  instructions: string; // General instructions
  durationMinutes: number;
  questions: Question[]; 
  
  // Section specific configs
  config?: {
    objective?: { instruction: string };
    theory?: { instruction: string };
    comprehension?: { instruction: string };
  };

  code: string;
  creatorId: string;
  creatorName: string;
  schoolId: string;
  
  // Approval Workflow
  status: 'pending' | 'approved' | 'review';
  adminFeedback?: string;
  
  createdAt: FirestoreTimestamp | any;
}

export interface ExamSubmission {
  id?: string;
  studentId: string;
  studentName: string;
  examId: string; // Link to original exam
  examTitle: string;
  answers: Record<string, string>; // Store student answers { questionId: answer }
  score: number; // Objective Score
  theoryScore?: number; // Manual score for theory
  total: number; // Total obtainable score for objective
  schoolId: string;
  timestamp: FirestoreTimestamp | any;
}

export interface Result {
  id?: string;
  studentId: string;
  studentName: string;
  schoolId: string;
  term: string;
  session: string;
  className: string;
  position?: string; // Changed from totalStudents context
  totalStudents?: string;
  colorTheme?: string;
  subjects: any[];
  domains: Record<string, string>; // Affective & Psychomotor
  cognitive: Record<string, string>; // New Cognitive Domain
  attendance?: {
    present: number;
    total: number;
  };
  remarks: { teacher: string; principal: string };
  cumulativeScore: number;
  gpa: string;
  creatorId?: string; // To track which teacher generated it
  createdAt: FirestoreTimestamp | any;
}

export interface LessonNote {
  id?: string;
  topic: string;
  subject: string;
  classLevel: string;
  content: string; // HTML Content
  accessCode: string;
  creatorId: string;
  creatorName: string;
  schoolId: string;
  createdAt: FirestoreTimestamp | any;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  studentName?: string;
  schoolId: string;
  type: 'in' | 'out';
  timestamp: FirestoreTimestamp | any;
  recordedBy: string;
  recordedByName?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianPhoto?: string;
}

export interface NotificationState {
  message: string;
  type: 'info' | 'success' | 'error';
}
