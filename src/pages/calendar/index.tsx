import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { departments } from '@/data/departments';
import { generateCalendarDays, generateTimeSlots, formatDisplayDate } from '@/utils/date';
import { CalendarDay, TimeSlot, Department } from '@/types/appointment';

const CalendarPage: React.FC = () => {
  const router = useRouter();
  const [calendarDays] = useState<CalendarDay[]>(generateCalendarDays());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [department, setDepartment] = useState<Department | null>(null);

  useEffect(() => {
    const deptId = router.params.deptId;
    const cached = Taro.getStorageSync('selectedDepartment');
    const dept = cached || departments.find(d => d.id === deptId);
    if (dept) setDepartment(dept);
    console.log(`[Calendar] Department loaded: ${dept?.name}`);

    const available = calendarDays.find(d => d.available);
    if (available) setSelectedDate(available.date);
  }, [router.params, calendarDays]);

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
    console.log(`[Calendar] Date selected: ${day.date}`);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (slot.available <= 0) return;
    setSelectedSlot(slot.id);
    console.log(`[Calendar] Slot selected: ${slot.startTime}-${slot.endTime}`);
  };

  const handleSubmit = () => {
    if (!selectedDate || !selectedSlotData) return;
    const slotText = `${selectedSlotData.startTime}-${selectedSlotData.endTime}`;
    Taro.setStorageSync('selectedDate', selectedDate);
    Taro.setStorageSync('selectedSlot', slotText);
    console.log(`[Calendar] Submit: ${selectedDate} ${slotText}`);
    Taro.navigateTo({ url: '/pages/confirm/index' });
  };

  const getRemainClass = (remain: number) => {
    if (remain === 0) return 'none';
    if (remain <= 2) return 'few';
    return '';
  };

  return (
    <View className={styles.page}>
      {department && (
        <View className={styles.deptBar}>
          <View className={styles.name}>{department.name}</View>
          <View className={styles.meta}>
            {department.examinationType === 'painless' ? '无痛检查' : '普通检查'} · 约{department.duration}分钟 · ¥{department.price}
          </View>
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
          下一步
        </View>
      </View>
    </View>
  );
};

export default CalendarPage;
