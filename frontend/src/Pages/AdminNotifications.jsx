// Round 14 (Sheriff): Admin > Notifications. The admin picks a group, types
// one message ({name} optional) and sends it to everyone in the group at
// once, now or at a time they choose. Only the number of members is shown.
// Round 22 (Sheriff): a switch turns the automatic streak reminders on or off.
import { useCallback, useEffect, useState } from "react";
import { BellRing, Clock, Send, Users } from "lucide-react";
import api from "../api/axios";
import "./Admin.css";
import "./AdminRound14.css";

const STATUS = {
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  cancelled: "Cancelled",
  failed: "Failed",
};

function when(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Round 22 (Sheriff): automatic notifications. The admin writes a message,
// picks a starting point and a time, and switches it on. Each member gets it
// on their own timing (e.g. 24 hours after their own sign-up). Edits show
// from the next time it is sent.
const BLANK_RULE = { message: "", trigger: "", amount: "24", unit: "hours" };

function timingText(rule, triggers) {
  const t = triggers.find((x) => x.id === rule.trigger);
  const unit = Number(rule.amount) === 1 ? rule.unit.replace(/s$/, "") : rule.unit;
  const label = (t?.label || rule.trigger).replace(/^After/, "after").replace(/^Before/, "before");
  return `${rule.amount} ${unit} ${label}`;
}

function AutoRuleForm({ triggers, initial, onSave, onCancel, saveLabel }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const ready = form.message.trim() && form.trigger && form.amount !== "" && form.unit;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setNote("");
    try {
      await onSave({ ...form, message: form.message.trim(), amount: Number(form.amount) });
    } catch (err) {
      setNote(err.response?.data?.message || "Could not save it.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="adm-form" onSubmit={submit}>
      <label className="adm-field">
        <span>Message</span>
        <textarea
          rows={3}
          maxLength={500}
          value={form.message}
          onChange={set("message")}
          placeholder="Hi {name}, …"
        />
        <small>Type {"{name}"} to use each member&apos;s first name. {form.message.length}/500</small>
      </label>
      <label className="adm-field">
        <span>Starting point</span>
        <select value={form.trigger} onChange={set("trigger")}>
          <option value="">Choose a starting point</option>
          {triggers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <div className="adm-when">
        <label className="adm-field">
          <span>Time</span>
          <input
            type="number"
            inputMode="numeric"
            min={form.trigger === "last_practice" ? 1 : 0}
            max={1000}
            step={1}
            value={form.amount}
            onChange={set("amount")}
          />
        </label>
        <label className="adm-field">
          <span>Hours or days</span>
          <select value={form.unit} onChange={set("unit")}>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </label>
      </div>
      <div className="adm-when">
        <button type="submit" className="adm-primary" disabled={busy || !ready}>
          {busy ? "Saving…" : saveLabel}
        </button>
        {onCancel && (
          <button type="button" className="adm-text-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      {note && (
        <p className="adm-note" role="status">
          {note}
        </p>
      )}
    </form>
  );
}

function AutoNotifications() {
  const [triggers, setTriggers] = useState([]);
  const [rules, setRules] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api
      .get("/api/admin/notifications/auto")
      .then((r) => {
        setTriggers(r.data.triggers);
        setRules(r.data.rules);
        setError("");
      })
      .catch((e) => setError(e.response?.data?.message || "Could not load the automatic notifications."));
  }, []);
  useEffect(load, [load]);

  const replace = (rule) => setRules((list) => list.map((r) => (r.id === rule.id ? rule : r)));

  const toggle = async (rule, enabled) => {
    try {
      const { data } = await api.put(`/api/admin/notifications/auto/${rule.id}`, { enabled });
      replace(data.rule);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save it.");
    }
  };

  const remove = async (rule) => {
    if (!window.confirm("Delete this automatic notification?")) return;
    try {
      await api.delete(`/api/admin/notifications/auto/${rule.id}`);
      setRules((list) => list.filter((r) => r.id !== rule.id));
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete it.");
    }
  };

  return (
    <div className="adm-card adm-auto">
      <h2 className="adm-card-title">Automatic notifications</h2>
      <p className="adm-sub">
        Each member gets these on their own timing, for example 24 hours after they sign up.
      </p>
      {error && (
        <p className="admin-overview-error" role="alert">
          {error}
        </p>
      )}
      {rules === null && !error && <p className="adm-empty">Loading…</p>}
      {rules && rules.length === 0 && <p className="adm-empty">No automatic notifications yet.</p>}
      {rules && rules.length > 0 && (
        <ul className="adm-history">
          {rules.map((rule) => (
            <li key={rule.id} className={editing === rule.id ? "is-editing" : undefined}>
              <span className="adm-history-icon" aria-hidden="true">
                <BellRing size={16} />
              </span>
              <div className="adm-history-main">
                {editing === rule.id ? (
                  <AutoRuleForm
                    triggers={triggers}
                    initial={{
                      message: rule.message,
                      trigger: rule.trigger,
                      amount: String(rule.amount),
                      unit: rule.unit,
                    }}
                    saveLabel="Save"
                    onCancel={() => setEditing(null)}
                    onSave={async (form) => {
                      const { data } = await api.put(`/api/admin/notifications/auto/${rule.id}`, form);
                      replace(data.rule);
                      setEditing(null);
                    }}
                  />
                ) : (
                  <>
                    <strong>{timingText(rule, triggers)}</strong>
                    <p>{rule.message}</p>
                    <span>
                      {rule.sentCount} sent
                      {rule.lastSentAt ? ` · last ${when(rule.lastSentAt)}` : ""}
                    </span>
                  </>
                )}
              </div>
              {editing !== rule.id && (
                <div className="adm-history-side">
                  <label className="adm-switch">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => toggle(rule, e.target.checked)}
                    />
                    <span className="adm-switch-track" aria-hidden="true" />
                    <span className="adm-sr">{rule.enabled ? "On" : "Off"}</span>
                  </label>
                  <button type="button" className="adm-text-btn" onClick={() => setEditing(rule.id)}>
                    Edit
                  </button>
                  <button type="button" className="adm-text-btn" onClick={() => remove(rule)}>
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <AutoRuleForm
          triggers={triggers}
          initial={BLANK_RULE}
          saveLabel="Save and switch on"
          onCancel={() => setAdding(false)}
          onSave={async (form) => {
            const { data } = await api.post("/api/admin/notifications/auto", { ...form, enabled: true });
            setRules((list) => [...(list || []), data.rule]);
            setAdding(false);
          }}
        />
      ) : (
        <button type="button" className="adm-primary" onClick={() => setAdding(true)}>
          Add automatic notification
        </button>
      )}
    </div>
  );
}

export default function AdminNotifications() {
  const [groups, setGroups] = useState([]);
  const [list, setList] = useState([]);
  const [phonesReady, setPhonesReady] = useState(true);
  const [error, setError] = useState("");
  const [group, setGroup] = useState("");
  const [count, setCount] = useState(null);
  const [message, setMessage] = useState("");
  const [later, setLater] = useState(false);
  const [at, setAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [autoOn, setAutoOn] = useState(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoNote, setAutoNote] = useState("");

  const load = useCallback(() => {
    api
      .get("/api/admin/notifications")
      .then((r) => {
        setGroups(r.data.groups);
        setList(r.data.notifications);
        setPhonesReady(r.data.phonesReady);
        setError("");
      })
      .catch((e) => setError(e.response?.data?.message || "Could not load notifications."));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    api
      .get("/api/admin/notifications/auto-streak")
      .then((r) => setAutoOn(r.data.on))
      .catch(() => setAutoNote("Could not load the streak reminders setting."));
  }, []);

  const toggleAuto = async (on) => {
    setAutoBusy(true);
    setAutoNote("");
    try {
      const { data } = await api.put("/api/admin/notifications/auto-streak", { on });
      setAutoOn(data.on);
    } catch (err) {
      setAutoNote(err.response?.data?.message || "Could not save the setting.");
    } finally {
      setAutoBusy(false);
    }
  };

  useEffect(() => {
    if (!group) return undefined;
    let alive = true;
    api
      .get("/api/admin/notifications/count", { params: { group } })
      .then((r) => alive && setCount(r.data.count))
      .catch(() => alive && setCount(null));
    return () => {
      alive = false;
    };
  }, [group]);

  const chosen = groups.find((g) => g.id === group);

  const send = async (e) => {
    e.preventDefault();
    if (!group || !message.trim()) return;
    if (later && !at) return;
    const confirmText = later
      ? `Schedule this for ${when(at)}?`
      : `Send this to ${count ?? "every"} ${count === 1 ? "member" : "members"} now?`;
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setNote("");
    try {
      const { data } = await api.post("/api/admin/notifications", {
        group,
        message: message.trim(),
        scheduledFor: later ? new Date(at).toISOString() : null,
      });
      const n = data.notification;
      setNote(
        n.status === "scheduled"
          ? `Scheduled for ${when(n.scheduledFor)}.`
          : n.status === "sent"
            ? `Sent to ${n.recipients} ${n.recipients === 1 ? "member" : "members"}.`
            : "Could not send the notification.",
      );
      load();
    } catch (err) {
      setNote(err.response?.data?.message || "Could not send the notification.");
      load();
    } finally {
      // Round 15 (Sheriff): the form is cleared once you press Send.
      setMessage("");
      setGroup("");
      setCount(null);
      setAt("");
      setLater(false);
      setBusy(false);
    }
  };

  const cancel = async (n) => {
    if (!window.confirm("Cancel this scheduled notification?")) return;
    try {
      await api.post(`/api/admin/notifications/${n.id}/cancel`);
      load();
    } catch (err) {
      setNote(err.response?.data?.message || "Could not cancel it.");
    }
  };

  return (
    <section className="adm-section">
      <header className="adm-head">
        <div>
          <p className="admin-overview-eyebrow">Admin dashboard</p>
          <h1>Notifications</h1>
          <p className="adm-sub">Create, schedule and monitor notifications.</p>
        </div>
      </header>

      {error && (
        <p className="admin-overview-error" role="alert">
          {error}
        </p>
      )}
      {!phonesReady && (
        <p className="adm-warn" role="note">
          Phone notifications are off on the server (VAPID keys missing). Members with
          Loquiex open still see the message in the app.
        </p>
      )}

      <article className={`adm-card adm-email${autoOn ? "" : " is-off"}`}>
        <div className="adm-email-top">
          <span className="adm-history-icon" aria-hidden="true">
            <BellRing size={16} />
          </span>
          <div className="adm-email-title">
            <strong>Automatic streak reminders</strong>
            <span>
              Sent to members&apos; phones in their own time zone: 7:00 pm to keep their streak,
              9:00 am and 8:00 pm on their grace day, and 6:00 pm to come back or start their
              first streak.
            </span>
          </div>
          <label className="adm-switch">
            <input
              type="checkbox"
              checked={Boolean(autoOn)}
              disabled={autoBusy || autoOn === null}
              onChange={(e) => toggleAuto(e.target.checked)}
            />
            <span className="adm-switch-track" aria-hidden="true" />
            <span className="adm-sr">{autoOn ? "On" : "Off"}</span>
          </label>
        </div>
        {autoNote && (
          <p className="adm-note" role="status">
            {autoNote}
          </p>
        )}
      </article>

      <form className="adm-card adm-form" onSubmit={send}>
        <label className="adm-field">
          <span>Group</span>
          <select
            value={group}
            onChange={(e) => {
              setCount(null);
              setGroup(e.target.value);
            }}
          >
            <option value="">Choose a group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        {chosen && (
          <div className="adm-audience">
            <Users size={16} aria-hidden="true" />
            <strong>{count === null ? "Counting…" : `${count} ${count === 1 ? "member" : "members"}`}</strong>
            <span>{chosen.who}</span>
          </div>
        )}
        <label className="adm-field">
          <span>Message</span>
          <textarea
            rows={4}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi {name}, …"
          />
          <small>Type {"{name}"} to use each member&apos;s first name. {message.length}/500</small>
        </label>
        <div className="adm-when">
          <label className="adm-check">
            <input type="radio" name="when" checked={!later} onChange={() => setLater(false)} />
            Send now
          </label>
          <label className="adm-check">
            <input type="radio" name="when" checked={later} onChange={() => setLater(true)} />
            Schedule
          </label>
          {later && (
            <input
              className="adm-datetime"
              type="datetime-local"
              value={at}
              onChange={(e) => setAt(e.target.value)}
              aria-label="Send at"
            />
          )}
        </div>
        <button
          type="submit"
          className="adm-primary"
          disabled={busy || !group || !message.trim() || (later && !at) || count === 0}
        >
          {later ? <Clock size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          {busy ? "Sending…" : later ? "Schedule" : "Send to all"}
        </button>
        {note && (
          <p className="adm-note" role="status">
            {note}
          </p>
        )}
      </form>

      <div className="adm-card">
        <h2 className="adm-card-title">Sent and scheduled</h2>
        {list.length === 0 ? (
          <p className="adm-empty">No notifications yet.</p>
        ) : (
          <ul className="adm-history">
            {list.map((n) => (
              <li key={n.id}>
                <span className="adm-history-icon" aria-hidden="true">
                  <BellRing size={16} />
                </span>
                <div className="adm-history-main">
                  <strong>{n.groupLabel}</strong>
                  <p>{n.message}</p>
                  <span>
                    {n.status === "sent"
                      ? `Sent ${when(n.sentAt)} · ${n.recipients} ${n.recipients === 1 ? "member" : "members"}`
                      : n.status === "scheduled"
                        ? `Scheduled for ${when(n.scheduledFor)}`
                        : `${STATUS[n.status] || n.status} · ${when(n.createdAt)}`}
                  </span>
                </div>
                <div className="adm-history-side">
                  <span className={`adm-pill is-${n.status}`}>{STATUS[n.status] || n.status}</span>
                  {n.status === "scheduled" && (
                    <button type="button" className="adm-text-btn" onClick={() => cancel(n)}>
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AutoNotifications />
    </section>
  );
}
