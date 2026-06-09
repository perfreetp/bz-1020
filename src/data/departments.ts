import { Department } from '@/types/appointment';

export const departments: Department[] = [
  {
    id: 'gastro_001',
    name: '普通胃镜检查',
    category: 'gastro',
    type: 'gastroscopy',
    description: '通过口腔插入胃镜，直接观察食管、胃、十二指肠的病变情况，适用于胃痛、胃胀、反酸等症状检查。',
    price: 320,
    duration: 10,
    tags: ['无需麻醉', '时间短', '当日可做'],
    preparation: '检查前8小时禁食禁水'
  },
  {
    id: 'gastro_002',
    name: '无痛胃镜检查',
    category: 'gastro',
    type: 'gastroscopy',
    description: '在静脉麻醉下进行胃镜检查，全程无痛感，适合对疼痛敏感或紧张的患者。',
    price: 780,
    duration: 20,
    tags: ['静脉麻醉', '全程无痛', '需陪同'],
    preparation: '检查前8小时禁食禁水，需家属陪同'
  },
  {
    id: 'gastro_003',
    name: '胃镜+病理活检',
    category: 'gastro',
    type: 'gastroscopy',
    description: '胃镜检查同时取可疑组织进行病理分析，明确病变性质。',
    price: 680,
    duration: 15,
    tags: ['活检取样', '病理分析', '精准诊断'],
    preparation: '检查前8小时禁食禁水'
  },
  {
    id: 'colon_001',
    name: '普通肠镜检查',
    category: 'colon',
    type: 'colonoscopy',
    description: '经肛门插入结肠镜，观察结肠和直肠病变，用于便血、腹泻、便秘等症状的诊断。',
    price: 380,
    duration: 20,
    tags: ['无需麻醉', '肠道准备', '诊断全面'],
    preparation: '检查前1天清流质饮食，检查前需服用泻药清洁肠道'
  },
  {
    id: 'colon_002',
    name: '无痛肠镜检查',
    category: 'colon',
    type: 'colonoscopy',
    description: '在静脉麻醉下进行肠镜检查，全程无痛感，舒适度高。',
    price: 880,
    duration: 30,
    tags: ['静脉麻醉', '全程无痛', '需陪同'],
    preparation: '检查前1天清流质饮食，检查前需服用泻药，需家属陪同'
  },
  {
    id: 'colon_003',
    name: '肠镜+息肉摘除',
    category: 'colon',
    type: 'colonoscopy',
    description: '肠镜检查发现息肉后直接进行摘除，避免二次手术。',
    price: 1680,
    duration: 40,
    tags: ['息肉摘除', '微创治疗', '一次完成'],
    preparation: '严格肠道准备，需停用抗凝药物'
  },
  {
    id: 'both_001',
    name: '无痛胃肠镜联合检查',
    category: 'gastro',
    type: 'both',
    description: '一次麻醉完成胃镜和肠镜两项检查，节省时间和麻醉费用。',
    price: 1580,
    duration: 40,
    tags: ['联合检查', '一次麻醉', '省时省钱'],
    preparation: '检查前8小时禁食，严格肠道准备，需家属陪同'
  }
];
