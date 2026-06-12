import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import sealabLogo from "../assets/sealab-logo.png";
import { saveSelfie } from "../lib/storage";
import type { AuthUser, Role, SelfieRecord } from "../types";
import type { SystemSettings } from "../types";

interface LoginProps {
  onLogin: (user: AuthUser) => void;
  settings: SystemSettings;
}

export function Login({ onLogin, settings }: LoginProps) {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("colaborador");
  const [choosingRole, setChoosingRole] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [technician, setTechnician] = useState("");
  const [photo, setPhoto] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function chooseRole(nextRole: Role) {
    stopCamera();
    setRole(nextRole);
    setError("");
    setPhoto("");
    const account = settings.accessAccounts.find((item) => item.role === nextRole);
    setUsername(account?.username ?? "");
    setPassword("");
    setChoosingRole(false);
  }

  async function startCamera() {
    setError("");
    if (!technician) {
      setError("Selecione seu nome antes de abrir a camera.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("A camera nao esta disponivel neste navegador.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError("Nao foi possivel acessar a camera. Autorize o uso e tente novamente.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("A camera ainda esta carregando. Aguarde um instante.");
      return;
    }
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 520;
    canvas.height = 520;
    const context = canvas.getContext("2d");
    if (!context) return;
    const sourceX = (video.videoWidth - size) / 2;
    const sourceY = (video.videoHeight - size) / 2;
    context.drawImage(video, sourceX, sourceY, size, size, 0, 0, 520, 520);
    setPhoto(canvas.toDataURL("image/jpeg", 0.78));
    stopCamera();
  }

  function submitManager(event: React.FormEvent) {
    event.preventDefault();
    if (role === "colaborador") return;
    const expected = settings.accessAccounts.find(
      (account) =>
        account.role === role &&
        account.active &&
        account.username === username &&
        account.password === password,
    );
    if (!expected) {
      setError("Usuario ou senha incorretos.");
      return;
    }
    onLogin({ role, name: expected.name, username });
    navigate(role === "financeiro" ? "/registros" : "/");
  }

  function submitCollaborator(event: React.FormEvent) {
    event.preventDefault();
    if (!technician || !photo) {
      setError("Selecione seu nome e registre uma selfie para continuar.");
      return;
    }
    const selfie: SelfieRecord = {
      id: `SELFIE-${Date.now()}`,
      technician,
      imageData: photo,
      capturedAt: new Date().toISOString(),
    };
    saveSelfie(selfie);
    onLogin({
      role: "colaborador",
      name: technician,
      selfieSessionId: selfie.id,
    });
    navigate("/novo");
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand">
          <img src={sealabLogo} alt="Sealab Medicina Ocupacional" />
        </div>
        <div className="login-message">
          <span className="eyebrow light">CONTROLE SEGURO E SIMPLES</span>
          <h1>Registre sua jornada com confianca.</h1>
          <p>Plataforma unificada de registro de Diárias</p>
        </div>
        <div className="login-security"><ShieldCheck size={19} /> Acesso protegido e registros auditaveis</div>
      </section>

      <section className="login-content">
        <div className="login-box">
          {choosingRole ? (
            <>
              <button type="button" className="login-back button-like" onClick={() => setChoosingRole(false)}>
                Voltar para colaborador
              </button>
              <span className="eyebrow">OUTROS PERFIS</span>
              <h2>Escolha o tipo de acesso</h2>
              <p>Os perfis abaixo exigem usuario e senha.</p>
              <div className="role-options">
                <button onClick={() => chooseRole("supervisor")}>
                  <span><UserRound size={22} /></span>
                  <div><strong>Supervisor</strong><small>Acompanhar equipe e aprovar edicoes</small></div>
                </button>
                <button onClick={() => chooseRole("financeiro")}>
                  <span><LockKeyhole size={22} /></span>
                  <div><strong>Financeiro</strong><small>Consultar registros e exportar relatorios</small></div>
                </button>
                <button onClick={() => chooseRole("admin")}>
                  <span><LockKeyhole size={22} /></span>
                  <div><strong>Administrador</strong><small>Gerenciar sistema e auditoria</small></div>
                </button>
              </div>
            </>
          ) : role === "colaborador" ? (
            <form onSubmit={submitCollaborator}>
              <button type="button" className="profile-switch-button" onClick={() => { stopCamera(); setChoosingRole(true); setError(""); }}>
                <UserRound size={17} /> Acessar como Supervisor, Financeiro ou Administrador
              </button>
              <span className="eyebrow">ACESSO DO COLABORADOR</span>
              <h2>Identifique-se</h2>
              <p>Selecione seu nome e tire uma foto para registrar este acesso.</p>
              <label className="field login-field">
                <span>Quem esta acessando? <b>*</b></span>
                <select value={technician} onChange={(event) => { setTechnician(event.target.value); setPhoto(""); }}>
                  <option value="">Selecione seu nome</option>
                  {settings.technicians.map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>

              <div className="camera-card">
                {photo ? (
                  <div className="photo-preview">
                    <img src={photo} alt={`Selfie de ${technician}`} />
                    <span><CheckCircle2 size={18} /> Foto registrada</span>
                  </div>
                ) : cameraActive ? (
                  <div className="camera-preview">
                    <video ref={videoRef} muted playsInline />
                    <div className="face-guide" />
                  </div>
                ) : (
                  <div className="camera-placeholder">
                    <span><Camera size={30} /></span>
                    <strong>Registro por selfie</strong>
                    <small>A foto sera visivel apenas para o administrador.</small>
                  </div>
                )}
                <div className="camera-actions">
                  {photo ? (
                    <button type="button" className="button button-secondary" onClick={() => setPhoto("")}>
                      <RotateCcw size={17} /> Tirar outra
                    </button>
                  ) : cameraActive ? (
                    <button type="button" className="button button-primary" onClick={capturePhoto}>
                      <Camera size={17} /> Capturar foto
                    </button>
                  ) : (
                    <button type="button" className="button button-secondary" onClick={startCamera}>
                      <Camera size={17} /> Abrir camera
                    </button>
                  )}
                </div>
              </div>
              {error && <div className="login-error"><AlertCircle size={17} /> {error}</div>}
              <button className="button button-primary login-submit" disabled={!technician || !photo}>
                Entrar na plataforma
              </button>
            </form>
          ) : (
            <form onSubmit={submitManager}>
              <button type="button" className="login-back button-like" onClick={() => { setRole("colaborador"); setError(""); }}>Voltar para colaborador</button>
              <span className="eyebrow">
                {role === "admin" ? "ACESSO ADMINISTRATIVO" : role === "financeiro" ? "ACESSO FINANCEIRO" : "ACESSO DA SUPERVISAO"}
              </span>
              <h2>Entre com suas credenciais</h2>
              <p>Informe o usuario e a senha definidos para este perfil.</p>
              <label className="field login-field">
                <span>Usuario</span>
                <div className="input-with-icon"><UserRound size={18} /><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></div>
              </label>
              <label className="field login-field">
                <span>Senha</span>
                <div className="input-with-icon">
                  <LockKeyhole size={18} />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              {error && <div className="login-error"><AlertCircle size={17} /> {error}</div>}
              <button className="button button-primary login-submit">Entrar na plataforma</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
