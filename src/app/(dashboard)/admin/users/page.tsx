"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { readApiResponse } from "@/lib/api-error";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { roleLabel } from "@/components/layout/nav-config";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RECEPTIONIST";
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  _count?: { invoices: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | undefined>();
  const [deleteUser, setDeleteUser] = useState<UserRecord | undefined>();
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const result = await readApiResponse<UserRecord[]>(res, "Failed to load users");
      if (result.ok) {
        setUsers(Array.isArray(result.data) ? result.data : []);
      } else {
        toast.error(result.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" });
      const result = await readApiResponse(res, "Failed to delete user");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("User deleted");
      setDeleteUser(undefined);
      loadUsers();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage employee accounts for the academy
          </p>
        </div>
        <Button
          className="bg-[#0070C0] hover:bg-[#005499]"
          onClick={() => {
            setEditUser(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-10 text-center text-muted-foreground">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No employees yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-semibold">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{roleLabel(user.role)}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "ACTIVE" ? "success" : "secondary"}>
                        {user.status === "ACTIVE" ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user._count?.invoices ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditUser(user);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={loadUsers}
        initialData={editUser}
      />

      <Modal
        open={Boolean(deleteUser)}
        onClose={() => setDeleteUser(undefined)}
        title="Delete User?"
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteUser(undefined)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete Permanently"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Permanently delete <strong>{deleteUser?.name}</strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
