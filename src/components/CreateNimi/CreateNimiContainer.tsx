import { Nimi } from '@nimi.io/card';
import createDebugger from 'debug';
import { useEffect, useState } from 'react';

import { Container } from '../../components/Container';
import { CreateNimi } from '../../components/CreateNimi';
import { Loader } from '../../components/Loader';
import { useAvaliableThemesFromPoaps } from '../../hooks/useAvaliableThemesFromPoaps';
import { useRainbow } from '../../hooks/useRainbow';
import { fetchGeneratedNimi, fetchNimiDataByENSName } from '../../modules/api-service';

type CreateNimiContainerProps = {
  ensName: string;
};

const debug = createDebugger('CreateNimiContainer');

export function CreateNimiContainer({ ensName }: CreateNimiContainerProps) {
  const { account, provider } = useRainbow();
  const [initialNimi, setInitialNimi] = useState<Nimi>();
  const [isLoading, setIsLoading] = useState(true);

  //check if user has certain poap
  const { avaliableThemes, loading: themeLoading } = useAvaliableThemesFromPoaps({
    account,
  });

  useEffect(() => {
    // Check for previous nimi snapshot

    const fetchInitialNimi = async () => {
      try {
        const nimiData = await fetchNimiDataByENSName(ensName);
        debug({ nimiData });
        if (nimiData) {
          setInitialNimi(nimiData.nimi);
          return;
        }
        // If no previous nimi snapshot, generate the initial nimi
        const initialGeneratedNimi = await fetchGeneratedNimi(ensName);
        if (initialGeneratedNimi) {
          setInitialNimi(initialGeneratedNimi);
        }
      } catch (error) {
        debug({ error });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialNimi();
  }, [ensName]);

  if (isLoading || themeLoading) {
    return <Loader />;
  }

  return (
    <Container>
      <CreateNimi
        ensAddress={account as string}
        ensName={ensName as string}
        provider={provider as any}
        availableThemes={avaliableThemes}
        initialNimi={initialNimi}
      />
    </Container>
  );
}
