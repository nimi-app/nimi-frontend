import { useChainModal, useConnectModal } from '@rainbow-me/rainbowkit';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { styled } from 'styled-components';
import '@rainbow-me/rainbowkit/styles.css';
import { useAccount, useClient, useConnect } from 'wagmi';

import backgroundImage from '../assets/images/nimi-header-background.jpeg';
import NimiLogoText from '../assets/svg/nimi-logo-text.svg';
import { Button } from '../components/Button';
import { Container } from '../components/Container';
import { Footer } from '../components/Footer';
import { NimiSignatureColor } from '../theme';

export function ConnectWalletButton() {
  const { t } = useTranslation();
  const navigate = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const { openChainModal } = useChainModal();
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { connectAsync, connectors } = useConnect();
  const client = useClient();
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  useEffect(() => {
    if (isAutoConnecting) return;
    if (isConnected) return;

    setIsAutoConnecting(true);

    const autoConnect = async () => {
      const lastUsedConnector = client.storage?.getItem('wallet');

      const sorted = lastUsedConnector
        ? [...connectors].sort((x) => (x.id === lastUsedConnector ? -1 : 1))
        : connectors;

      for (const connector of sorted) {
        if (!connector.ready || !connector.isAuthorized) continue;
        const isAuthorized = await connector.isAuthorized();
        if (!isAuthorized) continue;

        await connectAsync({ connector });
        break;
      }
    };

    autoConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoaded(true);
    }

    console.log({
      address,
      isConnected,
    });

    if (address && isConnected) {
      navigate.push('/domains');
    }
  }, [isConnected, address, navigate]);

  if (!isLoaded) return null;

  return (
    <Button
      onClick={() => {
        if (!isConnected) {
          openConnectModal?.();
        } else {
          openChainModal?.();
        }
      }}
    >
      <span>{t('hero.buttonLabel', { ns: 'landing' })}</span>
    </Button>
  );
}

export default function IndexPage() {
  const { t } = useTranslation('landing');

  return (
    <>
      <Head>
        <title>Nimi</title>
      </Head>
      <PageWrapper>
        <Header>
          <NimiLogoText height="60px" />
        </Header>
        <Content>
          <Container>
            <HeaderEyebrow>{t('hero.eyebrowText', { ns: 'landing' })}</HeaderEyebrow>
            <HeroText>
              <HeroLead>
                <Trans ns="landing" key="hero.lead">
                  Your{' '}
                  <i>
                    <strong>Web3</strong>
                  </i>{' '}
                  Identity.
                </Trans>
              </HeroLead>
            </HeroText>
            <ConnectWalletButton />
          </Container>
        </Content>
        <Footer />
      </PageWrapper>
    </>
  );
}

export const PageWrapper = styled.div`
  display: flex;
  background-image: url('${backgroundImage.src}');
  background-position: center;
  background-size: cover;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
`;

export const Header = styled.header`
  width: 100%;
  display: flex;

  margin-top: 60px;
  flex-grow: 0;
  -webkit-box-pack: center;
  justify-content: center;
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  font-style: normal;
  justify-content: center;
  flex-grow: 1;
  text-align: center;
`;

export const HeroText = styled.div`
  ${NimiSignatureColor};
  font-size: 72px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size:42px;
  `};
  align-items: center;
  margin-bottom: 32px;
  justify-content: start;
  > * {
    -webkit-text-fill-color: transparent;
  }
`;

export const HeroLead = styled.div`
  font-weight: 400;
  line-height: 93.06px;
`;

export const HeroSub = styled.div`
  font-weight: 600;
`;
export const HeaderEyebrow = styled.div`
  font-weight: 700;
  font-size: 15px;
  line-height: 117.7%;
  margin-bottom: 16px;
  text-align: center;
  letter-spacing: 0.1em;
  text-transform: uppercase;

  color: #556de7;
`;
