import {
  completeUserOnboarding,
  uploadUserAvatar,
  USER_HONORIFICS,
  validateOnboardingInput,
  type UserHonorific,
  type UserOnboardingProfile,
} from "@kjv/shared/onboarding";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type OnboardingTheme = {
  accent: string;
  accentText: string;
  background: string;
  border: string;
  danger: string;
  muted: string;
  surface: string;
  surfaceStrong: string;
  text: string;
};

type OnboardingScreenProps = {
  accessToken: string;
  apiBaseUrl: string;
  email: string;
  onComplete: (profile: UserOnboardingProfile) => void;
  onSignOut: () => void;
  theme: OnboardingTheme;
};

const maxAvatarBytes = 2 * 1024 * 1024;
const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function avatarFileName(mimeType: string) {
  if (mimeType === "image/png") return "avatar.png";
  if (mimeType === "image/webp") return "avatar.webp";
  return "avatar.jpg";
}

async function appendAvatar(formData: FormData, asset: ImagePicker.ImagePickerAsset, mimeType: string) {
  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    formData.append("avatar", await response.blob(), asset.fileName ?? avatarFileName(mimeType));
    return;
  }

  formData.append("avatar", {
    name: asset.fileName ?? avatarFileName(mimeType),
    type: mimeType,
    uri: asset.uri,
  } as unknown as Blob);
}

export function OnboardingScreen({ accessToken, apiBaseUrl, email, onComplete, onSignOut, theme }: OnboardingScreenProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fullName, setFullName] = useState("");
  const [honorific, setHonorific] = useState<UserHonorific>("성도님");
  const [message, setMessage] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectAvatar = async () => {
    setMessage("");
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage("프로필 사진을 선택하려면 사진 접근 권한이 필요합니다.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.85,
      selectionLimit: 1,
    });
    if (result.canceled) return;

    const selected = result.assets[0];
    const mimeType = selected.mimeType ?? "image/jpeg";
    if ((selected.fileSize ?? 0) > maxAvatarBytes || !allowedAvatarTypes.has(mimeType)) {
      setMessage("2MB 이하의 JPG, PNG, WebP 이미지를 선택하세요.");
      return;
    }
    setAvatar(selected);
  };

  const submit = async () => {
    const validation = validateOnboardingInput({ fullName, honorific, nickname });
    if (!validation.valid) {
      setMessage(validation.message);
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      let avatarPath: string | null = null;
      if (avatar) {
        const mimeType = avatar.mimeType ?? "image/jpeg";
        const formData = new FormData();
        await appendAvatar(formData, avatar, mimeType);
        avatarPath = (await uploadUserAvatar(formData, { accessToken, baseUrl: apiBaseUrl })).avatarPath;
      }

      const result = await completeUserOnboarding(
        { ...validation.input, avatarPath },
        { accessToken, baseUrl: apiBaseUrl },
      );
      if (!result.profile) throw new Error("저장된 프로필을 불러오지 못했습니다.");
      onComplete(result.profile);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "프로필을 저장하지 못했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>첫 로그인</Text>
          <Text accessibilityRole="header" style={styles.title}>프로필 설정</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarPreview}>
              {avatar ? <Image accessibilityLabel="선택한 프로필 사진" source={{ uri: avatar.uri }} style={styles.avatarImage} /> : <Text style={styles.avatarPlaceholder}>사</Text>}
            </View>
            <View style={styles.avatarActions}>
              <Pressable accessibilityRole="button" disabled={submitting} onPress={selectAvatar} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>사진 선택</Text>
              </Pressable>
              <Text style={styles.helper}>선택 사항 · 최대 2MB</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>닉네임</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="nickname"
              editable={!submitting}
              maxLength={24}
              onChangeText={setNickname}
              placeholder="커뮤니티에 표시할 이름"
              placeholderTextColor={theme.muted}
              style={styles.input}
              value={nickname}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              autoComplete="name"
              editable={!submitting}
              maxLength={50}
              onChangeText={setFullName}
              placeholder="실제 이름"
              placeholderTextColor={theme.muted}
              style={styles.input}
              value={fullName}
            />
            <Text style={styles.helper}>이름은 다른 사용자에게 공개되지 않습니다.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>호칭</Text>
            <View accessibilityRole="radiogroup" style={styles.honorificGrid}>
              {USER_HONORIFICS.map((item) => {
                const selected = honorific === item;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: submitting }}
                    aria-checked={selected}
                    aria-disabled={submitting}
                    disabled={submitting}
                    key={item}
                    onPress={() => setHonorific(item)}
                    style={[styles.honorificButton, selected ? styles.honorificButtonSelected : null]}
                  >
                    <Text style={[styles.honorificText, selected ? styles.honorificTextSelected : null]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {message ? <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text> : null}

          <Pressable accessibilityRole="button" disabled={submitting} onPress={submit} style={[styles.primaryButton, submitting ? styles.disabled : null]}>
            {submitting ? <ActivityIndicator color={theme.accentText} size="small" /> : null}
            <Text style={styles.primaryButtonText}>{submitting ? "저장 중" : "시작하기"}</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" disabled={submitting} onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>다른 계정으로 로그인</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: OnboardingTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    screen: {
      flexGrow: 1,
      gap: 24,
      justifyContent: "center",
      padding: 20,
      paddingVertical: 32,
    },
    heading: { alignItems: "center", gap: 6 },
    eyebrow: { color: theme.accent, fontSize: 12, fontWeight: "900" },
    title: { color: theme.text, fontSize: 28, fontWeight: "900", letterSpacing: 0 },
    email: { color: theme.muted, fontSize: 13 },
    panel: {
      alignSelf: "center",
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 18,
      maxWidth: 520,
      padding: 18,
      width: "100%",
    },
    avatarRow: { alignItems: "center", flexDirection: "row", gap: 14 },
    avatarPreview: {
      alignItems: "center",
      backgroundColor: theme.surfaceStrong,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      height: 76,
      justifyContent: "center",
      overflow: "hidden",
      width: 76,
    },
    avatarImage: { height: "100%", width: "100%" },
    avatarPlaceholder: { color: theme.muted, fontSize: 24, fontWeight: "900" },
    avatarActions: { flex: 1, gap: 6 },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.surfaceStrong,
      borderColor: theme.border,
      borderRadius: 6,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
    },
    secondaryButtonText: { color: theme.text, fontSize: 14, fontWeight: "900" },
    field: { gap: 7 },
    label: { color: theme.text, fontSize: 14, fontWeight: "900" },
    input: {
      backgroundColor: theme.background,
      borderColor: theme.border,
      borderRadius: 6,
      borderWidth: 1,
      color: theme.text,
      fontSize: 16,
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    helper: { color: theme.muted, fontSize: 12, lineHeight: 17 },
    honorificGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    honorificButton: {
      alignItems: "center",
      backgroundColor: theme.background,
      borderColor: theme.border,
      borderRadius: 6,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 12,
    },
    honorificButtonSelected: { backgroundColor: theme.surfaceStrong, borderColor: theme.accent },
    honorificText: { color: theme.muted, fontSize: 13, fontWeight: "800" },
    honorificTextSelected: { color: theme.text },
    error: { color: theme.danger, fontSize: 13, fontWeight: "700", lineHeight: 19 },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.accent,
      borderRadius: 6,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 50,
      paddingHorizontal: 16,
    },
    primaryButtonText: { color: theme.accentText, fontSize: 15, fontWeight: "900" },
    disabled: { opacity: 0.58 },
    signOutButton: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
    signOutText: { color: theme.muted, fontSize: 13, fontWeight: "800", textDecorationLine: "underline" },
  });
}
