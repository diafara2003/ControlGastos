"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/shared/api/supabase/client";
import { CreditCardSetupModal } from "./CreditCardSetupModal";

export function CreditCardCheck() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("credit_cards_configured")
          .eq("id", user.id)
          .single();

        if (profile && !profile.credit_cards_configured) {
          setShowModal(true);
        }
      } catch {
        // Silently fail — don't block the app
      }
    }

    check();
  }, []);

  if (!showModal) return null;

  return (
    <CreditCardSetupModal
      open={showModal}
      onComplete={() => setShowModal(false)}
    />
  );
}
