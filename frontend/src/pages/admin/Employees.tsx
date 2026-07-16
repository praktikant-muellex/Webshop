import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEmployees } from "../../api/admin";
import { EmployeeListItem } from "../../api/types";

export function Employees() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);

  useEffect(() => {
    fetchEmployees().then(setEmployees);
  }, []);

  return (
    <div>
      <h1>Mitarbeiter</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>E-Mail</th>
            <th style={{ textAlign: "left" }}>Gruppe</th>
            <th style={{ textAlign: "left" }}>Eintrittsdatum</th>
            <th style={{ textAlign: "left" }}>Status</th>
            <th style={{ textAlign: "right" }}>Guthaben</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{e.email}</td>
              <td>{e.employeeGroup?.name ?? "-"}</td>
              <td>{e.hireDate ? new Date(e.hireDate).toLocaleDateString("de-AT") : "-"}</td>
              <td>{e.employmentStatus}</td>
              <td style={{ textAlign: "right" }}>{e.balanceEur} €</td>
              <td>
                <Link to={`/admin/employees/${e.id}`}>Details</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
