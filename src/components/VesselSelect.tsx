import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { vessels } from "../data";

interface VesselSelectProps {
  value: string[];
  onChange: (vessels: string[]) => void;
  id: string;
}

export function VesselSelect({ value, onChange, id }: VesselSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(vessel: string) {
    onChange(
      value.includes(vessel)
        ? value.filter((item) => item !== vessel)
        : [...value, vessel],
    );
  }

  return (
    <div className="multi-select">
      <button
        id={id}
        type="button"
        className={`select-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{value.length ? value.join(", ") : "Selecione a embarcacao"}</span>
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="select-popover">
          {vessels.map((vessel) => (
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
        </div>
      )}
    </div>
  );
}
