import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type Section = {
  q: string;
  a: React.ReactNode;
  roles?: ("driver" | "dispatcher" | "admin")[];
};

const driverSections: Section[] = [
  {
    q: "Pulpit",
    a: (
      <>
        <p>Twój ekran startowy. Znajdziesz tu:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>najbliższą służbę z linią, pojazdem i godzinami,</li>
          <li>szybki dostęp do mapy, rozkładu i raportu bieżącej służby,</li>
          <li>aktualne ogłoszenia i komunikaty pop-up,</li>
          <li>powiadomienia o przydziałach, zmianach i odwołaniach.</li>
        </ul>
      </>
    ),
  },
  {
    q: "Grafik",
    a: (
      <>
        <p>
          Lista Twoich służb na wybrane dni. Klikając służbę przechodzisz do
          jej rozkładu, mapy i raportu. Każdy przydział, zmiana lub odwołanie
          pojawia się jednocześnie jako powiadomienie w dzwoneczku.
        </p>
      </>
    ),
  },
  {
    q: "Dyspozycyjność",
    a: (
      <p>
        Zgłaszasz tu dni i godziny, w których możesz pracować. Dyspozytor
        widzi Twoją dyspozycję przy układaniu służb. Aktualizuj ją z
        wyprzedzeniem — łatwiej dostać służbę, gdy harmonogram już jest jasny.
      </p>
    ),
  },
  {
    q: "Urlopy",
    a: (
      <p>
        Składasz wnioski urlopowe (wypoczynkowy, okolicznościowy, bezpłatny,
        chorobowy). Wniosek trafia do administracji do akceptacji. Status
        widzisz w tej samej zakładce, a decyzję dostajesz w powiadomieniach.
      </p>
    ),
  },
  {
    q: "Raporty i zdarzenia",
    a: (
      <>
        <p>Dwa rodzaje dokumentów wystawianych przez kierowcę:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong>Raport ze służby</strong> — podsumowanie po zakończonej
            zmianie (przebieg, paliwo, uwagi).
          </li>
          <li>
            <strong>Zdarzenie</strong> — wszystko, co odbiega od normy:
            awaria, kolizja, spóźnienie, incydent z pasażerem. Każde zdarzenie
            dostaje swój kod i jest śledzone przez dyspozytora.
          </li>
        </ul>
      </>
    ),
  },
  {
    q: "Mapa i rozkład służby",
    a: (
      <p>
        Z poziomu konkretnej służby otwierasz pełnoekranową mapę z trasą
        linii oraz rozkład jazdy z czasami przystanków. Mapa pokazuje też
        Twoją aktualną pozycję (jeśli Roblox raportuje pozycję pojazdu) oraz
        innych kierowców na służbie.
      </p>
    ),
  },
  {
    q: "Ogłoszenia",
    a: (
      <p>
        Tablica ogłoszeń całej firmy. Możesz komentować i reagować. Najnowsze
        ogłoszenia trafiają też jako powiadomienia, a najważniejsze pojawiają
        się jako komunikaty pop-up po wejściu na panel.
      </p>
    ),
  },
  {
    q: "Mój profil",
    a: (
      <p>
        Twoje dane, awatar, identyfikator pracownika, język i motyw (jasny/
        ciemny). Tutaj zmieniasz hasło i e-mail oraz powiązanie z kontem
        Roblox.
      </p>
    ),
  },
  {
    q: "Czat i powiadomienia",
    a: (
      <>
        <p>
          <strong>Czat</strong> (ikona w nagłówku) — szybkie wiadomości
          między pracownikami i dyspozytorem.
          <br />
          <strong>Dzwoneczek</strong> — powiadomienia o przydziałach służb,
          decyzjach urlopowych, ogłoszeniach i odpowiedziach na Twoje
          raporty/zdarzenia.
        </p>
      </>
    ),
  },
];

