import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export default function ProfileScreen({ goBack, user }: { goBack: () => void, user: User }) {
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.displayName || '');
  const [role, setRole] = useState(user?.user_metadata?.role || '');
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          full_name: displayName,
          displayName,
          role,
          phone
        }
      });
      if (error) throw error;
      setMessage('Perfil atualizado com sucesso!');
    } catch (e: any) {
      setMessage(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
  };

  const initial = (user?.user_metadata?.displayName || user?.email || '?')[0].toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'var(--bg-app)' }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Meu Perfil</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{initial}</Text>
        </View>

        <Text style={styles.emailText}>{user?.email}</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nome</Text>
          <TextInput 
            style={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.nativeEvent.text)}
            placeholder="Seu nome"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Cargo</Text>
          <TextInput 
            style={styles.input}
            value={role}
            onChange={(e) => setRole(e.nativeEvent.text)}
            placeholder="Seu cargo"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Telefone</Text>
          <TextInput 
            style={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.nativeEvent.text)}
            placeholder="Seu telefone"
            keyboardType="phone-pad"
          />
        </View>

        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'var(--bg-app)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: 'var(--bg-card)',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--border)',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'var(--text-main)',
    fontWeight: '600',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'var(--text-main)',
  },
  content: {
    padding: 32,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'var(--text-main)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarLargeText: {
    fontSize: 40,
    color: 'var(--bg-card)',
    fontWeight: 'bold',
  },
  emailText: {
    fontSize: 16,
    color: 'var(--text-muted)',
    marginBottom: 32,
  },
  formGroup: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'var(--border)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'var(--bg-card)',
    outlineStyle: 'none' as any,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  saveButton: {
    backgroundColor: 'var(--text-main)',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'var(--bg-card)',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: 'var(--bg-card)',
    borderWidth: 1,
    borderColor: 'var(--danger)',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'var(--danger)',
    fontWeight: '600',
    fontSize: 16,
  },
  messageText: {
    color: 'var(--success)',
    marginBottom: 16,
    fontWeight: '500',
  }
});
