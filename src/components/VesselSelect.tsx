import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface VesselSelectProps {
  value: string[];
  onChange: (vessels: string[]) => void;
  id: string;
  options: string[];
  single?: boolean;
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function VesselSelect({ value, onChange, id, options, single = false }: VesselSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filteredOptions = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return options;
    return options.filter((option) => normalizeText(option).includes(term));
  }, [options, query]);

  function toggle(vessel: string) {
    if (single) {
      onChange(value.includes(vessel) ? [] : [vessel]);
      setOpen(false);
      setQuery("");
      return;
    }
    onChange(value.includes(vessel) ? value.filter((item) => item !== vessel) : [...value, vessel]);
  }

  return (
    <div className="multi-select" ref={containerRef}>
      <button
        id={id}
        type="button"
        className={`select-trigger ${open ? "open" : ""}`}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        aria-expanded={open}
      >
        <span>{value.length ? value.join(", ") : "Selecione a embarcação"}</span>
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="select-popover">
          <label className="select-search">
            <Search size={14} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite para buscar a embarcação"
            />
          </label>
          <div className="select-popover-options">
            {filteredOptions.map((vessel) => (
              <button
                key={vessel}
                type="button"
                className={value.includes(vessel) ? "selected" : ""}
                onClick={() => toggle(vessel)}
              >
                <span className="check-box">{value.includes(vessel) && <Check size={14} />}</span>
                {vessel}
              </button>
            ))}
            {!filteredOptions.length && <div className="select-popover-empty">Nenhum resultado encontrado.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
