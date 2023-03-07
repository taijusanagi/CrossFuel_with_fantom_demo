import { useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';
import MockSBTClaimJson from '../../../truffle/build/MockSBTClaim.json';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  connectSnap,
  getSnap,
  sendAccountAbstraction,
  shouldDisplayReconnectButton,
  getChainId,
  getAbstractAccount,
  // getExternalOwnedAccount,
} from '../utils';
import {
  // ConnectButton,
  WalletConnectButton,
  InstallFlaskButton,
  ReconnectButton,
  SendAccountAbstractionButton,
  Card,
  Select,
  Form,
  Checkbox,
  Modal,
  TextInput,
} from '../components';
import deployments from '../../../truffle/deployments.json';
import networks from '../../../truffle/networks.json';
import { covalentApiKey } from '../../../truffle/config.json';
import { isChainId, ChainId } from '../../../../../common/types/ChainId';

const core = new Core({
  projectId: 'e45e61249f768100f05bf973e956a3e6',
});

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 3rem;
`;

const Notice = styled.div`
  background-color: ${({ theme }) => theme.colors.background.alternative};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;

  & > * {
    margin: 0;
  }
  ${({ theme }) => theme.mediaQueries.small} {
    margin-top: 1.2rem;
    padding: 1.6rem;
  }
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error.muted};
  border: 1px solid ${({ theme }) => theme.colors.error.default};
  color: ${({ theme }) => theme.colors.error.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const WalletAddress = styled.div`
  font-size: 0.6em;
`;

const ModalSubTitle = styled.div`
  font-weight: bold;
  padding: 10px 0;
  margin-top: 20px;
`;

const NetworkText = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.small};
`;

const NetworkNames = styled.div`
  white-space: pre-wrap;
  padding: 0;
  line-height: 1.5;
`;

const WarningString = styled.div`
  font-size: 12px;
  color: #ff0000; /* original red color */
  filter: brightness(80%); /* makes the color 80% as bright */
  margin-bottom: 6px;
