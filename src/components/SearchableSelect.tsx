import { useEffect, useMemo, useRef, useState } from "react";

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  allowCustom = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return options;
    return options.filter((option) => normalizeText(option).includes(term));
  }, [options, query]);

  return (
    <div className="searchable-select" ref={containerRef}>
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (allowCustom) onChange(event.target.value);
        }}
        placeholder={placeholder}
      />
      {open && (
        <div className="searchable-select-options">
          {filtered.length ? filtered.map((option) => (
            <button
              type="button"
              key={option}
              className={`searchable-select-option ${option === value ? "selected" : ""}`}
              onClick={() => {
                onChange(option);
                setQuery(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          )) : <div className="searchable-select-empty">{allowCustom ? "Nenhum cadastro encontrado. O nome digitado será usado." : "Nenhum resultado encontrado."}</div>}
        </div>
      )}
    </div>
  );
}
