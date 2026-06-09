import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <View className={styles.wrapper}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <View key={index} className={styles.step}>
            {index < steps.length - 1 && (
              <View className={classnames(styles.line, isCompleted && styles.filled)} />
            )}
            <View className={classnames(
              styles.circle,
              isActive && styles.active,
              isCompleted && styles.completed
            )}>
              {isCompleted ? '✓' : index + 1}
            </View>
            <Text className={classnames(
              styles.label,
              isActive && styles.active,
              isCompleted && styles.completed
            )}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export default StepIndicator;
