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

const ApplicationDeclined = () => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Informacja o Twoim zgłoszeniu do STP</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Decyzja rekrutacyjna</Heading>
        <Text style={text}>Cześć,</Text>
        <Text style={text}>
          Dziękujemy za zainteresowanie Skuszawyjińskim Transportem Publicznym
          i za czas poświęcony na wypełnienie quizu rekrutacyjnego. Z przykrością
          informujemy, że tym razem <strong>nie możemy przyjąć Twojego zgłoszenia</strong>.
        </Text>
        <Text style={text}>
          Nie zamykamy jednak drzwi — jeśli chcesz, możesz spróbować ponownie
          w przyszłości. Zachęcamy do nowego zgłoszenia za jakiś czas; chętnie
          rozpatrzymy je jeszcze raz.
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
  component: ApplicationDeclined,
  subject: 'Decyzja rekrutacyjna STP',
  displayName: 'Zgłoszenie odrzucone',
  previewData: {},
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#1a1730', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d3a4d', lineHeight: '1.6', margin: '0 0 12px' }
const hint = { fontSize: '13px', color: '#5a5670', lineHeight: '1.5', margin: '16px 0 0', padding: '12px 14px', backgroundColor: '#f4f3fb', borderRadius: '8px' }
const footer = { fontSize: '12px', color: '#9a96aa', margin: '24px 0 0', textAlign: 'center' as const }
