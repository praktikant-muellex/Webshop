import { useNavigate } from "react-router-dom";
import { Button } from "./Button";

/** Returns to whatever page linked here (browser history), not a hardcoded route — so a filtered/sorted list view is preserved instead of resetting. */
export function BackButton() {
  const navigate = useNavigate();
  return (
    <Button variant="outline" className="mb-3" onClick={() => navigate(-1)}>
      ← Zurück
    </Button>
  );
}
