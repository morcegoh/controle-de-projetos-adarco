import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Edit2, Trash2, Key } from 'lucide-react';

export default function AdminScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
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

  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetUser, setResetUser] = useState<any | null>(null);

  const confirmResetPassword = (user: any) => {
    setResetUser(user);
    setResetModalVisible(true);
  };

  const executeResetPassword = async () => {
    if (!resetUser) return;
    try {
      const response = await fetch(`/api/admin/users/${resetUser.id}/reset`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao resetar');
      alert('Senha resetada com sucesso! Um e-mail será enviado para o usuário.');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setResetModalVisible(false);
      setResetUser(null);
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
    <ScrollView style={styles.outerContainer} contentContainerStyle={styles.container}>
      <Text style={[styles.title, isMobile && { fontSize: 20, marginBottom: 16 }]}>Painel Admin</Text>
      
      <View style={[styles.tabsContainer, isMobile && { flexDirection: 'column', width: '100%' }]}>
        <TouchableOpacity style={[styles.tab, activeTab === 'NEW' && styles.activeTab, isMobile && { paddingVertical: 10 }]} onPress={() => setActiveTab('NEW')}>
          <Text style={[styles.tabText, activeTab === 'NEW' && styles.activeTabText]}>Adicionar Novo Usuário</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'LIST' && styles.activeTab, isMobile && { paddingVertical: 10 }]} onPress={() => setActiveTab('LIST')}>
          <Text style={[styles.tabText, activeTab === 'LIST' && styles.activeTabText]}>Usuários Cadastrados</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'NEW' && (
        <View style={[styles.card, isMobile && { padding: 20 }]}>
          <Text style={styles.description}>
            Preencha os dados abaixo para gerar um novo acesso. A senha padrão do usuário será 123456. Ele deverá trocá-la no primeiro acesso.
          </Text>

          {errorNew ? <Text style={styles.errorText}>{errorNew}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}

          <Text style={styles.label}>Nome Completo</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

          <Text style={styles.label}>E-mail</Text>
          <TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

          <Text style={styles.label}>Cargo</Text>
          <TextInput style={styles.input} value={role} onChangeText={setRole} />

          <Text style={styles.label}>Telefone</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

          <TouchableOpacity style={styles.button} onPress={submitNewUser} disabled={loadingNew}>
            {loadingNew ? <ActivityIndicator color="var(--bg-card)" /> : <Text style={styles.buttonText}>Gerar Acesso</Text>}
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'LIST' && (
        <View style={[styles.card, { width: isMobile ? '100%' : 800 }, isMobile && { padding: 12 }]}>
          {loadingList ? (
            <ActivityIndicator color="var(--primary)" />
          ) : errorList ? (
            <Text style={styles.errorText}>{errorList}</Text>
          ) : (
            <View>
              {isMobile ? (
                 <View>
                   {users.map((u) => (
                      <View key={u.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'var(--border)', gap: 4 }}>
                        <Text style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{u.user_metadata?.full_name}</Text>
                        <Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</Text>
                        <Text style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.user_metadata?.role}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                           <TouchableOpacity onPress={() => setEditingUser(u)} style={{ marginLeft: 16 }}><Edit2 size={20} color="var(--text-secondary)" /></TouchableOpacity>
                           <TouchableOpacity onPress={() => confirmResetPassword(u)} style={{ marginLeft: 16 }}><Key size={20} color="var(--warning)" /></TouchableOpacity>
                           {u.email !== 'heder.santos@adarco.com.br' && (
                             <TouchableOpacity onPress={() => deleteUser(u.id)} style={{ marginLeft: 16 }}><Trash2 size={20} color="var(--danger)" /></TouchableOpacity>
                           )}
                        </View>
                      </View>
                   ))}
                 </View>
              ) : (
                <>
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
                      <View style={[styles.tableCell, {flex: 1, flexDirection: 'row', justifyContent: 'flex-end', minWidth: 80}]}>
                         <TouchableOpacity onPress={() => setEditingUser(u)} style={{ marginLeft: 12 }}><Edit2 size={16} color="var(--text-secondary)" /></TouchableOpacity>
                         <TouchableOpacity onPress={() => confirmResetPassword(u)} style={{ marginLeft: 12 }}><Key size={16} color="var(--warning)" /></TouchableOpacity>
                         {u.email !== 'heder.santos@adarco.com.br' && (
                           <TouchableOpacity onPress={() => deleteUser(u.id)} style={{ marginLeft: 12 }}><Trash2 size={16} color="var(--danger)" /></TouchableOpacity>
                         )}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
      )}

      {resetModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Confirmar Reset de Senha</Text>
            <Text style={styles.description}>
              Deseja realmente resetar a senha do usuário <Text style={{fontWeight: 'bold'}}>{resetUser?.user_metadata?.full_name}</Text> ({resetUser?.email})?
            </Text>
            <Text style={styles.description}>
              A senha será alterada para 123456 e ele precisará trocá-la no próximo acesso.
            </Text>

            <View style={{flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 16}}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setResetModalVisible(false); setResetUser(null); }}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, {backgroundColor: 'var(--warning)', marginTop: 0}]} onPress={executeResetPassword}>
                <Text style={[styles.buttonText, {color: '#FFFFFF'}]}>Sim, Resetar</Text>
              </TouchableOpacity>
            </View>
          </View>
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
              onChangeText={(text) => setEditingUser({...editingUser, user_metadata: {...editingUser.user_metadata, full_name: text}})} 
            />

            <Text style={styles.label}>Cargo</Text>
            <TextInput 
              style={styles.input} 
              value={editingUser.user_metadata?.role || ''} 
              onChangeText={(text) => setEditingUser({...editingUser, user_metadata: {...editingUser.user_metadata, role: text}})} 
            />
            
            <Text style={styles.label}>Telefone</Text>
            <TextInput 
              style={styles.input} 
              value={editingUser.user_metadata?.phone || ''} 
              onChangeText={(text) => setEditingUser({...editingUser, user_metadata: {...editingUser.user_metadata, phone: text}})} 
            />

            <View style={{flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 16}}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingUser(null)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { marginTop: 0 }]} onPress={saveEdit}>
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
  outerContainer: {
    flex: 1, 
    backgroundColor: 'var(--bg-app)'
  },
  container: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'var(--bg-app)',
    flexGrow: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'var(--text-main)',
    marginBottom: 24,
    fontFamily: 'Inter, sans-serif'
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--text-muted)',
    fontFamily: 'Inter, sans-serif'
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'var(--border)'
  },
  description: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    marginBottom: 24,
    fontFamily: 'Inter, sans-serif'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: 8,
    fontFamily: 'Inter, sans-serif'
  },
  input: {
    borderWidth: 1,
    borderColor: 'var(--border)',
    color: 'var(--text-main)',
    backgroundColor: 'var(--input-bg)',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
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
    fontFamily: 'Inter, sans-serif'
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'var(--border)',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'var(--text-main)',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Inter, sans-serif'
  },
  errorText: {
    color: 'var(--danger)',
    backgroundColor: 'var(--danger-bg)',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    fontFamily: 'Inter, sans-serif'
  },
  successText: {
    color: 'var(--success)',
    backgroundColor: 'var(--kanban-card-hover)',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    fontFamily: 'Inter, sans-serif'
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
    borderBottomColor: 'var(--table-border)',
  },
  tableCell: {
    fontSize: 14,
    color: 'var(--text-main)',
    fontFamily: 'Inter, sans-serif'
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: 480,
    maxWidth: '95%',
    backgroundColor: 'var(--bg-card)',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: 'var(--border)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  }
});

