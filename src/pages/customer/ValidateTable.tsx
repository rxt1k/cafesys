import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { STORAGE_KEYS } from "@/lib/constants";
import { generateAnonymousId, getDeviceInfo } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { Skeleton } from "@/components/ui/Skeleton";

function parseTableNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export default function ValidateTable() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useCart();

  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [retryTick, setRetryTick] = useState(0);

  const tableNumberParam = searchParams.get("t");
  const secretToken = searchParams.get("s");

  useEffect(() => {
    async function validate() {
      setError(null);
      setValidating(true);

      const tableNumber = parseTableNumber(tableNumberParam);

      if (!tableNumber || !secretToken) {
        setError("Invalid QR code. Please scan a valid table QR code.");
        setValidating(false);
        return;
      }

      try {
        // Validate table
        const { data: table, error: tableError } = await supabase
          .from("tables")
          .select("*")
          .eq("table_number", tableNumber)
          .eq("secret_token", secretToken)
          .eq("is_active", true)
          .single();

        if (tableError || !table) {
          setError(
            "Invalid table or QR code expired. Please ask staff for assistance.",
          );
          setValidating(false);
          return;
        }

        // Get or create anonymous ID
        let anonymousId = localStorage.getItem(STORAGE_KEYS.ANONYMOUS_ID);
        if (!anonymousId) {
          anonymousId = generateAnonymousId();
          localStorage.setItem(STORAGE_KEYS.ANONYMOUS_ID, anonymousId);
        }

        const persistSession = (sessionId: string) => {
          localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
          localStorage.setItem(
            STORAGE_KEYS.TABLE_INFO,
            JSON.stringify({
              tableId: table.id,
              tableNumber: table.table_number,
              tableName: table.table_name,
            }),
          );
          setSession(sessionId, table.id, table.table_number);
        };

        // 1) Reuse local active session for same table, if available
        const localSessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
        if (localSessionId) {
          const { data: localSession } = await supabase
            .from("table_sessions")
            .select("*")
            .eq("id", localSessionId)
            .eq("table_id", table.id)
            .eq("status", "active")
            .single();

          if (localSession) {
            persistSession(localSession.id);
            navigate("/order/menu", { replace: true });
            setValidating(false);
            return;
          }
        }

        // 2) Join active table session if table already has one
        if (table.current_session_id) {
          const { data: tableSession } = await supabase
            .from("table_sessions")
            .select("*")
            .eq("id", table.current_session_id)
            .eq("status", "active")
            .single();

          if (tableSession) {
            persistSession(tableSession.id);
            navigate("/order/menu", { replace: true });
            setValidating(false);
            return;
          }
        }

        // 3) Create a new session
        const deviceInfo = getDeviceInfo();
        const { data: newSession, error: sessionError } = await supabase
          .from("table_sessions")
          .insert({
            table_id: table.id,
            anonymous_id: anonymousId,
            status: "active",
            device_info: deviceInfo,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (sessionError || !newSession) {
          const message = sessionError?.message?.toLowerCase() || "";
          const isPolicyError =
            sessionError?.code === "42501" ||
            message.includes("row-level security");

          if (isPolicyError) {
            setError(
              "Unable to create a session because database access policy is blocking customer session creation (RLS). Please ask staff/admin to enable insert policy for table_sessions.",
            );
          } else {
            setError(
              sessionError?.message ||
                "Failed to create session. Please try again.",
            );
          }

          setValidating(false);
          return;
        }

        persistSession(newSession.id);
        navigate("/order/menu", { replace: true });
      } catch (err) {
        console.error(err);
        setError(
          "Something went wrong. Please try again or ask staff for help.",
        );
      } finally {
        setValidating(false);
      }
    }

    validate();
  }, [tableNumberParam, secretToken, navigate, setSession, retryTick]);

  if (error) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-2xl p-8 max-w-sm w-full text-center shadow-card"
        >
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="font-display text-xl font-semibold text-primary mb-2">
            Unable to Access
          </h2>
          <p className="text-secondary text-sm leading-relaxed">{error}</p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={() => setRetryTick((v) => v + 1)}
              className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!validating) return null;

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-4">
        <div className="text-center mb-8">
          <Skeleton className="h-8 w-48 mx-auto mb-3" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
