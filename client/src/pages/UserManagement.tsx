import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Trash2, Edit2, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

interface User {
  id: number;
  name: string;
  username: string;
  type: 'admin' | 'supplier';
  supplierName?: string;
}

export default function UserManagement() {
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: '', type: 'supplier', supplierName: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/list');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.username || !formData.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const endpoint = editingUser ? `/api/users/${editingUser.id}` : '/api/users/create';
      const method = editingUser ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          password: formData.password,
          type: formData.type,
          supplierName: formData.type === 'supplier' ? formData.supplierName : null,
        }),
      });

      if (res.ok) {
        toast.success(editingUser ? 'Usuário atualizado!' : 'Usuário criado!');
        setShowDialog(false);
        setFormData({ name: '', username: '', password: '', type: 'supplier', supplierName: '' });
        setEditingUser(null);
        loadUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erro ao salvar usuário');
      }
    } catch (error) {
      toast.error('Erro ao salvar usuário');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Usuário deletado!');
        loadUsers();
      } else {
        toast.error('Erro ao deletar usuário');
      }
    } catch (error) {
      toast.error('Erro ao deletar usuário');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '',
      type: user.type,
      supplierName: user.supplierName || '',
    });
    setShowDialog(true);
  };

  const openNewDialog = (type: 'admin' | 'supplier') => {
    setEditingUser(null);
    setFormData({ name: '', username: '', password: '', type, supplierName: '' });
    setShowDialog(true);
  };

  const adminUsers = users.filter(u => u.type === 'admin');
  const supplierUsers = users.filter(u => u.type === 'supplier');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <Button onClick={() => setLocation('/admin')} variant="ghost" className="text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gerenciamento de Usuários</h1>
            <p className="text-slate-400">Crie e gerencie admins e fornecedores</p>
          </div>
        </div>

        <Tabs defaultValue="suppliers" className="space-y-6">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="suppliers" className="text-slate-300">Fornecedores ({supplierUsers.length})</TabsTrigger>
            <TabsTrigger value="admins" className="text-slate-300">Admins ({adminUsers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers">
            <Card className="border-slate-700 bg-slate-800/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Fornecedores</CardTitle>
                  <CardDescription>Gerencie login e senha dos fornecedores</CardDescription>
                </div>
                <Button onClick={() => openNewDialog('supplier')} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : supplierUsers.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Nenhum fornecedor cadastrado</p>
                ) : (
                  <div className="space-y-3">
                    {supplierUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-sm text-slate-400">@{user.username}</p>
                          {user.supplierName && <p className="text-xs text-slate-500 mt-1">{user.supplierName}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEdit(user)} size="sm" variant="ghost" className="text-slate-400">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleDelete(user.id)} size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins">
            <Card className="border-slate-700 bg-slate-800/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Administradores</CardTitle>
                  <CardDescription>Gerencie admins do sistema</CardDescription>
                </div>
                <Button onClick={() => openNewDialog('admin')} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Novo Admin
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : adminUsers.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Nenhum admin cadastrado</p>
                ) : (
                  <div className="space-y-3">
                    {adminUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-sm text-slate-400">@{user.username}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEdit(user)} size="sm" variant="ghost" className="text-slate-400">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleDelete(user.id)} size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Nome Completo *</label>
              <Input
                placeholder="Digite o nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Usuário (login) *</label>
              <Input
                placeholder="Digite o usuário"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Senha *</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite a senha"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white pr-10"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {formData.type === 'supplier' && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Fornecedor</label>
                <Select value={formData.supplierName} onValueChange={(value) => setFormData({ ...formData, supplierName: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="São Paulo" className="text-white">Fornecedor São Paulo</SelectItem>
                    <SelectItem value="Limeira" className="text-white">Fornecedor Limeira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {editingUser ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
