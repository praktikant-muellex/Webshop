import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEmployees, setEmployeeHidden, deleteEmployeePermanently } from "../../api/admin";
import { EmployeeListItem } from "../../api/types";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeading } from "../../components/ui/PageHeading";
import { employeeLabel } from "../../lib/employeeLabel";

interface SortOption {
  key: string;
  label: string;
  compare: (a: EmployeeListItem, b: EmployeeListItem) => number;
}

// Missing values (null/undefined/"") always sort to the end, in both
// directions — otherwise they're treated as "" and an empty string sorts
// before any real value, so e.g. an employee with no first name ("Unbekannt")
// would incorrectly show up first in an A-Z sort instead of last.
function compareStrings(a: string | null | undefined, b: string | null | undefined, direction: 1 | -1 = 1): number {
  const aEmpty = a == null || a === "";
  const bEmpty = b == null || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return direction * a.localeCompare(b, "de-AT");
}

const NAME_SORTS: SortOption[] = [
  { key: "firstName-asc", label: "Vorname (A-Z)", compare: (a, b) => compareStrings(a.firstName, b.firstName, 1) },
  { key: "firstName-desc", label: "Vorname (Z-A)", compare: (a, b) => compareStrings(a.firstName, b.firstName, -1) },
  { key: "lastName-asc", label: "Nachname (A-Z)", compare: (a, b) => compareStrings(a.lastName, b.lastName, 1) },
  { key: "lastName-desc", label: "Nachname (Z-A)", compare: (a, b) => compareStrings(a.lastName, b.lastName, -1) },
];

const NR_SORTS: SortOption[] = [
  { key: "nr-asc", label: "Aufsteigend", compare: (a, b) => compareStrings(a.employeeNumber, b.employeeNumber, 1) },
  { key: "nr-desc", label: "Absteigend", compare: (a, b) => compareStrings(a.employeeNumber, b.employeeNumber, -1) },
];

const GROUP_SORTS: SortOption[] = [
  { key: "group-asc", label: "A-Z", compare: (a, b) => compareStrings(a.employeeGroup?.name, b.employeeGroup?.name, 1) },
  { key: "group-desc", label: "Z-A", compare: (a, b) => compareStrings(a.employeeGroup?.name, b.employeeGroup?.name, -1) },
];

const HIRE_DATE_SORTS: SortOption[] = [
  { key: "hire-desc", label: "Neueste zuerst", compare: (a, b) => compareStrings(a.hireDate, b.hireDate, -1) },
  { key: "hire-asc", label: "Älteste zuerst", compare: (a, b) => compareStrings(a.hireDate, b.hireDate, 1) },
];

const STATUS_SORTS: SortOption[] = [
  {
    key: "status-active-first",
    label: "Aktiv zuerst",
    compare: (a, b) => Number(a.employmentStatus !== "active") - Number(b.employmentStatus !== "active"),
  },
  {
    key: "status-resigned-first",
    label: "Gekündigt zuerst",
    compare: (a, b) => Number(a.employmentStatus === "active") - Number(b.employmentStatus === "active"),
  },
];

const RESIGNATION_SORTS: SortOption[] = [
  { key: "resignation-desc", label: "Neueste zuerst", compare: (a, b) => compareStrings(a.resignationDate, b.resignationDate, -1) },
  { key: "resignation-asc", label: "Älteste zuerst", compare: (a, b) => compareStrings(a.resignationDate, b.resignationDate, 1) },
];

const BALANCE_SORTS: SortOption[] = [
  { key: "balance-desc", label: "Höchstes zuerst", compare: (a, b) => b.balanceEur - a.balanceEur },
  { key: "balance-asc", label: "Niedrigstes zuerst", compare: (a, b) => a.balanceEur - b.balanceEur },
];

