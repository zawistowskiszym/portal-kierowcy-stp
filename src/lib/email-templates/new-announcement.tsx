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
  title?: string
  body?: string
  category?: string
  severity?: 'info' | 'warning' | 'critical'
  appUrl?: string
}

const SEV_LABEL: Record<string, string> = {
  info: 'Informacja',
  warning: 'Ostrzeżenie',
  critical: 'Pilne',
}

const NewAnnouncement = ({
  recipientName,
  title = 'Nowe ogłoszenie',
  body = '',
  category,
  severity = 'info',
  appUrl = 'https://panel.skuszawyjice.eu',
}: Props) => {
  const sevColor =
    severity === 'critical' ? '#d33a3a' : severity === 'warning' ? '#d68a14' : '#5b3df5'
  return (
    <Html lang="pl" dir="ltr">
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={{ ...badge, color: sevColor, borderColor: sevColor }}>
            {SEV_LABEL[severity] ?? 'Informacja'}
            {category ? ` · ${category}` : ''}
          </Text>
          <Heading style={h1}>{title}</Heading>
          <Text style={text}>{recipientName ? `Cześć ${recipientName},` : 'Cześć,'}</Text>
          <Text style={text}>Pojawiło się nowe ogłoszenie w Portalu STP:</Text>
          <Section style={card}>
            <Text style={cardBody}>{body}</Text>
          </Section>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Link href={`${appUrl}/ogloszenia`} style={button}>
              Zobacz w portalu
            </Link>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Skuszawyjiński Transport Publiczny · automatyczne powiadomienie z Portalu STP.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NewAnnouncement,
  subject: (data) => `[STP] ${data.title ?? 'Nowe ogłoszenie'}`,
  displayName: 'Nowe ogłoszenie',
  previewData: {
    recipientName: 'Jan',
    title: 'Zmiana w rozkładzie linii 12',
    body: 'Od poniedziałku obowiązuje nowy rozkład jazdy na linii 12.',
    category: 'Zmiany w rozkładzie',
    severity: 'warning',
    appUrl: 'https://panel.skuszawyjice.eu',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#1a1730', margin: '12px 0 16px' }
const text = { fontSize: '15px', color: '#3d3a4d', lineHeight: '1.6', margin: '0 0 12px' }
const badge = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  border: '1px solid',
  borderRadius: '999px',
  padding: '4px 10px',
  margin: '0 0 8px',
}
const card = {
  border: '1px solid #e5e3ed',
  borderRadius: '12px',
  padding: '20px',
  margin: '16px 0',
  backgroundColor: '#fafafe',
}
const cardBody = { fontSize: '14px', color: '#3d3a4d', whiteSpace: 'pre-wrap' as const, margin: 0 }
const hr = { borderColor: '#e5e3ed', margin: '20px 0 12px' }
const button = {
  backgroundColor: '#5b3df5',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '10px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9a96aa', margin: 0, textAlign: 'center' as const }
