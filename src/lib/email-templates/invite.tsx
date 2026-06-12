import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Zaproszenie do Portalu Kierowcy STP</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Dzień dobry!</Heading>
        <Text style={text}>
          Zostałeś zaproszony do dołączenia do Portalu Kierowcy STP. Kliknij w
          link poniżej, aby utworzyć konto.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Utwórz konto
        </Button>
        <Text style={text}>
          Pozdrawiamy<br />
          Zespół Kadr STP
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
