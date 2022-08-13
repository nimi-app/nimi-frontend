import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { unstable_batchedUpdates } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useMemo, useRef, useState, useCallback } from 'react';
import { ContractTransaction, ContractReceipt } from '@ethersproject/contracts';
import { ReactComponent as PoapLogo } from '../../assets/svg/poap-logo.svg';

import { Nimi, nimiCard, NimiLink, NimiBlockchain, linkTypeList, NimiLinkBaseDetails, NimiWidgetType } from 'nimi-card';
import { CardBody, Card } from '../Card';
import {
  InnerWrapper,
  MainContent,
  PreviewContent,
  PageSectionTitle,
  ProfileImage,
  ProfileImagePlaceholder,
  AddFieldsButton,
  SaveAndDeployButton,
  PreviewMobile,
  BackButton,
  PoapButton,
} from './styled';

import { Label, Input, TextArea, FormGroup } from '../form';

// Partials
import { ImportButtonsWrapper, ImportFromLensProtocolButton, ImportFromTwitterButton } from './partials/buttons';
import { NimiBlockchainField } from './partials/NimiBlockchainField';
import { NimiLinkField } from './partials/NimiLinkField';
import { AddFieldsModal } from './partials/AddFieldsModal';
import { NimiPreviewCard } from './partials/NimiPreviewCard';
import { ImportFromTwitterModal } from './partials/ImportFromTwitterModal';
import { FormWrapper, LinkFormGroup } from '../form/FormGroup';
import { useLocation } from 'react-router-dom';
import { ENSMetadata } from '../../hooks/useENSMetadata';
import { setBonfidaContentHash, setENSNameContentHash } from '../../hooks/useSetContentHash';
import { useENSPublicResolverContract } from '../../hooks/useENSPublicResolverContract';
import { PublishNimiModal } from './partials/PublishNimiModal';
import { useLensDefaultProfileData } from '../../hooks/useLensDefaultProfileData';
import { publishNimi } from './api';
import { useConnection } from '@solana/wallet-adapter-react';
import { ActiveNetworkState, useActiveNetwork } from '../../context/ActiveNetwork';

export interface CreateNimiProps {
  userAddress: string;
  ensName: string;
  ensLabelName: string;
  solanaData?: any;
}

