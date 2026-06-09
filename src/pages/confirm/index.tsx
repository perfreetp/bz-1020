import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { departments } from '@/data/departments';
import StepIndicator from '@/components/StepIndicator';
import { formatDisplayDate } from '@/utils/date';
import { Department, UploadedReport } from '@/types/appointment';
import { useApp } from '@/store/AppContext';

const ConfirmPage: React.FC = () => {
  const { state, dispatch, createAppointment } = useApp();

  const department: Department | null = useMemo(() => {
    return state.selectedDepartment || departments[3];
  }, [state.selectedDepartment]);

  const selectedDate = state.selectedDate || '2026-06-15';
  const selectedSlot = state.selectedSlot || '10:00-10:30';

  const isPainlessDefault = useMemo(() => {
    return department?.name.includes('无痛') || department?.name.includes('联合');
  }, [department]);

  const [examType, setExamType] = useState<'normal' | 'painless'>(
    isPainlessDefault ? 'painless' : 'normal'
  );

  const [patientName, setPatientName] = useState(state.patientInfo.name);
  const [gender, setGender] = useState<'male' | 'female'>(state.patientInfo.gender);
  const [age, setAge] = useState(state.patientInfo.age);
  const [phone, setPhone] = useState(state.patientInfo.phone);
  const [idCard, setIdCard] = useState(state.patientInfo.idCard);
  const [companionName, setCompanionName] = useState(state.companionInfo.name);
  const [companionPhone, setCompanionPhone] = useState(state.companionInfo.phone);
  const [companionRelation, setCompanionRelation] = useState(state.companionInfo.relation);

  // 初始化时从 state.uploadedReports 恢复
  const [uploadedFiles, setUploadedFiles] = useState<UploadedReport[]>(state.uploadedReports);
  const [fastingConfirmed, setFastingConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isPainlessDefault) setExamType('painless');
  }, [isPainlessDefault]);

  // 同步本地 uploadedFiles 到 Context
  useEffect(() => {
    // 如果 Context 里有但本地没有，就同步进来（比如从其他页面回来）
    if (state.uploadedReports.length > uploadedFiles.length) {
      setUploadedFiles(state.uploadedReports);
    }
  }, [state.uploadedReports.length]);

  const relations = ['配偶', '子女', '父母', '朋友', '其他'];

  const basePrice = department?.price || 0;
  const hasPainlessTag = isPainlessDefault;
  const normalPrice = basePrice;
  const painlessPrice = hasPainlessTag ? basePrice : basePrice + 460;

  const totalPrice = examType === 'painless' ? painlessPrice : normalPrice;
  const showTypePicker = !hasPainlessTag;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const genReportId = () => `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 黑名单：包含这些关键词的名称就是临时路径，一律不用
  const TEMP_PATH_KEYWORDS = ['tmp', 'temp', 'wxfile', 'http://', 'https://', '/', '\\', 'blob:', 'file:'];

  // 检查名称是否是一个"正常、可读"的文件名
  const isReadableFileName = (name: unknown): name is string => {
    if (typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 80) return false;
    // 不能包含路径分隔符或临时关键词
    const lower = trimmed.toLowerCase();
    for (const kw of TEMP_PATH_KEYWORDS) {
      if (lower.includes(kw)) return false;
    }
    // 必须是正常可见字符开头
    return /^[a-zA-Z0-9_\u4e00-\u9fa5]/.test(trimmed);
  };

  // 稳定的报告名生成（带序号，不依赖平台临时路径）
  const genStableReportName = (
    category: 'image' | 'pdf' | 'file',
    indexInBatch: number,
    totalExisting: number
  ): string => {
    const seq = String(totalExisting + indexInBatch + 1).padStart(2, '0');
    const today = new Date();
    const dateTag = `${today.getMonth() + 1}${today.getDate()}`; // 如 69 表示 6月9日
    const extMap: Record<string, string> = { image: 'jpg', pdf: 'pdf', file: 'docx' };
    const typeMap: Record<string, string> = { image: '影像报告', pdf: '检查报告', file: '病历资料' };
    return `${typeMap[category]}_${dateTag}_${seq}.${extMap[category]}`;
  };

  // 统一的文件名决策：优先真实名 → 否则稳定名（绝不返回临时路径）
  const decideReportFileName = (
    rawName: unknown,
    category: 'image' | 'pdf' | 'file',
    indexInBatch: number,
    totalExisting: number
  ): string => {
    // 1. 优先用平台提供的真实可读文件名
    if (isReadableFileName(rawName)) {
      return rawName as string;
    }
    // 2. 否则用生成的稳定名称
    return genStableReportName(category, indexInBatch, totalExisting);
  };

  const handleUpload = async () => {
    console.log('[Confirm] Upload file clicked');
    const existingCount = uploadedFiles.length;
    if (existingCount >= 6) {
      Taro.showToast({ title: '最多上传6个文件', icon: 'none' });
      return;
    }

    try {
      const actionSheet = await Taro.showActionSheet({
        itemList: ['选择图片', '选择文件']
      });

      if (actionSheet.tapIndex === 0) {
        // 选择图片
        const res = await Taro.chooseImage({
          count: 6 - existingCount,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera']
        });
        const newFiles: UploadedReport[] = res.tempFiles.map((f, idx) => {
          // 使用统一决策：可读原名（如相册有name字段）→ 否则生成稳定名
          const fileName = decideReportFileName(
            (f as any).name,
            'image',
            idx,
            existingCount
          );
          return {
            id: genReportId(),
            name: fileName,
            path: f.path,
            size: formatFileSize(f.size),
            type: 'image',
            preview: f.path
          };
        });
        const merged = [...uploadedFiles, ...newFiles];
        setUploadedFiles(merged);
        // 同步到 Context
        newFiles.forEach(f => dispatch({ type: 'ADD_REPORT', payload: f }));
        console.log('[Confirm] Image uploaded:', newFiles.map(f => f.name));
        Taro.showToast({ title: `已上传${newFiles.length}张图片`, icon: 'success' });
      } else {
        // 选择文件 - 小程序端调 chooseMessageFile
        try {
          // @ts-ignore - chooseMessageFile 在某些类型声明中可能不存在
          const res = await Taro.chooseMessageFile({
            count: 6 - existingCount,
            type: 'file'
          });
          if (res && res.tempFiles) {
            const newFiles: UploadedReport[] = res.tempFiles.map((f: any, idx: number) => {
              const isPdf = f.name && f.name.toLowerCase().endsWith('.pdf');
              const category: 'pdf' | 'file' = isPdf ? 'pdf' : 'file';
              return {
                id: genReportId(),
                name: decideReportFileName(f.name, category, idx, existingCount),
                path: f.path || f.tempFilePath || 'mock://file',
                size: formatFileSize(f.size || 0),
                type: category,
                preview: undefined
              };
            });
            const merged = [...uploadedFiles, ...newFiles];
            setUploadedFiles(merged);
            newFiles.forEach(f => dispatch({ type: 'ADD_REPORT', payload: f }));
            console.log('[Confirm] File uploaded via chooseMessageFile:', newFiles);
            Taro.showToast({ title: `已上传${newFiles.length}个文件`, icon: 'success' });
          }
        } catch (fileErr) {
          // H5或不支持chooseMessageFile的环境，走模拟选择
          console.warn('[Confirm] chooseMessageFile not available, fallback to mock', fileErr);
          const stableMockFiles: UploadedReport[] = [
            {
              id: genReportId(),
              name: decideReportFileName(null, 'pdf', 0, existingCount),
              path: 'mock://pdf/' + Date.now(),
              size: '1.2 MB',
              type: 'pdf'
            },
            {
              id: genReportId(),
              name: decideReportFileName(null, 'file', 1, existingCount),
              path: 'mock://doc/' + Date.now(),
              size: '384 KB',
              type: 'file'
            }
          ];
          const pickCount = Math.min(1, 6 - existingCount);
          const picks = stableMockFiles.slice(0, pickCount);
          const merged = [...uploadedFiles, ...picks];
          setUploadedFiles(merged);
          picks.forEach(f => dispatch({ type: 'ADD_REPORT', payload: f }));
          console.log('[Confirm] Mock file uploaded:', picks);
          Taro.showToast({ title: `已上传${picks.length}个文件`, icon: 'success' });
        }
      }
    } catch (e) {
      if ((e as any).errMsg !== 'showActionSheet:fail cancel') {
        console.error('[Confirm] Upload error:', e);
      }
    }
  };

  const handleRemoveUpload = (id: string) => {
    const removed = uploadedFiles.find(f => f.id === id);
    if (!removed) return;
    setUploadedFiles(uploadedFiles.filter(f => f.id !== id));
    dispatch({ type: 'REMOVE_REPORT', payload: id });
    console.log(`[Confirm] Removed file: ${removed.name}`);
    Taro.showToast({ title: '已删除', icon: 'success' });
  };

  const canSubmit = patientName && age && phone && fastingConfirmed && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) {
      if (!fastingConfirmed) {
        Taro.showToast({ title: '请确认禁食要求', icon: 'none' });
      } else {
        Taro.showToast({ title: '请完善患者信息', icon: 'none' });
      }
      return;
    }

    if (!department) {
      Taro.showToast({ title: '未选择检查项目', icon: 'none' });
      return;
    }

    setSubmitting(true);
    // 提交时，使用当前的 uploadedFiles（已经反映了用户的删除操作）
    const reportsToSave: UploadedReport[] = [...uploadedFiles];
    console.log('[Confirm] Submit appointment, reports count:', reportsToSave.length, reportsToSave.map(f => f.name));
    Taro.showLoading({ title: '提交预约中...' });

    // 更新患者信息和陪同信息到全局状态
    dispatch({ type: 'SET_PATIENT_INFO', payload: {
      name: patientName,
      gender,
      age,
      phone,
      idCard
    }});
    dispatch({ type: 'SET_COMPANION_INFO', payload: {
      name: companionName,
      phone: companionPhone,
      relation: companionRelation
    }});

    setTimeout(() => {
      try {
        const newAppt = createAppointment({
          departmentId: department.id,
          departmentName: department.name,
          category: department.category,
          examinationType: examType,
          date: selectedDate,
          slot: selectedSlot,
          price: totalPrice,
          duration: department.duration,
          reports: reportsToSave, // 使用用户当前上传的（已删除的不再包含）
          companion: (examType === 'painless' && companionName && companionPhone)
            ? { name: companionName, phone: companionPhone, relation: companionRelation }
            : null,
          fastingConfirmed
        });

        // 提交成功后清空本地和 Context 中的 uploadedReports
        dispatch({ type: 'CLEAR_REPORTS' });
        setUploadedFiles([]);

        Taro.hideLoading();
        Taro.showModal({
          title: '🎉 预约成功',
          content:
`预约编号：${newAppt.orderNo}
检查项目：${newAppt.departmentName}
检查方式：${examType === 'painless' ? '无痛检查' : '普通检查'}
检查时间：${formatDisplayDate(selectedDate)} ${selectedSlot}
检查费用：¥${totalPrice}
既往报告：${reportsToSave.length > 0 ? `${reportsToSave.length}份` : '未上传'}

