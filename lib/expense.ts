export type ExpenseCategory = "rent" | "salary" | "bonus" | "assistance" | "unexpected" | "other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["rent", "salary", "bonus", "assistance", "unexpected", "other"];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  rent: "İcarə",
  salary: "Maaş",
  bonus: "Bonus",
  assistance: "Yardım",
  unexpected: "Gözlənilməz",
  other: "Digər",
};
