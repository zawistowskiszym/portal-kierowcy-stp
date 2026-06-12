import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Send, Search, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  listChatContacts,
  listChatConversations,
  listChatMessages,
  listDispatcherGroupMessages,
  listDispatcherGroupThreads,
  markChatThreadRead,
  markDispatcherGroupRead,
  sendDirectMessage,
  sendDispatcherGroupMessage,
} from "@/lib/ops.functions";
import { useAuth } from "@/hooks/use-auth";

type ProfileSummary = {
  id: string;
  full_name: string;
  employee_id?: string | null;
  roblox_username?: string | null;
};

const DISPATCHER_GROUP_SELF = "group:self";
const isDispatcherGroupId = (id: string | null) => !!id && id.startsWith("group:");
const groupDriverIdFromSelection = (id: string) => (id === DISPATCHER_GROUP_SELF ? undefined : id.slice("group:".length));

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function ChatPopover() {
  const qc = useQueryClient();
  const { isStaff, user } = useAuth();
  const myId = user?.id ?? null;

  const contactsFn = useServerFn(listChatContacts);
  const conversationsFn = useServerFn(listChatConversations);
  const messagesFn = useServerFn(listChatMessages);
  const markReadFn = useServerFn(markChatThreadRead);
  const sendFn = useServerFn(sendDirectMessage);

  const groupThreadsFn = useServerFn(listDispatcherGroupThreads);
  const groupMessagesFn = useServerFn(listDispatcherGroupMessages);
  const sendGroupFn = useServerFn(sendDispatcherGroupMessage);
  const markGroupReadFn = useServerFn(markDispatcherGroupRead);

  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const isGroup = isDispatcherGroupId(selectedUserId);

  const { data: contactsData } = useQuery({
    queryKey: ["chat", "contacts"],
    queryFn: () => contactsFn(),
    enabled: open,
    staleTime: 60_000,
  });
  const { data: conversationsData } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => conversationsFn(),
    enabled: open,
    refetchInterval: open ? 20_000 : false,
  });
  const { data: messagesData } = useQuery({
    queryKey: ["chat", "messages", selectedUserId],
    queryFn: () => messagesFn({ data: { peerId: selectedUserId! } }),
    enabled: open && !!selectedUserId && !isGroup,
    refetchInterval: open && selectedUserId && !isGroup ? 10_000 : false,
  });

  // Dispatcher group: driver's own thread (driver users only)
  const { data: groupMessagesData } = useQuery({
    queryKey: ["chat", "group-messages", selectedUserId],
    queryFn: () => {
      const driverId = selectedUserId ? groupDriverIdFromSelection(selectedUserId) : undefined;
      return groupMessagesFn({ data: driverId ? { driverId } : {} });
    },
    enabled: open && isGroup,
    refetchInterval: open && isGroup ? 10_000 : false,
  });

  // Dispatcher staff: list of per-driver group threads
  const { data: groupThreadsData } = useQuery({
    queryKey: ["chat", "group-threads"],
    queryFn: () => groupThreadsFn(),
    enabled: open && isStaff,
    refetchInterval: open && isStaff ? 20_000 : false,
  });

  const contacts = (contactsData ?? []) as ProfileSummary[];
  const conversations = (conversationsData ?? []) as Array<{
    peer_id: string;
    last_message: string;
    created_at: string;
    unread_count: number;
  }>;
  const messages = (messagesData ?? []) as Array<{
    id: string;
    author_id: string;
    body: string;
    created_at: string;
  }>;
  const groupMessages = (groupMessagesData ?? []) as Array<{
    id: string;
    author_id: string;
    author_name: string;
    author_role: "dispatcher" | "driver";
    body: string;
    created_at: string;
  }>;
  const groupThreads = (groupThreadsData ?? []) as Array<{
    driver_id: string;
    last_message: string;
    created_at: string;
    unread_count: number;
    driver: ProfileSummary | null;
  }>;

  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((c) =>
      [c.full_name, c.employee_id, c.roblox_username]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [contacts, search]);
  const filteredGroupThreads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groupThreads;
    return groupThreads.filter((t) =>
      [t.driver?.full_name, t.driver?.employee_id, t.driver?.roblox_username, t.last_message]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term)),
    );
  }, [groupThreads, search]);

  const directUnread = conversations.reduce((s, c) => s + c.unread_count, 0);
  const groupUnread = groupThreads.reduce((s, t) => s + t.unread_count, 0);
  const unread = directUnread + groupUnread;

  useEffect(() => {
    if (!open || selectedUserId) return;
    if (!isStaff) {
      setSelectedUserId(DISPATCHER_GROUP_SELF);
      return;
    }
    if (filteredGroupThreads.length > 0) {
      setSelectedUserId(`group:${filteredGroupThreads[0].driver_id}`);
      return;
    }
    if (filteredContacts.length > 0) {
      const preferred = conversations.find((c) => contactMap.has(c.peer_id))?.peer_id;
      setSelectedUserId(preferred ?? filteredContacts[0]?.id ?? null);
    }
  }, [open, selectedUserId, filteredContacts, filteredGroupThreads, conversations, contactMap, isStaff]);

  useEffect(() => {
    if (!open || !selectedUserId) return;
    if (isGroup) {
      const driverId = groupDriverIdFromSelection(selectedUserId);
      markGroupReadFn({ data: driverId ? { driverId } : {} })
        .then(() => qc.invalidateQueries({ queryKey: ["chat", "group-threads"] }))
        .catch(() => {});
    } else {
      markReadFn({ data: { peerId: selectedUserId } })
        .then(() => qc.invalidateQueries({ queryKey: ["chat", "conversations"] }))
        .catch(() => {});
    }
  }, [open, selectedUserId, isGroup, markReadFn, markGroupReadFn, qc]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUserId) {
      toast.error("Wybierz odbiorcę");
      return;
    }
    if (!draft.trim()) {
      toast.error("Wpisz wiadomość");
      return;
    }

    setSending(true);
    try {
      if (isGroup) {
        const driverId = groupDriverIdFromSelection(selectedUserId);
        await sendGroupFn({ data: { ...(driverId ? { driverId } : {}), body: draft } });
        setDraft("");
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["chat", "group-messages", selectedUserId] }),
          qc.invalidateQueries({ queryKey: ["chat", "group-threads"] }),
        ]);
      } else {
        await sendFn({ data: { recipient_id: selectedUserId, body: draft } });
        setDraft("");
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["chat", "conversations"] }),
          qc.invalidateQueries({ queryKey: ["chat", "messages", selectedUserId] }),
        ]);
      }
    } catch (error: any) {
      toast.error(error?.message ?? "Nie udało się wysłać wiadomości");
    } finally {
      setSending(false);
    }
  };

  const selectedContact = selectedUserId && !isGroup ? contactMap.get(selectedUserId) ?? null : null;
  const selectedGroupDriver =
    isGroup && selectedUserId && selectedUserId !== DISPATCHER_GROUP_SELF
      ? groupThreads.find((t) => t.driver_id === groupDriverIdFromSelection(selectedUserId!))?.driver ?? null
      : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" title="Wiadomości">
          <MessageSquare className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[min(92vw,46rem)] p-0 overflow-hidden">
        <div className="grid md:grid-cols-[18rem_minmax(0,1fr)] md:min-h-[34rem]">
          <aside className="border-b md:border-b-0 md:border-r border-border bg-muted/20">
            <div className="border-b border-border px-4 py-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Wiadomości</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {isStaff ? "Grupowe kierowców i bezpośrednie" : "Dyspozytornia i bezpośrednie"}
                  </p>
                </div>
                {unread > 0 && <Badge variant="secondary">{unread} nieprzeczyt.</Badge>}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Szukaj"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="max-h-[16rem] md:max-h-[28rem] overflow-y-auto">
              {/* Driver: single virtual "Dyspozytornia" entry */}
              {!isStaff && (
                <div className="border-b border-border">
                  <div className="px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">Grupa</div>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(DISPATCHER_GROUP_SELF)}
                    className={[
                      "w-full px-4 py-3 text-left transition-colors",
                      selectedUserId === DISPATCHER_GROUP_SELF ? "bg-primary/10" : "hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-9 shrink-0 rounded-full bg-primary/15 text-primary grid place-items-center">
                        <Megaphone className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">Dyspozytornia</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          Czat grupowy ze wszystkimi dyspozytorami
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Dispatcher: per-driver group threads */}
              {isStaff && (
                <div className="border-b border-border">
                  <div className="px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Skrzynka kierowców
                  </div>
                  {filteredGroupThreads.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-muted-foreground">Brak wątków</div>
                  ) : (
                    filteredGroupThreads.map((t) => {
                      const key = `group:${t.driver_id}`;
                      const isActive = selectedUserId === key;
                      const label = t.driver?.full_name ?? "Kierowca";
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedUserId(key)}
                          className={[
                            "w-full px-4 py-3 text-left transition-colors",
                            isActive ? "bg-primary/10" : "hover:bg-muted/40",
                          ].join(" ")}
                        >
                          <div className="flex items-start gap-3">
                            <div className="size-9 shrink-0 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold">
                              {label
                                .split(" ")
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium">{firstName(label)}</p>
                                {t.unread_count > 0 && (
                                  <Badge className="h-5 min-w-5 justify-center px-1.5">{t.unread_count}</Badge>
                                )}
                              </div>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {t.driver?.roblox_username ? `@${t.driver.roblox_username}` : "Czat grupowy"}
                                {t.driver?.employee_id ? ` · ID ${t.driver.employee_id}` : ""}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground mt-1">{t.last_message}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Direct contacts */}
              <div>
                <div className="px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Bezpośrednie
                </div>
                {filteredContacts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">Brak użytkowników</div>
                ) : (
                  filteredContacts.map((contact) => {
                    const conversation = conversations.find((c) => c.peer_id === contact.id);
                    const isActive = selectedUserId === contact.id;
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setSelectedUserId(contact.id)}
                        className={[
                          "w-full px-4 py-3 text-left transition-colors border-t border-border/40",
                          isActive ? "bg-primary/10" : "hover:bg-muted/40",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <div className="size-9 shrink-0 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold">
                            {contact.full_name
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">{firstName(contact.full_name)}</p>
                              {(conversation?.unread_count ?? 0) > 0 && (
                                <Badge className="h-5 min-w-5 justify-center px-1.5">
                                  {conversation?.unread_count}
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {contact.roblox_username ? `@${contact.roblox_username}` : "Brak Roblox"}
                              {contact.employee_id ? ` · ID ${contact.employee_id}` : ""}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground mt-1">
                              {conversation?.last_message ?? "Brak rozmowy"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          <section className="flex min-h-[24rem] flex-col">
            <div className="border-b border-border px-4 py-3">
              {isGroup ? (
                selectedUserId === DISPATCHER_GROUP_SELF ? (
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Megaphone className="size-4" /> Dyspozytornia
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Twoja wiadomość trafia do wszystkich dyspozytorów i administratorów.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-semibold">
                      {selectedGroupDriver?.full_name ?? "Kierowca"}{" "}
                      <span className="text-muted-foreground text-xs">· czat grupowy</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Wszyscy dyspozytorzy widzą tę rozmowę. Kierowca widzi ją jako „Dyspozytornia".
                    </p>
                  </div>
                )
              ) : selectedContact ? (
                <div>
                  <h3 className="text-sm font-semibold">{firstName(selectedContact.full_name)}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedContact.roblox_username ? `@${selectedContact.roblox_username}` : "Brak Roblox"}
                    {selectedContact.employee_id ? ` · ID ${selectedContact.employee_id}` : ""}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Wybierz rozmowę</div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background">
              {!selectedUserId ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">
                  Wybierz rozmowę z listy.
                </div>
              ) : isGroup ? (
                groupMessages.length === 0 ? (
                  <div className="h-full grid place-items-center text-sm text-muted-foreground">
                    Brak wiadomości — napisz pierwszą.
                  </div>
                ) : (
                  groupMessages.map((m) => {
                    const mine = m.author_id === myId;
                    return (
                      <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                        <div
                          className={[
                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                            mine
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground border border-border",
                          ].join(" ")}
                        >
                          {!mine && (
                            <p
                              className={[
                                "text-[10px] font-semibold mb-0.5",
                                m.author_role === "dispatcher" ? "text-primary" : "text-muted-foreground",
                              ].join(" ")}
                            >
                              {m.author_name}
                              {m.author_role === "dispatcher" ? " · dyspozytor" : ""}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p
                            className={[
                              "mt-1 text-[10px]",
                              mine ? "text-primary-foreground/80" : "text-muted-foreground",
                            ].join(" ")}
                          >
                            {new Date(m.created_at).toLocaleString("pl-PL")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )
              ) : messages.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">
                  Brak wiadomości w tej rozmowie.
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.author_id !== selectedUserId;
                  return (
                    <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                      <div
                        className={[
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground border border-border",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p
                          className={[
                            "mt-1 text-[10px]",
                            mine ? "text-primary-foreground/80" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {new Date(message.created_at).toLocaleString("pl-PL")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={submit} className="border-t border-border p-4 space-y-3">
              <Textarea
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  !selectedUserId
                    ? "Najpierw wybierz rozmowę"
                    : isGroup
                    ? selectedUserId === DISPATCHER_GROUP_SELF
                      ? "Wiadomość do dyspozytorni"
                      : "Odpowiedź w czacie grupowym"
                    : "Napisz wiadomość"
                }
                disabled={!selectedUserId || sending}
                maxLength={5000}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!selectedUserId || sending || !draft.trim()}>
                  <Send className="size-4" />
                  {sending ? "Wysyłanie…" : "Wyślij"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </PopoverContent>
    </Popover>
  );
}
