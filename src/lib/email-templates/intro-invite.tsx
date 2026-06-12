import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  introUrl?: string
  candidateEmail?: string
}

const IntroInvite = ({
  introUrl = 'https://panel.skuszawyjice.eu/wprowadzenie',
  candidateEmail,
}: Props) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Materiały wprowadzające STP — Twój spersonalizowany link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Witaj w STP</Heading>
        <Text style={text}>Cześć,</Text>
        <Text style={text}>
          Dziękujemy za zgłoszenie do Skuszawyjińskiego Transportu Publicznego.
          Poniżej znajdziesz spersonalizowany link do materiałów wprowadzających —
          pięciu krótkich filmów, które przygotują Cię do dalszego etapu rekrutacji.
        </Text>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Link href={introUrl} style={button}>
            Otwórz materiały wprowadzające
          </Link>
        </Section>
        <Text style={text}>
          Link jest przypisany do Twojego adresu
          {candidateEmail ? ` (${candidateEmail})` : ''}. Po obejrzeniu filmów
          potwierdzisz zapoznanie się jednym kliknięciem — nie musisz nigdzie
          ponownie wpisywać swojego adresu email.
        </Text>
        <Text style={hint}>
          Nie widzisz tej wiadomości w skrzynce odbiorczej? Sprawdź folder
          <strong> Spam</strong> lub <strong>Oferty</strong>.
        </Text>
        <Text style={footer}>
          Skuszawyjiński Transport Publiczny — rekrutacja
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: IntroInvite,
  subject: 'Materiały wprowadzające STP — Twój link',
  displayName: 'Wprowadzenie (rekrutacja)',
  previewData: {
    introUrl: 'https://panel.skuszawyjice.eu/wprowadzenie/przyklad',
    candidateEmail: 'kandydat@example.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#1a1730', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d3a4d', lineHeight: '1.6', margin: '0 0 12px' }
const hint = { fontSize: '13px', color: '#5a5670', lineHeight: '1.5', margin: '16px 0 0', padding: '12px 14px', backgroundColor: '#f4f3fb', borderRadius: '8px' }
const button = {
  backgroundColor: '#5b3df5',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '10px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: '#9a96aa',
  margin: '24px 0 0',
  textAlign: 'center' as const,
}
