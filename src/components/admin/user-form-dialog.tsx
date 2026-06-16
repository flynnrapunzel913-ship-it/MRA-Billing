"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { readApiResponse } from "@/lib/api-error";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validations";

interface UserRecord {
  id: string;
  username: string;
  role: "ADMIN" | "RECEPTIONIST";
  status: "ACTIVE" | "DISABLED";
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: UserRecord;
  currentUserId?: string;
}

export function UserFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  currentUserId,
}: UserFormDialogProps) {
  const isEdit = Boolean(initialData?.id);
  const isSelf = Boolean(initialData?.id && currentUserId && initialData.id === currentUserId);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", password: "", role: "RECEPTIONIST" },
  });

  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: "",
      role: "RECEPTIONIST",
      status: "ACTIVE",
      password: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      editForm.reset({
        username: initialData.username,
        role: initialData.role,
        status: initialData.status,
        password: "",
      });
    } else {
      createForm.reset({ username: "", password: "", role: "RECEPTIONIST" });
    }
  }, [initialData, createForm, editForm]);

  const onCreate = async (data: CreateUserInput) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await readApiResponse(res, "Failed to create user");
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Employee account created");
    createForm.reset();
    onSuccess();
    onOpenChange(false);
  };

  const onEdit = async (data: UpdateUserInput) => {
    if (!initialData) return;
    const payload = isSelf ? { ...data, status: "ACTIVE" as const } : data;
    const res = await fetch(`/api/admin/users/${initialData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await readApiResponse(res, "Failed to update user");
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Employee account updated");
    onSuccess();
    onOpenChange(false);
  };

  const handleResetPassword = async () => {
    if (!initialData || resetPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${initialData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const result = await readApiResponse(res, "Failed to reset password");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Password reset successfully");
      setResetOpen(false);
      setResetPassword("");
    } finally {
      setResetting(false);
    }
  };

  if (!open) return null;

  if (isEdit && initialData) {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = editForm;
    return (
      <>
        <Modal
          open={open && !resetOpen}
          onClose={() => onOpenChange(false)}
          title="Edit Employee"
          maxWidth="lg"
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setResetOpen(true)}>
                Reset Password
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" form="edit-user-form" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </>
          }
        >
          <form id="edit-user-form" onSubmit={handleSubmit(onEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input {...register("username")} className="h-11" />
              {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  {...register("role")}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {!isSelf && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    {...register("status")}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              )}
            </div>
            {isSelf ? (
              <p className="text-xs text-muted-foreground">
                You cannot disable your own account. Ask another administrator if access needs to change.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label>New Password (optional)</Label>
              <Input
                {...register("password")}
                type="password"
                placeholder="Leave blank to keep current password"
                className="h-11"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </form>
        </Modal>

        <Modal
          open={resetOpen}
          onClose={() => setResetOpen(false)}
          title="Reset Password"
          description={`Set a new password for ${initialData.username}. Existing password cannot be viewed.`}
          maxWidth="md"
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleResetPassword} disabled={resetting}>
                {resetting ? "Saving…" : "Update Password"}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label>New Password *</Label>
            <Input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="h-11"
              autoFocus
            />
          </div>
        </Modal>
      </>
    );
  }

  const { register, handleSubmit, formState: { errors, isSubmitting } } = createForm;
  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title="Create Employee Account"
      maxWidth="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="create-user-form" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Account"}
          </Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit(onCreate)} className="space-y-4">
        <div className="space-y-2">
          <Label>Username *</Label>
          <Input {...register("username")} placeholder="e.g. receptionist1" className="h-11" autoFocus />
          {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Password *</Label>
          <Input {...register("password")} type="password" className="h-11" />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <select
            {...register("role")}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          Password is stored securely and cannot be viewed after creation.
        </p>
      </form>
    </Modal>
  );
}
