import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { formatDisplayDate, getStatusText } from '@/utils/date';
import { useApp } from '@/store/AppContext';
import { departments } from '@/data/departments';

const IndexPage: React.FC = () => {
  const { state, dispatch } = useApp();
  const apptList = state.appointments;
  const unreadCount = state.messages.filter(m => !m.read).length;

  const latestAppt = useMemo(() => {
    // 按数组倒序（最新的在前），先找 waiting/calling，再找 confirmed
    // 过滤掉 cancelled/missed
    let waitingMatch: Appointment | null = null;
    let confirmedMatch: Appointment | null = null;
    for (let i = 0; i < apptList.length; i++) {
      const a = apptList[i];
      if (a.status === 'waiting' || a.status === 'calling') {
        waitingMatch = a;
        break; // waiting/calling 优先级最高，找到就停
      }
      if (!confirmedMatch && a.status === 'confirmed') {
        confirmedMatch = a;
        // 继续找，因为后面可能有 waiting/calling
      }
    }
    const active = waitingMatch || confirmedMatch;
    if (active) return active;
    // 没有活跃的，返回最新的已完成（用于显示评价入口）
    return apptList.find(a => a.status === 'completed') || null;
  }, [apptList]);

  const currentWaitingInfo = useMemo(() => {
    if (latestAppt && (latestAppt.status === 'waiting' || latestAppt.status === 'calling')) {
      const currentNum = latestAppt.currentNumber || 7;
      return {
        currentNumber: currentNum,
        aheadCount: Math.max(0, (latestAppt.queueNumber || 12) - currentNum),
        queueNumber: latestAppt.queueNumber || 12
      };
    }
    return null;
  }, [latestAppt]);

  const handleNavigate = (url: string, type: 'navigate' | 'switchTab' = 'navigate') => {
    console.log(`[Home] Navigate to: ${url}`);
    if (type === 'switchTab') {
      Taro.switchTab({ url });
    } else {
      Taro.navigateTo({ url });
    }
  };

  const handleQuickAppoint = (category?: 'gastro' | 'colon') => {
    console.log(`[Home] Quick appoint, category: ${category}`);
    dispatch({ type: 'CLEAR_REPORTS' });
    const params = category ? `?category=${category}` : '';
    Taro.navigateTo({ url: `/pages/department/index${params}` });
  };

  const getStatusBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      waiting: 'waiting', calling: 'calling', confirmed: 'confirmed', completed: 'completed', cancelled: 'cancelled'
    };
    return map[status] || '';
  };

  const getCardClass = (status: string) => {
    const map: Record<string, string> = {
      waiting: 'statusWaiting', calling: 'statusCalling', confirmed: 'statusConfirmed', completed: 'statusCompleted'
    };
    return map[status] || '';
  };

  return (
    <View className={styles.page}>
      <View className={styles.banner}>
        <View className={styles.greeting}>
          <View className={styles.greetingText}>
            <View className={styles.hello}>您好，欢迎使用</View>
            <View className={styles.name}>消化内镜预约中心</View>
          </View>
          <View className={styles.avatar} onClick={() => handleNavigate('/pages/records/index')}>
            <Text>👤</Text>
          </View>
        </View>
        <View className={styles.searchBox} onClick={() => handleQuickAppoint()}>
          <Text className={styles.icon}>🔍</Text>
          <Text className={styles.placeholder}>搜索检查项目、科室...</Text>
        </View>
      </View>

      <ScrollView scrollY className={styles.content}>
        <View className={styles.quickAppoint} onClick={() => handleQuickAppoint()}>
          <View className={styles.headline}>立即预约检查</View>
          <View className={styles.subhead}>在线预约胃镜/肠镜，免排队更便捷</View>
          <View className={styles.btn}>
            开始预约 <Text className={styles.arrow}>→</Text>
          </View>
        </View>

        {latestAppt && (
          <>
            <View className={styles.sectionTitle}>
              <Text className={styles.title}>我的预约</Text>
              <Text className={styles.more} onClick={() => handleNavigate('/pages/records/index')}>全部预约 →</Text>
            </View>
            <View className={classnames(styles.appointCard, styles[getCardClass(latestAppt.status)])}>
              <View className={styles.cardHeader}>
                <Text className={styles.deptName}>{latestAppt.departmentName}</Text>
                <View className={classnames(styles.statusBadge, styles[getStatusBadgeClass(latestAppt.status)])}>
                  {getStatusText(latestAppt.status)}
                </View>
              </View>
              <View className={styles.infoList}>
                <View className={styles.infoItem}>
                  <Text className={styles.label}>检查时间</Text>
                  <Text className={styles.value}>{formatDisplayDate(latestAppt.date)} {latestAppt.timeSlot}</Text>
                </View>
                <View className={styles.infoItem}>
                  <Text className={styles.label}>检查类型</Text>
                  <Text className={styles.value}>
                    {latestAppt.examinationType === 'painless' ? '无痛检查' : '普通检查'}
                  </Text>
                </View>
              </View>

              {currentWaitingInfo && (
                <View className={styles.queueInfo}>
                  <View className={styles.queueItem}>
                    <View className={styles.num}>{currentWaitingInfo.currentNumber}</View>
                    <View className={styles.txt}>当前叫号</View>
                  </View>
                  <View className={styles.divider} />
                  <View className={styles.queueItem}>
                    <View className={styles.num} style={{ color: '#FF3B30' }}>{currentWaitingInfo.aheadCount}</View>
                    <View className={styles.txt}>前方等待</View>
                  </View>
                  <View className={styles.divider} />
                  <View className={styles.queueItem}>
                    <View className={styles.num}>{currentWaitingInfo.queueNumber}</View>
                    <View className={styles.txt}>我的序号</View>
                  </View>
                </View>
              )}

              <View className={styles.cardFooter}>
                {(latestAppt.status === 'waiting' || latestAppt.status === 'calling') && (
                  <View className={styles.btnPrimary} onClick={() => handleNavigate('/pages/waiting/index', 'switchTab')}>
                    查看候诊
                  </View>
                )}
                {latestAppt.status === 'confirmed' && (
                  <>
                    <View className={styles.btnOutline} onClick={() => {
                      const dept = departments.find(d => d.id === latestAppt.departmentId) || departments[0];
                      dispatch({ type: 'SET_SELECTED_DEPARTMENT', payload: dept });
                      dispatch({ type: 'SET_SELECTED_DATE', payload: latestAppt.date });
                      dispatch({ type: 'SET_SELECTED_SLOT', payload: latestAppt.timeSlot });
                      dispatch({ type: 'START_RESCHEDULE', payload: latestAppt.id });
                      Taro.navigateTo({ url: '/pages/calendar/index?mode=reschedule' });
                    }}>改期</View>
                    <View className={styles.btnPrimary} onClick={() => handleNavigate('/pages/instructions/index', 'switchTab')}>
                      术前准备
                    </View>
                  </>
                )}
                {latestAppt.status === 'completed' && !latestAppt.rating && (
                  <View className={styles.btnPrimary} onClick={() => handleNavigate('/pages/records/index')}>立即评价</View>
                )}
              </View>
            </View>
          </>
        )}

        <View className={styles.sectionTitle}>
          <Text className={styles.title}>快速预约</Text>
        </View>
        <View className={styles.quickGrid}>
          <View className={styles.gridItem} onClick={() => handleQuickAppoint('gastro')}>
            <View className={classnames(styles.icon, styles.blue)}>🔬</View>
            <View className={styles.name}>胃镜检查</View>
            <View className={styles.desc}>食管·胃·十二指肠</View>
          </View>
          <View className={styles.gridItem} onClick={() => handleQuickAppoint('colon')}>
            <View className={classnames(styles.icon, styles.green)}>🩺</View>
            <View className={styles.name}>肠镜检查</View>
            <View className={styles.desc}>结肠·直肠·回肠末端</View>
          </View>
          <View className={styles.gridItem} onClick={() => handleQuickAppoint()}>
            <View className={classnames(styles.icon, styles.purple)}>💉</View>
            <View className={styles.name}>无痛联合</View>
            <View className={styles.desc}>一次麻醉 胃肠同查</View>
          </View>
          <View className={styles.gridItem} onClick={() => handleNavigate('/pages/instructions/index', 'switchTab')}>
            <View className={classnames(styles.icon, styles.orange)}>📖</View>
            <View className={styles.name}>检查须知</View>
            <View className={styles.desc}>术前术后注意事项</View>
          </View>
        </View>

        <View className={styles.sectionTitle}>
          <Text className={styles.title}>便民服务</Text>
        </View>
        <View className={styles.serviceGrid}>
          <View className={styles.serviceItem} onClick={() => handleNavigate('/pages/waiting/index', 'switchTab')}>
            <View className={styles.icon}>⏰</View>
            <Text className={styles.name}>候诊叫号</Text>
          </View>
          <View className={styles.serviceItem} onClick={() => handleNavigate('/pages/records/index')}>
            <View className={styles.icon}>📋</View>
            <Text className={styles.name}>历史记录</Text>
          </View>
          <View className={styles.serviceItem} onClick={() => handleNavigate('/pages/messages/index', 'switchTab')}>
            <View className={styles.icon} style={{ position: 'relative' }}>
              🔔
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute', top: -6, right: -6,
                  minWidth: 28, height: 28, padding: '0 8rpx',
                  background: '#FF3B30', color: '#fff', borderRadius: 999,
                  fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{unreadCount}</View>
              )}
            </View>
            <Text className={styles.name}>消息通知</Text>
          </View>
          <View className={styles.serviceItem} onClick={() => Taro.makePhoneCall({ phoneNumber: '021-12345678' }).catch(e => console.error('[Home] 拨打电话失败', e))}>
            <View className={styles.icon}>📞</View>
            <Text className={styles.name}>咨询电话</Text>
          </View>
          <View className={styles.serviceItem}>
            <View className={styles.icon}>🗺️</View>
            <Text className={styles.name}>导航到院</Text>
          </View>
          <View className={styles.serviceItem}>
            <View className={styles.icon}>💰</View>
            <Text className={styles.name}>缴费查询</Text>
          </View>
          <View className={styles.serviceItem}>
            <View className={styles.icon}>📄</View>
            <Text className={styles.name}>电子报告</Text>
          </View>
          <View className={styles.serviceItem}>
            <View className={styles.icon}>❓</View>
            <Text className={styles.name}>帮助中心</Text>
          </View>
        </View>

        <View className={styles.noticeCard}>
          <View className={styles.noticeHeader}>
            <Text className={styles.icon}>💡</Text>
            <Text className={styles.title}>温馨提示</Text>
          </View>
          <View className={styles.noticeContent}>
            1. 无痛检查需家属陪同，术后24小时禁止驾车；{'\n'}
            2. 胃镜检查前8小时禁食禁水；{'\n'}
            3. 肠镜检查需提前1天进行肠道准备；{'\n'}
            4. 如服用抗凝药物请提前告知医生。
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default IndexPage;
