import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { formatDisplayDate, getStatusText } from '@/utils/date';
import { Appointment, Department } from '@/types/appointment';
import { useApp } from '@/store/AppContext';
import { departments } from '@/data/departments';

const RecordsPage: React.FC = () => {
  const { state, dispatch } = useApp();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingAppt, setRatingAppt] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const apptList = state.appointments;

  const filterOptions = [
    { key: 'all', label: '全部' },
    { key: 'waiting', label: '候诊中' },
    { key: 'confirmed', label: '已确认' },
    { key: 'completed', label: '已完成' },
    { key: 'cancelled', label: '已取消' }
  ];

  const filteredList = useMemo(() => {
    if (activeFilter === 'all') return apptList;
    return apptList.filter(a => a.status === activeFilter);
  }, [apptList, activeFilter]);

  const stats = useMemo(() => ({
    total: apptList.length,
    completed: apptList.filter(a => a.status === 'completed').length,
    pending: apptList.filter(a => a.status === 'waiting' || a.status === 'confirmed').length
  }), [apptList]);

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      waiting: 'waiting', confirmed: 'confirmed', completed: 'completed',
      cancelled: 'cancelled', missed: 'missed', calling: 'waiting'
    };
    return map[status] || '';
  };

  const handleAction = (action: string, appt: Appointment) => {
    console.log(`[Records] Action: ${action} for ${appt.orderNo}`);
    if (action === 'cancel') {
      Taro.showModal({
        title: '取消预约',
        content: `确定要取消 ${formatDisplayDate(appt.date)} ${appt.timeSlot} 的${appt.departmentName}吗？`,
        confirmText: '确认取消',
        confirmColor: '#FF3B30',
        success: (res) => {
          if (res.confirm) {
            dispatch({ type: 'CANCEL_APPOINTMENT', payload: appt.id });
            Taro.showToast({ title: '取消成功', icon: 'success' });
          }
        }
      });
    } else if (action === 'reschedule') {
      const dept: Department | undefined = departments.find(d => d.id === appt.departmentId) || departments[0];
      dispatch({ type: 'SET_SELECTED_DEPARTMENT', payload: dept || null });
      dispatch({ type: 'SET_SELECTED_DATE', payload: appt.date });
      dispatch({ type: 'SET_SELECTED_SLOT', payload: appt.timeSlot });
      dispatch({ type: 'START_RESCHEDULE', payload: appt.id });
      Taro.navigateTo({ url: '/pages/calendar/index?mode=reschedule' });
    } else if (action === 'waiting') {
      Taro.switchTab({ url: '/pages/waiting/index' });
    } else if (action === 'report') {
      Taro.showModal({
        title: '电子报告',
        content: '报告已生成，请前往门诊一楼报告打印处领取纸质报告，或点击查看电子报告。',
        cancelText: '关闭',
        confirmText: '查看报告'
      });
    } else if (action === 'rate') {
      setRatingAppt(appt);
      setRating(appt.rating || 5);
      setComment(appt.comment || '');
      setShowRatingModal(true);
    } else if (action === 'detail') {
      Taro.showToast({ title: '查看详情', icon: 'none' });
    }
  };

  const handleSubmitRating = () => {
    if (!ratingAppt) return;
    console.log(`[Records] Submit rating: ${rating} for ${ratingAppt.orderNo}`);
    Taro.showLoading({ title: '提交中...' });
    setTimeout(() => {
      dispatch({
        type: 'RATE_APPOINTMENT',
        payload: { id: ratingAppt.id, rating, comment }
      });
      Taro.hideLoading();
      Taro.showToast({ title: '评价成功', icon: 'success' });
      setShowRatingModal(false);
    }, 600);
  };

  const renderStars = (num: number, interactive = false, onSelect?: (n: number) => void) => {
    return [...Array(5)].map((_, i) => (
      <Text
        key={i}
        className={classnames(
          interactive ? styles.star : styles.displayStar,
          i < num && (interactive ? styles.active : styles.activeStar
        )}
        onClick={() => interactive && onSelect?.(i + 1)}
      >★</Text>
    ));
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.profileCard}>
        <View className={styles.profileContent}>
          <View className={styles.avatar}>👤</View>
          <View className={styles.profileInfo}>
            <View className={styles.name}>{state.patientInfo.name}</View>
            <View className={styles.meta}>
              {state.patientInfo.gender === 'male' ? '男' : '女'} · {state.patientInfo.age}岁 · {state.patientInfo.phone}
            </View>
            <View className={styles.meta}>就诊卡号：202601000123</View>
          </View>
        </View>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <View className={styles.num}>{stats.total}</View>
            <View className={styles.label}>总预约</View>
          </View>
          <View className={styles.statItem}>
            <View className={styles.num}>{stats.completed}</View>
            <View className={styles.label}>已完成</View>
          </View>
          <View className={styles.statItem}>
            <View className={styles.num}>{stats.pending}</View>
            <View className={styles.label}>待就诊</View>
          </View>
        </View>
      </View>

      <View className={styles.filterTabs}>
        {filterOptions.map(opt => (
          <View
            key={opt.key}
            className={classnames(styles.filterItem, activeFilter === opt.key && styles.active)}
            onClick={() => setActiveFilter(opt.key)}
          >
            {opt.label}
          </View>
        ))}
      </View>

      {filteredList.length > 0 ? (
        <View className={styles.recordList}>
          {filteredList.map(appt => (
            <View key={appt.id} className={styles.recordCard}>
              <View className={styles.cardHeader}>
                <Text className={styles.orderNo}>NO. {appt.orderNo}</Text>
                <View className={classnames(styles.statusTag, styles[getStatusClass(appt.status)])}>
                  {getStatusText(appt.status)}
                </View>
              </View>

              <View className={styles.cardBody}>
                <View className={styles.deptName}>{appt.departmentName}</View>
                <View className={styles.infoGrid}>
                  <View className={styles.infoCell}>
                    <View className={styles.label}>检查时间</View>
                    <View className={styles.value}>{formatDisplayDate(appt.date)}</View>
                  </View>
                  <View className={styles.infoCell}>
                    <View className={styles.label}>时段</View>
                    <View className={styles.value}>{appt.timeSlot}</View>
                  </View>
                  <View className={styles.infoCell}>
                    <View className={styles.label}>检查方式</View>
                    <View className={styles.value}>
                      {appt.examinationType === 'painless' ? '无痛检查' : '普通检查'}
                    </View>
                  </View>
                  <View className={styles.infoCell}>
                    <View className={styles.label}>患者</View>
                    <View className={styles.value}>{appt.patientInfo.name}</View>
                  </View>
                </View>

                <View className={styles.tagsRow}>
                  <View className={classnames(styles.tag, appt.category === 'gastro' ? styles.gastro : styles.colon)}>
                    {appt.category === 'gastro' ? '胃镜类' : '肠镜类'}
                  </View>
                  {appt.examinationType === 'painless' && (
                    <View className={classnames(styles.tag, styles.painless)}>无痛</View>
                  )}
                  {appt.companionInfo && (
                    <View className={styles.tag}>有陪同</View>
                  )}
                  {appt.previousReports && appt.previousReports.length > 0 && (
                    <View className={styles.tag}>已上传报告</View>
                  )}
                </View>

                {appt.rating && (
                  <View className={styles.ratingBox}>
                    <View className={styles.stars}>{renderStars(appt.rating)}</View>
                    {appt.comment && <View className={styles.comment}>"{appt.comment}"</View>}
                  </View>
                )}
              </View>

              <View className={styles.cardFooter}>
                <View className={styles.priceBox}>
                  <View className={styles.label}>费用</View>
                  <View className={styles.price}>
                    <Text className={styles.currency}>¥</Text>{appt.price}
                  </View>
                </View>
                <View className={styles.actions}>
                  {(appt.status === 'waiting' || appt.status === 'confirmed') && (
                    <>
                      <View className={styles.btnDanger} onClick={() => handleAction('cancel', appt)}>取消</View>
                      <View className={styles.btnOutline} onClick={() => handleAction('reschedule', appt)}>改期</View>
                      {appt.status === 'waiting' && (
                        <View className={styles.btnPrimary} onClick={() => handleAction('waiting', appt)}>候诊</View>
                      )}
                    </>
                  )}
                  {appt.status === 'completed' && (
                    <>
                      <View className={styles.btnOutline} onClick={() => handleAction('report', appt)}>报告</View>
                      {!appt.rating && (
                        <View className={styles.btnPrimary} onClick={() => handleAction('rate', appt)}>评价</View>
                      )}
                      {appt.rating && (
                        <View className={styles.btnOutline} onClick={() => handleAction('detail', appt)}>详情</View>
                      )}
                    </>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className={styles.emptyBox}>
          <View className={styles.icon}>📭</View>
          <View className={styles.title}>暂无相关记录</View>
          <View className={styles.desc}>您还没有该状态下的预约记录</View>
          <View className={styles.btn} onClick={() => Taro.navigateTo({ url: '/pages/department/index' })}>
            立即预约
          </View>
        </View>
      )}

      {showRatingModal && (
        <View className={styles.modalOverlay} onClick={() => setShowRatingModal(false)}>
          <View className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <View className={styles.modalTitle}>
              评价「{ratingAppt?.departmentName}」服务
            </View>
            <View className={styles.ratingStars}>
              {renderStars(rating, true, setRating)}
            </View>
            <View style={{ textAlign: 'center', fontSize: 24, color: '#8C8C8C', marginBottom: 24 }}>
              {['很差', '较差', '一般', '满意', '非常满意'][rating - 1]}
            </View>
            <Textarea
              className={styles.commentInput}
              value={comment}
              placeholder="分享您的就诊体验，帮助其他患者（选填）"
              maxlength={200}
              onInput={e => setComment(e.detail.value)}
            />
            <View className={styles.modalBtns}>
              <View className={classnames(styles.modalBtn, styles.cancel)} onClick={() => setShowRatingModal(false)}>
                取消
              </View>
              <View className={classnames(styles.modalBtn, styles.confirm)} onClick={handleSubmitRating}>
                提交评价
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default RecordsPage;
