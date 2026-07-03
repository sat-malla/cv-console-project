import { Bot, X, ScrollText, MessageSquare, Send, ShieldAlert, Eye, History } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCameraSessions } from "@/contexts/camera-sessions-context";

type LogEntry = {
  id: number;
  session_id: string;
  type: string;
  message: string;
  flagged: boolean;
  created_at: string;
};

type ChatMessage = {
  role: "user" | "agent";
  text: string;
  usedLiveFrame?: boolean;
};

export function AgentBot() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"logs" | "chat">("logs");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const { activeSession } = useCameraSessions();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/session/${activeSession.sessionId}/logs`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setIsThinking(data.thinking ?? false);
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  };

  useEffect(() => {
    if (!open || !activeSession) return;
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, [open, activeSession]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeSession || isSending) return;

    const userMessage = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setChatInput("");
    setIsSending(true);

    try {
      const res = await fetch(`http://127.0.0.1:8000/session/${activeSession.sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "agent", text: data.reply, usedLiveFrame: data.used_live_frame },
      ]);
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        { role: "agent", text: "Something went wrong reaching the agent." },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-150 h-160 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">PRISM Agent</span>
              {activeSession && (
                <span className="text-xs text-muted-foreground font-mono">
                  · {activeSession.cameraName}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 px-3 pt-2 shrink-0">
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                activeTab === "logs"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ScrollText className="h-3.5 w-3.5" />
              Logs
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                activeTab === "chat"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </button>
          </div>

          {isThinking && (
            <div className="flex items-center gap-1.5 p-4 font-mono text-[12px] text-muted-foreground uppercase tracking-widest">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-400" />
              </span>
              Summarizing...
            </div>
          )}

          {!activeSession ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground italic">
                Connect a camera to see agent activity.
              </p>
            </div>
          ) : activeTab === "logs" ? (
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {logs.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No observations yet.</p>
              )}
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex min-h-0">
              <div className="w-55 shrink-0 border-r border-border overflow-y-auto px-3 py-3 flex flex-col gap-2">
                <span className="font-mono text-[12px] tracking-widest text-muted-foreground uppercase mb-1">
                  Recent observations
                </span>
                {logs.map((log) => (
                  <LogRow key={log.id} log={log} compact />
                ))}
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                  {chatMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Ask about what the agent has observed — e.g. "is anything unsafe right now?"
                    </p>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "self-end bg-blue-500/15 text-foreground"
                          : "self-start bg-accent text-foreground"
                      }`}
                    >
                      {msg.role === "agent" && msg.usedLiveFrame !== undefined && (
                        <div className="flex items-center gap-1 mb-1 text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                          {msg.usedLiveFrame ? (
                            <>
                              <Eye className="h-2.5 w-2.5" />
                              Checked live frame
                            </>
                          ) : (
                            <>
                              <History className="h-2.5 w-2.5" />
                              From recent logs
                            </>
                          )}
                        </div>
                      )}
                      {msg.text}
                    </div>
                  ))}
                  {isSending && (
                    <div className="self-start bg-accent rounded-lg px-3 py-2 text-xs text-muted-foreground">
                      Thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="flex items-center gap-2 p-3 border-t border-border shrink-0">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Ask the agent..."
                    className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isSending || !chatInput.trim()}
                    className="p-2 rounded-md bg-blue-500 hover:bg-blue-600 disabled:bg-accent disabled:cursor-not-allowed text-white transition-colors"
                    aria-label="Send message"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open agent"
        className="relative h-14 w-14 rounded-full grid place-items-center text-white transition-transform hover:scale-105 brand-gradient shadow-lg"
      >
        <Bot className="h-6 w-6" />
      </button>
    </div>
  );
}

function LogRow({ log, compact = false }: { log: LogEntry; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(log.created_at).toLocaleTimeString([], { hour12: false });

  return (
    <div
      className={`rounded-md border px-2.5 py-2 ${
        log.flagged ? "border-red-500/40 bg-red-500/5" : "border-border bg-background/40"
      }`}
      onClick={() => compact && setExpanded((e) => !e)}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        {log.flagged && <ShieldAlert className="h-3 w-3 text-red-400" />}
        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
          {log.type} · {time}
        </span>
      </div>
      <p className={`text-xs leading-snug ${compact && !expanded ? "line-clamp-2" : ""}`}>
        {log.message}
      </p>
    </div>
  );
}
