import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  recipientName?: string
  senderName?: string
  subject?: string
  body?: string
  appUrl?: string
}

const NewMessage = ({
  recipientName,
  senderName = 'Pracownik STP',
  subject = 'Nowa wiadomość',
  body = '',
  appUrl = 'https://panel.skuszawyjice.eu',
}: Props) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>{`Nowa wiadomość od ${senderName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Masz nową wiadomość</Heading>
        <Text style={text}>{recipientName ? `Cześć ${recipientName},` : 'Cześć,'}</Text>
        <Text style={text}>
          <strong>{senderName}</strong> wysłał(a) do Ciebie wiadomość w Portalu STP.
        </Text>
        <Section style={card}>
          <Text style={cardLabel}>Temat</Text>
          <Text style={cardSubject}>{subject}</Text>
          <Hr style={hr} />
          <Text style={cardBody}>{body}</Text>
        </Section>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Link href={appUrl} style={button}>
            Otwórz Portal STP
          </Link>
        </Section>
        <Text style={footer}>
          Otrzymujesz tę wiadomość, ponieważ jesteś pracownikiem Skuszawyjińskiego Transportu
          Publicznego.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewMessage,
  subject: (data) => `Nowa wiadomość: ${data.subject ?? 'STP'}`,
  displayName: 'Nowa wiadomość',
  previewData: {
    recipientName: 'Jan',
    senderName: 'Anna Kowalska',
    subject: 'Pytanie o grafik',
    body: 'Cześć, czy możemy zamienić się służbami w piątek?',
    appUrl: 'https://panel.skuszawyjice.eu',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#1a1730', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d3a4d', lineHeight: '1.6', margin: '0 0 12px' }
const card = {
  border: '1px solid #e5e3ed',
  borderRadius: '12px',
  padding: '20px',
  margin: '16px 0',
  backgroundColor: '#fafafe',
}
const cardLabel = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: '#7a7690',
  margin: '0 0 4px',
  fontWeight: 700,
}
const cardSubject = { fontSize: '16px', fontWeight: 600, color: '#1a1730', margin: '0 0 12px' }
const cardBody = { fontSize: '14px', color: '#3d3a4d', whiteSpace: 'pre-wrap' as const, margin: 0 }
const hr = { borderColor: '#e5e3ed', margin: '12px 0' }
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
