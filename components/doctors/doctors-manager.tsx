"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormDialog } from "@/lib/use-form-dialog";
import { shortDate } from "@/lib/format";
import { createDoctor, updateDoctor, setDoctorActive } from "@/app/director/doctors/actions";

export type SellerLite = { id: string; first_name: string; last_name: string; seller_color: string | null };
export type DoctorRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  instagram: string | null;
  clinic: string | null;
  comment: string | null;
  is_active: boolean;
  assigned_seller_id: string | null;
  created_at: string;
  seller: SellerLite | null;
  last_activity_at: string | null;
};

export function DoctorsManager({
  doctors,
  sellers,
  basePath,
  canEdit = true,
  lockedSellerId,
}: {
  doctors: DoctorRow[];
  sellers: SellerLite[];
  basePath: string;
  canEdit?: boolean;
  /** When set (seller view), the add/edit form is locked to this seller and only own doctors are editable. */
  lockedSellerId?: string;
}) {
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <AddDoctorDialog sellers={sellers} lockedSellerId={lockedSellerId} />
        </div>
      )}
      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>Klinika</TableHead>
              <TableHead>Əlaqə</TableHead>
              <TableHead>Satıcı</TableHead>
              <TableHead>Son aktivlik</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Hələ həkim yoxdur.</TableCell>
              </TableRow>
            )}
            {doctors.map((d) => (
              <TableRow key={d.id} className={d.is_active ? "" : "opacity-50"}>
                <TableCell className="font-medium">
                  <Link href={`${basePath}/${d.id}`} className="hover:underline">
                    {d.first_name} {d.last_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{d.clinic ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {d.phone ?? "—"}
                  {d.instagram ? <span className="block text-xs">{d.instagram}</span> : null}
                </TableCell>
                <TableCell>
                  {d.seller ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block size-3 rounded-full border" style={{ backgroundColor: d.seller.seller_color ?? "#999" }} />
                      {d.seller.first_name} {d.seller.last_name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{shortDate(d.last_activity_at)}</TableCell>
                <TableCell>
                  {d.is_active ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">Aktiv</Badge>
                  ) : (
                    <Badge variant="destructive">Deaktiv</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`${basePath}/${d.id}`}>Bax</Link>
                    </Button>
                    {canEdit && (!lockedSellerId || d.assigned_seller_id === lockedSellerId) && (
                      <EditDoctorDialog doctor={d} sellers={sellers} lockedSellerId={lockedSellerId} />
                    )}
                    {canEdit && (!lockedSellerId || d.assigned_seller_id === lockedSellerId) && (
                      <ActivateButton id={d.id} active={d.is_active} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ActivateButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { await setDoctorActive(id, !active); router.refresh(); })}
    >
      {active ? "Deaktiv" : "Aktiv"}
    </Button>
  );
}

function DoctorFields({ sellers, d, lockedSellerId }: { sellers: SellerLite[]; d?: DoctorRow; lockedSellerId?: string }) {
  const [sellerId, setSellerId] = useState(lockedSellerId ?? d?.assigned_seller_id ?? "");
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField id="first_name" label="Ad" defaultValue={d?.first_name} required />
        <TextField id="last_name" label="Soyad" defaultValue={d?.last_name} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField id="phone" label="Telefon" defaultValue={d?.phone ?? ""} />
        <TextField id="instagram" label="Instagram" defaultValue={d?.instagram ?? ""} />
      </div>
      <TextField id="clinic" label="Klinika" defaultValue={d?.clinic ?? ""} />
      {lockedSellerId ? (
        <input type="hidden" name="assigned_seller_id" value={lockedSellerId} />
      ) : (
        <div className="space-y-1.5">
          <Label>Təyin olunmuş satıcı</Label>
          <input type="hidden" name="assigned_seller_id" value={sellerId} />
          <Select value={sellerId} onValueChange={setSellerId}>
            <SelectTrigger><SelectValue placeholder="Satıcı seçin" /></SelectTrigger>
            <SelectContent>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <TextField id="comment" label="Şərh" defaultValue={d?.comment ?? ""} />
    </div>
  );
}

function TextField({ id, label, defaultValue, required }: { id: string; label: string; defaultValue?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} defaultValue={defaultValue} required={required} />
    </div>
  );
}

function AddDoctorDialog({ sellers, lockedSellerId }: { sellers: SellerLite[]; lockedSellerId?: string }) {
  const { open, setOpen, formAction, pending } = useFormDialog(createDoctor, "Həkim əlavə olundu.");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Yeni həkim</Button></DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Yeni həkim</DialogTitle>
            <DialogDescription>Həkim seçilmiş satıcıya təyin olunur.</DialogDescription>
          </DialogHeader>
          <DoctorFields sellers={sellers} lockedSellerId={lockedSellerId} />
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Yaradılır…" : "Yarat"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDoctorDialog({ doctor, sellers, lockedSellerId }: { doctor: DoctorRow; sellers: SellerLite[]; lockedSellerId?: string }) {
  const { open, setOpen, formAction, pending } = useFormDialog(updateDoctor, "Yeniləndi.");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="sm">Düzəliş</Button></DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Həkim məlumatları</DialogTitle>
            <DialogDescription>Satıcını dəyişmək gələcək əməliyyatlara aiddir; keçmiş əməliyyatlar orijinal satıcıda qalır.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="id" value={doctor.id} />
          <DoctorFields sellers={sellers} d={doctor} lockedSellerId={lockedSellerId} />
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Yenilənir…" : "Yadda saxla"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
