import { Camera, Ship, UserCog, Users } from "lucide-react";
import { technicians, vessels } from "../data";
import { loadSelfies } from "../lib/storage";

export function Admin() {
  const selfies = loadSelfies();

  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">CONFIGURACOES</span>
        <h1>Administracao</h1>
        <p>Gerencie os cadastros utilizados nos registros de diarias.</p>
      </section>
      <section className="admin-grid">
        <article className="admin-card">
          <span className="admin-icon"><Users size={24} /></span>
          <div><strong>{technicians.length}</strong><span>Tecnicos cadastrados</span></div>
          <button className="text-link">Gerenciar tecnicos</button>
        </article>
        <article className="admin-card">
          <span className="admin-icon"><Ship size={24} /></span>
          <div><strong>{vessels.length}</strong><span>Embarcacoes ativas</span></div>
          <button className="text-link">Gerenciar embarcacoes</button>
        </article>
        <article className="admin-card">
          <span className="admin-icon"><UserCog size={24} /></span>
          <div><strong>3</strong><span>Perfis de acesso</span></div>
          <button className="text-link">Gerenciar acessos</button>
        </article>
      </section>
      <section className="panel">
        <div className="panel-header"><div><h2>Embarcacoes</h2><p>Lista inicial consolidada a partir do Forms e do Excel.</p></div></div>
        <div className="catalog-grid">
          {vessels.map((vessel) => <div key={vessel}><Ship size={17} /><strong>{vessel}</strong><span>Ativa</span></div>)}
        </div>
      </section>
      <section className="panel selfie-panel">
        <div className="panel-header">
          <div><h2>Registro de selfies</h2><p>Fotos capturadas nos acessos dos colaboradores. Acesso exclusivo do administrador.</p></div>
          <span className="private-badge"><Camera size={14} /> Privado</span>
        </div>
        {selfies.length ? (
          <div className="selfie-grid">
            {selfies.map((selfie) => (
              <article className="selfie-card" key={selfie.id}>
                <img src={selfie.imageData} alt={`Selfie de ${selfie.technician}`} />
                <div>
                  <strong>{selfie.technician}</strong>
                  <span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(selfie.capturedAt))}</span>
                  <small>{selfie.id}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Camera size={28} /><strong>Nenhuma selfie registrada</strong><span>As fotos aparecerao aqui depois do primeiro acesso de um colaborador.</span></div>
        )}
      </section>
    </>
  );
}
