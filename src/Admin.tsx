import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Edit2, Trash2, KeyRound } from 'lucide-react';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<'NEW' | 'LIST'>('NEW');
  
  // States for New User
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingNew, setLoadingNew] = useState(false);
  const [message, setMessage] = useState('');
  const [errorNew, setErrorNew] = useState('');

  // States for User List
  const [users, setUsers] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState('');
  
  // State for Edit Modal
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === 'LIST') fetchUsers();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingList(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar usuários');
      setUsers(data);
    } catch (e: any) {
      setErrorList(e.message);
    } finally {
      setLoadingList(false);
    }
  };

  const submitNewUser = async () => {
    if (!fullName || !email || !role || !phone) {
      setErrorNew('Preencha todos os campos.');
      return;
    }
    setLoadingNew(true);
    setErrorNew('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          role,
          phone,
          password: '123456' // senha padrão
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar usuário');
      setMessage('Usuário criado com sucesso! Senha padrão: 123456');
      setFullName('');
      setEmail('');
      setRole('');
      setPhone('');
    } catch (e: any) {
      setErrorNew(e.message);
    } finally {
      setLoadingNew(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir');
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const resetPassword = async (id: string) => {
    if (!window.confirm('Deseja resetar a senha deste usuário? Ele precisará trocar no próximo acesso.')) return;
    try {
      const response = await fetch(`/api/admin/users/${id}/reset`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao resetar');
      alert(`Senha resetada com sucesso! Nova senha temporária: ${data.newPassword}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editingUser.user_metadata?.full_name,
          role: editingUser.user_metadata?.role,
          phone: editingUser.user_metadata?.phone,
        })
      });
      if (!response.ok) throw new Error('Erro ao editar');
      setEditingUser(null);
      fetchUsers();
    } catch(e: any) {
      alert(e.message);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'var(--bg-app)' }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Painel Admin</Text>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'NEW' && styles.activeTab]} onPress={() => setActiveTab('NEW')}>
          <Text style={[styles.tabText, activeTab === 'NEW' && styles.activeTabText]}>Adicionar Novo Usuário</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'LIST' && styles.activeTab]} onPress={() => setActiveTab('LIST')}>
          <Text style={[styles.tabText, activeTab === 'LIST' && styles.activeTabText]}>Usuários Cadastrados</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'NEW' && (
        <View style={styles.card}>
          <Text style={styles.description}>
            Preencha os dados abaixo para gerar um novo acesso. A senha padrão do usuário será 123456. Ele deverá trocá-la no primeiro acesso.
          </Text>

          {errorNew ? <Text style={styles.errorText}>{errorNew}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}

          <Text style={styles.label}>Nome Completo</Text>
          <TextInput style={styles.input} value={fullName} onChange={(e) => setFullName(e.nativeEvent.text)} />

          <Text style={styles.label}>E-mail</Text>
          <TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.nativeEvent.text)} />

          <Text style={styles.label}>Cargo</Text>
          <TextInput style={styles.input} value={role} onChange={(e) => setRole(e.nativeEvent.text)} />

          <Text style={styles.label}>Telefone</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" value={phone} onChange={(e) => setPhone(e.nativeEvent.text)} />

          <TouchableOpacity style={styles.button} onPress={submitNewUser} disabled={loadingNew}>
            {loadingNew ? <ActivityIndicator color="var(--bg-card)" /> : <Text style={styles.buttonText}>Gerar Acesso</Text>}
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'LIST' && (
        <View style={[styles.card, { width: 800 }]}>
          {loadingList ? (
            <ActivityIndicator color="var(--primary)" />
          ) : errorList ? (
            <Text style={styles.errorText}>{errorList}</Text>
          ) : (
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, {flex: 2, fontWeight: "bold"}]}>Nome</Text>
                <Text style={[styles.tableCell, {flex: 2, fontWeight: "bold"}]}>Email</Text>
                <Text style={[styles.tableCell, {flex: 1, fontWeight: "bold"}]}>Cargo</Text>
                <Text style={[styles.tableCell, {flex: 1, fontWeight: "bold", textAlign: 'right'}]}>Ações</Text>
              </View>
              {users.map((u) => (
                <View key={u.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, {flex: 2}]} numberOfLines={1}>{u.user_metadata?.full_name}</Text>
                  <Text style={[styles.tableCell, {flex: 2}]} numberOfLines={1}>{u.email}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]} numberOfLines={1}>{u.user_metadata?.role}</Text>
                  <View style={[styles.tableCell, {flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 12}]}>
                     <TouchableOpacity onPress={() => setEditingUser(u)}><Edit2 size={16} color="var(--text-secondary)" /></TouchableOpacity>
                     <TouchableOpacity onPress={() => resetPassword(u.id)}><KeyRound size={16} color="var(--warning)" /></TouchableOpacity>
                     <TouchableOpacity onPress={() => deleteUser(u.id)}><Trash2 size={16} color="var(--danger)" /></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {editingUser && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Editar Usuário</Text>
            
            <Text style={styles.label}>Nome</Text>
            <TextInput 
              style={styles.input} 
              value={editingUser.user_metadata?.full_name || ''} 
              onChange={(e) => setEditingUser({...editingUser, user_metadata: {...editingUser.user_metadata, full_name: e.nativeEvent.text}})} 
            />

            <Text style={styles.label}>Cargo</Text>
            <TextInput 
              style={styles.input} 
              value={editingUser.user_metadata?.role || ''} 
              onChange={(e) => setEditingUser({...editingUser, user_metadata: {...editingUser.user_metadata, role: e.nativeEvent.text}})} 
            />
            
            <Text style={styles.label}>Telefone</Text>
            <TextInput 
              style={styles.input} 
              value={editingUser.user_metadata?.phone || ''} 
              onChange={(e) => setEditingUser({...editingUser, user_metadata: {...editingUser.user_metadata, phone: e.nativeEvent.text}})} 
            />

            <View style={{flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 16}}>
              <TouchableOpacity style={[styles.button, {backgroundColor: 'transparent', borderWidth: 1, borderColor: 'var(--border)'}]} onPress={() => setEditingUser(null)}>
                <Text style={[styles.buttonText, {color: 'var(--text-main)'}]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={saveEdit}>
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'var(--bg-app)'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'var(--text-main)',
    marginBottom: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: 'var(--table-header-bg)',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: 'var(--bg-card)',
    boxShadow: '0 1px 3px var(--shadow)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  activeTabText: {
    color: 'var(--text-main)',
  },
  card: {
    width: 500,
    maxWidth: '100%',
    backgroundColor: 'var(--bg-card)',
    padding: 32,
    borderRadius: 8,
    boxShadow: '0 4px 6px -1px var(--glass-border)',
  },
  description: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'var(--border)',
    color: 'var(--text-main)',
    backgroundColor: 'var(--input-bg)',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    outlineStyle: 'none' as any,
  },
  button: {
    backgroundColor: 'var(--text-main)',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'var(--bg-card)',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: 'var(--danger)',
    backgroundColor: 'var(--danger-bg)',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  successText: {
    color: '#059669',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--border)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'var(--border-light)',
  },
  tableCell: {
    fontSize: 14,
    color: 'var(--text-main)',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'var(--modal-overlay)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: 480,
    backgroundColor: 'var(--bg-card)',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: 'var(--border)',
  }
});
