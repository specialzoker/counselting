interface DataTableProps {
  columns: string[]
  rows: (string | number | null)[][]
  title?: string | null
}

function formatCell(v: string | number | null): string {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(2)
  }
  return v ?? ''
}

export default function DataTable({ columns, rows, title }: DataTableProps) {
  return (
    <div className="data-table">
      {title && <h3 className="data-table-title">{title}</h3>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{formatCell(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty-note">표시할 데이터가 없습니다.</p>}
      </div>
    </div>
  )
}
