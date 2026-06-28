// src/client/components/CsvImport.tsx
import { useRef, useState } from "react";
import { IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import { api, ApiError } from "../lib/api";

interface ImportResult {
  imported: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export function CsvImport({ onImported }: { onImported: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }

    const text = await file.text();
    setImporting(true);
    try {
      const res = await api.transactions.importCsv(text);
      setResult(res);
      if (res.imported > 0) onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed. Check the file format and try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="bg-surface rounded-xl p-4">
      <h2 className="text-sm font-semibold mb-1">Import from CSV</h2>
      <p className="text-xs text-ink-tertiary mb-3">
        Got a statement export from your bank? Upload it here. The file needs
        columns named <code className="font-mono">amount</code>,{" "}
        <code className="font-mono">type</code> (DEBIT or CREDIT),{" "}
        <code className="font-mono">merchant</code>, and{" "}
        <code className="font-mono">date</code>.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium px-3 py-2.5 rounded-lg border border-dashed border-surface-tertiary hover:bg-surface-secondary transition-colors disabled:opacity-50"
      >
        {importing ? (
          <>
            <IconUpload size={16} className="animate-pulse" />
            Importing...
          </>
        ) : (
          <>
            <IconFileSpreadsheet size={16} />
            {fileName ?? "Choose a CSV file"}
          </>
        )}
      </button>

      {error && <p className="text-xs text-debit mt-2">{error}</p>}

      {result && (
        <div className="mt-3 text-xs">
          <p className={result.imported > 0 ? "text-credit font-medium" : "text-ink-secondary"}>
            Imported {result.imported} transaction{result.imported === 1 ? "" : "s"}.
            {result.failed > 0 && ` ${result.failed} row${result.failed === 1 ? "" : "s"} skipped.`}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-1.5 text-ink-tertiary list-disc list-inside">
              {result.errors.slice(0, 5).map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