export function CreateNimi({ userAddress, ensName, solanaData }: CreateNimiProps) {
  /**
   * @todo replace this API
   */
  const [isAddFieldsModalOpen, setIsAddFieldsModalOpen] = useState(false);
  const [isImportFromTwitterModalOpen, setIsImportFromTwitterModalOpen] = useState(false);
  const location = useLocation();
  const ensMetadata = location.state as ENSMetadata;
  const { connection } = useConnection();
  const { activeNetwork } = useActiveNetwork();

  const { loading: loadingLensProfile, defaultProfileData: lensProfile } = useLensDefaultProfileData();
  const { t } = useTranslation('nimi');

  /**
   * Publish Nimi state
   * @todo create a reducer or context for this
   */
  const publicResolverContract = useENSPublicResolverContract();
  const [isPublishNimiModalOpen, setIsPublishNimiModalOpen] = useState(false);
  const [isPublishingNimi, setIsPublishingNimi] = useState(false);
  const [publishNimiError, setPublishNimiError] = useState<Error>();
  const [publishNimiResponseIpfsHash, setPublishNimiResponseIpfsHash] = useState<string>();
  const [setContentHashTransaction, setSetContentHashTransaction] = useState<ContractTransaction>();
  const [setContentHashTransactionReceipt, setSetContentHashTransactionReceipt] = useState<ContractReceipt>();
  const publishNimiAbortController = useRef<AbortController>();

  // Form state manager
  const useFormContext = useForm<Nimi>({
    resolver: yupResolver(nimiCard),
    defaultValues: {
      displayName: ensName,
      displayImageUrl: ensMetadata?.image,
      description: '',
      ensAddress: userAddress,
      ensName,
      addresses: [],
      links: [],
      widgets: [
        {
          type: NimiWidgetType.POAP,
          address: userAddress,
        },
      ],
    },
  });

  const { register, watch, handleSubmit, setValue, getValues } = useFormContext;

  // Manages the links blockchain address list
  const [formLinkList, setFormLinkList] = useState<NimiLink[]>([]);
  const [formAddressList, setFormAddressList] = useState<NimiBlockchain[]>([]);
  const [formWidgetList, setFormWidgetList] = useState<NimiWidgetType[]>([NimiWidgetType.POAP]);
  // To keep the same order of links and addresses, compute
  // the list of blockchain addresses and links from Nimi
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const selectedBlockchainAddressFieldList = useMemo(
    () => Object.values(NimiBlockchain).filter((blockchain) => formAddressList.includes(blockchain)),
    [formAddressList]
  );
  const selectedLinkFieldList = useMemo(
    () => linkTypeList.filter((link) => formLinkList.includes(link)),
    [formLinkList]
  );

  const formWatchPayload = watch();

  const handleImportLensProfile = useCallback(() => {
    if (!lensProfile) return;
    setValue('displayName', lensProfile.name);
    setValue('description', lensProfile.description);
    setValue('displayImageUrl', lensProfile?.pictureUrl);
  }, [setValue, lensProfile]);

  /**
   * Handle the form submit via ENS contract interaction
   * @param data a validated Nimi object
   */
  const onSubmitValid = async (data: Nimi) => {
    unstable_batchedUpdates(() => {
      setIsPublishNimiModalOpen(true);
      setIsPublishingNimi(true);
      setPublishNimiError(undefined);
    });

    try {
      publishNimiAbortController.current = new AbortController();

      const { cid } = await publishNimi(data, publishNimiAbortController.current);

      if (!cid) {
        throw new Error('No CID returned from publishNimi');
      }

      // Set the content
      console.log('solandata', solanaData);
      setPublishNimiResponseIpfsHash(cid);
      if (activeNetwork === ActiveNetworkState.SOLANA) {
        const solana = await setBonfidaContentHash(cid, solanaData.registry, connection);
        console.log('bonfidaContentHash', solana);
      } else {
        if (!publicResolverContract) {
          throw new Error('ENS Public Resolver contract is not available.');
        }
        const setContentHashTransaction = await setENSNameContentHash({
          contract: publicResolverContract,
          name: data.ensName,
          contentHash: `ipfs://${cid}`,
        });

        setSetContentHashTransaction(setContentHashTransaction);

        const setContentHashTransactionReceipt = await setContentHashTransaction.wait();

        unstable_batchedUpdates(() => {
          setSetContentHashTransactionReceipt(setContentHashTransactionReceipt);
          setIsPublishingNimi(false);
        });
      }
    } catch (error) {
      console.error(error);
      unstable_batchedUpdates(() => {
        setIsPublishingNimi(false);
        setPublishNimiError(error);
      });
    }
  };

  const onSubmitInvalid = (data) => {
    console.log(data);
  };
  const handleKeyDown = (e) => {
    e.target.style.height = 'inherit';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <FormProvider {...useFormContext}>
      <InnerWrapper>
        <MainContent showMobile={!showPreviewMobile}>
          <PageSectionTitle>{t('creatingYourProfile')}</PageSectionTitle>
          <Card>
            <CardBody>
              {formWatchPayload.displayImageUrl ? (
                <ProfileImage src={formWatchPayload.displayImageUrl} />
              ) : (
                <ProfileImagePlaceholder />
              )}

              <ImportButtonsWrapper>
                <ImportFromTwitterButton onClick={() => setIsImportFromTwitterModalOpen(true)}>
                  {t('buttonLabel.importFromTwitter')}
                </ImportFromTwitterButton>
                {!loadingLensProfile && !!lensProfile && (
                  <ImportFromLensProtocolButton onClick={handleImportLensProfile}>
                    {t('buttonLabel.importFromLensProtocol')}
                  </ImportFromLensProtocolButton>
                )}
              </ImportButtonsWrapper>
              <FormWrapper onSubmit={handleSubmit(onSubmitValid, onSubmitInvalid)}>
                <FormGroup>
                  <Label htmlFor="displayName">{t('formLabel.displayName')}</Label>
                  <Input placeholder="Name" id="displayName" {...register('displayName')} />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="description">{t('formLabel.description')}</Label>
                  <TextArea
                    onKeyDown={handleKeyDown}
                    maxLength={300}
                    placeholder="Description"
                    id="description"
                    {...register('description')}
                  ></TextArea>
                  {/* <span  role="textbox" contenteditable  {...register('description')}></span> */}
                </FormGroup>

                {selectedLinkFieldList.map((link) => {
                  const label = t(`formLabel.${link}`);

                  return (
                    <LinkFormGroup key={'blockchain-input-' + link}>
                      <NimiLinkField key={'link-input' + link} label={label} link={link} />
                    </LinkFormGroup>
                  );
                })}
                {selectedBlockchainAddressFieldList.map((blockchain) => {
                  const label = t(`formLabel.${blockchain.toLowerCase()}`);

                  return (
                    <FormGroup key={'blockchain-input-' + blockchain.toLowerCase()}>
                      <NimiBlockchainField label={label} blockchain={blockchain} />
                    </FormGroup>
                  );
                })}

                <FormGroup>
                  {formWidgetList.includes(NimiWidgetType.POAP) && (
                    <PoapButton>
                      <PoapLogo />
                      POAPs
                    </PoapButton>
                  )}
                  <AddFieldsButton type="button" onClick={() => setIsAddFieldsModalOpen(true)}>
                    + {t('buttonLabel.addFields')}
                  </AddFieldsButton>
                </FormGroup>
                <FormGroup>
                  <SaveAndDeployButton type="submit">{t('publishSite')}</SaveAndDeployButton>
                </FormGroup>
                <PreviewMobile onClick={() => setShowPreviewMobile(true)}>PREVIEW PROFILE</PreviewMobile>
              </FormWrapper>
            </CardBody>
          </Card>
        </MainContent>
        <PreviewContent showMobile={showPreviewMobile}>
          <BackButton onClick={() => setShowPreviewMobile(false)}>← Back To Editor</BackButton>
          <PageSectionTitle>{t('preview')}</PageSectionTitle>

          <NimiPreviewCard nimi={formWatchPayload} />
        </PreviewContent>
      </InnerWrapper>
      {isAddFieldsModalOpen && (
        <AddFieldsModal
          initialValues={{
            links: formLinkList,
            blockchainAddresses: formAddressList,
            widgets: formWidgetList,
          }}
          onClose={() => setIsAddFieldsModalOpen(false)}
          onSubmit={({ links, blockchainAddresses, widgets }) => {
            unstable_batchedUpdates(() => {
              setIsAddFieldsModalOpen(false);
              const arrayOfLinkItemsToBeRemoved = formLinkList.filter((item) => !links.includes(item));
              if (arrayOfLinkItemsToBeRemoved.length > 0) {
                const formData = getValues('links');
                const newArray = formData.filter((item) => !arrayOfLinkItemsToBeRemoved.includes(item.type));
                if (newArray) setValue('links', newArray);
              }

              const arrayOfAddressItemsToBeRemoved = formAddressList.filter(
                (item) => !blockchainAddresses.includes(item)
              );
              if (arrayOfAddressItemsToBeRemoved.length > 0) {
                const formData = getValues('addresses');
                const newArray = formData.filter((item) => !arrayOfAddressItemsToBeRemoved.includes(item.blockchain));
                if (newArray) setValue('addresses', newArray);
              }

              // const arrayOfWidgetsItemsToBeRemoved = formWidgetList.filter((item) => !nimiWidgetList.includes(item));
              // if (arrayOfWidgetsItemsToBeRemoved.length > 0) {
              //   const formData = getValues('widgets');
              //   const newArray = formData.filter((item) => !arrayOfWidgetsItemsToBeRemoved.includes(item.type));

              setValue(
                'widgets',
                widgets.map((widget) => {
                  if (widget === NimiWidgetType.POAP) {
                    return {
                      type: NimiWidgetType.POAP,
                      address: userAddress,
                    };
                  }

                  return widget;
                })
              );

              setFormLinkList(links);
              setFormAddressList(blockchainAddresses);
              setFormWidgetList(widgets);
            });
          }}
        />
      )}
      {isImportFromTwitterModalOpen && (
        <ImportFromTwitterModal
          onClose={() => setIsImportFromTwitterModalOpen(false)}
          onDataImport={(data) => {
            unstable_batchedUpdates(() => {
              const label = t(`formLabel.twitter`);
              // Set the fields and close the modal
              setValue('displayName', data.name);
              setValue('description', data.description);
              setValue('displayImageUrl', data.profileImageUrl);
              const hasTwitter = formLinkList.some((element) => element === 'twitter');
              if (!hasTwitter) setFormLinkList([...formLinkList, 'twitter']);

              const prevLinkState = getValues('links') || [];

              const hasLink = prevLinkState.some((prevLink) => prevLink.type === 'twitter');
              const newState: NimiLinkBaseDetails[] = hasLink
                ? prevLinkState.map((curr) => {
                    if (curr.type === 'twitter') {
                      return { ...curr, url: data.username };
                    }

                    return curr;
                  })
                : [...prevLinkState, { type: 'twitter', label, url: data.username }];

              setValue('links', newState);

              setIsImportFromTwitterModalOpen(false);
            });
          }}
        />
      )}
      {isPublishNimiModalOpen && (
        <PublishNimiModal
          ensName={ensName}
          ipfsHash={publishNimiResponseIpfsHash}
          isPublishing={isPublishingNimi}
          publishError={publishNimiError}
          setContentHashTransaction={setContentHashTransaction}
          setContentHashTransactionReceipt={setContentHashTransactionReceipt}
          cancel={() => {
            setIsPublishNimiModalOpen(false);
            publishNimiAbortController?.current?.abort();
          }}
        />
      )}
    </FormProvider>
  );
}
