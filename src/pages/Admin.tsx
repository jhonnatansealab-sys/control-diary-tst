import { Building2, Camera, Filter, MapPin, Phone, Plus, Search, Ship, Trash2, UserCog, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deleteRemoteSelfie, fetchRemoteSelfies } from "../lib/api";
import { CLIENTS } from "../lib/clients";
import { normalizePhone, phonePattern } from "../lib/phone";
import { loadSelfies, saveSelfies } from "../lib/storage";
import { isDemoMode } from "../lib/supabase";
import type { AccessAccount, AuthUser, Role, SelfieRecord, ServiceRegion, SupportContact, SystemSettings } from "../types";

interface AdminProps {
  user: AuthUser;
  settings: SystemSettings;
  onSettingsChange: (settings: SystemSettings) => void | Promise<void>;
}

type AdminSection = "technicians" | "vessels" | "regions" | "supports" | "clients" | "access";
type ManagementFilter = "all" | "contains" | "exact" | "possibleDuplicates" | "supervisor" | "financeiro" | "admin" | "active" | "inactive" | "CBO" | "DOF" | "none";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function PhoneField({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <input
      className="management-phone-input"
      value={draft}
      onChange={(event) => setDraft(normalizePhone(event.target.value))}
      onBlur={() => { if (draft !== value) onCommit(draft); }}
      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
      placeholder="(21) 99999-9999"
    />
  );
}

function duplicateKeys(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const key = normalizeSearch(value);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
}

