import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { formatDisplayDate, getStatusText } from '@/utils/date';
import { Appointment, Department, UploadedReport } from '@/types/appointment';
import { useApp } from '@/store/AppContext';
import { departments } from '@/data/departments';

const RecordsPage: React.FC = () => {
  const { state, dispatch } = useApp();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // 评价弹窗状态，分别管理避免冲突
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingApptId, setRatingApptId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

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

  // 当前正在评价的预约对象（每次渲染都从 state 重新取）
  const ratingAppt: Appointment | null = useMemo(() => {
    if (!ratingApptId) return null;
    return state.appointments.find(a => a.id === ratingApptId) || null;
  }, [ratingApptId, state.appointments]);

  const openRatingModal = useCallback((appt: Appointment) => {
    console.log(`[Records] Open rating modal for: ${appt.orderNo}, existing rating: ${appt.rating || 'none'}`);
    setRatingApptId(appt.id);
    setRating(appt.rating && appt.rating > 0 ? appt.rating : 5);
    setComment(appt.comment || '');
    setIsSubmittingRating(false);
    // 下一帧再显示弹窗，确保状态已更新
    Taro.nextTick(() => {
      setShowRatingModal(true);
    });
  }, []);

  const closeRatingModal = useCallback(() => {
    console.log('[Records] Close rating modal');
    setShowRatingModal(false);
    // 延迟清空，避免关闭动画过程中状态闪烁
    setTimeout(() => {
      if (!showRatingModal) {
        setRatingApptId(null);
        setRating(5);
        setComment('');
        setIsSubmittingRating(false);
      }
    }, 300);
  }, [showRatingModal]);

  const handleAction = useCallback((action: string, appt: Appointment) => {
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
      openRatingModal(appt);
    } else if (action === 'detail') {
      // 查看报告上传详情
      const reports: UploadedReport[] = appt.previousReports || [];
      if (reports.length === 0) {
        Taro.showToast({ title: '该预约未上传报告', icon: 'none' });
        return;
      }
      Taro.showModal({
        title: `已上传报告（${reports.length}份）`,
        content: reports.map((r, i) => `${i + 1}. ${r.name}`).join('\n'),
        showCancel: false,
        confirmText: '知道了'
      });
    }
  }, [dispatch, openRatingModal]);

  const handleSubmitRating = useCallback(() => {
    if (!ratingApptId || isSubmittingRating) return;
    setIsSubmittingRating(true);
    console.log(`[Records] Submit rating: id=${ratingApptId}, stars=${rating}, comment=${comment}`);

    Taro.showLoading({ title: '提交中...' });
    setTimeout(() => {
      dispatch({
        type: 'RATE_APPOINTMENT',
        payload: { id: ratingApptId, rating, comment }
      });
      Taro.hideLoading();
      Taro.showToast({ title: '评价成功', icon: 'success' });
      // 提交成功后关闭弹窗
      setTimeout(() => {
        setShowRatingModal(false);
        setIsSubmittingRating(false);
      }, 200);
    }, 500);
  }, [ratingApptId, rating, comment, dispatch, isSubmittingRating]);

  // 渲染星星：num 是实际的星级数
  const renderStars = useCallback((num: number, interactive = false, onSelect?: ((n: number) => void) | undefined) => {
    const safeNum = Math.max(0, Math.min(5, Math.floor(num)));
    return [...Array(5)].map((_, i) => {
      const isFilled = i < safeNum;
      return (
        <Text
          key={i}
          className={classnames(
            interactive ? styles.star : styles.displayStar,
            isFilled && (interactive ? styles.active : styles.activeStar)
          )}
          onClick={() => {
            if (interactive && onSelect) {
              console.log(`[Records] Star selected: ${i + 1}`);
              onSelect(i + 1);
            }
          }}
        >★</Text>
      );
    });
  }, []);

  // 格式化报告数量显示
  const getReportsCount = (reports: UploadedReport[] | undefined): string => {
    if (!reports || reports.length === 0) return '';
    return `${reports.length}份报告`;
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
            onClick={() => {
              console.log(`[Records] Switch filter: ${opt.key}`);
              setActiveFilter(opt.key);
            }}
          >
            {opt.label}
          </View>
        ))}
      </View>

      {filteredList.length > 0 ? (
        <View className={styles.recordList}>
          {filteredList.map(appt => {
            const reports = appt.previousReports || [];
            const reportCountLabel = getReportsCount(reports);
            return (
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
                    {reportCountLabel && (
                      <View
                        className={classnames(styles.tag, styles.reports)}
                        onClick={() => handleAction('detail', appt)}
                      >📎 {reportCountLabel}</View>
                    )}
                  </View>

                  {appt.rating && appt.rating > 0 && (
                    <View className={styles.ratingBox}>
                      <View className={styles.stars}>
                        {renderStars(appt.rating)}
                        <Text style={{ fontSize: 22, color: '#8C8C8C', marginLeft: 12 }}>
                          {appt.rating}分
                        </Text>
                      </View>
                      {appt.comment && (
                        <View className={styles.comment}>"{appt.comment}"</View>
                      )}
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
                        <View className={styles.btnDanger} onClick={(e) => { e.stopPropagation(); handleAction('cancel', appt); }}>取消</View>
                        <View className={styles.btnOutline} onClick={(e) => { e.stopPropagation(); handleAction('reschedule', appt); }}>改期</View>
                        {appt.status === 'waiting' && (
                          <View className={styles.btnPrimary} onClick={(e) => { e.stopPropagation(); handleAction('waiting', appt); }}>候诊</View>
                        )}
                      </>
                    )}
                    {appt.status === 'completed' && (
                      <>
                        {reportCountLabel ? (
                          <View className={styles.btnOutline} onClick={(e) => { e.stopPropagation(); handleAction('report', appt); }}>报告</View>
                        ) : (
                          <View className={styles.btnOutline} onClick={(e) => { e.stopPropagation(); handleAction('detail', appt); }}>详情</View>
                        )}
                        {!appt.rating || appt.rating <= 0 ? (
                          <View className={styles.btnPrimary} onClick={(e) => { e.stopPropagation(); handleAction('rate', appt); }}>评价</View>
                        ) : (
                          <View className={styles.btnOutline} onClick={(e) => { e.stopPropagation(); handleAction('rate', appt); }}>修改评价</View>
                        )}
                      </>
                    )}
                    {appt.status === 'cancelled' && (
                      <View className={styles.btnOutline} onClick={(e) => { e.stopPropagation(); Taro.navigateTo({ url: '/pages/department/index' }); }}>再次预约</View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
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
        <View className={styles.modalOverlay} onClick={closeRatingModal}>
          <View className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalTitle}>
              评价「{ratingAppt?.departmentName}」服务
            </View>

            <View className={styles.ratingStars}>
              {renderStars(rating, true, (newRating: number) => setRating(newRating))}
            </View>
            <View className={styles.ratingText}>
              {['很差', '较差', '一般', '满意', '非常满意'][Math.max(0, rating - 1)]}
            </View>

            <Textarea
              className={styles.commentInput}
              value={comment}
              placeholder="分享您的就诊体验，帮助其他患者（选填）"
              maxlength={200}
              autoHeight
              onInput={(e) => setComment(e.detail.value)}
            />

            <View className={styles.modalBtns}>
              <View
                className={classnames(styles.modalBtn, styles.cancel)}
                onClick={(e) => {
                  e.stopPropagation();
                  closeRatingModal();
                }}
              >
                取消
              </View>
              <View
                className={classnames(styles.modalBtn, styles.confirm, isSubmittingRating && styles.disabled)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmitRating();
                }}
              >
                {isSubmittingRating ? '提交中...' : '提交评价'}
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default RecordsPage;