const dispatcherSections: Section[] = [
  {
    q: "Pulpit dyspozytora",
    a: (
      <p>
        Widok operacyjny „tu i teraz”: kto jest na służbie, jakie linie są
        obsadzone, ile pojazdów jest aktywnych, świeże zdarzenia i raporty
        oczekujące na akceptację.
      </p>
    ),
  },
  {
    q: "Planowanie sieci",
    a: (
      <>
        <p>Tu zarządzasz wszystkim, co tworzy ofertę przewozową:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong>Linie</strong> — numery, trasy, kierunki, przystanki.
          </li>
          <li>
            <strong>Rozkłady</strong> — kursy na każdej linii w podziale na
            dni typu (powszedni, sobota, niedziela).
          </li>
          <li>
            <strong>Brygady</strong> — sklejone kursy obsługiwane przez jeden
            pojazd w ciągu dnia.
          </li>
          <li>
            <strong>Okna częstotliwości</strong> oraz <strong>łączenia
            międzyliniowe</strong>.
          </li>
        </ul>
      </>
    ),
  },
  {
    q: "Kierowcy i tabor",
    a: (
      <p>
        Lista kierowców z ich dostępnością, status na służbie oraz tabor
        (pojazdy, oznaczenia, dane techniczne, przeglądy). Stąd uruchamiasz
        edycję profilu kierowcy lub karty pojazdu.
      </p>
    ),
  },
  {
    q: "Planowanie służb",
    a: (
      <p>
        Główne narzędzie układania grafiku. Przydzielasz kierowcom i pojazdom
        konkretne służby (numer, data, godziny, linia, brygada). Każdy
        przydział od razu trafia do kierowcy jako powiadomienie i widoczny
        jest w jego grafiku. Status „pending” / „assigned” / „unassigned”
        liczy się automatycznie z tego, kto i co zostało już przypisane.
      </p>
    ),
  },
  {
    q: "Nieprzydzielone",
    a: (
      <p>
        Lista służb bez kierowcy lub pojazdu — to Twoja kolejka do
        domknięcia przed dniem operacyjnym.
      </p>
    ),
  },
  {
    q: "Mapa operacyjna",
    a: (
      <p>
        Mapa wszystkich aktywnych pojazdów w czasie rzeczywistym (dane z
        Robloxa). Widzisz kto gdzie jest, którą linią jedzie i kiedy ostatni
        raz wysłał heartbeat.
      </p>
    ),
  },
  {
    q: "Monitor",
    a: (
      <p>
        Widok „studyjny” do wyświetlenia na drugim monitorze: linie,
        opóźnienia, zdarzenia, alarmy.
      </p>
    ),
  },
  {
    q: "Dziennik",
    a: (
      <p>
        Książka pracy dyspozytora — wpisy o ważnych decyzjach, zmianach w
        sieci, zastępstwach. Zapisuje się z autorem i timestampem.
      </p>
    ),
  },
  {
    q: "Incydenty",
    a: (
      <p>
        Wszystkie zdarzenia zgłoszone przez kierowców trafiają tutaj. Możesz
        je komentować, eskalować, łączyć z raportami i nadawać status. Kody
        incydentów (INC-YYYY-XXXXX) generują się automatycznie.
      </p>
    ),
  },
  {
    q: "Raporty",
    a: (
      <p>
        Raporty zakończonych służb. Akceptujesz, zwracasz do poprawy lub
        dopinasz komentarz. Każdy raport ma kod RPT-YYYY-XXXXX.
      </p>
    ),
  },
  {
    q: "Urlopy (admin)",
    a: (
      <p>
        Lista wniosków urlopowych ze wszystkich pracowników z filtrami po
        statusie i rodzaju. Decyzja od razu wraca do kierowcy jako
        powiadomienie i etykieta w jego widoku „Urlopy”.
      </p>
    ),
  },
  {
    q: "Ogłoszenia i komunikaty pop-up",
    a: (
      <>
        <p>
          <strong>Ogłoszenia</strong> — tablica firmowa z komentarzami.
          <br />
          <strong>Komunikaty pop-up</strong> — krótkie, „twarde” komunikaty,
          które pojawiają się jako modal/baner po wejściu w panel. Liczone
          jest, kto je przeczytał.
        </p>
      </>
    ),
  },
  {
    q: "Statystyki",
    a: (
      <p>
        Skrótowe wskaźniki: liczba służb, frekwencja, raporty, zdarzenia w
        ujęciu tygodniowym i miesięcznym.
      </p>
    ),
  },
];