`;

const backendURLBase =
  process.env.GATSBY_BACKEND_URL || 'http://localhost:8001';

const isAxelarNativeToken = (address: string) => {
  return address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
};

const isMockGasPaymentToken = (address: string) => {
  return address === deployments.mockERC20Address;
};

const chainIdToCovalentNativeToken = (chainId: string) => {
  if (chainId === '5') {
    return '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  }
  return '0x0000000000000000000000000000000000001010';
};

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [gasPaymentChainId, setGasPaymentChainId] = useState('5');
  const [gasPaymentTokenList, setGasPaymentTokenList] = useState([]);
  // const [eoaWallet, setEOAWallet] = useState('');
  const [connectedNetwork, setConnectedNetwork] = useState('');
  const [aaWallet, setAAWallet] = useState('');

  // TODO: update using squid api
  const [gasPaymentToken, setGasPaymentToken] = useState(
    deployments.mockERC20Address,
  );

  const [currentBalance, setLabelText] = useState('');
  const [isPossibleToProcessPayment, setIsPossibleToProcessPayment] =
    useState(false);

  const [isTenderlySimulationEnabled, setIsTenderlySimulationEnabled] =
    useState(false);

  const [isModalDisplayed, setIsModalDisplayed] = useState(false);

  const [walletConnect, setWalletConnect] = useState<any>();
  const [walletConnectUrl, setWalletConnectUrl] = useState('');
  // const [walletConnectTopic, setWalletConnectTopic] = useState('');

  useEffect(() => {
    if (!aaWallet || !gasPaymentChainId || !gasPaymentToken) {
      return;
    }

    setLabelText('load balance from Covalent API...');
    // TODO: put in a secure place.

    const { covalentKey } = networks[gasPaymentChainId as ChainId];

    const adjustedGasPaymentToken = isAxelarNativeToken(gasPaymentToken)
      ? chainIdToCovalentNativeToken(gasPaymentChainId)
      : gasPaymentToken;

    fetch(
      `https://api.covalenthq.com/v1/${covalentKey}/address/${aaWallet}/balances_v2/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${covalentApiKey}`,
        },
      },
    )
      .then((response) => response.json())
      .then(({ data }) => {
        const target = data.items.find(
          (item: any) =>
            item.contract_address.toLowerCase() ===
            adjustedGasPaymentToken.toLowerCase(),
        );
        if (target === undefined) {
          setLabelText('You do not own this token.');
          if (isMockGasPaymentToken(gasPaymentToken)) {
            setIsPossibleToProcessPayment(true);
          } else {
            setIsPossibleToProcessPayment(false);
          }
        } else {
          setLabelText(
            `${ethers.utils.formatUnits(
              target.balance,
              target.contract_decimals,
            )} ${target.contract_ticker_symbol}`,
          );
          setIsPossibleToProcessPayment(true);
        }
      })
      .catch((error) => console.error(error));
  }, [aaWallet, gasPaymentChainId, gasPaymentToken]);

  const mockSBTClaim = new ethers.Contract(
    deployments.mockSBTClaim,
    MockSBTClaimJson.abi,
  );
  const claimSBTData = mockSBTClaim.interface.encodeFunctionData('claim', []);

  const handleAccountAbstractionClick = async (to: string, data: string) => {
    try {
      return await sendAccountAbstraction(
        to,
        data,
        gasPaymentChainId,
        gasPaymentToken,
        isTenderlySimulationEnabled,
      );
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  useEffect(() => {
    console.log('load aa wallet test');
    // const isFlaskConnected = shouldDisplayReconnectButton(state.installedSnap);
    if (!state.installedSnap) {
      return;
    }
    console.log('pass flask test');
    const relead = (chainId: string) => {
      console.log('relead');
      if (chainId === '4002') {
        console.log('chain id if fine');
        setIsModalDisplayed(false);
        setConnectedNetwork(networks[chainId].name);
        // getExternalOwnedAccount().then((address) => setEOAWallet(address));
        getAbstractAccount().then((address) => {
          setAAWallet(address);
          Web3Wallet.init({
            core, // <- pass the shared `core` instance
            metadata: {
              name: 'CrossFuel',
              description: 'Cross-chain gas payment with AA',
              url: '',
              icons: [],
            },
          }).then((web3Wallet) => {
            setWalletConnect(web3Wallet);
            web3Wallet.on('session_proposal', async (proposal) => {
              await web3Wallet.approveSession({
                id: proposal.id,
                namespaces: {
                  eip155: {
                    chains: [`eip155:${chainId}`],
                    events: ['chainChanged', 'accountsChanged'],
                    // in this demo, we only implemented eth_sendTransaction
                    methods: [
                      'eth_sendTransaction',
                      'eth_signTransaction',
                      'eth_sign',
                      'personal_sign',
                      'eth_signTypedData',
                    ],
                    accounts: [`eip155:${chainId}:${address}`],
                  },
                },
              });
            });

            web3Wallet.on('session_request', async (event) => {
              const { topic, params, id } = event;
              const { request } = params;
              if (request.method === 'eth_sendTransaction') {
                const { executeHash } = (await handleAccountAbstractionClick(
                  request.params[0].to,
                  request.params[0].data || '0x',
                )) as any;

                console.log('executeHash', executeHash);

                await web3Wallet.respondSessionRequest({
                  topic,
                  response: {
                    id,
                    result: executeHash,
                    jsonrpc: '2.0',
                  },
                });
              }
            });
          });
        });
      } else {
        setIsModalDisplayed(true);
        setConnectedNetwork('');
      }
    };

    console.log('start get chain id');
    getChainId().then((chainId) => {
      console.log(chainId);
      relead(chainId);
    });

    window.ethereum.on('networkChanged', (chainId) => {
      relead(chainId as string);
    });
  }, [state.installedSnap]);

  useEffect(() => {
    if (!gasPaymentChainId) {
      return;
    }

    fetch(
      `${backendURLBase}/getSupportedPaymentTokens?chainId=${gasPaymentChainId}`,
    )
      .then((response) => response.json())
      .then((data) => {
        const _gasPaymentTokenList = data.map(({ address, name }: any) => {
          return {
            value: address,
            label: name,
            disabled:
              address.toLowerCase() !==
              '0x254d06f33bdc5b8ee05b2ea472107e300226659a',
          };
        });
        _gasPaymentTokenList.unshift({
          value: deployments.mockERC20Address,
          label: 'Mock Payment Token',
        });
        setGasPaymentTokenList(_gasPaymentTokenList);
      });
  }, [gasPaymentChainId]);

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleWalletConnectClick = () => {
    if (!walletConnect) {
      return;
    }
    walletConnect.core.pairing.pair({ uri: walletConnectUrl });
  };

  return (
    <Container>
      <Heading>
        Welcome to <Span>CrossFuel</Span>
      </Heading>
      <Subtitle>Cross-chain gas payment with AA</Subtitle>
      <CardContainer>
        {state.error && (
          <ErrorMessage>
            <b>An error happened:</b> {state.error.message}
          </ErrorMessage>
        )}
        {!state.isFlask && (
          <Card
            content={{
              title: 'Install',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {/* {!state.installedSnap && (
          <Card
            content={{
              title: 'Connect',
              description:
                'Get started by connecting to and installing the example snap.',
              button: (
                <ConnectButton
                  onClick={handleConnectClick}
                  disabled={!state.isFlask}
                />
              ),
            }}
            disabled={!state.isFlask}
          />
        )}
        {shouldDisplayReconnectButton(state.installedSnap) && (
          <Card
            content={{
              title: 'Reconnect',
              description:
                'While connected to a local running snap this button will always be displayed in order to update the snap if a change is made.',
              button: (
                <ReconnectButton
                  onClick={handleConnectClick}
                  disabled={!state.installedSnap}
                />
              ),
            }}
            disabled={!state.installedSnap}
          />
        )} */}

        <Card
          content={{
            title: 'Account Abstraction',
            others: (
              <>
                {aaWallet && (
                  <>
                    <Form
                      label="Connected Network"
                      input={<NetworkText>{connectedNetwork}</NetworkText>}
                    />
                    <Form
                      label="Address"
                      input={<WalletAddress>{aaWallet}</WalletAddress>}
                    />
                    <Form
                      label="Receive Fund"
                      input={<QRCodeSVG value={aaWallet} />}
                    />
                  </>
                )}
              </>
            ),
            // button: (
            //   <ReconnectButton
            //     onClick={handleConnectClick}
            //     disabled={!state.installedSnap}
            //   />
            // ),
          }}
          disabled={!state.installedSnap}
        />

        <Card
          content={{
            title: 'Cross-Chain Gas Payment',
            others: (
              <>
                <Form
                  label="Network"
                  input={
                    <Select
                      onChange={(e) => {
                        setGasPaymentChainId(e.target.value);
                      }}
                      options={[
                        {
                          value: '5',
                          label: 'Goerli',
                        },
                        {
                          value: '80001',
                          label: 'Polygon Mumbai',
                          disabled: true,
                        },
                        {
                          value: 'o',
                          label: 'Optimism Goerli',
                          disabled: true,
                        },
                        {
                          value: 'a',
                          label: 'Arbitrum Goerli',
                          disabled: true,
                        },
                        {
                          value: 's',
                          label: 'Scroll Alpha Testnet',
                          disabled: true,
                        },
                      ]}
                    />
                  }
                />
                <Form
                  label="Token"
                  input={
                    <Select
                      onChange={(e) => {
                        setGasPaymentToken(e.target.value);
                      }}
                      options={gasPaymentTokenList}
                    />
                  }
                />
                <Form label="Balance" input={<>{currentBalance}</>} />
                <Form
                  label="Advanced"
                  input={
                    <Checkbox
                      label="Enable Tenderly simulation"
                      checked={isTenderlySimulationEnabled}
                      onChange={(e) => {
                        setIsTenderlySimulationEnabled(e.target.checked);
                      }}
                    />
                  }
                />
                <WarningString>
                  * You will receive a Mock Payment Token in your wallet
                  automatically, and you should obtain Axelar USDC from the
                  official faucet.
                </WarningString>
              </>
            ),
            button: (
              <SendAccountAbstractionButton
                onClick={() =>
                  handleAccountAbstractionClick(
                    deployments.mockSBTClaim,
                    claimSBTData,
                  )
                }
                disabled={!state.installedSnap || !isPossibleToProcessPayment}
              />
            ),
          }}
          disabled={!state.installedSnap}
        />
        <Card
          content={{
            title: 'Connect by Web3Wallet',
            others: (
              <>
                <Form
                  label="Input WalletConnect URL"
                  input={
                    <>
                      <TextInput
                        value={walletConnectUrl}
                        onChange={(e) => setWalletConnectUrl(e.target.value)}
                      />
                    </>
                  }
                />
              </>
            ),
            button: (
              <WalletConnectButton
                onClick={handleWalletConnectClick}
                disabled={
                  !state.installedSnap || !walletConnect || !walletConnectUrl
                }
              />
            ),
          }}
          fullWidth
          disabled={!state.installedSnap}
        />
        <WarningString>
          * The Wallet Connect transaction is still unstable, so please use the
          Demo - Claim MockSBT button instead. If you wish to try out the Wallet
          Connect transaction, please use
          https://react-dapp-v2-with-web3js.vercel.app/
        </WarningString>
        <Notice>
          <p>
            CrossFuel is a payment system that simplifies gas fees for dApps on
            different blockchains using
            <b> Account Abstraction</b>. It eliminates the need to swap or
            bridge tokens, making transactions across multiple chains
            effortless.
          </p>
        </Notice>
      </CardContainer>
      {isModalDisplayed && (
        <Modal title="Network Error">
          The current network is not supported. Please Switch to Fantom Testnet.
          <ModalSubTitle>Note:</ModalSubTitle>
          <NetworkNames>
            <>Contracts are deployed</>
            <br />
            <br />
            {Object.values(networks)
              .map((d) => `- ${d.name}`)
              .join('\n')}
            <br />
            <br />
            <>
              However, only gas payment on Goerli and execution on Fantom
              Testnet have been tested sufficiently for the demo.
            </>
          </NetworkNames>
        </Modal>
      )}
    </Container>
  );
};

export default Index;
