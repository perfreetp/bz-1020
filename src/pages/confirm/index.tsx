import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { departments } from '@/data/departments';
import StepIndicator from '@/components/StepIndicator';
import { formatDisplayDate } from '@/utils/date';
import { Department } from '@/types/appointment';

const ConfirmPage: React.FC = () => {
  const [department, setDepartment] = useState<Department | null>(null);
  const [selectedDate] = useState(Taro.getStorageSync('selectedDate') || '2026-06-15');
  const [selectedSlot] = useState(Taro.getStorageSync('selectedSlot') || '10:00-10:30');

  const [examType, setExamType] = useState<'normal' | 'painless'>('painless');
  const [patientName, setPatientName] = useState('张三');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('45');
  const [phone, setPhone] = useState('138****5678');
  const [idCard, setIdCard] = useState('320***********1234');
  const [companionName, setCompanionName] = useState('张妻');
  const [companionPhone, setCompanionPhone] = useState('139****9876');
  const [companionRelation, setCompanionRelation] = useState('配偶');
  const [uploads, setUploads] = useState<string[]>(['📄']);
  const [fastingConfirmed, setFastingConfirmed] = useState(false);
  const [companionConfirmed, setCompanionConfirmed] = useState(true);

  useEffect(() => {
    const cached = Taro.getStorageSync('selectedDepartment');
    const dept = cached || departments[3];
    setDepartment(dept);
    console.log(`[Confirm] Department: ${dept?.name}`);
  }, []);

  const relations = ['配偶', '子女', '父母', '朋友', '其他'];

  const handleUpload = () => {
    console.log('[Confirm] Upload report clicked');
    if (uploads.length >= 6) {
      Taro.showToast({ title: '最多上传6张', icon: 'none' });
      return;
    }
    setUploads([...uploads, '📄']);
    Taro.showToast({ title: '上传成功', icon: 'success' });
  };

  const handleRemoveUpload = (idx: number) => {
    setUploads(uploads.filter((_, i) => i !== idx));
  };

  const canSubmit = patientName && age && phone && fastingConfirmed;
  const basePrice = department?.price || 0;
  const totalPrice = examType === 'painless' && !department?.name.includes('无痛')
    ? basePrice + 460
    : basePrice;

  const handleSubmit = () => {
    if (!canSubmit) {
      if (!fastingConfirmed) {
        Taro.showToast({ title: '请确认禁食要求', icon: 'none' });
      } else {
        Taro.showToast({ title: '请完善患者信息', icon: 'none' });
      }
      return;
    }

    console.log('[Confirm] Submit appointment');
    Taro.showLoading({ title: '提交中...' });

    setTimeout(() => {
      Taro.hideLoading();
      Taro.showModal({
        title: '预约成功',
        content: `您已成功预约：${department?.name}\n时间：${formatDisplayDate(selectedDate)} ${selectedSlot}\n请提前做好检查前准备。`,
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          Taro.switchTab({ url: '/pages/index/index' });
        }
      });
    }, 1000);
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.stepBar}>
        <StepIndicator steps={['选择科室', '选择日期', '确认信息']} currentStep={2} />
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <View className={styles.icon}>📋</View>
          <Text className={styles.title}>预约信息</Text>
        </View>
        <View className={styles.summaryCard}>
          <View className={styles.row}>
            <Text className={styles.label}>检查项目</Text>
            <Text className={styles.value}>{department?.name || '肠镜+息肉摘除'}</Text>
          </View>
          <View className={styles.row}>
            <Text className={styles.label}>检查时间</Text>
            <Text className={styles.value}>{formatDisplayDate(selectedDate)} {selectedSlot}</Text>
          </View>
          <View className={styles.row}>
            <Text className={styles.label}>检查时长</Text>
            <Text className={styles.value}>约{department?.duration || 40}分钟</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <View className={styles.icon}>💉</View>
          <Text className={styles.title}>检查方式</Text>
          <Text className={styles.required}>*</Text>
        </View>
        <View className={styles.typePicker}>
          <View
            className={classnames(styles.typeCard, examType === 'normal' && styles.active)}
            onClick={() => setExamType('normal')}
          >
            <View className={styles.check}>✓</View>
            <View className={styles.icon}>🔬</View>
            <View className={styles.name}>普通检查</View>
            <View className={styles.desc}>清醒状态，无麻醉风险</View>
            <View className={styles.price}>
              <Text className={styles.currency}>¥</Text>
              {basePrice}
            </View>
          </View>
          <View
            className={classnames(styles.typeCard, examType === 'painless' && styles.active)}
            onClick={() => setExamType('painless')}
          >
            <View className={styles.check}>✓</View>
            <View className={styles.icon}>😴</View>
            <View className={styles.name}>无痛检查</View>
            <View className={styles.desc}>静脉麻醉，全程无痛</View>
            <View className={styles.price}>
              <Text className={styles.currency}>¥</Text>
              {totalPrice}
            </View>
          </View>
        </View>
        {examType === 'painless' && (
          <View style={{ fontSize: 22, color: '#FF9500', padding: '12rpx 16rpx', background: 'rgba(255,149,0,0.06)', borderRadius: 8 }}>
            ⚠️ 无痛检查必须有家属陪同，术后24小时禁止驾驶车辆
          </View>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <View className={styles.icon}>👤</View>
          <Text className={styles.title}>患者信息</Text>
          <Text className={styles.required}>*</Text>
        </View>

        <View className={styles.formGroup}>
          <View className={styles.formLabel}>
            <Text className={styles.required}>*</Text>姓名
          </View>
          <View className={styles.formInput}>
            <Input
              value={patientName}
              placeholder="请输入患者姓名"
              placeholderClass={styles.placeholder}
              onInput={(e) => setPatientName(e.detail.value)}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View className={styles.formGroup}>
          <View className={styles.formLabel}>
            <Text className={styles.required}>*</Text>性别
          </View>
          <View className={styles.genderPicker}>
            <View
              className={classnames(styles.genderItem, gender === 'male' && styles.active)}
              onClick={() => setGender('male')}
            >
              👨 男
            </View>
            <View
              className={classnames(styles.genderItem, gender === 'female' && styles.active)}
              onClick={() => setGender('female')}
            >
              👩 女
            </View>
          </View>
        </View>

        <View className={styles.formGroup}>
          <View className={styles.formLabel}>
            <Text className={styles.required}>*</Text>年龄
          </View>
          <View className={styles.formInput}>
            <Input
              type="number"
              value={age}
              placeholder="请输入年龄"
              placeholderClass={styles.placeholder}
              onInput={(e) => setAge(e.detail.value)}
              style={{ flex: 1 }}
            />
            <Text className={styles.prefix}>岁</Text>
          </View>
        </View>

        <View className={styles.formGroup}>
          <View className={styles.formLabel}>
            <Text className={styles.required}>*</Text>手机号
          </View>
          <View className={styles.formInput}>
            <Input
              type="number"
              value={phone}
              placeholder="请输入手机号码"
              placeholderClass={styles.placeholder}
              onInput={(e) => setPhone(e.detail.value)}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View className={styles.formGroup}>
          <View className={styles.formLabel}>身份证号</View>
          <View className={styles.formInput}>
            <Input
              value={idCard}
              placeholder="请输入身份证号"
              placeholderClass={styles.placeholder}
              onInput={(e) => setIdCard(e.detail.value)}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>

      {examType === 'painless' && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.icon}>👨‍👩‍👧</View>
            <Text className={styles.title}>陪同人信息</Text>
            <Text className={styles.required}>*</Text>
          </View>

          <View className={styles.formGroup}>
            <View className={styles.formLabel}>陪同人姓名</View>
            <View className={styles.formInput}>
              <Input
                value={companionName}
                placeholder="请输入陪同人姓名"
                placeholderClass={styles.placeholder}
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
                placeholder="请输入陪同人电话"
                placeholderClass={styles.placeholder}
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
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <View className={styles.icon}>📁</View>
          <Text className={styles.title}>既往报告上传</Text>
        </View>
        <View className={styles.uploadArea} onClick={handleUpload}>
          <View className={styles.icon}>📤</View>
          <View className={styles.title}>点击上传既往检查报告</View>
          <View className={styles.hint}>支持 PDF、JPG、PNG 格式，最多6张</View>
        </View>
        {uploads.length > 0 && (
          <View className={styles.uploadList}>
            {uploads.map((u, idx) => (
              <View key={idx} className={styles.uploadItem}>
                <Text>{u}</Text>
                <View className={styles.remove} onClick={() => handleRemoveUpload(idx)}>×</View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <View className={styles.icon}>⚠️</View>
          <Text className={styles.title}>检查前确认</Text>
        </View>
        <View
          className={styles.confirmCheckbox}
          onClick={() => setFastingConfirmed(!fastingConfirmed)}
        >
          <View className={classnames(styles.checkbox, fastingConfirmed && styles.checked)}>
            <Text className={styles.icon}>✓</Text>
          </View>
          <View className={styles.text}>
            我已认真阅读并确认：
            {'\n'}1. <strong>胃镜检查</strong>：检查前8小时禁食、6小时禁水
            {'\n'}2. <strong>肠镜检查</strong>：按医嘱完成肠道准备
            {'\n'}3. 服用抗凝/抗血小板药物（阿司匹林等）已告知医生
            {'\n'}4. 无痛检查当日有家属陪同
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.priceInfo}>
          <View className={styles.label}>预估费用</View>
          <View className={styles.price}>
            <Text className={styles.currency}>¥</Text>{totalPrice}
          </View>
        </View>
        <View
          className={classnames(styles.submitBtn, !canSubmit && styles.disabled)}
          onClick={handleSubmit}
        >
          确认预约
        </View>
      </View>
    </ScrollView>
  );
};

export default ConfirmPage;
