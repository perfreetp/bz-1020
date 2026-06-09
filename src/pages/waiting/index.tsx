import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { formatDisplayDate } from '@/utils/date';
import { Appointment } from '@/types/appointment';
import { useApp } from '@/store/AppContext';

const WaitingPage: React.FC = () => {
  const { state, dispatch } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { currentAppt, waitingIndex } = useMemo(() => {
    // 与首页 100% 相同的算法：
    // 新预约 unshift 在数组最前，idx=0 就是最新的
    // 从 idx=0 开始找，第一个 active（waiting/calling/confirmed）就命中
    // 这样刚提交的预约（idx=0）永远不会被更早的（idx>0）候诊记录盖过
    let activeIdx = -1;
    for (let i = 0; i < state.appointments.length; i++) {
      const a = state.appointments[i];
      if (a.status === 'waiting' || a.status === 'calling' || a.status === 'confirmed') {
        activeIdx = i;
        break; // 与首页完全一致：命中第一个活跃就停
      }
    }

    if (activeIdx >= 0) {
      const appt = state.appointments[activeIdx];
      // 如果还没分配序号，自动分配
      if (!appt.queueNumber) {
        const qNum = 10 + activeIdx;
        return {
          currentAppt: { ...appt, queueNumber: qNum, currentNumber: Math.max(1, qNum - 5) },
          waitingIndex: activeIdx
        };
      }
      return { currentAppt: appt, waitingIndex: activeIdx };
    }
    return { currentAppt: null, waitingIndex: -1 };
  }, [state.appointments]);

  const waitingInfo = useMemo(() => {
    if (!currentAppt) return null;
    const queueNumber = currentAppt.queueNumber || 12;
    const currentNumber = currentAppt.currentNumber || 7;
    return {
      appointmentId: currentAppt.id,
      departmentName: currentAppt.departmentName,
      queueNumber,
      currentNumber,
      aheadCount: Math.max(0, queueNumber - currentNumber),
      estimatedTime: `${Math.max(0, queueNumber - currentNumber) * 8}分钟`,
      roomNo: '内镜室-' + ((waitingIndex % 5) + 1),
      status: 'waiting' as const,
      qrCode: `${currentAppt.orderNo}|${queueNumber}`
    };
  }, [currentAppt, waitingIndex]);

  useEffect(() => {
    console.log(`[Waiting] Current active appointment: ${currentAppt?.id || 'none'}`);
  }, [currentAppt]);

  const handleRefresh = () => {
    if (!currentAppt || !waitingInfo) return;
    console.log('[Waiting] Refresh queue for appt:', currentAppt.id);
    setIsRefreshing(true);
    setTimeout(() => {
      if (waitingInfo.currentNumber < waitingInfo.queueNumber - 1) {
        const newCurrent = waitingInfo.currentNumber + 1;
        dispatch({
          type: 'UPDATE_APPOINTMENT',
          payload: {
            id: currentAppt.id,
            changes: { currentNumber: newCurrent }
          }
        });
        // 如果只剩2位，发送叫号临近提醒
        if (waitingInfo.queueNumber - newCurrent <= 2) {
          const nearMsg = {
            id: `msg_near_${Date.now()}`,
            type: 'calling' as const,
            title: '叫号临近提醒',
            content: `您的${currentAppt.departmentName}还有${waitingInfo.queueNumber - newCurrent}位就到了，请前往${waitingInfo.roomNo}门口等候，不要离开候诊区太远哦～`,
            time: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-'),
            read: false,
            appointmentId: currentAppt.id
          };
          dispatch({ type: 'ADD_MESSAGE', payload: nearMsg });
        }
      }
      setIsRefreshing(false);
      Taro.showToast({ title: '已更新', icon: 'success' });
    }, 800);
  };

  const handleAction = (action: string) => {
    console.log(`[Waiting] Action: ${action}`);
    if (action === 'instructions') {
      Taro.switchTab({ url: '/pages/instructions/index' });
    } else if (action === 'call') {
      Taro.makePhoneCall({ phoneNumber: '021-12345678' }).catch(e => console.error(e));
    } else if (action === 'cancel') {
      Taro.showModal({
        title: '过号处理说明',
        content: '如未听到叫号，请立即前往候诊区护士台咨询，护士会帮您重新安排号序，不要直接进入诊室哦。',
        showCancel: false,
        confirmText: '知道了'
      });
    } else if (action === 'nearby') {
      Taro.showToast({ title: '附近餐饮加载中...', icon: 'none' });
    }
  };

  if (!currentAppt || !waitingInfo) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View className={styles.header}>
          <View className={styles.deptInfo}>
            <View className={styles.deptName}>候诊叫号</View>
          </View>
        </View>
        <View className={styles.content}>
          <View className={styles.emptyCard}>
            <View className={styles.icon}>🕐</View>
            <View className={styles.title}>暂无正在候诊的预约</View>
            <View className={styles.desc}>
              {state.appointments.length > 0
                ? '您可以在个人记录查看预约，或进行签到后在此查看候诊队列'
                : '您可以在首页立即预约检查，预约成功后在此查看候诊'}
            </View>
            <View className={styles.btn} onClick={() => {
              if (state.appointments.length > 0) {
                Taro.navigateTo({ url: '/pages/records/index' });
              } else {
                Taro.switchTab({ url: '/pages/index/index' });
              }
            }}>
              {state.appointments.length > 0 ? '查看我的预约' : '去预约检查'}
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  const isCalling = waitingInfo.aheadCount <= 0;
  const isNear = waitingInfo.aheadCount <= 3 && waitingInfo.aheadCount > 0;

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.deptInfo}>
          <View className={styles.deptName}>{currentAppt.departmentName}</View>
          <View className={styles.room}>
            🏥 {waitingInfo.roomNo} · {formatDisplayDate(currentAppt.date)} {currentAppt.timeSlot}
          </View>
        </View>

        <View className={styles.queueOverview}>
          <View className={styles.queueItem}>
            <View className={styles.num}>{waitingInfo.currentNumber}</View>
            <View className={styles.label}>当前叫号</View>
            <View className={styles.sub}>请以上患者进入诊室</View>
          </View>
          <View className={styles.divider} />
          <View className={styles.queueItem}>
            <View className={classnames(styles.num, waitingInfo.aheadCount <= 0 && styles.highlight)}>
              {waitingInfo.aheadCount}
            </View>
            <View className={styles.label}>前方等待</View>
            <View className={styles.sub}>预计等待 {waitingInfo.estimatedTime}</View>
          </View>
          <View className={styles.divider} />
          <View className={styles.queueItem}>
            <View className={classnames(styles.num, isCalling && styles.danger)}>
              {waitingInfo.queueNumber}
            </View>
            <View className={styles.label}>我的序号</View>
            <View className={styles.sub}>第 {currentAppt.examinationType === 'painless' ? '无痛' : '普通'} 通道</View>
          </View>
        </View>
      </View>

      <ScrollView scrollY className={styles.content}>
        <View className={styles.refreshBar} onClick={handleRefresh}>
          <Text className={classnames(isRefreshing && styles.icon)}>🔄</Text>
          {isRefreshing ? '正在更新排队信息...' : '点击刷新队列状态'}
        </View>

        <View className={styles.qrCard}>
          <View className={styles.qrTitle}>扫码签到 · 报到候诊</View>
          <View className={styles.qrBox}>
            <View className={styles.qrPattern} />
            <View className={styles.qrCenter}>内镜</View>
          </View>
          <View className={styles.qrInfo}>请向护士出示此二维码签到</View>
          <View className={styles.qrOrderNo}>{currentAppt.orderNo}</View>
        </View>

        {isCalling && waitingInfo.aheadCount <= 0 && (
          <View className={classnames(styles.tipCard, 'danger')}>
            <View className={styles.tipHeader}>
              <Text className={styles.icon}>🔔</Text>
              <Text className={styles.title} style={{ color: '#8C3D3D' }}>正在叫您的号！</Text>
            </View>
            <View className={classnames(styles.tipContent, styles.dangerText)}>
              请立即携带就诊资料前往 {waitingInfo.roomNo} 门口等候，不要走远哦！
              {'\n'}如超过3次叫号未到，将视为过号处理。
            </View>
          </View>
        )}

        {isNear && !isCalling && (
          <View className={styles.tipCard}>
            <View className={styles.tipHeader}>
              <Text className={styles.icon}>⏰</Text>
              <Text className={styles.title}>临近叫号提醒</Text>
            </View>
            <View className={styles.tipContent}>
              前方还有 {waitingInfo.aheadCount} 位患者，预计 {waitingInfo.estimatedTime} 后轮到您。
              {'\n'}建议您在候诊区等候，不要离开太远，注意听叫号。
            </View>
          </View>
        )}

        {!isNear && !isCalling && (
          <View className={classnames(styles.tipCard, 'success')}>
            <View className={styles.tipHeader}>
              <Text className={styles.icon}>✅</Text>
              <Text className={styles.title} style={{ color: '#2F7A3D' }}>候诊中，请耐心等待</Text>
            </View>
            <View className={classnames(styles.tipContent, styles.successText)}>
              您已成功签到，前方还有 {waitingInfo.aheadCount} 位患者。
              {'\n'}请在候诊区就座休息，注意收听叫号广播或查看屏幕。
            </View>
          </View>
        )}

        <View className={styles.actionCard}>
          <View className={styles.actionTitle}>便民服务</View>
          <View className={styles.actionGrid}>
            <View className={styles.actionItem} onClick={() => handleAction('instructions')}>
              <View className={styles.icon}>📖</View>
              <Text className={styles.name}>检查须知</Text>
            </View>
            <View className={styles.actionItem} onClick={() => handleAction('cancel')}>
              <View className={styles.icon}>⚠️</View>
              <Text className={styles.name}>过号处理</Text>
            </View>
            <View className={styles.actionItem} onClick={() => handleAction('nearby')}>
              <View className={styles.icon}>🍜</View>
              <Text className={styles.name}>附近餐饮</Text>
            </View>
            <View className={styles.actionItem} onClick={() => handleAction('call')}>
              <View className={styles.icon}>📞</View>
              <Text className={styles.name}>护士台</Text>
            </View>
          </View>
        </View>

        <View className={styles.timelineCard}>
          <View className={styles.timelineTitle}>检查流程</View>
          <View className={styles.timelineList}>
            <View className={styles.timelineItem}>
              <View className={classnames(styles.dot, 'done')} />
              <View className={styles.time}>已完成</View>
              <View className={styles.title}>预约成功</View>
              <View className={styles.desc}>预约编号：{currentAppt.orderNo}</View>
            </View>
            <View className={styles.timelineItem}>
              <View className={classnames(styles.dot, 'done')} />
              <View className={styles.time}>已完成</View>
              <View className={styles.title}>扫码签到</View>
              <View className={styles.desc}>请在候诊区就座等候</View>
            </View>
            <View className={styles.timelineItem}>
              <View className={classnames(styles.dot, isCalling && 'danger', !isCalling && 'active')} />
              <View className={styles.time}>{isCalling ? '进行中' : '预计 ' + waitingInfo.estimatedTime}</View>
              <View className={styles.title}>候诊叫号</View>
              <View className={styles.desc}>
                {isCalling ? '正在叫您的号，请立即前往！' : `当前叫到第 ${waitingInfo.currentNumber} 号`}
              </View>
            </View>
            <View className={styles.timelineItem}>
              <View className={styles.dot} />
              <View className={styles.time}>待进行</View>
              <View className={styles.title}>进入检查室</View>
              <View className={styles.desc}>医护人员会引导您进入诊室</View>
            </View>
            <View className={styles.timelineItem}>
              <View className={styles.dot} />
              <View className={styles.time}>待进行</View>
              <View className={styles.title}>完成检查 · 领取报告</View>
              <View className={styles.desc}>常规报告约1小时后可取</View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default WaitingPage;
