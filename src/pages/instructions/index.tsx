import React, { useState } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { colonPreparationSteps, gastroPreparationSteps, generalPrecautions } from '@/data/messages';
import { PreparationStep } from '@/types/appointment';
import { useApp } from '@/store/AppContext';

const InstructionsPage: React.FC = () => {
  const { state, dispatch } = useApp();
  const [activeCategory, setActiveCategory] = useState<'colon' | 'gastro' | 'general'>('colon');
  const [companionName, setCompanionName] = useState(state.companionInfo.name);
  const [companionPhone, setCompanionPhone] = useState(state.companionInfo.phone);
  const [companionRelation, setCompanionRelation] = useState(state.companionInfo.relation);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqList = [
    { q: '无痛检查和普通检查有什么区别？', a: '无痛检查是在静脉麻醉下进行，全程睡眠无疼痛感，但需要家属陪同，术后24小时不能驾车。普通检查清醒状态下进行，费用较低，无需陪同，检查后可立即正常活动。' },
    { q: '肠道准备到什么程度才算合格？', a: '最后排出的大便应为无色或淡黄色清水样，无粪渣或固体物质，像尿液一样清澈即为合格。如果仍有粪渣，会影响检查视野，可能需要重新准备或改期。' },
    { q: '检查后多久可以进食？', a: '普通胃肠镜检查后2小时可吃温凉流质；无痛检查需完全清醒后（1-2小时）先饮水无呛咳再进食；取活检或息肉摘除者需遵医嘱延长禁食时间。' },
    { q: '做了肠镜后腹胀怎么办？', a: '这是正常现象，因为检查时向肠腔内注气便于观察。建议多走动，按顺时针方向轻揉腹部，一般数小时后会逐渐缓解，如有剧烈腹痛请及时就医。' }
  ];

  const relations = ['配偶', '子女', '父母', '朋友', '其他'];

  const getSteps = (): PreparationStep[] => {
    if (activeCategory === 'colon') return colonPreparationSteps;
    if (activeCategory === 'gastro') return gastroPreparationSteps;
    return [];
  };

  const getBanner = () => {
    if (activeCategory === 'colon') {
      return { title: '肠镜检查 · 肠道准备全指南', desc: '规范的肠道准备是肠镜检查成功的关键，请严格按照以下步骤执行，确保检查顺利进行。' };
    }
    if (activeCategory === 'gastro') {
      return { title: '胃镜检查 · 术前术后须知', desc: '胃镜检查前的充分准备和术后的正确护理，能最大程度降低风险、提升舒适度，请认真阅读以下内容。' };
    }
    return { title: '通用注意事项', desc: '消化内镜检查前后的通用注意事项和常见问题解答，帮助您安全顺利地完成检查。' };
  };

  const steps = getSteps();
  const banner = getBanner();

  const handleSaveCompanion = () => {
    if (!companionName || !companionPhone) {
      Taro.showToast({ title: '请完善陪同人信息', icon: 'none' });
      return;
    }
    console.log(`[Instructions] Save companion: ${companionName} ${companionPhone} ${companionRelation}`);
    dispatch({
      type: 'SET_COMPANION_INFO',
      payload: { name: companionName, phone: companionPhone, relation: companionRelation }
    });
    Taro.showToast({ title: '保存成功', icon: 'success' });
  };

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.categoryTabs}>
        <View
          className={classnames(styles.tabItem, activeCategory === 'colon' && styles.active)}
          onClick={() => setActiveCategory('colon')}
        >🩺 肠镜准备</View>
        <View
          className={classnames(styles.tabItem, activeCategory === 'gastro' && styles.active)}
          onClick={() => setActiveCategory('gastro')}
        >🔬 胃镜准备</View>
        <View
          className={classnames(styles.tabItem, activeCategory === 'general' && styles.active)}
          onClick={() => setActiveCategory('general')}
        >📋 通用须知</View>
      </View>

      <View className={styles.banner}>
        <View className={styles.title}>{banner.title}</View>
        <View className={styles.desc}>{banner.desc}</View>
      </View>

      {activeCategory !== 'general' && steps.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={classnames(styles.icon, activeCategory === 'colon' ? 'green' : 'blue')}>
              {activeCategory === 'colon' ? '🩺' : '🔬'}
            </View>
            <Text className={styles.title}>准备步骤详解</Text>
          </View>
          <View className={styles.stepList}>
            {steps.map((step, idx) => (
              <View key={step.id} className={styles.stepItem}>
                <View className={styles.stepNum}>{idx + 1}</View>
                <View className={styles.stepContent}>
                  <View className={styles.stepTitle}>{step.title}</View>
                  <View className={styles.stepTime}>⏰ {step.timeRange}</View>
                  <View className={styles.stepDesc}>{step.description}</View>
                  <View className={styles.stepKeyPoints}>
                    {step.keyPoints.map((point, pIdx) => (
                      <View key={pIdx} className={styles.pointItem}>
                        <Text className={styles.check}>✓</Text>
                        <Text>{point}</Text>
                      </View>
                    ))}
                  </View>
                  {step.warning && (
                    <View className={styles.warningBox}>
                      <Text className={styles.icon}>⚠️</Text>
                      <Text>{step.warning}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {activeCategory === 'general' && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={classnames(styles.icon, 'orange')}>📌</View>
            <Text className={styles.title}>通用注意事项</Text>
          </View>
          <View className={styles.precautionsList}>
            {generalPrecautions.map((item, idx) => (
              <View key={item.id} className={styles.precautionItem}>
                <View className={styles.num}>{idx + 1}</View>
                <View className={styles.content}>
                  <View className={styles.title}>{item.title}</View>
                  <View className={styles.text}>{item.content}</View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <View className={classnames(styles.icon, 'purple')}>❓</View>
          <Text className={styles.title}>常见问题</Text>
        </View>
        <View>
          {faqList.map((faq, idx) => (
            <View key={idx} className={styles.accordionItem}>
              <View className={styles.accordionHeader} onClick={() => toggleFaq(idx)}>
                <Text className={styles.q}>Q：{faq.q}</Text>
                <Text className={classnames(styles.arrow, openFaq === idx && styles.open)}>▼</Text>
              </View>
              {openFaq === idx && (
                <View className={styles.accordionBody}>A：{faq.a}</View>
              )}
            </View>
          ))}
        </View>
      </View>

      <View className={styles.companionSection}>
        <View className={styles.sectionHeader}>
          <View className={classnames(styles.icon, 'blue')}>👨‍👩‍👧</View>
          <Text className={styles.title}>陪同人信息</Text>
        </View>
        <View style={{ fontSize: 22, color: '#8C8C8C', marginBottom: 24, padding: '8rpx 16rpx', background: 'rgba(25,137,250,0.06)', borderRadius: 8 }}>
          💡 无痛检查、身体虚弱或行动不便的患者，建议保存陪同人信息，便于紧急联系
        </View>

        <View className={styles.formGroup}>
          <View className={styles.formLabel}>陪同人姓名</View>
          <View className={styles.formInput}>
            <Input
              value={companionName}
              placeholder="请输入陪同人姓名"
              onInput={(e) => setCompanionName(e.detail.value)}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View className={styles.formGroup}>
          <View className={styles.formLabel}>陪同人电话</View>
          <View className={styles.formInput}>
            <Input
              type="number"
              value={companionPhone}
              placeholder="请输入陪同人联系电话"
              onInput={(e) => setCompanionPhone(e.detail.value)}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View className={styles.formGroup}>
          <View className={styles.formLabel}>与患者关系</View>
          <View className={styles.relationPicker}>
            {relations.map((r) => (
              <View
                key={r}
                className={classnames(styles.relationTag, companionRelation === r && styles.active)}
                onClick={() => setCompanionRelation(r)}
              >
                {r}
              </View>
            ))}
          </View>
        </View>

        <View className={styles.saveBtn} onClick={handleSaveCompanion}>
          保存陪同人信息
        </View>
      </View>
    </ScrollView>
  );
};

export default InstructionsPage;
