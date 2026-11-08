import { Picker } from '@react-native-picker/picker';
import { ActionSheetIOS, Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, layout } from '@/theme';

import { AppText } from './AppText';
import { ChevronIcon } from './ChevronIcon';

interface SelectFieldProps<Option extends string> {
  label: string;
  value: Option;
  options: readonly Option[];
  onSelect: (option: Option) => void;
}

const cancelLabel = 'Cancel';

/*
 * Draws the field from the design, then lists its options with the system's
 * own picker, as the design's select does. iOS uses an action sheet. On
 * Android an invisible picker sits over the field and opens on press.
 */
export function SelectField<Option extends string>({
  label,
  value,
  options,
  onSelect,
}: SelectFieldProps<Option>) {
  function showOptionsOnIos() {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: label, options: [...options, cancelLabel], cancelButtonIndex: options.length },
      (pressedIndex) => {
        if (pressedIndex < options.length) onSelect(options[pressedIndex]);
      },
    );
  }

  const field = (
    <>
      <AppText numberOfLines={1}>{value}</AppText>
      <View style={styles.chevron}>
        <ChevronIcon direction="down" />
      </View>
    </>
  );

  if (Platform.OS === 'ios') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={showOptionsOnIos}
        style={styles.field}
      >
        {field}
      </Pressable>
    );
  }

  return (
    <View style={styles.field}>
      {field}
      <Picker
        accessibilityLabel={label}
        mode="dialog"
        selectedValue={value}
        onValueChange={onSelect}
        style={styles.invisiblePicker}
      >
        {options.map((option) => (
          <Picker.Item key={option} label={option} value={option} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    minHeight: layout.controlHeight,
    paddingLeft: 14,
    paddingRight: 32,
    justifyContent: 'center',
    borderRadius: layout.controlRadius,
    backgroundColor: colors.controlBackground,
  },
  chevron: { position: 'absolute', right: 14, top: 16 },
  invisiblePicker: { ...StyleSheet.absoluteFill, opacity: 0 },
});
