import { useRef, useState } from "react";

interface ImageDropzoneProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export function ImageDropzone({ value, onChange }: ImageDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Bitte eine Bilddatei auswählen.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Bild ist zu groß (max. 4 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.onerror = () => setError("Bild konnte nicht gelesen werden.");
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-2 text-center transition-colors ${
          dragOver ? "border-primary-500 bg-primary-50" : "border-slate-300 hover:bg-slate-50"
        }`}
      >
        {value ? (
          <img src={value} alt="Vorschau" className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-slate-500">Bild hierher ziehen oder klicken</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(null);
          }}
          className="mt-1 text-xs text-red-600 hover:text-red-700"
        >
          Bild entfernen
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
