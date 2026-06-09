export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日 ${weekday}`;
};

export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

export const generateCalendarDays = (): { date: string; weekday: string; available: boolean; slotsAvailable: number; isToday: boolean }[] => {
  const days: { date: string; weekday: string; available: boolean; slotsAvailable: number; isToday: boolean }[] = [];
  const today = new Date('2026-06-09');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const availablePattern = [true, true, true, true, true, false, true, true, true, true, true, true, false, true, true];

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = formatDate(d);
    const isToday = i === 0;
    days.push({
      date: dateStr,
      weekday: weekdays[d.getDay()],
      available: availablePattern[i],
      slotsAvailable: availablePattern[i] ? Math.floor(Math.random() * 10) + 2 : 0,
      isToday
    });
  }
  return days;
};

export const generateTimeSlots = (dateStr: string): { id: string; date: string; startTime: string; endTime: string; period: 'morning' | 'afternoon'; available: number; total: number }[] => {
  const slots: { id: string; date: string; startTime: string; endTime: string; period: 'morning' | 'afternoon'; available: number; total: number }[] = [];
  const morningTimes = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'];
  const afternoonTimes = ['13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
  const dayOfWeek = new Date(dateStr).getDay();
  const isAvailable = dayOfWeek !== 0;

  if (!isAvailable) return slots;

  morningTimes.forEach((time, idx) => {
    const start = time;
    const end = `${Math.floor(parseInt(time.split(':')[0]) + (parseInt(time.split(':')[1]) + 30) / 60)}:${String((parseInt(time.split(':')[1]) + 30) % 60).padStart(2, '0')}`;
    slots.push({
      id: `${dateStr}_m_${idx}`,
      date: dateStr,
      startTime: start,
      endTime: `${parseInt(start.split(':')[0])}:${String((parseInt(start.split(':')[1]) + 30) % 60).padStart(2, '0')}`,
      period: 'morning',
      available: [3, 5, 2, 0, 4, 6, 1][idx],
      total: 8
    });
  });

  afternoonTimes.forEach((time, idx) => {
    slots.push({
      id: `${dateStr}_a_${idx}`,
      date: dateStr,
      startTime: time,
      endTime: `${parseInt(time.split(':')[0])}:${String((parseInt(time.split(':')[1]) + 30) % 60).padStart(2, '0')}`,
      period: 'afternoon',
      available: [5, 2, 6, 3, 0, 4][idx],
      total: 8
    });
  });

  return slots;
};

export const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    waiting: '候诊中',
    calling: '叫号中',
    completed: '已完成',
    cancelled: '已取消',
    missed: '已过号'
  };
  return map[status] || status;
};

export const getStatusColorClass = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'statusPending',
    confirmed: 'statusConfirmed',
    waiting: 'statusWaiting',
    calling: 'statusCalling',
    completed: 'statusCompleted',
    cancelled: 'statusCancelled',
    missed: 'statusMissed'
  };
  return map[status] || '';
};
