import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { departments } from '@/data/departments';
import { Department } from '@/types/appointment';
import { useApp } from '@/store/AppContext';

const DepartmentPage: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'gastro' | 'colon'>('all');

  useEffect(() => {
    const category = router.params.category;
    if (category === 'gastro') setActiveTab('gastro');
    else if (category === 'colon') setActiveTab('colon');
    console.log(`[Department] Filter category: ${category}`);
  }, [router.params]);

  const filteredList = useMemo(() => {
    if (activeTab === 'all') return departments;
    return departments.filter(d => d.category === activeTab || d.type === 'both');
  }, [activeTab]);

  const getCardClass = (item: Department) => {
    if (item.type === 'both') return 'bothCategory';
    return item.category === 'gastro' ? 'gastroCategory' : 'colonCategory';
  };

  const getTagClass = (item: Department, _tag: string) => {
    if (item.type === 'both') return 'painlessTag';
    return item.category === 'gastro' ? 'gastroTag' : 'colonTag';
  };

  const handleSelect = (item: Department) => {
    console.log(`[Department] Selected: ${item.id} - ${item.name}`);
    dispatch({ type: 'SET_SELECTED_DEPARTMENT', payload: item });
    dispatch({ type: 'SET_SELECTED_DATE', payload: '' });
    dispatch({ type: 'SET_SELECTED_SLOT', payload: '' });
    dispatch({ type: 'CLEAR_REPORTS' });
    Taro.navigateTo({ url: `/pages/calendar/index?deptId=${item.id}` });
  };

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.container}>
        <View className={styles.filterTabs}>
          <View
            className={classnames(styles.tabItem, activeTab === 'all' && styles.active)}
            onClick={() => setActiveTab('all')}
          >全部项目</View>
          <View
            className={classnames(styles.tabItem, activeTab === 'gastro' && styles.active)}
            onClick={() => setActiveTab('gastro')}
          >胃镜检查</View>
          <View
            className={classnames(styles.tabItem, activeTab === 'colon' && styles.active)}
            onClick={() => setActiveTab('colon')}
          >肠镜检查</View>
        </View>

        <View className={styles.sectionHeader}>
          <Text className={styles.title}>可预约项目</Text>
          <Text className={styles.count}>共 {filteredList.length} 项</Text>
        </View>

        {filteredList.length > 0 ? (
          <View className={styles.deptList}>
            {filteredList.map((item) => (
              <View
                key={item.id}
                className={classnames(styles.deptCard, styles[getCardClass(item)])}
                onClick={() => handleSelect(item)}
              >
                <View className={styles.cardTop}>
                  <View className={styles.deptInfo}>
                    <View className={styles.deptName}>{item.name}</View>
                    <View className={styles.deptDesc}>{item.description}</View>
                  </View>
                  <View className={styles.priceBox}>
                    <View className={styles.price}>
                      <Text className={styles.currency}>¥</Text>{item.price}
                    </View>
                    <View className={styles.duration}>约{item.duration}分钟</View>
                  </View>
                </View>

                <View className={styles.tagList}>
                  {item.tags.map((tag, idx) => (
                    <View key={idx} className={classnames(styles.tag, styles[getTagClass(item, tag)])}>
                      {tag}
                    </View>
                  ))}
                </View>

                <View className={styles.cardBottom}>
                  <View className={styles.prepHint}>
                    <Text className={styles.icon}>📌</Text>
                    <Text className={styles.text}>{item.preparation}</Text>
                  </View>
                  <View className={styles.selectBtn} onClick={(e) => { e.stopPropagation(); handleSelect(item); }}>
                    选择预约
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className={styles.noData}>
            <View className={styles.icon}>🔍</View>
            <View className={styles.text}>暂无相关检查项目</View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default DepartmentPage;
