import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { Appointment } from '@/types/appointment';
import { formatDisplayDate, getStatusText, getStatusColorClass } from '@/utils/date';

interface StatusCardProps {
  appointment: Appointment;
  showActions?: boolean;
  onClick?: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({ appointment, showActions = true, onClick }) => {
  const statusColor = getStatusColorClass(appointment.status);
  const statusText = getStatusText(appointment.status);

  const handleAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`[StatusCard] Action clicked: ${action} for order: ${appointment.orderNo}`);
    if (action === 'waiting') {
      Taro.switchTab({ url: '/pages/waiting/index' });
    } else if (action === 'cancel') {
      Taro.showModal({
        title: '确认取消',
        content: '确定要取消该预约吗？取消后号源将释放给其他患者。',
        confirmText: '确认取消',
        confirmColor: '#FF3B30',
        success: (res) => {
          if (res.confirm) {
            Taro.showToast({ title: '预约已取消', icon: 'success' });
          }
        }
      });
    } else if (action === 'reschedule') {
      Taro.navigateTo({ url: '/pages/calendar/index' });
    }
  };

  const renderActions = () => {
    if (!showActions) return null;
    const { status } = appointment;

    if (status === 'waiting') {
      return (
        <View className={styles.actionBtn} onClick={(e) => handleAction('waiting', e)}>
          查看候诊
        </View>
      );
    }
    if (status === 'confirmed') {
      return (
        <>
          <View className={classnames(styles.actionBtn, styles.outline)} onClick={(e) => handleAction('cancel', e)}>
            取消预约
          </View>
          <View className={classnames(styles.actionBtn, styles.primary)} onClick={(e) => handleAction('reschedule', e)}>
            改期
          </View>
        </>
      );
    }
    if (status === 'completed' && !appointment.rating) {
      return (
        <View className={classnames(styles.actionBtn, styles.outline)}>
          去评价
        </View>
      );
    }
    return null;
  };

  return (
    <View className={styles.wrapper} onClick={onClick}>
      {appointment.status === 'calling' && <View className={styles.badge} />}
      <View className={styles.header}>
        <Text className={styles.title}>{appointment.departmentName}</Text>
        <View className={classnames(styles.statusTag, styles[statusColor])}>
          {statusText}
        </View>
      </View>
      <View className={styles.content}>
        <View className={styles.infoRow}>
          <Text className={styles.label}>检查时间</Text>
          <Text className={styles.value}>{formatDisplayDate(appointment.date)} {appointment.timeSlot}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.label}>检查类型</Text>
          <Text className={styles.value}>
            {appointment.examinationType === 'painless' ? '无痛检查' : '普通检查'}
          </Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.label}>预约编号</Text>
          <Text className={styles.value}>{appointment.orderNo}</Text>
        </View>
        {appointment.queueNumber && (
          <View className={styles.infoRow}>
            <Text className={styles.label}>排队序号</Text>
            <Text className={styles.value}>第 {appointment.queueNumber} 号</Text>
          </View>
        )}
      </View>
      <View className={styles.footer}>
        <View className={styles.price}>
          <Text className={styles.currency}>¥</Text>
          {appointment.price}
        </View>
        <View className={styles.actions}>{renderActions()}</View>
      </View>
    </View>
  );
};

export default StatusCard;
