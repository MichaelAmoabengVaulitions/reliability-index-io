import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet } from 'react-native';

import {
  earliestScoringDate,
  formatDate,
  fromPickerDate,
  todayAsDate,
  toPickerDate,
} from '@/domain/scoringWindow';
import { colors, layout } from '@/theme';

import { AppText } from './AppText';

interface DateFieldProps {
  date: string;
  onDateChange: (date: string) => void;
}

/*
 * Draws the field from the design, then uses the system date picker. Android
 * opens it from a press. iOS only opens it from its own control, so that
 * control sits invisibly over the field.
 */
export function DateField({ date, onDateChange }: DateFieldProps) {
  const pickerOptions = {
    mode: 'date' as const,
    value: toPickerDate(date),
    minimumDate: toPickerDate(earliestScoringDate),
    maximumDate: toPickerDate(todayAsDate()),
    onValueChange: (_event: unknown, pickedDate: Date) => onDateChange(fromPickerDate(pickedDate)),
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`End date, ${formatDate(date)}`}
      onPress={() => DateTimePickerAndroid.open(pickerOptions)}
      disabled={Platform.OS === 'ios'}
      style={styles.field}
    >
      <AppText>{formatDate(date)}</AppText>
      {Platform.OS === 'ios' && (
        <DateTimePicker {...pickerOptions} display="compact" style={styles.invisiblePicker} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: layout.largeControlHeight,
    marginTop: 4,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: layout.controlRadius,
    backgroundColor: colors.controlBackground,
  },
  // Fully transparent controls stop receiving touches, so this keeps a trace of opacity.
  invisiblePicker: { ...StyleSheet.absoluteFill, opacity: 0.02 },
});
