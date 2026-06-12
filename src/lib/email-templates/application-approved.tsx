import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  candidateEmail?: string
}

const ApplicationApproved = ({ candidateEmail }: Props) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Gratulacje! Twoje zgłoszenie do STP zostało zaakceptowane</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Gratulacje!</Heading>
        <Text style={text}>Cześć,</Text>
        <Text style={text}>
          Z radością informujemy, że Twoje zgłoszenie do Skuszawyjińskiego
          Transportu Publicznego zostało <strong>zaakceptowane</strong>.
          Dziękujemy za przejście procesu rekrutacji i udzielenie odpowiedzi
          w quizie.
        </Text>
        <Text style={text}>
          Wkrótce otrzymasz osobne zaproszenie do dołączenia do panelu STP
          {candidateEmail ? ` na adres ${candidateEmail}` : ''}. Prosimy o
          cierpliwość — zajmie nam to maksymalnie kilka dni roboczych.
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
  component: ApplicationApproved,
  subject: 'Gratulacje — Twoje zgłoszenie do STP zostało zaakceptowane',
  displayName: 'Zgłoszenie zaakceptowane',
  previewData: { candidateEmail: 'kandydat@example.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#1a1730', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d3a4d', lineHeight: '1.6', margin: '0 0 12px' }
const hint = { fontSize: '13px', color: '#5a5670', lineHeight: '1.5', margin: '16px 0 0', padding: '12px 14px', backgroundColor: '#f4f3fb', borderRadius: '8px' }
const footer = { fontSize: '12px', color: '#9a96aa', margin: '24px 0 0', textAlign: 'center' as const }
