import { Appointment, WaitingInfo } from '@/types/appointment';

export const appointments: Appointment[] = [
  {
    id: 'apt_001',
    orderNo: 'ENDO20260610001',
    departmentId: 'gastro_002',
    departmentName: '无痛胃镜检查',
    category: 'gastro',
    examinationType: 'painless',
    date: '2026-06-10',
    timeSlot: '08:30-09:00',
    patientInfo: {
      name: '张三',
      gender: 'male',
      age: 45,
      phone: '138****5678',
      idCard: '320***********1234'
    },
    companionInfo: {
      name: '张妻',
      phone: '139****9876',
      relation: '配偶'
    },
    fastingConfirmed: true,
    status: 'waiting',
    queueNumber: 12,
    currentNumber: 7,
    createdAt: '2026-06-08 14:30:00',
    price: 780
  },
  {
    id: 'apt_002',
    orderNo: 'ENDO20260515003',
    departmentId: 'colon_002',
    departmentName: '无痛肠镜检查',
    category: 'colon',
    examinationType: 'painless',
    date: '2026-05-15',
    timeSlot: '14:00-14:30',
    patientInfo: {
      name: '张三',
      gender: 'male',
      age: 45,
      phone: '138****5678',
      idCard: '320***********1234'
    },
    fastingConfirmed: true,
    status: 'completed',
    createdAt: '2026-05-10 10:20:00',
    price: 880,
    rating: 5,
    comment: '医生非常专业，全程无痛，体验很好！'
  },
  {
    id: 'apt_003',
    orderNo: 'ENDO20260420008',
    departmentId: 'gastro_001',
    departmentName: '普通胃镜检查',
    category: 'gastro',
    examinationType: 'normal',
    date: '2026-04-20',
    timeSlot: '09:00-09:30',
    patientInfo: {
      name: '张三',
      gender: 'male',
      age: 45,
      phone: '138****5678',
      idCard: '320***********1234'
    },
    fastingConfirmed: true,
    status: 'completed',
    createdAt: '2026-04-15 16:45:00',
    price: 320,
    rating: 4
  },
  {
    id: 'apt_004',
    orderNo: 'ENDO20260615012',
    departmentId: 'colon_003',
    departmentName: '肠镜+息肉摘除',
    category: 'colon',
    examinationType: 'painless',
    date: '2026-06-15',
    timeSlot: '10:00-10:30',
    patientInfo: {
      name: '张三',
      gender: 'male',
      age: 45,
      phone: '138****5678',
      idCard: '320***********1234'
    },
    fastingConfirmed: false,
    status: 'confirmed',
    createdAt: '2026-06-07 09:15:00',
    price: 1680
  }
];

export const currentWaitingInfo: WaitingInfo = {
  appointmentId: 'apt_001',
  departmentName: '无痛胃镜检查',
  queueNumber: 12,
  currentNumber: 7,
  aheadCount: 5,
  estimatedTime: '约40分钟',
  roomNo: '内镜室-3',
  status: 'waiting',
  qrCode: 'ENDO20260610001|12'
};
