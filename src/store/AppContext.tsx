import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Appointment, MessageItem, Department, UploadedReport } from '@/types/appointment';
import { appointments as defaultAppointments, currentWaitingInfo } from '@/data/appointments';
import { messages as defaultMessages } from '@/data/messages';
import { departments } from '@/data/departments';

interface AppState {
  appointments: Appointment[];
  messages: MessageItem[];
  selectedDepartment: Department | null;
  selectedDate: string;
  selectedSlot: string;
  uploadedReports: UploadedReport[];
  currentWaitingAppointmentId: string | null;
  reschedulingAppointmentId: string | null;
  patientInfo: {
    name: string;
    gender: 'male' | 'female';
    age: string;
    phone: string;
    idCard: string;
  };
  companionInfo: {
    name: string;
    phone: string;
    relation: string;
  };
}

type AppAction =
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: { id: string; changes: Partial<Appointment> } }
  | { type: 'CANCEL_APPOINTMENT'; payload: string }
  | { type: 'RESCHEDULE_APPOINTMENT'; payload: { id: string; date: string; slot: string } }
  | { type: 'START_RESCHEDULE'; payload: string }
  | { type: 'CLEAR_RESCHEDULE' }
  | { type: 'ADD_MESSAGE'; payload: MessageItem }
  | { type: 'MARK_MESSAGE_READ'; payload: string }
  | { type: 'MARK_ALL_MESSAGES_READ' }
  | { type: 'SET_SELECTED_DEPARTMENT'; payload: Department | null }
  | { type: 'SET_SELECTED_DATE'; payload: string }
  | { type: 'SET_SELECTED_SLOT'; payload: string }
  | { type: 'ADD_REPORT'; payload: UploadedReport }
  | { type: 'REMOVE_REPORT'; payload: string }
  | { type: 'CLEAR_REPORTS' }
  | { type: 'SET_PATIENT_INFO'; payload: Partial<AppState['patientInfo']> }
  | { type: 'SET_COMPANION_INFO'; payload: Partial<AppState['companionInfo']> }
  | { type: 'RATE_APPOINTMENT'; payload: { id: string; rating: number; comment: string } }
  | { type: 'HYDRATE'; payload: Partial<AppState> };

const STORAGE_KEY = 'endo_app_state_v1';

const defaultPatientInfo = {
  name: '张三',
  gender: 'male' as const,
  age: '45',
  phone: '138****5678',
  idCard: '320***********1234'
};

const defaultCompanionInfo = {
  name: '张妻',
  phone: '139****9876',
  relation: '配偶'
};