export function Admin({ user, settings, onSettingsChange }: AdminProps) {
  const [section, setSection] = useState<AdminSection>("technicians");
  const [newItem, setNewItem] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [savingClients, setSavingClients] = useState(false);
  const [managementSearch, setManagementSearch] = useState("");
  const [managementFilter, setManagementFilter] = useState<ManagementFilter>("all");
  const [managementMessage, setManagementMessage] = useState("");
  const [selfies, setSelfies] = useState<SelfieRecord[]>(loadSelfies);
  const [account, setAccount] = useState({ name: "", username: "", password: "", role: "supervisor" as Exclude<Role, "colaborador"> });
  const [selfieError, setSelfieError] = useState("");
  const [newPostByRegion, setNewPostByRegion] = useState<Record<string, string>>({});
  const isSystemAdmin = user.role === "admin";

  useEffect(() => {
    if (isDemoMode || !isSystemAdmin) return;
    fetchRemoteSelfies(user)
      .then(({ selfies: remoteSelfies }) => setSelfies(remoteSelfies))
      .catch((error: Error) => setSelfieError(error.message));
  }, [isSystemAdmin, user]);

  useEffect(() => {
    setManagementSearch("");
    setManagementFilter("all");
    setManagementMessage("");
    setNewItem("");
    setNewPhone("");
  }, [section]);

  function addCatalogItem() {
    const value = newItem.trim();
    if (!value) return;
    if (section === "technicians") {
      if (settings.technicians.some((item) => normalizeSearch(item) === normalizeSearch(value))) {
        setManagementMessage("Este técnico já parece estar cadastrado. Use a busca para conferir antes de adicionar novamente.");
        return;
      }
      if (newPhone && !phonePattern.test(newPhone)) {
        setManagementMessage("Informe o telefone no formato (21) 99999-9999 ou deixe em branco.");
        return;
      }
      onSettingsChange({
        ...settings,
        technicians: [...new Set([...settings.technicians, value])].sort(),
        technicianContacts: newPhone ? { ...settings.technicianContacts, [value]: newPhone } : settings.technicianContacts,
      });
    } else if (section === "supports") {
      if (!phonePattern.test(newPhone)) {
        setManagementMessage("Informe o nome e o telefone no formato (21) 99999-9999.");
        return;
      }
      if (settings.cboSupports.some((item) => normalizeSearch(item.name) === normalizeSearch(value))) {
        setManagementMessage("Este suporte já está cadastrado.");
        return;
      }
      const support: SupportContact = { id: `support-${Date.now()}`, name: value, contact: newPhone };
      onSettingsChange({ ...settings, cboSupports: [...settings.cboSupports, support] });
    } else if (section === "vessels") {
      const vesselName = value.toUpperCase();
      if (settings.vessels.some((item) => normalizeSearch(item) === normalizeSearch(vesselName))) {
        setManagementMessage("Esta embarcação já parece estar cadastrada. Use a busca para conferir antes de adicionar novamente.");
        return;
      }
      onSettingsChange({ ...settings, vessels: [...new Set([...settings.vessels, vesselName])].sort() });
    } else if (section === "regions") {
      if (settings.serviceRegions.some((region) => normalizeSearch(region.name) === normalizeSearch(value))) {
        setManagementMessage("Esta região já parece estar cadastrada. Use a busca para conferir antes de adicionar novamente.");
        return;
      }
      const region: ServiceRegion = { id: `region-${Date.now()}`, name: value, posts: [] };
      onSettingsChange({ ...settings, serviceRegions: [...settings.serviceRegions, region] });
    }
    setNewItem("");
    setNewPhone("");
    setManagementMessage("");
  }

  function updateTechnicianPhone(name: string, phone: string) {
    if (phone && !phonePattern.test(phone)) {
      setManagementMessage("Telefone inválido. Use o formato (21) 99999-9999.");
      return;
    }
    const contacts = { ...settings.technicianContacts };
    if (phone) contacts[name] = phone;
    else delete contacts[name];
    setManagementMessage("");
    onSettingsChange({ ...settings, technicianContacts: contacts });
  }

  function updateSupportPhone(id: string, phone: string) {
    if (!phonePattern.test(phone)) {
      setManagementMessage("Telefone inválido. Use o formato (21) 99999-9999.");
      return;
    }
    setManagementMessage("");
    onSettingsChange({
      ...settings,
      cboSupports: settings.cboSupports.map((item) => (item.id === id ? { ...item, contact: phone } : item)),
    });
  }

  function removeSupport(id: string) {
    onSettingsChange({ ...settings, cboSupports: settings.cboSupports.filter((item) => item.id !== id) });
  }

  async function setVesselClients(vessels: string[], client: string) {
    const next = { ...settings.vesselClients };
    vessels.forEach((vessel) => {
      if (client) next[vessel] = client;
      else delete next[vessel];
    });
    setSavingClients(true);
    try {
      await onSettingsChange({ ...settings, vesselClients: next });
    } finally {
      setSavingClients(false);
    }
  }

  function removeCatalogItem(value: string) {
    if (section === "technicians") {
      const contacts = { ...settings.technicianContacts };
      delete contacts[value];
      onSettingsChange({
        ...settings,
        technicians: settings.technicians.filter((item) => item !== value),
        technicianContacts: contacts,
      });
    } else {
      const clients = { ...settings.vesselClients };
      delete clients[value];
      onSettingsChange({ ...settings, vessels: settings.vessels.filter((item) => item !== value), vesselClients: clients });
    }
  }

  function removeRegion(id: string) {
    onSettingsChange({ ...settings, serviceRegions: settings.serviceRegions.filter((region) => region.id !== id) });
  }

  function addPost(regionId: string) {
    const value = (newPostByRegion[regionId] ?? "").trim();
    if (!value) return;
    const region = settings.serviceRegions.find((item) => item.id === regionId);
    if (region?.posts.some((post) => normalizeSearch(post) === normalizeSearch(value))) {
      setManagementMessage("Este posto já está cadastrado nesta região.");
      return;
    }
    onSettingsChange({
      ...settings,
      serviceRegions: settings.serviceRegions.map((item) =>
        item.id === regionId ? { ...item, posts: [...item.posts, value] } : item
      ),
    });
    setNewPostByRegion((current) => ({ ...current, [regionId]: "" }));
    setManagementMessage("");
  }

  function removePost(regionId: string, post: string) {
    onSettingsChange({
      ...settings,
      serviceRegions: settings.serviceRegions.map((item) =>
        item.id === regionId ? { ...item, posts: item.posts.filter((current) => current !== post) } : item
      ),
    });
  }

  function addAccount() {
    if (!account.name.trim() || !account.username.trim() || !account.password) return;
    if (settings.accessAccounts.some((item) => normalizeSearch(item.username) === normalizeSearch(account.username))) {
      setManagementMessage("Já existe uma conta com este usuário. Use a busca para conferir antes de adicionar novamente.");
      return;
    }
    const next: AccessAccount = { ...account, id: `access-${Date.now()}`, active: true };
    onSettingsChange({ ...settings, accessAccounts: [...settings.accessAccounts, next] });
    setAccount({ name: "", username: "", password: "", role: "supervisor" });
    setManagementMessage("");
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

  const catalog = useMemo(
    () => section === "technicians" ? settings.technicians : section === "vessels" ? settings.vessels : [],
    [section, settings.technicians, settings.vessels],
  );
  const normalizedSearch = normalizeSearch(managementSearch);
  const catalogDuplicateKeys = useMemo(() => duplicateKeys(catalog), [catalog]);
  const filteredCatalog = useMemo(
    () => catalog.filter((item) => {
      const normalizedItem = normalizeSearch(item);
      const matchesSearch = !normalizedSearch || normalizedItem.includes(normalizedSearch);
      const matchesFilter =
        managementFilter === "all" ||
        managementFilter === "contains" ||
        (managementFilter === "exact" && !!normalizedSearch && normalizedItem === normalizedSearch) ||
        (managementFilter === "possibleDuplicates" && catalogDuplicateKeys.has(normalizedItem));

      return matchesSearch && matchesFilter;
    }),
    [catalog, catalogDuplicateKeys, managementFilter, normalizedSearch],
  );
  const filteredClientVessels = useMemo(
    () => settings.vessels.filter((vessel) => {
      const client = settings.vesselClients[vessel] ?? "none";
      const matchesSearch = !normalizedSearch || normalizeSearch(vessel).includes(normalizedSearch);
      const matchesFilter = managementFilter === "all" || managementFilter === client;
      return matchesSearch && matchesFilter;
    }),
    [managementFilter, normalizedSearch, settings.vesselClients, settings.vessels],
  );
  const filteredAccounts = useMemo(
    () => settings.accessAccounts.filter((item) => {
      const searchable = normalizeSearch(`${item.name} ${item.username} ${item.role} ${item.active ? "ativo" : "inativo"}`);
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesFilter =
        managementFilter === "all" ||
        item.role === managementFilter ||
        (managementFilter === "active" && item.active) ||
        (managementFilter === "inactive" && !item.active);

      return matchesSearch && matchesFilter;
    }),
    [managementFilter, normalizedSearch, settings.accessAccounts],
  );
  const visibleCount = section === "access"
    ? filteredAccounts.length
    : section === "regions"
      ? settings.serviceRegions.length
      : section === "supports"
        ? settings.cboSupports.length
        : section === "clients"
          ? filteredClientVessels.length
          : filteredCatalog.length;
  const totalCount = section === "access"
    ? settings.accessAccounts.length
    : section === "regions"
      ? settings.serviceRegions.length
      : section === "supports"
        ? settings.cboSupports.length
        : section === "clients"
          ? settings.vessels.length
          : catalog.length;
  const searchPlaceholder = section === "technicians"
    ? "Pesquisar técnico cadastrado"
    : section === "vessels" || section === "clients"
      ? "Pesquisar embarcação cadastrada"
      : "Pesquisar nome, usuário ou perfil";

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
        <button className={`admin-card ${section === "regions" ? "selected" : ""}`} onClick={() => setSection("regions")}>
          <span className="admin-icon"><MapPin size={24} /></span><div><strong>{settings.serviceRegions.length}</strong><span>Regiões cadastradas</span></div><b>Gerenciar regiões e postos</b>
        </button>
        <button className={`admin-card ${section === "supports" ? "selected" : ""}`} onClick={() => setSection("supports")}>
          <span className="admin-icon"><Phone size={24} /></span><div><strong>{settings.cboSupports.length}</strong><span>Suportes cadastrados</span></div><b>Gerenciar suportes CBO</b>
        </button>
        <button className={`admin-card ${section === "clients" ? "selected" : ""}`} onClick={() => setSection("clients")}>
          <span className="admin-icon"><Building2 size={24} /></span><div><strong>{settings.vessels.filter((vessel) => settings.vesselClients[vessel]).length}/{settings.vessels.length}</strong><span>Embarcações com cliente</span></div><b>Vincular embarcações a clientes</b>
        </button>
        {isSystemAdmin && (
          <button className={`admin-card ${section === "access" ? "selected" : ""}`} onClick={() => setSection("access")}>
            <span className="admin-icon"><UserCog size={24} /></span><div><strong>{settings.accessAccounts.length}</strong><span>Acessos configurados</span></div><b>Gerenciar acessos</b>
          </button>
        )}
      </section>

      <section className="panel management-panel">
        <div className="panel-header">
          <div><h2>{section === "technicians" ? "Técnicos" : section === "vessels" ? "Embarcações" : section === "regions" ? "Regiões e postos de atendimento" : section === "supports" ? "Suportes da CBO" : section === "clients" ? "Clientes das embarcações" : "Contas de acesso"}</h2><p>As alterações são aplicadas imediatamente aos formulários e ao login.</p></div>
        </div>
        {section !== "regions" && section !== "supports" && (
          <div className="management-tools">
            <label className="search-field">
              <Search size={17} />
              <span className="sr-only">Barra de pesquisa</span>
              <input value={managementSearch} onChange={(event) => setManagementSearch(event.target.value)} placeholder={searchPlaceholder} />
            </label>
            <label className="filter-select">
              <Filter size={17} />
              <select value={managementFilter} onChange={(event) => setManagementFilter(event.target.value as ManagementFilter)}>
                <option value="all">Todos</option>
                {section === "clients" ? (
                  <>
                    <option value="CBO">Cliente CBO</option>
                    <option value="DOF">Cliente DOF</option>
                    <option value="none">Sem cliente</option>
                  </>
                ) : section !== "access" ? (
                  <>
                    <option value="contains">Contém o termo</option>
                    <option value="exact">Coincidência exata</option>
                    <option value="possibleDuplicates">Possiveis duplicados</option>
                  </>
                ) : (
                  <>
                    <option value="supervisor">Supervisores</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="admin">Administradores</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </>
                )}
              </select>
            </label>
          </div>
        )}
        <div className="management-results-summary">
          <span>{visibleCount} de {totalCount} itens exibidos</span>
          {managementMessage && <strong>{managementMessage}</strong>}
        </div>
        {section === "regions" ? (
          <>
            <div className="management-add">
              <input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Nome da região" onKeyDown={(event) => event.key === "Enter" && addCatalogItem()} />
              <button className="button button-primary" onClick={addCatalogItem}><Plus size={17} /> Adicionar região</button>
            </div>
            <div className="regions-list">
              {settings.serviceRegions.map((region) => (
                <div className="region-card" key={region.id}>
                  <div className="region-card-header">
                    <span><MapPin size={15} /> <strong>{region.name}</strong></span>
                    <button onClick={() => removeRegion(region.id)} aria-label={`Remover região ${region.name}`}><Trash2 size={16} /></button>
                  </div>
                  <div className="region-posts">
                    {region.posts.map((post) => (
                      <span className="region-post-chip" key={post}>
                        {post}
                        <button type="button" onClick={() => removePost(region.id, post)} aria-label={`Remover posto ${post}`}><Trash2 size={12} /></button>
                      </span>
                    ))}
                    {!region.posts.length && <span className="region-post-empty">Nenhum posto cadastrado nesta região.</span>}
                  </div>
                  <div className="management-add region-post-add">
                    <input
                      value={newPostByRegion[region.id] ?? ""}
                      onChange={(event) => setNewPostByRegion((current) => ({ ...current, [region.id]: event.target.value }))}
                      placeholder="Nome do posto"
                      onKeyDown={(event) => event.key === "Enter" && addPost(region.id)}
                    />
                    <button className="button button-secondary" type="button" onClick={() => addPost(region.id)}><Plus size={15} /> Adicionar posto</button>
                  </div>
                </div>
              ))}
              {!settings.serviceRegions.length && <div className="empty-state compact-empty"><Search size={24} /><strong>Nenhuma região cadastrada</strong><span>Adicione uma região para começar a cadastrar os postos de atendimento.</span></div>}
            </div>
          </>
        ) : section === "clients" ? (
          <>
            <div className="management-add client-bulk-actions">
              <span>{filteredClientVessels.length} embarcações exibidas — vincular todas a:{savingClients ? " (salvando...)" : ""}</span>
              {CLIENTS.map((client) => (
                <button key={client} className="button button-secondary" type="button" disabled={savingClients || !filteredClientVessels.length} onClick={() => setVesselClients(filteredClientVessels, client)}>{client}</button>
              ))}
              <button className="button button-secondary" type="button" disabled={savingClients || !filteredClientVessels.length} onClick={() => setVesselClients(filteredClientVessels, "")}>Remover vínculo</button>
            </div>
            <div className="management-list">
              {filteredClientVessels.map((vessel) => (
                <div key={vessel}>
                  <span>{vessel}</span>
                  <select className="client-select" disabled={savingClients} value={settings.vesselClients[vessel] ?? ""} onChange={(event) => setVesselClients([vessel], event.target.value)}>
                    <option value="">Sem cliente</option>
                    {CLIENTS.map((client) => <option key={client} value={client}>{client}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {!filteredClientVessels.length && <div className="empty-state compact-empty"><Search size={24} /><strong>Nenhuma embarcação encontrada</strong><span>Ajuste a busca ou o filtro.</span></div>}
          </>
        ) : section === "supports" ? (
          <>
            <div className="management-add">
              <input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Nome completo do suporte" onKeyDown={(event) => event.key === "Enter" && addCatalogItem()} />
              <input className="management-phone-input" value={newPhone} onChange={(event) => setNewPhone(normalizePhone(event.target.value))} placeholder="(21) 99999-9999" onKeyDown={(event) => event.key === "Enter" && addCatalogItem()} />
              <button className="button button-primary" onClick={addCatalogItem}><Plus size={17} /> Adicionar suporte</button>
            </div>
            <div className="management-list">
              {settings.cboSupports.map((item) => (
                <div key={item.id}>
                  <span>{item.name}</span>
                  <PhoneField value={item.contact} onCommit={(phone) => updateSupportPhone(item.id, phone)} />
                  <button onClick={() => removeSupport(item.id)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            {!settings.cboSupports.length && <div className="empty-state compact-empty"><Phone size={24} /><strong>Nenhum suporte cadastrado</strong><span>Cadastre os suportes da CBO com nome e telefone para preencher automaticamente os atendimentos.</span></div>}
          </>
        ) : section !== "access" ? (
          <>
            <div className="management-add">
              <input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder={section === "technicians" ? "Nome completo do técnico" : "Nome da embarcação"} onKeyDown={(event) => event.key === "Enter" && addCatalogItem()} />
              {section === "technicians" && <input className="management-phone-input" value={newPhone} onChange={(event) => setNewPhone(normalizePhone(event.target.value))} placeholder="(21) 99999-9999 (opcional)" onKeyDown={(event) => event.key === "Enter" && addCatalogItem()} />}
              <button className="button button-primary" onClick={addCatalogItem}><Plus size={17} /> Adicionar</button>
            </div>
            <div className="management-list">
              {filteredCatalog.map((item) => <div key={item}><span>{item}</span>{section === "technicians" && <PhoneField value={settings.technicianContacts[item] ?? ""} onCommit={(phone) => updateTechnicianPhone(item, phone)} />}<button onClick={() => removeCatalogItem(item)} aria-label={`Remover ${item}`}><Trash2 size={16} /></button></div>)}
            </div>
            {!filteredCatalog.length && <div className="empty-state compact-empty"><Search size={24} /><strong>Nenhum item encontrado</strong><span>Ajuste a busca ou o filtro para conferir os cadastros.</span></div>}
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
              {filteredAccounts.map((item) => (
                <div key={item.id}>
                  <span><strong>{item.name}</strong><small>{item.username} · {item.role}</small></span>
                  <label className="mini-switch"><input type="checkbox" checked={item.active} onChange={() => onSettingsChange({ ...settings, accessAccounts: settings.accessAccounts.map((current) => current.id === item.id ? { ...current, active: !current.active } : current) })} /><span>{item.active ? "Ativo" : "Inativo"}</span></label>
                  <button onClick={() => onSettingsChange({ ...settings, accessAccounts: settings.accessAccounts.filter((current) => current.id !== item.id) })} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            {!filteredAccounts.length && <div className="empty-state compact-empty"><Search size={24} /><strong>Nenhum item encontrado</strong><span>Ajuste a busca ou o filtro para conferir os acessos.</span></div>}
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
