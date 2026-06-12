import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Send, Search } from "lucide-react";
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
  markChatThreadRead,
  sendDirectMessage,
} from "@/lib/ops.functions";

type ProfileSummary = {
  id: string;
  full_name: string;
  employee_id?: string | null;
  roblox_username?: string | null;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function ChatPopover() {
  const qc = useQueryClient();
  const contactsFn = useServerFn(listChatContacts);
  const conversationsFn = useServerFn(listChatConversations);
  const messagesFn = useServerFn(listChatMessages);
  const markReadFn = useServerFn(markChatThreadRead);
  const sendFn = useServerFn(sendDirectMessage);

  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

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
    enabled: open && !!selectedUserId,
    refetchInterval: open && selectedUserId ? 10_000 : false,
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

  const contactMap = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);
  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((contact) =>
      [contact.full_name, contact.employee_id, contact.roblox_username]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [contacts, search]);
  const unread = conversations.reduce((sum, conversation) => sum + conversation.unread_count, 0);

  useEffect(() => {
    if (!open || selectedUserId || filteredContacts.length === 0) return;
    const preferred = conversations.find((conversation) => contactMap.has(conversation.peer_id))?.peer_id;
    setSelectedUserId(preferred ?? filteredContacts[0]?.id ?? null);
  }, [open, selectedUserId, filteredContacts, conversations, contactMap]);

  useEffect(() => {
    if (!open || !selectedUserId) return;
    markReadFn({ data: { peerId: selectedUserId } })
      .then(() => qc.invalidateQueries({ queryKey: ["chat", "conversations"] }))
      .catch(() => {});
  }, [open, selectedUserId, markReadFn, qc]);

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
      await sendFn({ data: { recipient_id: selectedUserId, body: draft } });
      setDraft("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["chat", "conversations"] }),
        qc.invalidateQueries({ queryKey: ["chat", "messages", selectedUserId] }),
      ]);
    } catch (error: any) {
      toast.error(error?.message ?? "Nie udało się wysłać wiadomości");
    } finally {
      setSending(false);
    }
  };

  const selectedContact = selectedUserId ? contactMap.get(selectedUserId) ?? null : null;

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
                  <p className="text-[11px] text-muted-foreground">Wszyscy aktywni użytkownicy</p>
                </div>
                {unread > 0 && <Badge variant="secondary">{unread} nieprzeczyt.</Badge>}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Szukaj osoby"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="max-h-[16rem] md:max-h-[28rem] overflow-y-auto divide-y divide-border">
              {filteredContacts.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">Brak użytkowników</div>
              ) : (
                filteredContacts.map((contact) => {
                  const conversation = conversations.find((item) => item.peer_id === contact.id);
                  const isActive = selectedUserId === contact.id;
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setSelectedUserId(contact.id)}
                      className={[
                        "w-full px-4 py-3 text-left transition-colors",
                        isActive ? "bg-primary/10" : "hover:bg-muted/40",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-9 shrink-0 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold">
                          {contact.full_name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{firstName(contact.full_name)}</p>
                            {(conversation?.unread_count ?? 0) > 0 && (
                              <Badge className="h-5 min-w-5 justify-center px-1.5">{conversation?.unread_count}</Badge>
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
          </aside>

          <section className="flex min-h-[24rem] flex-col">
            <div className="border-b border-border px-4 py-3">
              {selectedContact ? (
                <div>
                  <h3 className="text-sm font-semibold">{firstName(selectedContact.full_name)}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedContact.roblox_username ? `@${selectedContact.roblox_username}` : "Brak Roblox"}
                    {selectedContact.employee_id ? ` · ID ${selectedContact.employee_id}` : ""}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Wybierz użytkownika</div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background">
              {!selectedUserId ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">Wybierz rozmowę z listy.</div>
              ) : messages.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">Brak wiadomości w tej rozmowie.</div>
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
                        <p className={[
                          "mt-1 text-[10px]",
                          mine ? "text-primary-foreground/80" : "text-muted-foreground",
                        ].join(" ")}>
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
                onChange={(event) => setDraft(event.target.value)}
                placeholder={selectedUserId ? "Napisz wiadomość" : "Najpierw wybierz odbiorcę"}
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