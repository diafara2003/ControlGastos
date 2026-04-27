export type PrestamoType = "dado" | "recibido";
export type PrestamoStatus = "pending" | "partial" | "completed";

export interface Prestamo {
  id: string;
  user_id: string;
  type: PrestamoType;
  contact_name: string;
  amount: number;
  start_date: string;
  expected_return_date: string | null;
  notes: string | null;
  status: PrestamoStatus;
  created_at: string;
  updated_at: string;
  // Joined
  payments?: PrestamoPayment[];
}

export interface PrestamoPayment {
  id: string;
  prestamo_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
}
