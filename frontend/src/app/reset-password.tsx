import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../lib/api';
import { colors } from '../lib/theme';
import { Footer } from '../components/Footer';
import { Container, Button, Field, Card } from '../components/ui';
import { vPassword, isClean } from '../lib/validate';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError('');
    const e: Record<string, string | null> = {
      password: vPassword(password),
      confirm: password !== confirm ? 'Passwords do not match' : null,
    };
    setErrors(e);
    if (!isClean(e)) return;
    if (!token) {
      setError('This reset link is invalid. Please request a new one.');
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(String(token), password);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Could not reset your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Container style={{ marginTop: 40, maxWidth: 460 }}>
        <Card style={{ gap: 14 }}>
          {done ? (
            <>
              <Ionicons name="checkmark-circle" size={52} color={colors.green} style={{ alignSelf: 'center' }} />
              <Text style={styles.title}>Password updated</Text>
              <Text style={styles.sub}>Your password has been reset. You can now log in with your new password.</Text>
              <Button label="Go to login" onPress={() => router.replace('/login')} />
            </>
          ) : !token ? (
            <>
              <Text style={styles.title}>Invalid reset link</Text>
              <Text style={styles.sub}>This link is missing or invalid. Please request a new password reset.</Text>
              <Button label="Request new link" onPress={() => router.replace('/forgot-password')} />
            </>
          ) : (
            <>
              <Text style={styles.title}>Set a new password</Text>
              <Text style={styles.sub}>Choose a new password for your account.</Text>
              <Field
                label="New password"
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((x) => ({ ...x, password: undefined })); }}
                placeholder="••••••"
                secureTextEntry
                error={errors.password}
              />
              <Field
                label="Confirm password"
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setErrors((x) => ({ ...x, confirm: undefined })); }}
                placeholder="••••••"
                secureTextEntry
                error={errors.confirm}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Button label={busy ? 'Saving…' : 'Reset password'} onPress={submit} disabled={busy} />
            </>
          )}
        </Card>
      </Container>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '900', color: colors.ink },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  error: { color: colors.red, fontSize: 13 },
});
