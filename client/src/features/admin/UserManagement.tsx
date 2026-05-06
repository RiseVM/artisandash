import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Key, Loader2, Shield, Archive, RotateCcw, ShieldCheck, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AVAILABLE_PERMISSIONS } from "@shared/schema";
import { useAuth } from "@/features/auth/hooks";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: string;
  tracksHours?: string; // yes | no
  createdAt: string;
}

interface RolePermission {
  id: number;
  role: string;
  permission: string;
  enabled: string;
}

export function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changingPassword, setChangingPassword] = useState<User | null>(null);
  const [archivingUser, setArchivingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [managingPermissions, setManagingPermissions] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "staff",
    tracksHours: "yes",
  });

  const [newPassword, setNewPassword] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: rolePermissions = [] } = useQuery<RolePermission[]>({
    queryKey: ["/api/role-permissions"],
    enabled: isAdmin,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (data: { role: string; permission: string; enabled: boolean }) => {
      return apiRequest("PUT", "/api/role-permissions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      toast({ title: "Permission updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update permission", description: error.message, variant: "destructive" });
    },
  });

  const getPermissionEnabled = (role: string, permission: string): boolean => {
    if (role === "admin") return true;
    const perm = rolePermissions.find(p => p.role === role && p.permission === permission);
    return perm?.enabled === "yes";
  };

  const togglePermission = (role: string, permission: string) => {
    const currentValue = getPermissionEnabled(role, permission);
    updatePermissionMutation.mutate({ role, permission, enabled: !currentValue });
  };

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateOpen(false);
      setFormData({ email: "", password: "", firstName: "", lastName: "", role: "staff", tracksHours: "yes" });
      toast({ title: "User created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<typeof formData>) => {
      return apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      toast({ title: "User updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    },
  });

  const archiveUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/users/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User archived successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to archive user", description: error.message, variant: "destructive" });
    },
  });

  const restoreUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/users/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User restored successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to restore user", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User permanently deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      return apiRequest("PATCH", `/api/users/${id}`, { password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setChangingPassword(null);
      setNewPassword("");
      toast({ title: "Password changed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      tracksHours: formData.tracksHours,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPassword) return;
    changePasswordMutation.mutate({ id: changingPassword.id, password: newPassword });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "manager": return "default" as const;
      default: return "secondary" as const;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage staff accounts and permissions</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="permissions" data-testid="tab-permissions">
              <Shield className="h-4 w-4 mr-2" />
              Role Permissions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        data-testid="input-user-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        data-testid="input-user-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="input-user-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <PasswordInput
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      data-testid="input-user-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger data-testid="select-user-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-save-user">
                      {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create User
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>{users.length} user{users.length !== 1 ? 's' : ''} total</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium">
                          {user.firstName || user.lastName
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : '-'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive === "yes" ? "outline" : "secondary"}>
                            {user.isActive === "yes" ? "Active" : "Archived"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setFormData({
                                  email: user.email,
                                  password: "",
                                  firstName: user.firstName || "",
                                  lastName: user.lastName || "",
                                  role: user.role,
                                  tracksHours: user.tracksHours || "yes",
                                });
                              }}
                              disabled={!isAdmin && user.role === "admin"}
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            {isAdmin && user.role !== "admin" && user.isActive === "yes" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setManagingPermissions(user)}
                                data-testid={`button-permissions-user-${user.id}`}
                                title="Set permissions for this specific user"
                              >
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                Permissions
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setChangingPassword(user)}
                              disabled={!isAdmin && user.role === "admin"}
                              data-testid={`button-change-password-${user.id}`}
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Password
                            </Button>
                            {user.isActive === "yes" ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setArchivingUser(user)}
                                disabled={user.email === "ed@risevm.com" || (!isAdmin && user.role === "admin")}
                                data-testid={`button-archive-user-${user.id}`}
                              >
                                <Archive className="h-4 w-4 mr-1" />
                                Archive
                              </Button>
                            ) : (
                              <>
                                {isAdmin && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => restoreUserMutation.mutate(user.id)}
                                      disabled={restoreUserMutation.isPending}
                                      data-testid={`button-restore-user-${user.id}`}
                                    >
                                      <RotateCcw className="h-4 w-4 mr-1" />
                                      Restore
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => setDeletingUser(user)}
                                      disabled={user.email === "ed@risevm.com"}
                                      data-testid={`button-delete-user-${user.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstName">First Name</Label>
                    <Input
                      id="edit-firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-lastName">Last Name</Label>
                    <Input
                      id="edit-lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                    disabled={editingUser?.email === "ed@risevm.com" || (!isAdmin && editingUser?.role === "admin")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-tracks-hours" className="text-sm">Tracks hours</Label>
                    <p className="text-xs text-muted-foreground">
                      When on, this user gets a weekly timecard, can clock in/out, and shows up in payroll.
                    </p>
                  </div>
                  <Switch
                    id="edit-tracks-hours"
                    checked={formData.tracksHours === "yes"}
                    onCheckedChange={(v) => setFormData({ ...formData, tracksHours: v ? "yes" : "no" })}
                    data-testid="switch-tracks-hours"
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={!!changingPassword} onOpenChange={(open) => !open && setChangingPassword(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Set a new password for {changingPassword?.email}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <PasswordInput
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="input-new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Click the eye icon to confirm what you typed before sharing it with the user.
                  </p>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={changePasswordMutation.isPending} data-testid="button-save-password">
                    {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Change Password
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                Configure what each role can do in the system. Admin always has full access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Permission</TableHead>
                      <TableHead className="text-center">Admin</TableHead>
                      <TableHead className="text-center">Manager</TableHead>
                      <TableHead className="text-center">Staff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <TableRow key={perm.key} data-testid={`row-permission-${perm.key}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{perm.label}</div>
                            <div className="text-sm text-muted-foreground">{perm.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={true}
                            disabled={true}
                            data-testid={`switch-permission-admin-${perm.key}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={getPermissionEnabled("manager", perm.key)}
                            onCheckedChange={() => togglePermission("manager", perm.key)}
                            disabled={updatePermissionMutation.isPending}
                            data-testid={`switch-permission-manager-${perm.key}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={getPermissionEnabled("staff", perm.key)}
                            onCheckedChange={() => togglePermission("staff", perm.key)}
                            disabled={updatePermissionMutation.isPending}
                            data-testid={`switch-permission-staff-${perm.key}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!archivingUser} onOpenChange={(open) => !open && setArchivingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive {archivingUser?.email}? They will no longer be able to log in.
              {isAdmin ? " You can restore them later from the archived users list." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archivingUser) {
                  archiveUserMutation.mutate(archivingUser.id);
                  setArchivingUser(null);
                }
              }}
              data-testid="button-confirm-archive"
            >
              Archive User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {deletingUser?.email}? This action cannot be undone.
              The user's name will be preserved on any existing records (checkouts, contracts).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingUser) {
                  deleteUserMutation.mutate(deletingUser.id);
                  setDeletingUser(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserPermissionsDialog
        user={managingPermissions}
        onClose={() => setManagingPermissions(null)}
      />
    </div>
  );
}

// ── Per-user permissions dialog ──────────────

interface UserPermissionsPayload {
  userId: string;
  role: string;
  effective: Record<string, boolean>;
  overrides: Record<string, "yes" | "no">;
}

function UserPermissionsDialog({
  user,
  onClose,
}: {
  user: { id: string; email: string; firstName: string | null; lastName: string | null; role: string } | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<UserPermissionsPayload>({
    queryKey: ["/api/users", user?.id, "permissions"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user!.id}/permissions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
    enabled: !!user,
  });

  const setPermission = useMutation({
    mutationFn: async ({ permission, enabled }: { permission: string; enabled: boolean | null }) => {
      return apiRequest("PUT", `/api/users/${user!.id}/permissions`, { permission, enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "permissions"] });
      // In case the admin is editing their own permissions
      queryClient.invalidateQueries({ queryKey: ["/api/my-permissions"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update permission", description: err.message, variant: "destructive" });
    },
  });

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
    : "";

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Permissions for {displayName}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Role: <span className="font-medium capitalize">{user?.role}</span>. Toggles below
          override the role default for this person only. Tap the reset icon to go back to the role default.
        </p>

        {isLoading || !data ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {AVAILABLE_PERMISSIONS.map((perm) => {
              const effective = !!data.effective[perm.key];
              const override = data.overrides[perm.key];
              const isOverridden = override === "yes" || override === "no";
              return (
                <div
                  key={perm.key}
                  className={`flex items-start gap-3 py-2 px-3 rounded border ${
                    isOverridden ? "bg-amber-50/60 border-amber-200" : "border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{perm.label}</span>
                      {isOverridden ? (
                        <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border border-amber-200">
                          Custom
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          From role
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    {isOverridden && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        title="Clear override — use role default"
                        disabled={setPermission.isPending}
                        onClick={() =>
                          setPermission.mutate({ permission: perm.key, enabled: null })
                        }
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                    <Switch
                      checked={effective}
                      disabled={setPermission.isPending}
                      onCheckedChange={(checked) =>
                        setPermission.mutate({ permission: perm.key, enabled: checked })
                      }
                      data-testid={`switch-user-perm-${perm.key}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
