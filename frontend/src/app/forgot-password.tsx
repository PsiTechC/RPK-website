import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { colors } from '../lib/theme';
import { Footer } from '../components/Footer';
import { Container, Button, Field, Card } from '../components/ui';
import { vEmail, isClean } from '../lib/validate';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const e = vEmail(email);
    setError(e);
    if (!isClean({ e })) return;
    setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch {
      // Endpoint always succeeds; show the confirmation regardless so we don't
      // reveal whether the email exists.
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
      <Container style={{ marginTop: 40, maxWidth: 460 }}>
        <Card style={{ gap: 14 }}>
          {sent ? (
            <>
              <Text style={{ fontSize: 44, textAlign: 'center' }}>📧</Text>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.sub}>
                If an account exists for <Text style={{ fontWeight: '800' }}>{email.trim()}</Text>, we've sent a link to
                reset your password. The link expires in 1 hour.
              </Text>
              <Button label="Back to login" onPress={() => router.replace('/login')} />
            </>
          ) : (
            <>
              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.sub}>Enter your account email and we'll send you a link to reset your password.</Text>
              <Field
                label="Email"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                placeholder="you@email.com"
                keyboardType="email-address"
                error={error}
              />
              <Button label={busy ? 'Sending…' : 'Send reset link'} onPress={submit} disabled={busy} />
              <Text style={styles.alt} onPress={() => router.replace('/login')}>
                ← Back to login
              </Text>
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
  alt: { textAlign: 'center', color: colors.navy, fontWeight: '700', fontSize: 13 },
});
