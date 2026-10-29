"use client";
import { use, useEffect, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import { api, type Message } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const { me } = useRequireAuth();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [locked, setLocked] = useState(false);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!me) return;
    let socket: Socket | undefined;
    api<Message[]>(`/bookings/${id}/messages`).then(setMsgs).catch(() => setLocked(true));
    socket = io({ path: "/socket.io" });
    socket.on("connect", () => socket?.emit("join", id));
    socket.on("message", (m: Message) => setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m])));
    return () => { socket?.disconnect(); };
  }, [me, id]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  if (!me) return <p>{t("common.loading")}</p>;
  if (locked) return <p className="text-slate-500">{t("chat.locked")}</p>;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const m = await api<Message>(`/bookings/${id}/messages`, { method: "POST", json: { body } });
    setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] max-w-xl flex-col gap-3">
      <h1 className="text-xl font-bold">{t("chat.title")}</h1>
      <p className="text-xs text-slate-500">{t("chat.masked")}</p>
      <div className="card flex-1 space-y-2 overflow-y-auto">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === me.id ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${m.senderId === me.id ? "bg-brand-600 text-white" : "bg-slate-100"}`}>{m.body}</div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={(e) => void send(e)} className="flex gap-2">
        <input className="input" maxLength={1000} placeholder={t("chat.placeholder")} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn-primary">{t("chat.send")}</button>
      </form>
    </div>
  );
}
