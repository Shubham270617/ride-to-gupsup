import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LabDialog from "../components/lab/LabDialog";
import MembershipPlans from "../components/lab/MembershipPlans";
import RidgeDashboard from "../components/lab/RidgeDashboard";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { useSiteSettings } from "../lib/publicData";
import { buildLabCopy, buildRidgeCopy, useLabAccessSteps, useLabRegistration } from "../lib/labData";

const PROGRAMME = "ridge-repeats";

function RidgeAccess({ copy, labCopy, steps, user, registered, onLogin, onRegister, busy, error }) {
  const done = { login: Boolean(user), register: registered, open: registered };
  const note = user ? [copy.noteMemberTitle, copy.noteMemberText] : [copy.noteGuestTitle, copy.noteGuestText];
  return (
    <>
      <Link to="/lab" className="close" aria-label={labCopy.backLabel}>
        ×
      </Link>
      <div className="eyebrow">{labCopy.accessEyebrow}</div>
      <h2 id="rr-access-title">{copy.accessTitle}</h2>
      <p>{copy.accessText}</p>

      <ol className="access-steps">
        {steps.map((step, i) => (
          <li key={step.id} className={done[step.step] ? "done" : undefined}>
            <b>{done[step.step] ? "✓" : String(i + 1).padStart(2, "0")}</b>
            <div>
              <strong>{step.title}</strong>
              <span>{done[step.step] ? labCopy.stepDoneLabel : step.text}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="connection-note">
        <b>{note[0]}</b>
        <p>{note[1]}</p>
      </div>
      {error && <p className="access-error">{error}</p>}

      <div className="modal-actions">
        {user ? (
          <button type="button" className="button purple" onClick={onRegister} disabled={busy}>
            {busy ? labCopy.registeringLabel : labCopy.registerLabel}
          </button>
        ) : (
          <button type="button" className="button purple" onClick={onLogin}>
            {labCopy.loginLabel}
          </button>
        )}
        <Link to="/lab" className="outline">
          {labCopy.backLabel}
        </Link>
      </div>
    </>
  );
}

export default function LabRidge() {
  const settings = useSiteSettings();
  const copy = useMemo(() => buildRidgeCopy(settings), [settings]);
  const labCopy = useMemo(() => buildLabCopy(settings), [settings]);
  const { user, loading: sessionLoading } = useSession();
  const { requestLogin } = useAuthGate();
  const steps = useLabAccessSteps();
  const registration = useLabRegistration(user?.id, PROGRAMME);
  const checkingAccess = sessionLoading || registration.loading;
  const canOpen = Boolean(user && registration.registered && !checkingAccess);
  const [registering, setRegistering] = useState(false);
  const [accessError, setAccessError] = useState("");

  const handleRegister = async () => {
    setRegistering(true);
    setAccessError("");
    try {
      await registration.register();
    } catch {
      setAccessError(labCopy.registerError);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <>
      <div className="rtg-ridge ridge-page">
        <header className="rr-brandbar">
          <Link className="rr-brand" to="/lab">
            <span className="rr-brandmark">RTG</span>
            <span>{copy.backLabel}<small>{copy.title}</small></span>
          </Link>
        </header>
        {checkingAccess ? (
          <p role="status">Checking your Ridge Repeats access…</p>
        ) : canOpen ? (
          <RidgeDashboard />
        ) : (
          <section className="rr-intro" aria-labelledby="ridge-page-title">
            <div className="rr-intro-copy">
              <p className="rr-eyebrow">{copy.eyebrow}</p>
              <h1 id="ridge-page-title">{copy.title}<span>.</span></h1>
              <p className="rr-intro-line">{copy.introLine}</p>
            </div>
          </section>
        )}
      </div>
      <LabDialog open={!checkingAccess && !canOpen} onClose={() => {}} className="access-dialog" labelledBy="rr-access-title">
        <RidgeAccess
          copy={copy}
          labCopy={labCopy}
          steps={steps}
          user={user}
          registered={registration.registered}
          onLogin={() => requestLogin("login")}
          onRegister={handleRegister}
          busy={registering}
          error={accessError}
        />
      </LabDialog>
      <MembershipPlans
        only="ridge"
        heading={{ eyebrow: copy.packsEyebrow, title: copy.packsTitle, accent: copy.packsTitleAccent, text: copy.packsText, linkLabel: copy.packsAllLabel }}
      />
    </>
  );
}
