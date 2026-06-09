export interface Department {
  id: string;
  name: string;
  category: 'gastro' | 'colon';
  type: 'gastroscopy' | 'colonoscopy' | 'both';
  description: string;
  price: number;
  duration: number;
  tags: string[];
  preparation: string;
}

export interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  period: 'morning' | 'afternoon';
  available: number;
  total: number;
}

export interface CalendarDay {
  date: string;
  weekday: string;
  available: boolean;
  slotsAvailable: number;
  isToday: boolean;
}

export interface PatientInfo {
  name: string;
  gender: 'male' | 'female';
  age: number;
  phone: string;
  idCard: string;
  medicalRecordNo?: string;
}

export interface CompanionInfo {
  name: string;
  phone: string;
  relation: string;
}

export interface Appointment {
  id: string;
  orderNo: string;
  departmentId: string;
  departmentName: string;
  category: 'gastro' | 'colon';
  examinationType: 'normal' | 'painless';
  date: string;
  timeSlot: string;
  patientInfo: PatientInfo;
  companionInfo?: CompanionInfo;
  previousReports?: UploadedReport[];
  fastingConfirmed: boolean;
  status: 'pending' | 'confirmed' | 'waiting' | 'calling' | 'completed' | 'cancelled' | 'missed';
  queueNumber?: number;
  currentNumber?: number;
  createdAt: string;
  price: number;
  rating?: number;
  comment?: string;
}

export interface WaitingInfo {
  appointmentId: string;
  departmentName: string;
  queueNumber: number;
  currentNumber: number;
  aheadCount: number;
  estimatedTime: string;
  roomNo: string;
  status: 'waiting' | 'calling' | 'entering' | 'missed';
  callingTime?: string;
  qrCode: string;
}

export interface MessageItem {
  id: string;
  type: 'system' | 'appointment' | 'report' | 'calling';
  title: string;
  content: string;
  time: string;
  read: boolean;
  appointmentId?: string;
}

export interface UploadedReport {
  id: string;
  name: string;
  path: string;
  size: string;
  type: 'image' | 'pdf' | 'file';
  preview?: string;
}

export interface PreparationStep {
  id: string;
  title: string;
  description: string;
  timeRange: string;
  keyPoints: string[];
  warning?: string;
}
