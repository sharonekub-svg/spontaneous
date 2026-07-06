import { Alert } from 'react-native';

import { useToast } from '@/components';
import type { ReportTargetType } from '@/types/database.types';

import { useBlockUser, useSubmitReport, useUnblockUser } from './hooks';

const REPORT_REASONS = [
  'תוכן פוגעני או לא הולם',
  'הטרדה או בריונות',
  'ספאם או הונאה',
  'התחזות',
  'אחר',
];

/**
 * Report / block / unblock flows built on native alerts, so any screen showing
 * another user's content can offer them (App Store Guideline 1.2).
 */
export function useModeration() {
  const toast = useToast();
  const report = useSubmitReport();
  const block = useBlockUser();
  const unblock = useUnblockUser();

  function promptReport(targetType: ReportTargetType, targetId: string) {
    Alert.alert('דיווח על תוכן', 'בחרו את הסיבה לדיווח:', [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await report.mutateAsync({ targetType, targetId, reason });
            toast.success('הדיווח התקבל', 'הצוות שלנו יבחן אותו בהקדם.');
          } catch (err) {
            toast.error('הדיווח נכשל', err instanceof Error ? err.message : 'נסו שוב.');
          }
        },
      })),
      { text: 'ביטול', style: 'cancel' as const },
    ]);
  }

  function promptBlock(userId: string, displayName: string) {
    Alert.alert(
      `לחסום את ${displayName}?`,
      'לא תראו יותר את הפעילות של המשתמש, וכל קשר חברות ביניכם יוסר.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'חסימה',
          style: 'destructive',
          onPress: async () => {
            try {
              await block.mutateAsync(userId);
              toast.success('המשתמש נחסם');
            } catch (err) {
              toast.error('החסימה נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
            }
          },
        },
      ],
    );
  }

  function promptUnblock(userId: string, displayName: string) {
    Alert.alert(`לבטל את החסימה של ${displayName}?`, undefined, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'ביטול חסימה',
        onPress: async () => {
          try {
            await unblock.mutateAsync(userId);
            toast.success('החסימה בוטלה');
          } catch (err) {
            toast.error('הפעולה נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
          }
        },
      },
    ]);
  }

  return { promptReport, promptBlock, promptUnblock };
}