function SortMenu({
  columnId,
  options,
  activeKey,
  openColumn,
  setOpenColumn,
  onSelect,
}: {
  columnId: string;
  options: SortOption[];
  activeKey: string | null;
  openColumn: string | null;
  setOpenColumn: (id: string | null) => void;
  onSelect: (option: SortOption) => void;
}) {
  const isOpen = openColumn === columnId;

  return (
    <span className="relative ml-1 inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpenColumn(isOpen ? null : columnId)}
        aria-label="Sortieren"
        className="text-white/80 hover:text-white"
      >
        ▼
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 min-w-max rounded-md border border-slate-200 bg-white py-1 text-left font-normal normal-case text-slate-600 shadow-lg">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                onSelect(o);
                setOpenColumn(null);
              }}
              className={`block w-full whitespace-nowrap px-3 py-1.5 text-left text-xs ${
                activeKey === o.key ? "bg-secondary-50 text-primary-700" : "hover:bg-slate-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

export function Employees() {
  const { user } = useAuth();
  // Entfernen/Wiederherstellen/Endgültig löschen call adminOnly backend
  // endpoints (backend/src/routes/admin.ts) — a supervisor clicking these
  // would just get a "Keine Berechtigung" error, so hide them entirely.
  const isAdmin = user?.role === "admin";
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption | null>(null);
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = () => {
    fetchEmployees(showHidden)
      .then((data) => {
        setEmployees(data);
        setError(null);
      })
      .catch(() => setError("Mitarbeiterliste konnte nicht geladen werden."));
  };

  useEffect(load, [showHidden]);

  const handleToggleHidden = async (employee: EmployeeListItem) => {
    const nextHidden = !employee.hidden;
    if (nextHidden && !window.confirm(`${employeeLabel(employee)} aus der Mitarbeiterliste entfernen?`)) return;
    setError(null);
    try {
      await setEmployeeHidden(employee.id, nextHidden);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aktion fehlgeschlagen.");
    }
  };

  const handleDeletePermanently = async (employee: EmployeeListItem) => {
    if (
      !window.confirm(
        `${employeeLabel(employee)} endgültig löschen? Dies kann NICHT rückgängig gemacht werden.`
      )
    )
      return;
    setError(null);
    try {
      await deleteEmployeePermanently(employee.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Endgültiges Löschen fehlgeschlagen.");
    }
  };

  useEffect(() => {
    if (!openColumn) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenColumn(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openColumn]);

  const displayedEmployees = sort ? [...employees].sort(sort.compare) : employees;

  return (
    <div ref={containerRef}>
      <PageHeading>Mitarbeiter</PageHeading>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={showHidden}
          onChange={(e) => setShowHidden(e.target.checked)}
        />
        Entfernte Mitarbeiter anzeigen
      </label>

      {error && <p className="mb-4 mt-2 text-sm text-red-600">{error}</p>}

      <Card className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-secondary-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-bold text-white">
                Name
                <SortMenu
                  columnId="name"
                  options={NAME_SORTS}
                  activeKey={sort?.key ?? null}
                  openColumn={openColumn}
                  setOpenColumn={setOpenColumn}
                  onSelect={setSort}
                />
              </th>
              <th className="px-4 py-2.5 text-left font-bold text-white">
                Nr.
                <SortMenu
                  columnId="nr"
                  options={NR_SORTS}
                  activeKey={sort?.key ?? null}
                  openColumn={openColumn}
                  setOpenColumn={setOpenColumn}
                  onSelect={setSort}
                />
              </th>
              <th className="px-4 py-2.5 text-left font-bold text-white">
                Gruppe
                <SortMenu
                  columnId="group"
                  options={GROUP_SORTS}
                  activeKey={sort?.key ?? null}
                  openColumn={openColumn}
                  setOpenColumn={setOpenColumn}
                  onSelect={setSort}
                />
              </th>
              <th className="px-4 py-2.5 text-left font-bold text-white">
                Eintrittsdatum
                <SortMenu
                  columnId="hireDate"
                  options={HIRE_DATE_SORTS}
                  activeKey={sort?.key ?? null}
                  openColumn={openColumn}
                  setOpenColumn={setOpenColumn}
                  onSelect={setSort}
                />
              </th>
              <th className="px-4 py-2.5 text-left font-bold text-white">
                Status
                <SortMenu
                  columnId="status"
                  options={STATUS_SORTS}
                  activeKey={sort?.key ?? null}
                  openColumn={openColumn}
                  setOpenColumn={setOpenColumn}
                  onSelect={setSort}
                />
              </th>
              <th className="px-4 py-2.5 text-left font-bold text-white">
                Austrittsdatum
                <SortMenu
                  columnId="resignationDate"
                  options={RESIGNATION_SORTS}
                  activeKey={sort?.key ?? null}
                  openColumn={openColumn}
                  setOpenColumn={setOpenColumn}
                  onSelect={setSort}
                />
              </th>
              <th className="px-4 py-2.5 text-right font-bold text-white">
                Guthaben
                <SortMenu
                  columnId="balance"
                  options={BALANCE_SORTS}
                  activeKey={sort?.key ?? null}
                  openColumn={openColumn}
                  setOpenColumn={setOpenColumn}
                  onSelect={setSort}
                />
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedEmployees.map((e) => (
              <tr key={e.id} className={`hover:bg-slate-50 ${e.hidden ? "opacity-60" : ""}`}>
                <td className="px-4 py-2.5 text-slate-700">{employeeLabel(e)}</td>
                <td className="px-4 py-2.5 text-slate-600">{e.employeeNumber ?? "-"}</td>
                <td className="px-4 py-2.5 text-slate-600">{e.employeeGroup?.name ?? "-"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                  {e.hireDate ? new Date(e.hireDate).toLocaleDateString("de-AT") : "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      e.employmentStatus === "active"
                        ? "bg-secondary-100 text-secondary-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {e.employmentStatus === "active" ? "Aktiv" : "Gekündigt"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                  {e.resignationDate ? new Date(e.resignationDate).toLocaleDateString("de-AT") : "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700">
                  {e.balanceEur} €
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isAdmin && e.employmentStatus === "resigned" && (
                      <Button
                        variant={e.hidden ? "secondary" : "danger"}
                        className="px-2.5 py-1"
                        onClick={() => handleToggleHidden(e)}
                      >
                        {e.hidden ? "Wiederherstellen" : "Entfernen"}
                      </Button>
                    )}
                    {isAdmin && e.hidden && (
                      <Button variant="danger" className="px-2.5 py-1" onClick={() => handleDeletePermanently(e)}>
                        Endgültig löschen
                      </Button>
                    )}
                    <Link
                      to={`/admin/employees/${e.id}`}
                      className="inline-block rounded-md border-2 border-secondary-500 bg-white px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-secondary-50"
                    >
                      Details
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
