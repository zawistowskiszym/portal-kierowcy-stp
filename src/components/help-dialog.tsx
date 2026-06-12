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
import { ScrollArea } from "@/components/ui/scroll-area";

type Section = {
  q: string;
  a: React.ReactNode;
};

const driverSections: Section[] = [
  {
    q: "Cel i idea platformy STP (Wprowadzenie)",
    a: (
      <>
        <p className="font-semibold text-foreground mb-2">
          Witaj w STP! Nasz system to zaawansowany symulator prawdziwego przedsiębiorstwa komunikacyjnego.
        </p>
        <p className="mb-2">
          Cała platforma łączy tę stronę internetową z rozgrywką bezpośrednio w grze Roblox. Nie jesteś tu zwykłym graczem — odwzorowujemy tu realną pracę kierowcy autobusu miejskiego oraz dyspozytorów ruchu:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2 mb-3">
          <li>
            <strong>Realistyczny grafik i służby:</strong> Każda jazda w grze opiera się na konkretnej brygadzie, trasie i rozkładzie jazdy zaplanowanym przez dyspozytora.
          </li>
          <li>
            <strong>Telemetria na żywo:</strong> Gdy jedziesz autobusem w Robloxie, Twoja pozycja, prędkość, opóźnienie (dane z systemu PIS) oraz status są przesyłane w czasie rzeczywistym do naszego panelu.
          </li>
          <li>
            <strong>Komunikacja z Dyspozytornią:</strong> Dyspozytorzy widzą Cię na mapie operacyjnej, mogą wysyłać Ci bezpośrednie polecenia w grze oraz reagować na zgłaszane przez Ciebie zdarzenia drogowe czy awarie.
          </li>
          <li>
            <strong>Dokumentacja i kariera:</strong> Po każdej służbie zdajesz raport z przebiegu, zużycia paliwa i ewentualnych uwag. Na tej podstawie budujesz swoją historię i reputację w firmie.
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Dzięki temu systemowi łączymy pasję do symulacji autobusów z profesjonalnym odwzorowaniem struktur rzeczywistego przewoźnika.
        </p>
      </>
    ),
  },
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
            Przewodnik kierowcy STP
          </DialogTitle>
          <DialogDescription>
            Zwięzły opis każdej funkcji panelu dla kierowcy. Kliknij
            sekcję, żeby ją rozwinąć.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] px-6 pb-6">
          <SectionsAccordion sections={driverSections} />

          <div className="mt-6 mb-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
            Brakuje czegoś w tym przewodniku albo coś nie działa? Napisz do
            dyspozytora przez czat w nagłówku — pomożemy.
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SectionsAccordion({ sections }: { sections: Section[] }) {
  return (
    <Accordion type="multiple" className="w-full">
      {sections.map((s, i) => (
        <AccordionItem key={i} value={`item-${i}`} className="border-border/60">
          <AccordionTrigger className="text-left hover:no-underline font-medium py-3">
            {s.q}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
            {s.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
