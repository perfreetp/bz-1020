import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { appointments, currentWaitingInfo } from '@/data/appointments';
import { formatDisplayDate } from '@/utils/date';
import { Appointment, WaitingInfo } from '@/types/appointment';

const WaitingPage: React.FC = () => {
  const [waitingInfo, setWaitingInfo] = useState<WaitingInfo | null>(currentWaitingInfo);
  const [currentAppt, setCurrentAppt] = useState<Appointment | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const waiting = appointments.find(a => a.status === 'waiting' || a.status === 'calling');
    setCurrentAppt(waiting || null);
    console.log(`[Waiting] Current appointment: ${waiting?.id || 'none'}`);
  }, []);

  const handleRefresh = () => {
    console.log('[Waiting] Refresh queue');
    setIsRefreshing(true);
    setTimeout(() => {
      if (waitingInfo && waitingInfo.currentNumber < waitingInfo.queueNumber - 1) {
        setWaitingInfo({
          ...waitingInfo,
          currentNumber: waitingInfo.currentNumber + 1,
          aheadCount: Math.max(0, waitingInfo.aheadCount - 1)
        });
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
        title: '过号说明',
        content: '如未听到叫号，请立即前往候诊区护士台咨询，护士会帮您重新安排号序，不要直接进入诊室哦。',
        showCancel: false,
        confirmText: '知道了'
      });
    } else if (action === 'nearby') {
      Taro.showToast({ title: '附近餐饮正在加载...', icon: 'none' });
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
            <View className={styles.desc}>您可以在首页查看预约记录或立即预约</View>
            <View className={styles.btn} onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
              前往首页
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  const isCalling = waitingInfo.status === 'calling' || waitingInfo.aheadCount <= 2;
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

        {isNear && waitingInfo.aheadCount > 0 && (
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
