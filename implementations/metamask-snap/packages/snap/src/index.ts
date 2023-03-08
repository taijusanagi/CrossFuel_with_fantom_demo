/* eslint-disable camelcase */
/* eslint-disable no-case-declarations */
import * as qs from 'querystring';
import {
  UserOperationStruct,
  EntryPoint__factory,
} from '@account-abstraction/contracts';
import { resolveProperties } from 'ethers/lib/utils';
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, copyable, text, heading, divider } from '@metamask/snaps-ui';
import { ethers } from 'ethers';
import {
  HttpRpcClient,
  SimpleAccountAPI,
  PaymasterAPI,
} from '@account-abstraction/sdk';

import { getBIP44AddressKeyDeriver } from '@metamask/key-tree';
import deployments from '../../truffle/deployments.json';
import MockERC20Json from '../../truffle/build/MockERC20.json';
import {
  verifyingPaymasterSigner,
  bundlerSigner,
} from '../../truffle/config.json';
import { ChainId } from '../../../../common/types/ChainId';
import configJson from '../../truffle/networks.json';
import { getGasFee } from './utils/getGasFee';
/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */

// http://localhost:8001
// https://cross-fuel-backend.onrender.com
const backendUrl = 'https://cross-fuel-backend.onrender.com';

const bundlerUrls = {
  '5': 'https://node.stackup.sh/v1/rpc/d7567b6a3d8c1d90df52de74c0b310e08dcb0a538f264ac162090c046613931c',
  '80001':
    'https://node.stackup.sh/v1/rpc/bdaf63d7cd0180897fc9ec780edd1d408e4c406aaab1763a73b21b0b35ae4af9',
  '4002': 'https://cross-fuel-fantom-bundler.onrender.com/rpc', // deployed
};

let currentChainId: ChainId | null;

const fundManager = verifyingPaymasterSigner;

// Although it should be stored in a secure location, for the time being, it will be hardcoded
const infuraProjectId = 'eedaad734dce46a4b08816a7f6df0b9b';
const tenderlyApiKey = 'LQCz-SOOynktbBecKFBpduGtnkCVFNiR';
const tenderlyUser = 'taijusanagi';
const tenderlyProject = 'hackathon';

const getConnectedProvider = () => {
  return new ethers.providers.Web3Provider(ethereum as any);
};

const getConnectedChainId = async (): Promise<ChainId> => {
  const provider = getConnectedProvider();
  const { chainId } = await provider.getNetwork();
  const chainIdString = chainId.toString();
  return chainIdString as ChainId;
};

const getJsonPRCProviderByChainId = (chainId: ChainId) => {
  console.log(configJson[chainId]);
  console.log(infuraProjectId);

  if (chainId !== '4002') {
    return new ethers.providers.JsonRpcProvider(
      `https://${configJson[chainId].key}.infura.io/v3/${infuraProjectId}`,
    );
  }
  // this is fantom integration
  return new ethers.providers.JsonRpcProvider(
    `https://rpc.ankr.com/fantom_testnet`,
  );
};

const getSignerFromDerivedPrivateKey = async (chainId?: ChainId) => {
  console.log('getSignerFromDerivedPrivateKey');
  // TODO: currently, only supports accounts[0] in metamask default account
  //       let's think about better private key creation way later
  const ethereumNode = await snap.request({
    method: 'snap_getBip44Entropy',
    params: {
      coinType: 60, // this is Ethereum type
    },
  });

  const derivedEthereumKeyDriver = await getBIP44AddressKeyDeriver(
    ethereumNode as any,
  );

  const { privateKey } = await derivedEthereumKeyDriver(0);

  if (!privateKey) {
    throw new Error('Private key is null or undefined');
  }

  const signer = new ethers.Wallet(privateKey);

  if (chainId) {
    const provider = getJsonPRCProviderByChainId(chainId);
    signer.connect(provider);
  }

  return signer;
};

