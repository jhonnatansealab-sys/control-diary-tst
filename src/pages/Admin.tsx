import { Camera, Plus, Ship, Trash2, UserCog, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteRemoteSelfie, fetchRemoteSelfies } from "../lib/api";
import { loadSelfies, saveSelfies } from "../lib/storage";
import { isDemoMode } from "../lib/supabase";
import type { AccessAccount, AuthUser, Role, SelfieRecord, SystemSettings } from "../types";

interface AdminProps {
  user: AuthUser;
  settings: SystemSettings;
  onSettingsChange: (settings: SystemSettings) => void | Promise<void>;
}

type AdminSection = "technicians" | "vessels" | "access";

export function Admin({ user, settings, onSettingsChange }: AdminProps) {
  const [section, setSection] = useState<AdminSection>("technicians");
  const [newItem, setNewItem] = useState("");
  const [selfies, setSelfies] = useState<SelfieRecord[]>(loadSelfies);
  const [account, setAccount] = useState({ name: "", username: "", password: "", role: "supervisor" as Exclude<Role, "colaborador"> });
  const [selfieError, setSelfieError] = useState("");
  const isSystemAdmin = user.role === "admin";

  useEffect(() => {
    if (isDemoMode || !isSystemAdmin) return;
    fetchRemoteSelfies(user)
      .then(({ selfies: remoteSelfies }) => setSelfies(remoteSelfies))
      .catch((error: Error) => setSelfieError(error.message));
  }, [isSystemAdmin, user]);

  function addCatalogItem() {
    const value = newItem.trim();
    if (!value) return;
    if (section === "technicians") {
      onSettingsChange({ ...settings, technicians: [...new Set([...settings.technicians, value])].sort() });
    } else if (section === "vessels") {
      onSettingsChange({ ...settings, vessels: [...new Set([...settings.vessels, value.toUpperCase()])].sort() });
    }
    setNewItem("");
  }

  function removeCatalogItem(value: string) {
    if (section === "technicians") {
      onSettingsChange({ ...settings, technicians: settings.technicians.filter((item) => item !== value) });
    } else {
      onSettingsChange({ ...settings, vessels: settings.vessels.filter((item) => item !== value) });
    }
  }

  function addAccount() {
    if (!account.name.trim() || !account.username.trim() || !account.password) return;
    const next: AccessAccount = { ...account, id: `access-${Date.now()}`, active: true };
    onSettingsChange({ ...settings, accessAccounts: [...settings.accessAccounts, next] });
    setAccount({ name: "", username: "", password: "", role: "supervisor" });
  }

  async function deleteSelfie(id: string) {
    if (!settings.allowSelfieDeletion) return;
    if (!isDemoMode) {
      try {
        await deleteRemoteSelfie(user, id);
      } catch (error) {
        setSelfieError((error as Error).message);
        return;
      }
    }
    const next = selfies.filter((selfie) => selfie.id !== id);
    setSelfies(next);
    if (isDemoMode) saveSelfies(next);
  }

  const catalog = section === "technicians" ? settings.technicians : settings.vessels;

  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">CONFIGURAÇÕES</span>
        <h1>Administração</h1>
        <p>{isSystemAdmin ? "Gerencie pessoas, embarcações, acessos e a política das fotos." : "Gerencie os técnicos e as embarcações disponíveis nos registros."}</p>
      </section>
      <section className="admin-grid">
        <button className={`admin-card ${section === "technicians" ? "selected" : ""}`} onClick={() => setSection("technicians")}>
          <span className="admin-icon"><Users size={24} /></span><div><strong>{settings.technicians.length}</strong><span>Técnicos cadastrados</span></div><b>Gerenciar técnicos</b>
        </button>
        <button className={`admin-card ${section === "vessels" ? "selected" : ""}`} onClick={() => setSection("vessels")}>
          <span className="admin-icon"><Ship size={24} /></span><div><strong>{settings.vessels.length}</strong><span>Embarcações ativas</span></div><b>Gerenciar embarcações</b>
        </button>
        {isSystemAdmin && (
          <button className={`admin-card ${section === "access" ? "selected" : ""}`} onClick={() => setSection("access")}>
            <span className="admin-icon"><UserCog size={24} /></span><div><strong>{settings.accessAccounts.length}</strong><span>Acessos configurados</span></div><b>Gerenciar acessos</b>
          </button>
        )}
      </section>

      <section className="panel management-panel">
        <div className="panel-header">
          <div><h2>{section === "technicians" ? "Técnicos" : section === "vessels" ? "Embarcações" : "Contas de acesso"}</h2><p>As alterações são aplicadas imediatamente aos formulários e ao login.</p></div>
        </div>
        {section !== "access" ? (
          <>
            <div className="management-add">
              <input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder={section === "technicians" ? "Nome completo do técnico" : "Nome da embarcação"} onKeyDown={(event) => event.key === "Enter" && addCatalogItem()} />
              <button className="button button-primary" onClick={addCatalogItem}><Plus size={17} /> Adicionar</button>
            </div>
            <div className="management-list">
              {catalog.map((item) => <div key={item}><span>{item}</span><button onClick={() => removeCatalogItem(item)} aria-label={`Remover ${item}`}><Trash2 size={16} /></button></div>)}
            </div>
          </>
        ) : (
          <>
            <div className="account-form">
              <input placeholder="Nome do perfil" value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} />
              <input placeholder="Usuário" value={account.username} onChange={(event) => setAccount({ ...account, username: event.target.value })} />
              <input placeholder="Senha" value={account.password} onChange={(event) => setAccount({ ...account, password: event.target.value })} />
              <select value={account.role} onChange={(event) => setAccount({ ...account, role: event.target.value as Exclude<Role, "colaborador"> })}><option value="supervisor">Supervisor</option><option value="financeiro">Financeiro</option><option value="admin">Administrador</option></select>
              <button className="button button-primary" onClick={addAccount}><Plus size={17} /> Adicionar acesso</button>
            </div>
            <div className="management-list access-list">
              {settings.accessAccounts.map((item) => (
                <div key={item.id}>
                  <span><strong>{item.name}</strong><small>{item.username} · {item.role}</small></span>
                  <label className="mini-switch"><input type="checkbox" checked={item.active} onChange={() => onSettingsChange({ ...settings, accessAccounts: settings.accessAccounts.map((current) => current.id === item.id ? { ...current, active: !current.active } : current) })} /><span>{item.active ? "Ativo" : "Inativo"}</span></label>
                  <button onClick={() => onSettingsChange({ ...settings, accessAccounts: settings.accessAccounts.filter((current) => current.id !== item.id) })} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {isSystemAdmin && <section className="panel selfie-panel">
        <div className="panel-header">
          <div><h2>Registro de selfies</h2><p>Fotos capturadas nos acessos dos colaboradores. Acesso exclusivo do administrador.</p></div>
          <label className="deletion-policy"><input type="checkbox" checked={settings.allowSelfieDeletion} onChange={(event) => onSettingsChange({ ...settings, allowSelfieDeletion: event.target.checked })} /><span>Permitir exclusão de fotos</span></label>
        </div>
        {selfieError && <div className="error-banner">{selfieError}</div>}
        {selfies.length ? (
          <div className="selfie-grid">
            {selfies.map((selfie) => (
              <article className="selfie-card" key={selfie.id}>
                <img src={selfie.imageData} alt={`Selfie de ${selfie.technician}`} />
                <div><strong>{selfie.technician}</strong><span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(selfie.capturedAt))}</span></div>
                <button className="delete-selfie" disabled={!settings.allowSelfieDeletion} onClick={() => deleteSelfie(selfie.id)}><Trash2 size={15} /> Excluir foto</button>
              </article>
            ))}
          </div>
        ) : <div className="empty-state"><Camera size={28} /><strong>Nenhuma selfie registrada</strong><span>As fotos aparecerão aqui depois do primeiro acesso de um colaborador.</span></div>}
      </section>}
    </>
  );
}
