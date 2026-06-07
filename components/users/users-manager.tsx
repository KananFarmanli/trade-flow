"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createUser, setUserActive, type CreateUserState } from "@/app/director/users/actions";
import { roleLabel, type Role } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type UserRow = {
  id: string;
  role: Role;
  first_name: string;
  last_name: string;
  username: string;
  seller_color: string | null;
  is_active: boolean;
  created_at: string;
};

export function UsersManager({ users }: { users: UserRow[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"manager" | "seller">("seller");
  const [state, formAction, pending] = useActionState<CreateUserState, FormData>(createUser, null);
  const [isToggling, startToggle] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      toast.success("İstifadəçi yaradıldı.");
      setOpen(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Yeni istifadəçi</Button>
          </DialogTrigger>
          <DialogContent>
            <form action={formAction}>
              <DialogHeader>
                <DialogTitle>Yeni istifadəçi</DialogTitle>
                <DialogDescription>Menecer və ya satıcı hesabı yaradın.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name">Ad</Label>
                    <Input id="first_name" name="first_name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name">Soyad</Label>
                    <Input id="last_name" name="last_name" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="username">İstifadəçi adı (login)</Label>
                  <Input id="username" name="username" autoCapitalize="none" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Şifrə</Label>
                  <Input id="password" name="password" type="text" minLength={6} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Rol</Label>
                  <input type="hidden" name="role" value={role} />
                  <Select value={role} onValueChange={(v) => setRole(v as "manager" | "seller")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seller">Satıcı</SelectItem>
                      <SelectItem value="manager">Menecer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {role === "seller" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="seller_color">Satıcı rəngi</Label>
                    <Input id="seller_color" name="seller_color" type="color" defaultValue="#6366f1" className="h-10 w-20 p-1" />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Yaradılır…" : "Yarat"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Rəng</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Hələ istifadəçi yoxdur.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.first_name} {u.last_name}</TableCell>
                <TableCell className="text-muted-foreground">{u.username}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "director" ? "default" : "secondary"}>{roleLabel(u.role)}</Badge>
                </TableCell>
                <TableCell>
                  {u.seller_color ? (
                    <span className="inline-block size-4 rounded-full border" style={{ backgroundColor: u.seller_color }} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {u.is_active ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">Aktiv</Badge>
                  ) : (
                    <Badge variant="destructive">Deaktiv</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {u.role === "director" ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isToggling}
                      onClick={() => startToggle(() => setUserActive(u.id, !u.is_active))}
                    >
                      {u.is_active ? "Deaktiv et" : "Aktiv et"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
