import { NextResponse } from "next/server";
import { createClient } from "@/src/shared/api/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let query = supabase
    .from("transactions")
    .select("*, category:categories(name)")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  if (startDate) query = query.gte("transaction_date", startDate);
  if (endDate) query = query.lte("transaction_date", endDate);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build CSV
  const headers = [
    "Fecha",
    "Tipo",
    "Monto",
    "Comercio",
    "Categoría",
    "Descripción",
    "Notas",
    "Verificada",
  ];

  const rows = (data ?? []).map((t) => {
    const cat = t.category as unknown as { name: string } | { name: string }[] | null;
    const categoryName = Array.isArray(cat)
      ? cat[0]?.name ?? ""
      : cat?.name ?? "";

    return [
      new Date(t.transaction_date).toLocaleDateString("es-CO"),
      t.type === "income" ? "Ingreso" : "Gasto",
      t.amount,
      `"${(t.merchant ?? "").replace(/"/g, '""')}"`,
      categoryName,
      `"${(t.description ?? "").replace(/"/g, '""')}"`,
      `"${(t.notes ?? "").replace(/"/g, '""')}"`,
      t.is_verified ? "Sí" : "No",
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="miscuentas-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
