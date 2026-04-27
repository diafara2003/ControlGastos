-- Préstamos (loans tracking)
CREATE TABLE prestamos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('dado', 'recibido')),
  contact_name text NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  start_date timestamptz NOT NULL,
  expected_return_date timestamptz,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Abonos / pagos parciales
CREATE TABLE prestamo_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id uuid NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  payment_date timestamptz NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamo_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own prestamos"
  ON prestamos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage payments of own prestamos"
  ON prestamo_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM prestamos
      WHERE prestamos.id = prestamo_payments.prestamo_id
        AND prestamos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prestamos
      WHERE prestamos.id = prestamo_payments.prestamo_id
        AND prestamos.user_id = auth.uid()
    )
  );

-- Index for faster lookups
CREATE INDEX idx_prestamos_user_id ON prestamos(user_id);
CREATE INDEX idx_prestamo_payments_prestamo_id ON prestamo_payments(prestamo_id);
