import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { messages } from '@/data/messages';
import { formatDateTime } from '@/utils/date';
import { MessageItem } from '@/types/appointment';

const MessagesPage: React.FC = () => {
  const [msgList, setMsgList] = useState<MessageItem[]>(messages);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showDetail, setShowDetail] = useState<MessageItem | null>(null);

  const typeConfig = {
    calling: { label: '叫号通知', icon: '🔔', class: 'calling' },
    report: { label: '报告通知', icon: '📄', class: 'report' },
    appointment: { label: '预约通知', icon: '📅', class: 'appointment' },
    system: { label: '系统通知', icon: 'ℹ️', class: 'system' }
  };

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'calling', label: '叫号' },
    { key: 'report', label: '报告' },
    { key: 'appointment', label: '预约' },
    { key: 'system', label: '系统' }
  ];

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    msgList.forEach(m => {
      if (!m.read) {
        counts.all = (counts.all || 0) + 1;
        counts[m.type] = (counts[m.type] || 0) + 1;
      }
    });
    return counts;
  }, [msgList]);

  const filteredList = useMemo(() => {
    if (activeTab === 'all') return msgList;
    return msgList.filter(m => m.type === activeTab);
  }, [msgList, activeTab]);

  const markAsRead = (id: string) => {
    setMsgList(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const handleMessageClick = (msg: MessageItem) => {
    console.log(`[Messages] Click message: ${msg.id}`);
    markAsRead(msg.id);
    setShowDetail(msg);
  };

  const handleMessageAction = (action: string, msg: MessageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`[Messages] Action: ${action} for ${msg.id}`);
    markAsRead(msg.id);
    if (action === 'waiting') {
      setShowDetail(null);
      Taro.switchTab({ url: '/pages/waiting/index' });
    } else if (action === 'record') {
      setShowDetail(null);
      Taro.navigateTo({ url: '/pages/records/index' });
    } else if (action === 'confirm') {
      Taro.showToast({ title: '已确认', icon: 'success' });
      setShowDetail(null);
    } else if (action === 'instructions') {
      setShowDetail(null);
      Taro.switchTab({ url: '/pages/instructions/index' });
    }
  };

  const handleReadAll = () => {
    Taro.showModal({
      title: '全部已读',
      content: '确定将所有消息标记为已读吗？',
      success: (res) => {
        if (res.confirm) {
          setMsgList(prev => prev.map(m => ({ ...m, read: true })));
          Taro.showToast({ title: '已全部标记', icon: 'success' });
        }
      }
    });
  };

  const getActionBtn = (msg: MessageItem) => {
    switch (msg.type) {
      case 'calling':
        return (
          <View className={styles.btnPrimary} onClick={(e) => handleMessageAction('waiting', msg, e)}>
            查看候诊
          </View>
        );
      case 'report':
        return (
          <View className={styles.btnPrimary} onClick={(e) => handleMessageAction('record', msg, e)}>
            查看报告
          </View>
        );
      case 'appointment':
        return (
          <View className={styles.btnPrimary} onClick={(e) => handleMessageAction('confirm', msg, e)}>
            查看预约
          </View>
        );
      default:
        return (
          <View className={styles.btnLink} onClick={(e) => handleMessageAction('instructions', msg, e)}>
            查看详情
          </View>
        );
    }
  };

  const getModalPrimaryBtn = (msg: MessageItem) => {
    switch (msg.type) {
      case 'calling': return { label: '前往候诊', action: 'waiting' };
      case 'report': return { label: '查看报告', action: 'record' };
      case 'appointment': return { label: '查看预约', action: 'record' };
      default: return { label: '查看详情', action: 'instructions' };
    }
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.headerBar}>
        <Text className={styles.title}>消息中心</Text>
        {unreadCounts.all > 0 && (
          <Text className={styles.readAll} onClick={handleReadAll}>全部已读</Text>
        )}
      </View>

      <View className={styles.categoryTabs}>
        {tabs.map(tab => (
          <View
            key={tab.key}
            className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {unreadCounts[tab.key] > 0 && (
              <View className={styles.badge}>{unreadCounts[tab.key]}</View>
            )}
          </View>
        ))}
      </View>

      {unreadCounts.all > 0 && (
        <View className={styles.summaryCard} onClick={() => setActiveTab('all')}>
          <View className={styles.icon}>📬</View>
          <View className={styles.content}>
            <View className={styles.count}>
              您有 <Text className={styles.num}>{unreadCounts.all}</Text> 条未读消息
            </View>
            <View className={styles.desc}>点击查看最新的检查通知与温馨提示</View>
          </View>
          <Text className={styles.arrow}>›</Text>
        </View>
      )}

      {filteredList.length > 0 ? (
        <View className={styles.messageList}>
          {filteredList.map(msg => {
            const config = typeConfig[msg.type];
            return (
              <View
                key={msg.id}
                className={classnames(styles.messageCard, !msg.read && styles.unread)}
                onClick={() => handleMessageClick(msg)}
              >
                <View className={styles.cardTop}>
                  <View className={classnames(styles.typeIcon, styles[config.class])}>
                    {config.icon}
                  </View>
                  <View className={styles.typeInfo}>
                    <View className={styles.typeName}>
                      {config.label}
                      {!msg.read && <View className={styles.unreadDot} />}
                    </View>
                    <View className={styles.time}>{msg.time}</View>
                  </View>
                </View>
                <View className={styles.cardBody}>
                  <View className={styles.title}>{msg.title}</View>
                  <View className={styles.content}>{msg.content}</View>
                </View>
                <View className={styles.cardFooter}>
                  {getActionBtn(msg)}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View className={styles.emptyBox}>
          <View className={styles.icon}>✉️</View>
          <View className={styles.title}>暂无消息</View>
          <View className={styles.desc}>您还没有该类型的消息记录</View>
        </View>
      )}

      {showDetail && (() => {
        const config = typeConfig[showDetail.type];
        const primaryBtn = getModalPrimaryBtn(showDetail);
        return (
          <View className={styles.detailModalOverlay} onClick={() => setShowDetail(null)}>
            <View className={styles.detailModal} onClick={e => e.stopPropagation()}>
              <View className={styles.modalHeader}>
                <Text className={styles.title}>消息详情</Text>
                <Text className={styles.close} onClick={() => setShowDetail(null)}>×</Text>
              </View>
              <ScrollView scrollY className={styles.modalBody}>
                <View className={styles.modalMeta}>
                  <View className={classnames(styles.typeIcon, styles[config.class])}>
                    {config.icon}
                  </View>
                  <View className={styles.info}>
                    <View className={styles.typeName}>{showDetail.title}</View>
                    <View className={styles.time}>{showDetail.time}</View>
                  </View>
                </View>
                <View className={styles.modalContent}>{showDetail.content}</View>
              </ScrollView>
              <View className={styles.modalActions}>
                <View className={classnames(styles.modalBtn, styles.secondary)} onClick={() => setShowDetail(null)}>
                  关闭
                </View>
                <View
                  className={classnames(styles.modalBtn, styles.primary)}
                  onClick={(e) => handleMessageAction(primaryBtn.action, showDetail, e as any)}
                >
                  {primaryBtn.label}
                </View>
              </View>
            </View>
          </View>
        );
      })()}
    </ScrollView>
  );
};

export default MessagesPage;
