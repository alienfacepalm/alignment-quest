import * as Haptics from "expo-haptics";

export function hapticLight(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Unsupported platform
  }
}

export function hapticMedium(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Unsupported platform
  }
}

export function hapticSuccess(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Unsupported platform
  }
}

export function hapticWarning(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Unsupported platform
  }
}

export function hapticError(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Unsupported platform
  }
}
