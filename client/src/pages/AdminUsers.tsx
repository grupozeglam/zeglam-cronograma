import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ChevronLeft, Lock, Users, Edit2 } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663391333985/kfJrCdZgsWRY3f9mLQkwBL/zeglam-logo_80654552.png";

interface AdminUser {
  id: number;
  name: string;
  username: string;
}

interface Supplier {
  id: number;
  name: string;
  username: string;
  panel?: 'sp' | 'limeira';
}

export function AdminUsers() {
  const [, setLocation] = useLocation();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditAdmin, setShowEditAdmin] = useState(false);
  const [showEditSupplier, setShowEditSupplier] = useState(false);
  const [showChangeSupplierPassword, setShowChangeSupplierPassword] = useState(false);

  // Form states
  const [adminForm, setAdminForm] = useState({ name: "", username: "", password: "" });
  const [supplierForm, setSupplierForm] = useState({ name: "", username: "", password: "", panel: "sp" as 'sp' | 'limeira' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editAdminForm, setEditAdminForm] = useState({ name: "", username: "" });
  const [editSupplierForm, setEditSupplierForm] = useState({ name: "", username: "", panel: "sp" as 'sp' | 'limeira' });
  const [supplierPasswordForm, setSupplierPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminsRes, suppliersRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/suppliers/list"),
      ]);

      if (adminsRes.ok) {
        const admins = await adminsRes.json();
        setAdminUsers(Array.isArray(admins) ? admins : []);
      }

      if (suppliersRes.ok) {
        const sups = await suppliersRes.json();
        setSuppliers(Array.isArray(sups) ? sups : []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!adminForm.name || !adminForm.username || !adminForm.password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (adminForm.password.length < 8) {
      toast.error("Senha deve ter no mínimo 8 caracteres");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao criar admin");
        return;
      }

      toast.success("Admin criado com sucesso");
      setAdminForm({ name: "", username: "", password: "" });
      setShowAddAdmin(false);
      await loadData();
    } catch (error) {
      console.error("Erro ao criar admin:", error);
      toast.error("Erro ao criar admin");
    }
  };

  const handleEditAdmin = async () => {
    if (!editingAdmin || !editAdminForm.name || !editAdminForm.username) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${editingAdmin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editAdminForm),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao editar admin");
        return;
      }

      toast.success("Admin atualizado com sucesso");
      setEditingAdmin(null);
      setShowEditAdmin(false);
      await loadData();
    } catch (error) {
      console.error("Erro ao editar admin:", error);
      toast.error("Erro ao editar admin");
    }
  };

  const handleCreateSupplier = async () => {
    if (!supplierForm.name || !supplierForm.username || !supplierForm.password || !supplierForm.panel) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (supplierForm.password.length < 8) {
      toast.error("Senha deve ter no mínimo 8 caracteres");
      return;
    }

    try {
      const res = await fetch("/api/suppliers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao criar fornecedor");
        return;
      }

      toast.success("Fornecedor criado com sucesso");
      setSupplierForm({ name: "", username: "", password: "", panel: "sp" });
      setShowAddSupplier(false);
      await loadData();
    } catch (error) {
      console.error("Erro ao criar fornecedor:", error);
      toast.error("Erro ao criar fornecedor");
    }
  };

  const handleEditSupplier = async () => {
    if (!editingSupplier || !editSupplierForm.name || !editSupplierForm.username) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSupplierForm),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao editar fornecedor");
        return;
      }

      toast.success("Fornecedor atualizado com sucesso");
      setEditingSupplier(null);
      setShowEditSupplier(false);
      await loadData();
    } catch (error) {
      console.error("Erro ao editar fornecedor:", error);
      toast.error("Erro ao editar fornecedor");
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Nova senha deve ter no mínimo 8 caracteres");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Senhas não conferem");
      return;
    }

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao alterar senha");
        return;
      }

      toast.success("Senha alterada com sucesso");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowChangePassword(false);
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast.error("Erro ao alterar senha");
    }
  };

  const handleChangeSupplierPassword = async () => {
    if (!editingSupplier || !supplierPasswordForm.currentPassword || !supplierPasswordForm.newPassword || !supplierPasswordForm.confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (supplierPasswordForm.newPassword.length < 8) {
      toast.error("Nova senha deve ter no mínimo 8 caracteres");
      return;
    }

    if (supplierPasswordForm.newPassword !== supplierPasswordForm.confirmPassword) {
      toast.error("Senhas não conferem");
      return;
    }

    try {
      const res = await fetch(`/api/suppliers/${editingSupplier.id}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: supplierPasswordForm.currentPassword,
          newPassword: supplierPasswordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao alterar senha");
        return;
      }

      toast.success("Senha alterada com sucesso");
      setSupplierPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowChangeSupplierPassword(false);
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast.error("Erro ao alterar senha");
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este admin?")) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao deletar admin");
        return;
      }

      toast.success("Admin deletado com sucesso");
      await loadData();
    } catch (error) {
      console.error("Erro ao deletar admin:", error);
      toast.error("Erro ao deletar admin");
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este fornecedor?")) return;

    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao deletar fornecedor");
        return;
      }

      toast.success("Fornecedor deletado com sucesso");
      await loadData();
    } catch (error) {
      console.error("Erro ao deletar fornecedor:", error);
      toast.error("Erro ao deletar fornecedor");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a1628" }}>
        <div style={{ color: "#b8a060" }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a1628" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "rgba(184,160,96,0.2)", background: "rgba(10,22,40,0.8)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/admin")}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <img src={LOGO_URL} alt="Zeglam" className="h-8" />
            <h1 className="text-xl font-bold" style={{ color: "#b8a060" }}>
              Gerenciar Usuários
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Admins Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: "#b8a060" }} />
              Administradores
            </h2>
            <Button
              onClick={() => setShowAddAdmin(true)}
              className="text-xs gap-1.5"
              style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}
            >
              <Plus className="w-3.5 h-3.5" /> Novo Admin
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "rgba(184,160,96,0.2)" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(184,160,96,0.08)" }}>
                <tr>
                  <th className="px-4 py-3 text-left" style={{ color: "rgba(255,255,255,0.6)" }}>Nome</th>
                  <th className="px-4 py-3 text-left" style={{ color: "rgba(255,255,255,0.6)" }}>Usuário</th>
                  <th className="px-4 py-3 text-right" style={{ color: "rgba(255,255,255,0.6)" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(adminUsers) && adminUsers.map((admin) => (
                  <tr key={admin.id} style={{ borderTop: "1px solid rgba(184,160,96,0.1)" }}>
                    <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.85)" }}>{admin.name}</td>
                    <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.6)" }}>{admin.username}</td>
                    <td className="px-4 py-3 text-right flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAdmin(admin);
                          setEditAdminForm({ name: admin.name, username: admin.username });
                          setShowEditAdmin(true);
                        }}
                        className="text-xs"
                        style={{ color: "#60a5fa" }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin.id)}
                        className="text-xs"
                        style={{ color: "#f87171" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!Array.isArray(adminUsers) || adminUsers.length === 0) && (
            <div className="text-center py-8" style={{ color: "rgba(255,255,255,0.4)" }}>
              Nenhum admin criado ainda
            </div>
          )}
        </div>

        {/* Suppliers Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: "#b8a060" }} />
              Fornecedores
            </h2>
            <Button
              onClick={() => setShowAddSupplier(true)}
              className="text-xs gap-1.5"
              style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}
            >
              <Plus className="w-3.5 h-3.5" /> Novo Fornecedor
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "rgba(184,160,96,0.2)" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(184,160,96,0.08)" }}>
                <tr>
                  <th className="px-4 py-3 text-left" style={{ color: "rgba(255,255,255,0.6)" }}>Nome</th>
                  <th className="px-4 py-3 text-left" style={{ color: "rgba(255,255,255,0.6)" }}>Usuário</th>
                  <th className="px-4 py-3 text-left" style={{ color: "rgba(255,255,255,0.6)" }}>Painel</th>
                  <th className="px-4 py-3 text-right" style={{ color: "rgba(255,255,255,0.6)" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(suppliers) && suppliers.map((supplier) => (
                  <tr key={supplier.id} style={{ borderTop: "1px solid rgba(184,160,96,0.1)" }}>
                    <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.85)" }}>{supplier.name}</td>
                    <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.6)" }}>{supplier.username}</td>
                    <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                      <span style={{ background: supplier.panel === "sp" ? "rgba(59,130,246,0.2)" : "rgba(168,85,247,0.2)", color: supplier.panel === "sp" ? "#3b82f6" : "#a855f7", padding: "0.25rem 0.75rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: "600" }}>
                        {supplier.panel === "sp" ? "São Paulo" : "Limeira"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setEditSupplierForm({ name: supplier.name, username: supplier.username, panel: supplier.panel || "sp" });
                          setShowEditSupplier(true);
                        }}
                        className="text-xs"
                        style={{ color: "#60a5fa" }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setSupplierPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                          setShowChangeSupplierPassword(true);
                        }}
                        className="text-xs"
                        style={{ color: "#fbbf24" }}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="text-xs"
                        style={{ color: "#f87171" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!Array.isArray(suppliers) || suppliers.length === 0) && (
            <div className="text-center py-8" style={{ color: "rgba(255,255,255,0.4)" }}>
              Nenhum fornecedor criado ainda
            </div>
          )}
        </div>

        {/* Change Password Section */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: "#b8a060" }} />
            Segurança
          </h2>
          <Button
            onClick={() => setShowChangePassword(true)}
            className="text-xs gap-1.5"
            style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}
          >
            <Lock className="w-3.5 h-3.5" /> Alterar Senha
          </Button>
        </div>
      </div>

      {/* Dialog: Add Admin */}
      <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
        <DialogContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.2)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#b8a060" }}>Novo Administrador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Nome</label>
              <Input
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                placeholder="Ex: João Silva"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Usuário</label>
              <Input
                value={adminForm.username}
                onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                placeholder="Ex: joao.silva"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Senha (mínimo 8 caracteres)</label>
              <Input
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddAdmin(false)}
              style={{ borderColor: "rgba(184,160,96,0.2)", color: "rgba(255,255,255,0.6)" }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAdmin}
              style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Admin */}
      <Dialog open={showEditAdmin} onOpenChange={setShowEditAdmin}>
        <DialogContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.2)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#b8a060" }}>Editar Administrador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Nome</label>
              <Input
                value={editAdminForm.name}
                onChange={(e) => setEditAdminForm({ ...editAdminForm, name: e.target.value })}
                placeholder="Ex: João Silva"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Usuário</label>
              <Input
                value={editAdminForm.username}
                onChange={(e) => setEditAdminForm({ ...editAdminForm, username: e.target.value })}
                placeholder="Ex: joao.silva"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditAdmin(false)}
              style={{ borderColor: "rgba(184,160,96,0.2)", color: "rgba(255,255,255,0.6)" }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditAdmin}
              style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Supplier */}
      <Dialog open={showAddSupplier} onOpenChange={setShowAddSupplier}>
        <DialogContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.2)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#b8a060" }}>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Nome</label>
              <Input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder="Ex: SP Fornecedor"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Usuário</label>
              <Input
                value={supplierForm.username}
                onChange={(e) => setSupplierForm({ ...supplierForm, username: e.target.value })}
                placeholder="Ex: sp_fornecedor"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Senha (mínimo 8 caracteres)</label>
              <Input
                type="password"
                value={supplierForm.password}
                onChange={(e) => setSupplierForm({ ...supplierForm, password: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Painel</label>
              <select
                value={supplierForm.panel}
                onChange={(e) => setSupplierForm({ ...supplierForm, panel: e.target.value as 'sp' | 'limeira' })}
                className="mt-1 w-full px-3 py-2 rounded-md text-sm"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              >
                <option value="sp" style={{ background: "#152340", color: "white" }}>São Paulo</option>
                <option value="limeira" style={{ background: "#152340", color: "white" }}>Limeira</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddSupplier(false)}
              style={{ borderColor: "rgba(184,160,96,0.2)", color: "rgba(255,255,255,0.6)" }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSupplier}
              style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Supplier */}
      <Dialog open={showEditSupplier} onOpenChange={setShowEditSupplier}>
        <DialogContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.2)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#b8a060" }}>Editar Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Nome</label>
              <Input
                value={editSupplierForm.name}
                onChange={(e) => setEditSupplierForm({ ...editSupplierForm, name: e.target.value })}
                placeholder="Ex: SP Fornecedor"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Usuário</label>
              <Input
                value={editSupplierForm.username}
                onChange={(e) => setEditSupplierForm({ ...editSupplierForm, username: e.target.value })}
                placeholder="Ex: sp_fornecedor"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Painel</label>
              <select
                value={editSupplierForm.panel}
                onChange={(e) => setEditSupplierForm({ ...editSupplierForm, panel: e.target.value as 'sp' | 'limeira' })}
                className="mt-1 w-full px-3 py-2 rounded-md text-sm"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              >
                <option value="sp" style={{ background: "#152340", color: "white" }}>São Paulo</option>
                <option value="limeira" style={{ background: "#152340", color: "white" }}>Limeira</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditSupplier(false)}
              style={{ borderColor: "rgba(184,160,96,0.2)", color: "rgba(255,255,255,0.6)" }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditSupplier}
              style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Change Password */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.2)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#b8a060" }}>Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Senha Atual</label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Nova Senha (mínimo 8 caracteres)</label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Confirmar Nova Senha</label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChangePassword(false)}
              style={{ borderColor: "rgba(184,160,96,0.2)", color: "rgba(255,255,255,0.6)" }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}
            >
              Alterar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Change Supplier Password */}
      <Dialog open={showChangeSupplierPassword} onOpenChange={setShowChangeSupplierPassword}>
        <DialogContent style={{ background: "#152340", border: "1px solid rgba(184,160,96,0.2)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#b8a060" }}>Alterar Senha do Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Senha Atual</label>
              <Input
                type="password"
                value={supplierPasswordForm.currentPassword}
                onChange={(e) => setSupplierPasswordForm({ ...supplierPasswordForm, currentPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Nova Senha (mínimo 8 caracteres)</label>
              <Input
                type="password"
                value={supplierPasswordForm.newPassword}
                onChange={(e) => setSupplierPasswordForm({ ...supplierPasswordForm, newPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Confirmar Nova Senha</label>
              <Input
                type="password"
                value={supplierPasswordForm.confirmPassword}
                onChange={(e) => setSupplierPasswordForm({ ...supplierPasswordForm, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(184,160,96,0.2)", color: "white" }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowChangeSupplierPassword(false)}
              style={{ borderColor: "rgba(184,160,96,0.2)", color: "rgba(255,255,255,0.6)" }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangeSupplierPassword}
              style={{ background: "linear-gradient(135deg,#c9a84c,#b8a060)", color: "#0a1628" }}
            >
              Alterar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
