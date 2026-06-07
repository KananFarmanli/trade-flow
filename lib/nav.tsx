import {
  LayoutDashboard,
  Warehouse,
  Package,
  Stethoscope,
  ShoppingCart,
  HandCoins,
  Target,
  Wallet,
  Users,
  UserCog,
  History,
  ArrowLeftRight,
  Receipt,
} from "lucide-react";
import type { Role } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const NAV: Record<Role, NavItem[]> = {
  director: [
    { href: "/director", label: "İcmal", icon: LayoutDashboard },
    { href: "/director/users", label: "İstifadəçilər", icon: UserCog },
    { href: "/director/warehouse", label: "Anbar", icon: Warehouse },
    { href: "/director/products", label: "Məhsullar", icon: Package },
    { href: "/director/doctors", label: "Həkimlər", icon: Stethoscope },
    { href: "/director/sales", label: "Satışlar", icon: ShoppingCart },
    { href: "/director/consignment", label: "Konsiqnasiya", icon: HandCoins },
    { href: "/director/quotas", label: "Kvotalar", icon: Target },
    { href: "/director/finance", label: "Maliyyə", icon: Wallet },
    { href: "/director/sellers", label: "Satıcılar", icon: Users },
    { href: "/director/audit", label: "Tarixçə", icon: History },
  ],
  manager: [
    { href: "/manager", label: "İcmal", icon: LayoutDashboard },
    { href: "/manager/warehouse", label: "Anbar", icon: Warehouse },
    { href: "/manager/transfers", label: "Transferlər", icon: ArrowLeftRight },
    { href: "/manager/doctors", label: "Həkimlər", icon: Stethoscope },
    { href: "/manager/sales", label: "Satışlar", icon: ShoppingCart },
    { href: "/manager/consignment", label: "Konsiqnasiya", icon: HandCoins },
    { href: "/manager/quotas", label: "Kvotalar", icon: Target },
    { href: "/manager/expenses", label: "Xərclər", icon: Receipt },
  ],
  seller: [
    { href: "/seller", label: "İcmal", icon: LayoutDashboard },
    { href: "/seller/inventory", label: "Mənim anbarım", icon: Warehouse },
    { href: "/seller/sales", label: "Satışlar", icon: ShoppingCart },
    { href: "/seller/consignment", label: "Konsiqnasiya", icon: HandCoins },
    { href: "/seller/doctors", label: "Həkimlər", icon: Stethoscope },
    { href: "/seller/quotas", label: "Kvotalar", icon: Target },
    { href: "/seller/cash", label: "Kassa / Köçürmə", icon: Wallet },
  ],
};
