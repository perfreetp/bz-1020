import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { departments } from '@/data/departments';
import { generateCalendarDays, generateTimeSlots, formatDisplayDate } from '@/utils/date';
import { CalendarDay, TimeSlot, Department } from '@/types/appointment';
import { useApp } from '@/store/AppContext';

const CalendarPage: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [calendarDays] = useState<CalendarDay[]>(generateCalendarDays());

  const isRescheduleMode = !!state.reschedulingAppointmentId || router.params.mode === 'reschedule';

  const department: Department | null = useMemo(() => {
    if (state.selectedDepartment) return state.selectedDepartment;
    const deptId = router.params.deptId;
    return departments.find(d => d.id === deptId) || departments[3];
  }, [state.selectedDepartment, router.params.deptId]);

  const [selectedDate, setSelectedDate] = useState<string>(state.selectedDate);
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  useEffect(() => {
    const available = calendarDays.find(d => d.available);
    if (!selectedDate && available) {
      setSelectedDate(available.date);
    }
    if (department) {
      dispatch({ type: 'SET_SELECTED_DEPARTMENT', payload: department });
    }
    console.log(`[Calendar] Mode: ${isRescheduleMode ? '改期' : '新建'}, Department: ${department?.name}, 无痛? ${department?.name.includes('无痛')}`);
  }, [calendarDays, selectedDate, department, dispatch, isRescheduleMode]);

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return generateTimeSlots(selectedDate);
  }, [selectedDate]);

  const morningSlots = useMemo(() => timeSlots.filter(s => s.period === 'morning'), [timeSlots]);
  const afternoonSlots = useMemo(() => timeSlots.filter(s => s.period === 'afternoon'), [timeSlots]);

  const selectedSlotData = useMemo(() => {
    return timeSlots.find(s => s.id === selectedSlot) || null;
  }, [timeSlots, selectedSlot]);

  const handleDateSelect = (day: CalendarDay) => {
    if (!day.available) return;
    setSelectedDate(day.date);
    setSelectedSlot('');
    dispatch({ type: 'SET_SELECTED_DATE', payload: day.date });
    dispatch({ type: 'SET_SELECTED_SLOT', payload: '' });
    console.log(`[Calendar] Date selected: ${day.date}`);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (slot.available <= 0) return;
    setSelectedSlot(slot.id);
    const slotText = `${slot.startTime}-${slot.endTime}`;
    dispatch({ type: 'SET_SELECTED_SLOT', payload: slotText });
    console.log(`[Calendar] Slot selected: ${slot.startTime}-${slot.endTime}`);
  };

  const handleSubmit = () => {
    if (!selectedDate || !selectedSlotData) return;
    const slotFullText = `${selectedSlotData.startTime}-${selectedSlotData.endTime}`;
    dispatch({ type: 'SET_SELECTED_DATE', payload: selectedDate });
    dispatch({ type: 'SET_SELECTED_SLOT', payload: slotFullText });

    if (isRescheduleMode && state.reschedulingAppointmentId) {
      const apptId = state.reschedulingAppointmentId;
      const originalAppt = state.appointments.find(a => a.id === apptId);
      console.log(`[Calendar] Reschedule: ${apptId} -> ${selectedDate} ${slotFullText}`);
      Taro.showLoading({ title: '改期中...' });
      setTimeout(() => {
        dispatch({
          type: 'RESCHEDULE_APPOINTMENT',
          payload: { id: apptId, date: selectedDate, slot: slotFullText }
        });
        Taro.hideLoading();
        Taro.showToast({ title: '改期成功', icon: 'success' });
        setTimeout(() => {
          Taro.navigateBack();
        }, 800);
      }, 600);
    } else {
      console.log(`[Calendar] New appointment: ${selectedDate} ${slotFullText}`);
      Taro.navigateTo({ url: '/pages/confirm/index' });
    }
  };

  const getRemainClass = (remain: number) => {
    if (remain === 0) return 'none';
    if (remain <= 2) return 'few';
    return '';
  };

  const isPainlessByDefault = department?.name.includes('无痛') || department?.name.includes('联合');

  return (
    <View className={styles.page}>
      {department && (
        <View className={styles.deptBar}>
          <View className={styles.name}>
            {isRescheduleMode && <Text style={{ color: '#FF9500', marginRight: 12 }}>【改期】</Text>}
            {department.name}
          </View>
          <View className={styles.meta}>
            {isPainlessByDefault ? '无痛检查' : '普通/无痛可选'} · 约{department.duration}分钟 · ¥{department.price}
          </View>
        </View>
      )}

      {isRescheduleMode && (
        <View style={{
          margin: '20rpx 24rpx 0',
          padding: '20rpx 24rpx',
          background: 'rgba(255,149,0,0.08)',
          borderRadius: 12,
          border: '1rpx solid rgba(255,149,0,0.2)',
          fontSize: 24,
          color: '#8B4513',
          lineHeight: 1.6
        }}>
          💡 您正在为当前预约重新选择日期和时段，选择完成后原预约时间将自动更新
        </View>
      )}

      <View className={styles.dateSection}>
        <View className={styles.sectionTitle}>
          <Text className={styles.title}>选择日期</Text>
          <Text className={styles.tip}>未来14天可预约</Text>
        </View>
        <ScrollView scrollX className={styles.dateScroll} enhanced showScrollbar={false}>
          {calendarDays.map((day) => (
            <View
              key={day.date}
              className={classnames(
                styles.dateItem,
                selectedDate === day.date && styles.active,
                !day.available && styles.disabled
              )}
              onClick={() => handleDateSelect(day)}
            >
              {day.isToday && <View className={styles.today}>今天</View>}
              <View className={styles.weekday}>{day.weekday}</View>
              <View className={styles.day}>{parseInt(day.date.split('-')[2])}</View>
              <View className={classnames(styles.slots, getRemainClass(day.slotsAvailable))}>
                {day.available ? `余${day.slotsAvailable}个` : '无号'}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.slotSection}>
        <View className={styles.sectionTitle}>
          <Text className={styles.title}>选择时段</Text>
        </View>

        <View className={styles.periodSection}>
          <View className={styles.periodHeader}>
            <Text className={styles.icon}>🌅</Text>
            <Text className={styles.label}>上午时段</Text>
            <Text className={styles.count}>
              {morningSlots.reduce((sum, s) => sum + s.available, 0)} 个可预约
            </Text>
          </View>
          <View className={styles.slotGrid}>
            {morningSlots.map((slot) => (
              <View
                key={slot.id}
                className={classnames(
                  styles.slotItem,
                  selectedSlot === slot.id && styles.active,
                  slot.available <= 0 && styles.disabled
                )}
                onClick={() => handleSlotSelect(slot)}
              >
                <View className={styles.time}>{slot.startTime}</View>
                <View className={classnames(styles.remain, getRemainClass(slot.available))}>
                  {slot.available > 0 ? `余${slot.available}` : '约满'}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.periodSection}>
          <View className={styles.periodHeader}>
            <Text className={styles.icon}>🌆</Text>
            <Text className={styles.label}>下午时段</Text>
            <Text className={styles.count}>
              {afternoonSlots.reduce((sum, s) => sum + s.available, 0)} 个可预约
            </Text>
          </View>
          <View className={styles.slotGrid}>
            {afternoonSlots.map((slot) => (
              <View
                key={slot.id}
                className={classnames(
                  styles.slotItem,
                  selectedSlot === slot.id && styles.active,
                  slot.available <= 0 && styles.disabled
                )}
                onClick={() => handleSlotSelect(slot)}
              >
                <View className={styles.time}>{slot.startTime}</View>
                <View className={classnames(styles.remain, getRemainClass(slot.available))}>
                  {slot.available > 0 ? `余${slot.available}` : '约满'}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.selectedInfo}>
          <View className={styles.label}>已选择</View>
          <View className={styles.value}>
            {selectedDate && selectedSlotData
              ? `${formatDisplayDate(selectedDate)} ${selectedSlotData.startTime}-${selectedSlotData.endTime}`
              : '请选择日期和时段'}
          </View>
        </View>
        <View
          className={classnames(styles.submitBtn, (!selectedDate || !selectedSlotData) && styles.disabled)}
          onClick={handleSubmit}
        >
          {isRescheduleMode ? '确认改期' : '下一步'}
        </View>
      </View>
    </View>
  );
};

export default CalendarPage;