请按要求做好检查前准备，
建议提前30分钟到院报到。`,
          showCancel: false,
          confirmText: '去首页查看',
          success: () => {
            setSubmitting(false);
            Taro.switchTab({ url: '/pages/index/index' });
          }
        });
      } catch (e) {
        console.error('[Confirm] Submit error:', e);
        Taro.hideLoading();
        Taro.showToast({ title: '提交失败，请重试', icon: 'error' });
        setSubmitting(false);
      }
    }, 1200);
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
          <View className={styles.row}>
            <Text className={styles.label}>检查科室</Text>
            <Text className={styles.value}>消化内镜中心</Text>
          </View>
        </View>
      </View>

      {showTypePicker && (
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
                {normalPrice}
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
                {painlessPrice}
              </View>
            </View>
          </View>
          {examType === 'painless' && (
            <View style={{ fontSize: 22, color: '#FF9500', padding: '12rpx 16rpx', background: 'rgba(255,149,0,0.06)', borderRadius: 8 }}>
              ⚠️ 无痛检查必须有家属陪同，术后24小时禁止驾驶车辆
            </View>
          )}
        </View>
      )}

      {!showTypePicker && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <View className={styles.icon}>💉</View>
            <Text className={styles.title}>检查方式</Text>
          </View>
          <View style={{
            padding: 24,
            background: 'rgba(175, 82, 222, 0.08)',
            borderRadius: 12,
            border: '1rpx solid rgba(175, 82, 222, 0.2)',
            fontSize: 26,
            color: '#6B21A8',
            lineHeight: 1.6
          }}>
            💉 本项目已包含无痛检查，按套餐价 ¥{basePrice} 收取
          </View>
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <View className={styles.icon}></View>
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
              placeholder="请输入身份证号（选填）"
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
            <View className={styles.formLabel}>
              <Text className={styles.required}>*</Text>陪同人姓名
            </View>
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
            <View className={styles.formLabel}>
              <Text className={styles.required}>*</Text>陪同人电话
            </View>
            <View className={styles.formInput}>
              <Input
                type="number"
                value={companionPhone}
                placeholder="请输入陪同人联系电话"
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
          <View className={styles.icon} style={{ fontSize: 60, marginBottom: 12, opacity: 0.7 }}>📤</View>
          <View style={{ fontSize: 26, color: '#1a1a1a', marginBottom: 4 }}>点击上传既往检查报告</View>
          <View style={{ fontSize: 22, color: '#8C8C8C' }}>
            支持 图片(JPG/PNG)、PDF 格式，最多6个文件 ({uploadedFiles.length}/6)
          </View>
        </View>

        {uploadedFiles.length > 0 && (
          <View className={styles.uploadList}>
            {uploadedFiles.map((file) => (
              <View
                key={file.id}
                style={{
                  aspectRatio: '1',
                  background: '#F5F6F7',
                  borderRadius: 12,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                  border: '1rpx solid #E5E6EB'
                }}
              >
                {file.type === 'image' && file.preview ? (
                  <Image
                    src={file.preview}
                    mode="aspectFill"
                    style={{ width: '100%', height: '65%', borderRadius: 8, marginBottom: 6 }}
                  />
                ) : (
                  <Text style={{ fontSize: 36, marginBottom: 4 }}>
                    {file.type === 'pdf' ? '📕' : '📄'}
                  </Text>
                )}
                <Text
                  style={{
                    fontSize: 18,
                    color: '#595959',
                    textAlign: 'center',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {file.name.length > 8 ? file.name.slice(0, 6) + '...' : file.name}
                </Text>
                <Text style={{ fontSize: 18, color: '#8C8C8C', marginTop: 2 }}>{file.size}</Text>
                <View
                  onClick={() => handleRemoveUpload(file.id)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 44,
                    height: 44,
                    background: 'rgba(255,59,48,0.9)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    fontWeight: 'bold',
                    borderBottomLeftRadius: 10
                  }}
                >
                  ×
                </View>
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
            {'\n'}4. {examType === 'painless' ? '无痛检查当日有家属陪同' : '知晓并同意检查相关风险'}
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
          {submitting ? '提交中...' : '确认预约'}
        </View>
      </View>
    </ScrollView>
  );
};

export default ConfirmPage;
