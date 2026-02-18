import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import AvailabilityGrid from "../components/availability/AvailabilityGrid";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function AvailabilityPage() {
  const { isAuthenticated } = useConvexAuth();
  const myAvailability = useQuery(
    api.availability.getMyAvailability,
    isAuthenticated ? {} : "skip"
  );
  const saveAvailability = useMutation(api.availability.saveAvailability);

  const [localSlots, setLocalSlots] = useState<Record<string, number> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (myAvailability !== undefined && localSlots === null) {
      setLocalSlots((myAvailability?.slots as Record<string, number>) ?? {});
    }
  }, [myAvailability, localSlots]);

  const handleSlotsChange = useCallback(
    (newSlots: Record<string, number>) => {
      setLocalSlots(newSlots);
      setSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        await saveAvailability({ slots: newSlots });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }, 1000);
    },
    [saveAvailability]
  );

  if (!isAuthenticated) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-medium text-raikes-black">
          Sign in to set your availability
        </h2>
      </div>
    );
  }

  if (localSlots === null) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-raikes-black">
            My Availability
          </h1>
          <p className="mt-1 text-sm text-raikes-black/50">
            Set your weekly availability for match scheduling. Changes take effect on the next week advance.
          </p>
        </div>
        <span className="text-xs text-raikes-black/40">
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
              ? "Saved"
              : ""}
        </span>
      </div>
      <AvailabilityGrid slots={localSlots} onChange={handleSlotsChange} />
    </div>
  );
}