const initialState: AppState = {
  appointments: defaultAppointments,
  messages: defaultMessages,
  selectedDepartment: departments[3],
  selectedDate: '',
  selectedSlot: '',
  uploadedReports: [],
  currentWaitingAppointmentId: currentWaitingInfo.appointmentId,
  reschedulingAppointmentId: null,
  patientInfo: defaultPatientInfo,
  companionInfo: defaultCompanionInfo
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload };

    case 'ADD_APPOINTMENT': {
      const newAppointments = [action.payload, ...state.appointments];
      const newMessage: MessageItem = {
        id: `msg_auto_${Date.now()}`,
        type: 'appointment',
        title: '预约成功',
        content: `您已成功预约${action.payload.departmentName}，时间：${action.payload.date} ${action.payload.timeSlot}，请提前做好检查前准备。`,
        time: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
        read: false,
        appointmentId: action.payload.id
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({
        ...state,
        appointments: newAppointments,
        messages: [newMessage, ...state.messages],
        uploadedReports: []
      }));
      return {
        ...state,
        appointments: newAppointments,
        messages: [newMessage, ...state.messages],
        uploadedReports: []
      };
    }

    case 'UPDATE_APPOINTMENT': {
      const appointments = state.appointments.map(a =>
        a.id === action.payload.id ? { ...a, ...action.payload.changes } : a
      );
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ ...state, appointments }));
      return { ...state, appointments };
    }

    case 'CANCEL_APPOINTMENT': {
      const target = state.appointments.find(a => a.id === action.payload);
      const appointments = state.appointments.map(a =>
        a.id === action.payload ? { ...a, status: 'cancelled' as const } : a
      );
      const newMessages = [...state.messages];
      if (target) {
        newMessages.unshift({
          id: `msg_cancel_${Date.now()}`,
          type: 'system',
          title: '预约已取消',
          content: `您已取消${target.departmentName}（${target.date} ${target.timeSlot}）的预约，号源已释放。`,
          time: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
          read: false,
          appointmentId: action.payload
        });
      }
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ ...state, appointments, messages: newMessages }));
      return { ...state, appointments, messages: newMessages };
    }

    case 'START_RESCHEDULE':
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ ...state, reschedulingAppointmentId: action.payload }));
      return { ...state, reschedulingAppointmentId: action.payload };

    case 'CLEAR_RESCHEDULE':
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ ...state, reschedulingAppointmentId: null }));
      return { ...state, reschedulingAppointmentId: null };

    case 'RESCHEDULE_APPOINTMENT': {
      const target = state.appointments.find(a => a.id === action.payload.id);
      const appointments = state.appointments.map(a =>
        a.id === action.payload.id
          ? { ...a, date: action.payload.date, timeSlot: action.payload.slot, status: 'confirmed' as const }
          : a
      );
      const newMessages = [...state.messages];
      if (target) {
        newMessages.unshift({
          id: `msg_resched_${Date.now()}`,
          type: 'appointment',
          title: '改期成功',
          content: `您的${target.departmentName}已改期至：${action.payload.date} ${action.payload.slot}，请按新时间做好准备。`,
          time: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
          read: false,
          appointmentId: action.payload.id
        });
      }
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ ...state, appointments, messages: newMessages, reschedulingAppointmentId: null }));
      return { ...state, appointments, messages: newMessages, reschedulingAppointmentId: null };
    }

    case 'ADD_MESSAGE':
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ ...state, messages: [action.payload, ...state.messages] }));
      return { ...state, messages: [action.payload, ...state.messages] };

    case 'MARK_MESSAGE_READ': {
      const messages = state.messages.map(m => m.id === action.payload ? { ...m, read: true } : m);
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ ...state, messages }));
      return { ...state, messages };
    }

    case 'MARK_ALL_MESSAGES_READ': {
      const messages = state.messages.map(m => ({ ...m, read: true }));
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ ...state, messages }));
      return { ...state, messages };
    }

    case 'SET_SELECTED_DEPARTMENT':
      return { ...state, selectedDepartment: action.payload };

    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };

    case 'SET_SELECTED_SLOT':
      return { ...state, selectedSlot: action.payload };

    case 'ADD_REPORT':
      return { ...state, uploadedReports: [...state.uploadedReports, action.payload] };

    case 'REMOVE_REPORT':
      return { ...state, uploadedReports: state.uploadedReports.filter(r => r.id !== action.payload) };

    case 'CLEAR_REPORTS':
      return { ...state, uploadedReports: [] };

    case 'SET_PATIENT_INFO':
      return { ...state, patientInfo: { ...state.patientInfo, ...action.payload } };

    case 'SET_COMPANION_INFO':
      return { ...state, companionInfo: { ...state.companionInfo, ...action.payload } };

    case 'RATE_APPOINTMENT': {
      const appointments = state.appointments.map(a =>
        a.id === action.payload.id
          ? { ...a, rating: action.payload.rating, comment: action.payload.comment }
          : a
      );
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ ...state, appointments }));
      return { ...state, appointments };
    }

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  createAppointment: (data: {
    departmentId: string;
    departmentName: string;
    category: 'gastro' | 'colon';
    examinationType: 'normal' | 'painless';
    date: string;
    slot: string;
    price: number;
    duration: number;
    reports?: UploadedReport[];
    companion?: { name: string; phone: string; relation: string } | null;
    fastingConfirmed: boolean;
  }) => Appointment;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    try {
      const saved = Taro.getStorageSync(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.appointments && Array.isArray(parsed.appointments)) {
          dispatch({ type: 'HYDRATE', payload: parsed });
          console.log('[AppContext] State hydrated from storage');
        }
      }
    } catch (e) {
      console.error('[AppContext] Hydrate error:', e);
    }
  }, []);

  const createAppointment = useCallback((data: AppContextType['createAppointment'] extends (d: infer D) => infer R ? D : never): Appointment => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const seq = String(state.appointments.length + 1).padStart(3, '0');
    const newAppt: Appointment = {
      id: `apt_${Date.now()}`,
      orderNo: `ENDO${dateStr}${seq}`,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      category: data.category,
      examinationType: data.examinationType,
      date: data.date,
      timeSlot: data.slot,
      patientInfo: {
        name: state.patientInfo.name,
        gender: state.patientInfo.gender,
        age: parseInt(state.patientInfo.age) || 0,
        phone: state.patientInfo.phone,
        idCard: state.patientInfo.idCard
      },
      companionInfo: data.companion || undefined,
      previousReports: data.reports,
      fastingConfirmed: data.fastingConfirmed,
      status: 'confirmed',
      createdAt: now.toLocaleString('zh-CN').replace(/\//g, '-'),
      price: data.price,
      queueNumber: undefined,
      currentNumber: undefined
    };
    dispatch({ type: 'ADD_APPOINTMENT', payload: newAppt });
    console.log('[AppContext] New appointment created:', newAppt.orderNo);
    return newAppt;
  }, [state.appointments.length, state.patientInfo]);

  return (
    <AppContext.Provider value={{ state, dispatch, createAppointment }}>
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