const adminSections: Section[] = [
  {
    q: "Kandydaci (rekrutacja)",
    a: (
      <>
        <p>Pełen lejek rekrutacyjny w jednej zakładce, w dwóch sekcjach:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong>Zgłoszenia</strong> — to, co przyszło z formularza
            <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">
              /rekrutacja
            </code>
            . Możesz zmieniać status, dopisywać notatki i wysłać kandydatowi
            spersonalizowany link wprowadzający (
            <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">
              /wprowadzenie/&lt;token&gt;
            </code>
            ).
          </li>
          <li>
            <strong>Quizy</strong> — automatycznie generowane przez AI pytania,
            które kandydat wypełnia po zgłoszeniu. Widzisz odpowiedzi, dodajesz
            notatki, a przyciskami <em>Zaakceptuj</em> i <em>Odrzuć</em> wysyłasz
            kandydatowi e-mail z decyzją (akceptacja = gratulacje + zaproszenie
            wkrótce; odrzucenie = uprzejma odmowa z zachętą do ponowienia).
          </li>
        </ul>
      </>
    ),
  },
  {
    q: "Użytkownicy i role",
    a: (
      <>
        <p>
          Zarządzasz kontami pracowników i ich rolami. Dostępne role:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <Badge variant="secondary">admin</Badge> — pełne uprawnienia.
          </li>
          <li>
            <Badge variant="secondary">dyspozytor</Badge> — sekcja Dyspozytor,
            bez panelu administracyjnego.
          </li>
          <li>
            <Badge variant="secondary">kierowca</Badge> — widok kierowcy.
          </li>
        </ul>
        <p className="mt-2 text-muted-foreground text-xs">
          Role są trzymane w osobnej tabeli i sprawdzane po stronie serwera —
          nie da się ich podrobić z przeglądarki.
        </p>
      </>
    ),
  },
  {
    q: "E-maile systemowe",
    a: (
      <p>
        Powiadomienia z aplikacji idą automatycznie (przydziały, decyzje
        rekrutacyjne, quiz, zaproszenia). Jeżeli kandydat lub kierowca nie
        widzi maila, najpierw poproś go o sprawdzenie folderu <em>Spam</em> /
        <em> Oferty</em> — informacja o tym jest dodana w każdej takiej
        wiadomości.
      </p>
    ),
  },
  {
    q: "Integracja z Robloxem",
    a: (
      <p>
        Pojazdy w grze raportują pozycję, służbę i incydenty do tego panelu
        przez publiczne API. Mapa operacyjna i statusy „na służbie” opierają
        się na tych danych. Konto pracownika musi być powiązane z kontem
        Roblox w profilu.
      </p>
    ),
  },
];

export function HelpDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Pomoc"
          aria-label="Pomoc"
          className="rounded-full hover:bg-glass-strong"
        >
          <HelpCircle className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="font-display text-2xl">
            Pomoc i przewodnik po panelu STP
          </DialogTitle>
          <DialogDescription>
            Zwięzły opis każdej funkcji panelu w podziale na role. Kliknij
            sekcję, żeby ją rozwinąć.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="driver" className="px-6 pb-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="driver">Kierowca</TabsTrigger>
            <TabsTrigger value="dispatcher">Dyspozytor</TabsTrigger>
            <TabsTrigger value="admin">Administracja</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[55vh] mt-3 pr-3">
            <TabsContent value="driver">
              <SectionsAccordion sections={driverSections} />
            </TabsContent>
            <TabsContent value="dispatcher">
              <SectionsAccordion sections={dispatcherSections} />
            </TabsContent>
            <TabsContent value="admin">
              <SectionsAccordion sections={adminSections} />
            </TabsContent>

            <div className="mt-6 mb-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
              Brakuje czegoś w tym przewodniku albo coś nie działa? Napisz do
              dyspozytora przez czat w nagłówku — pomożemy.
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function SectionsAccordion({ sections }: { sections: Section[] }) {
  return (
    <Accordion type="multiple" className="w-full">
      {sections.map((s, i) => (
        <AccordionItem key={i} value={`item-${i}`} className="border-border/60">
          <AccordionTrigger className="text-left hover:no-underline">
            {s.q}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
            {s.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