class VerifyingPaymasterAPI extends PaymasterAPI {
  override async getPaymasterAndData(userOp: Partial<UserOperationStruct>) {
    console.log('VerifyingPaymasterAPI - getPaymasterAndData');
    console.log('currentChainId', currentChainId);
    const resolvedUserOp = await resolveProperties(userOp);
    const parsedUserOp = {
      ...resolvedUserOp,
    };
    const chainId = currentChainId;
    const method = 'POST';
    const headers = {
      'Content-Type': 'application/json',
    };
    const { paymasterAndData } = await fetch(`${backendUrl}/sign`, {
      method,
      headers,
      body: JSON.stringify({
        userOp: parsedUserOp,
        chainId,
      }),
    }).then((res) => res.json());
    return paymasterAndData;
  }
}

const paymasterAPI = new VerifyingPaymasterAPI();

export const getAbstractAccount = async (
  chainId: ChainId,
): Promise<SimpleAccountAPI> => {
  console.log('getAbstractAccount');
  const { entryPointAddress, factoryAddress } = deployments;
  console.log('chainId', chainId);
  const provider = getJsonPRCProviderByChainId(chainId);
  console.log('provider', provider);
  const owner = await getSignerFromDerivedPrivateKey();

  const aa = new SimpleAccountAPI({
    provider,
    entryPointAddress,
    owner,
    factoryAddress,
    paymasterAPI,
  });
  return aa;
};

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  console.log('onRpcRequest');
  switch (request.method) {
    // This is the original code and should be kept as a reference for future use.
    case 'hello':
      console.log('hello');
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'Confirmation',
          content: panel([
            text(`Hello, **${origin}**!`),
            text('This custom confirmation is just for display purposes.'),
            text(
              'But you can edit the snap source code to make it do something, if you want to!',
            ),
          ]),
        },
      });

    case 'crossFuel_getChainId': {
      console.log('crossFuel_getChainId');
      return await getConnectedChainId();
    }

    case 'crossFuel_getExternalOwnedAccount': {
      console.log('crossFuel_getExternalOwnedAccount');
      const signer = await getSignerFromDerivedPrivateKey();
      return await signer.getAddress();
    }

    case 'crossFuel_getAbstractAccount': {
      console.log('crossFuel_getAbstractAccount');
      const chainId = await getConnectedChainId();
      console.log('chainId', chainId);
      const connectedAbstractAccount = await getAbstractAccount(chainId);
      console.log('connectedAbstractAccount', connectedAbstractAccount);
      return await connectedAbstractAccount.getAccountAddress();
    }

    case 'crossFuel_sendTransactionWithCrossFuel': {
      try {
        console.log('crossFuel_sendTransactionWithCrossFuel');

        const {
          target,
          data,
          gasPaymentChainId,
          gasPaymentToken,
          isTenderlySimulationEnabled,
        } = request.params as {
          target: string;
          data: string;
          gasPaymentChainId: ChainId;
          gasPaymentToken: string;
          isTenderlySimulationEnabled: boolean;
        };

        const executeChainId = await getConnectedChainId();

        console.log('confirm transaction...');
        const snapConfirmResult = await snap.request({
          method: 'snap_dialog',
          params: {
            type: 'Confirmation',
            content: panel([
              heading('Account Abstraction with Cross-Chain Gas Payment'),
              text(
                'By approving this request, you are authorizing Metamask Snap to access your private key and create a cross-chain batch transaction with gas payment.',
              ),
              heading('Gas Payment'),
              text('ChainId:'),
              copyable(gasPaymentChainId),
              text('Gas Payment Token:'),
              copyable(gasPaymentToken),
              heading('Execute'),
              text('ChainId:'),
              copyable(executeChainId),
              text('Target Address:'),
              copyable(target),
              text('Transaction Data:'),
              copyable(data),
              text('Transaction Value:'),
              copyable('0'),
            ]),
          },
        });

        if (!snapConfirmResult) {
          return null;
        }

        console.log('init aa wallet');
        const gasPaymentAbstractAccount = await getAbstractAccount(
          gasPaymentChainId,
        );
        const executeAbstractAccount = await getAbstractAccount(executeChainId);

        const aaAccount = await executeAbstractAccount.getAccountAddress();
        console.log('aaAccount', aaAccount);

        console.log('1. Generate an execute user operation.');

        currentChainId = executeChainId;
        const executeChainProvider =
          getJsonPRCProviderByChainId(executeChainId);
        const executeOp1 = await executeAbstractAccount.createSignedUserOp({
          target,
          data,
          ...getGasFee(executeChainProvider),
        });

        console.log(
          '2. Calculate the gas needed for the execute user operation created in step 1.',
        );
        const resolvedExecuteUserOp1 = await resolveProperties(executeOp1);
        const gasWillBeUsed = ethers.BigNumber.from(
          resolvedExecuteUserOp1.callGasLimit,
        )
          .add(resolvedExecuteUserOp1.preVerificationGas)
          .toString();
        let paymentTokenAmount = '0';
        if (gasPaymentToken === deployments.mockERC20Address) {
          // @dev: Since there is no currency conversion for the mock ERC20, a fixed amount is being used.
          paymentTokenAmount = ethers.utils.parseEther('0.01').toString();
        } else {
          const params = {
            gasPaymentChainId,
            gasPaymentToken,
            executeChainId,
            gasWillBeUsed,
          };
          const queryString = qs.stringify(params);
          const { requiredGasPaymentTokenAmount } = await fetch(
            `${`${backendUrl}/getRequiredPaymentTokenAmount`}?${queryString}`,
          ).then((response) => response.json());
          paymentTokenAmount = requiredGasPaymentTokenAmount.toString();
        }

        console.log(
          '3. Create a gas payment user operation using the gas amount calculated in step 2.',
        );

        currentChainId = gasPaymentChainId;
        const gasPaymentChainProvider =
          getJsonPRCProviderByChainId(gasPaymentChainId);
        let gasPaymentOp1;
        if (gasPaymentToken === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
          gasPaymentOp1 = await gasPaymentAbstractAccount.createSignedUserOp({
            target: fundManager,
            data: '0x',
            ...getGasFee(gasPaymentChainProvider),
            value: paymentTokenAmount,
          });
        } else {
          const mockERO20 = new ethers.Contract(
            gasPaymentToken,
            MockERC20Json.abi,
          );
          const gasPaymentData = mockERO20.interface.encodeFunctionData(
            'transfer',
            [fundManager, paymentTokenAmount],
          );
          gasPaymentOp1 = await gasPaymentAbstractAccount.createSignedUserOp({
            target: gasPaymentToken,
            data: gasPaymentData,
            ...getGasFee(gasPaymentChainProvider),
          });
        }

        const resolveGasPaymentUserOp1 = await resolveProperties(gasPaymentOp1);

        console.log('4. Sign the gas payment user operation with paymaster.');
        // @dev: This is fix preVerificationGas too low bug
        // https://github.com/eth-infinitism/bundler/pull/7
        resolveGasPaymentUserOp1.preVerificationGas = 100000;

        resolveGasPaymentUserOp1.paymasterAndData =
          await paymasterAPI.getPaymasterAndData(resolveGasPaymentUserOp1);

        const gasPaymentOp2 = await gasPaymentAbstractAccount.signUserOp(
          resolveGasPaymentUserOp1,
        );
        const resolvedGasPaymentUserOp2 = await resolveProperties(
          gasPaymentOp2,
        );

        console.log('5. Sign the execute user operation with paymaster.');
        // @dev: This is fix preVerificationGas too low bug
        // https://github.com/eth-infinitism/bundler/pull/7
        currentChainId = executeChainId;
        resolvedExecuteUserOp1.preVerificationGas = 100000;

        resolvedExecuteUserOp1.paymasterAndData =
          await paymasterAPI.getPaymasterAndData(resolvedExecuteUserOp1);
        const executeOp2 = await executeAbstractAccount.signUserOp(
          resolvedExecuteUserOp1,
        );

        // executeAbstractAccount.
        const resolvedExecuteUserOp2 = await resolveProperties(executeOp2);

        currentChainId = null;
        console.log('resolvedGasPaymentUserOp2', resolvedGasPaymentUserOp2);
        console.log('resolvedExecuteUserOp2', resolvedExecuteUserOp2);

        console.log('6. Conduct a Tenderly simulation.');
        if (isTenderlySimulationEnabled) {
          const tenderlyURL = `https://api.tenderly.co/api/v1/account/${tenderlyUser}/project/${tenderlyProject}/simulate`;
          const entryPointInterface = new ethers.utils.Interface(
            EntryPoint__factory.abi,
          );
          const gasPaymentInput = entryPointInterface.encodeFunctionData(
            'handleOps',
            [[resolvedGasPaymentUserOp2], fundManager],
          );
          const tenderlySimulationOnGasPaymentResponse = await fetch(
            tenderlyURL,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': tenderlyApiKey,
              },
              body: JSON.stringify({
                /* Simulation Configuration */
                save: false, // if true simulation is saved and shows up in the dashboard
                save_if_fails: false, // if true, reverting simulations show up in the dashboard
                simulation_type: 'full', // full or quick (full is default)
                network_id: gasPaymentChainId, // network to simulate on
                /* Standard EVM Transaction object */
                from: bundlerSigner,
                to: deployments.entryPointAddress,
                input: gasPaymentInput,
                gas: 1000000,
                gas_price: resolvedGasPaymentUserOp2.maxFeePerGas.toString(),
                value: 0,
              }),
            },
          ).then((response) => response.json());
          const executeInput = entryPointInterface.encodeFunctionData(
            'handleOps',
            [[resolvedExecuteUserOp2], fundManager],
          );
          const tenderlySimulationOnExecuteResponse = await fetch(tenderlyURL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Access-Key': tenderlyApiKey,
            },
            body: JSON.stringify({
              /* Simulation Configuration */
              save: false, // if true simulation is saved and shows up in the dashboard
              save_if_fails: false, // if true, reverting simulations show up in the dashboard
              simulation_type: 'full', // full or quick (full is default)
              network_id: executeChainId, // network to simulate on
              /* Standard EVM Transaction object */
              from: bundlerSigner,
              to: deployments.entryPointAddress,
              input: executeInput,
              gas: 1000000,
              gas_price: resolvedExecuteUserOp2.maxFeePerGas.toString(),
              value: 0,
            }),
          }).then((response) => response.json());
          console.log(
            'tenderlySimulationOnGasPaymentResponse',
            tenderlySimulationOnGasPaymentResponse,
          );

          console.log(
            'tenderlySimulationOnExecuteResponse',
            tenderlySimulationOnExecuteResponse,
          );

          if (
            tenderlySimulationOnGasPaymentResponse.error ||
            tenderlySimulationOnExecuteResponse.error
          ) {
            return null;
          }

          // TODO: implement balance diff
          // const gasPaymentBalanceChange =
          //   tenderlySimulationOnGasPaymentResponse.transaction.transaction_info.balance_diff.filter(
          //     (balanceDiff: { address: string }) =>
          //       balanceDiff.address === aaAccount,
          //   );
          const formatTenderlySimlationLog = (log: any) => {
            const name = log.name ? log.name : 'unknown';
            const inputs = log.inputs
              ? log.inputs.map((input: any) => [
                  text(input.soltype.name),
                  copyable(input.value.toString()),
                ])
              : [];
            return panel([
              heading(`${name} at`),
              copyable(log.raw.address),
              ...inputs.flat(),
            ]);
          };
          const formattedTenderlySimulationOnGasPaymentResponse =
            tenderlySimulationOnGasPaymentResponse.transaction.transaction_info.logs.map(
              (log: any) => {
                return formatTenderlySimlationLog(log);
              },
            );
          const formattedTenderlySimulationOnExecuteResponse =
            tenderlySimulationOnExecuteResponse.transaction.transaction_info.logs.map(
              (log: any) => {
                return formatTenderlySimlationLog(log);
              },
            );
          const simlationResultConfirmResult = await snap.request({
            method: 'snap_dialog',
            params: {
              type: 'Confirmation',
              content: panel([
                heading('Transaction Simulation with Tenderly'),
                divider(),
                heading(`Gas payment made on chain ID: ${gasPaymentChainId}`),
                // text('Balance diff change:'),
                // text('detail...'),
                ...formattedTenderlySimulationOnGasPaymentResponse,
                divider(),
                heading(`Transaction made on chain ID: ${executeChainId}`),
                // text('Balance diff  change:'),
                // text('detail...'),
                ...formattedTenderlySimulationOnExecuteResponse,
              ]),
            },
          });
          if (!simlationResultConfirmResult) {
            return null;
          }
        } else {
          console.log('simulation skipped');
        }

        console.log('init aa bundlers');
        const gasPaymentChainBundler = new HttpRpcClient(
          bundlerUrls[gasPaymentChainId],
          deployments.entryPointAddress,
          parseInt(gasPaymentChainId, 10),
        );

        const executeChainBundler = new HttpRpcClient(
          bundlerUrls[executeChainId],
          deployments.entryPointAddress,
          parseInt(executeChainId, 10),
        );

        console.log(
          '7. If the user approves the transaction, send the gas payment transaction to the bundler.',
        );
        const sendGasPaymentUserOpToBundlerResult =
          await gasPaymentChainBundler.sendUserOpToBundler(
            resolvedGasPaymentUserOp2,
          );

        console.log(
          'sendGasPaymentUserOpToBundlerResult',
          sendGasPaymentUserOpToBundlerResult,
        );

        console.log(
          '8. After the gas payment transaction is sent, send the execute transaction to the bundler.',
        );
        console.log(resolvedExecuteUserOp2);
        const sendExecuteUserOpToBundlerResult =
          await executeChainBundler.sendUserOpToBundler(resolvedExecuteUserOp2);

        console.log(
          'sendExecuteUserOpToBundlerResult',
          sendExecuteUserOpToBundlerResult,
        );

        await snap.request({
          method: 'snap_dialog',
          params: {
            type: 'Alert',
            content: panel([
              heading('User Op Sent to Bundler!'),
              text(
                'Please wait for some time to receive confirmation that the user operation has been included in the blockchain.',
              ),
              divider(),
              text('Gas payment request ID:'),
              copyable(sendGasPaymentUserOpToBundlerResult),
              text('Execute request ID:'),
              copyable(sendExecuteUserOpToBundlerResult),
            ]),
          },
        });

        const waitForResult = async (
          opHash: string,
          url: string,
          timeout: number,
        ): Promise<{ transactionHash: string }> => {
          return new Promise((resolve, reject) => {
            const intervalId = setInterval(async () => {
              // Check for a condition to be true

              const gasPaymentUserOperationReceipt = {
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getUserOperationReceipt',
                params: [opHash],
              };

              const result = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(gasPaymentUserOperationReceipt),
                headers: {
                  'Content-Type': 'application/json',
                },
              }).then((response) => response.json());

              console.log('waiting for the confirmation...');

              if (!result.error) {
                clearInterval(intervalId);
                resolve(result.result.receipt);
              }
            }, 5000);

            // If the timeout is reached, reject the promise
            setTimeout(() => {
              clearInterval(intervalId);
              reject(new Error('Timed out while waiting for result.'));
            }, timeout);
          });
        };

        const { transactionHash: gasPaymentHash } = await waitForResult(
          sendGasPaymentUserOpToBundlerResult,
          bundlerUrls[gasPaymentChainId],
          1000000,
        );

        const { transactionHash: executeHash } = await waitForResult(
          sendExecuteUserOpToBundlerResult,
          bundlerUrls[executeChainId],
          1000000,
        );

        await snap.request({
          method: 'snap_dialog',
          params: {
            type: 'Alert',
            content: panel([
              heading('Transaction Confirmed!'),
              divider(),
              text('Gas payment tx:'),
              copyable(gasPaymentHash),
              text('Execute payment tx:'),
              copyable(executeHash),
            ]),
          },
        });
        return {
          gasPaymentHash,
          executeHash,
        };
      } catch (e) {
        await snap.request({
          method: 'snap_dialog',
          params: {
            type: 'Alert',
            content: panel([
              heading('Something happened in the system'),
              copyable(e.message),
            ]),
          },
        });
        return null;
      }
    }
    default:
      throw new Error('Method not found.');
  }
};
