import { CalendarCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AvailabilityAlertModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="availability-alert-title">
      <section className="modal availability-alert-modal">
        <span className="availability-alert-icon"><CalendarCheck size={34} /></span>
        <span className="eyebrow">DISPONIBILIDADE</span>
        <h2 id="availability-alert-title">Você ainda não informou sua disponibilidade</h2>
        <p>
          Preencha o calendário do mês indicando em quais dias você está disponível
          (diurno, noturno ou ambos) ou indisponível.
        </p>
        <div className="form-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Depois</button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              onClose();
              navigate("/disponibilidade");
            }}
          >
            Preencher agora
          </button>
        </div>
      </section>
    </div>
  );
}
