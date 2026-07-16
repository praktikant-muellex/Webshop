import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEmployees } from "../../api/admin";
import { EmployeeListItem } from "../../api/types";
import { Card } from "../../components/ui/Card";
import { PageHeading } from "../../components/ui/PageHeading";

export function Employees() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);

  useEffect(() => {
    fetchEmployees().then(setEmployees);
  }, []);

  return (
    <div>
      <PageHeading>Mitarbeiter</PageHeading>

      <Card className="mt-4 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">E-Mail</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Gruppe</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Eintrittsdatum</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Guthaben</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-700">{e.email}</td>
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
                    {e.employmentStatus === "active" ? "Aktiv" : "Ausgeschieden"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700">
                  {e.balanceEur} €
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <Link to={`/admin/employees/${e.id}`} className="text-primary-600 hover:text-primary-700">
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
