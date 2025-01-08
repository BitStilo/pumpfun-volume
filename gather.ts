import base58 from 'bs58';
import { logger, readJson, retrieveEnvVariable, saveDataToFile, sleep, writeJson } from './utils';
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { SPL_ACCOUNT_LAYOUT, TokenAccount } from '@raydium-io/raydium-sdk';
import { getSellTxWithJupiter } from './utils/swapOnlyAmm';
import { execute } from './executor/legacy';
import { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from './constants';

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
  commitment: 'processed',
});

const rpcUrl = retrieveEnvVariable('RPC_ENDPOINT', logger);
const mainKpStr = retrieveEnvVariable('PRIVATE_KEY', logger);
const connection = new Connection(rpcUrl, { commitment: 'processed' });
const mainKp = Keypair.fromSecretKey(base58.decode(mainKpStr));

const main = async () => {
  const walletsData = readJson();

  const wallets = walletsData.map(({ privateKey }) => Keypair.fromSecretKey(base58.decode(privateKey)));
  wallets.map(async (kp, i) => {
    try {
      await sleep(i * 1000);
      const accountInfo = await connection.getAccountInfo(kp.publicKey);

      const tokenAccounts = await connection.getTokenAccountsByOwner(
        kp.publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        },
        'confirmed',
      );
      const ixs: TransactionInstruction[] = [];
      const accounts: TokenAccount[] = [];

      if (tokenAccounts.value.length > 0)
        for (const { pubkey, account } of tokenAccounts.value) {
          accounts.push({
            pubkey,
            programId: account.owner,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
          });
        }

      for (let j = 0; j < accounts.length; j++) {
        const baseAta = await getAssociatedTokenAddress(accounts[j].accountInfo.mint, mainKp.publicKey);
        const tokenAccount = accounts[j].pubkey;
        const tokenBalance = (await connection.getTokenAccountBalance(accounts[j].pubkey)).value;

        let i = 0;
        while (true) {
          if (i > 10) {
            logger.info('Sell error before gather');
            break;
          }
          if (tokenBalance.uiAmount == 0) {
            break;
          }
        }
        await sleep(1000);

        const tokenBalanceAfterSell = (await connection.getTokenAccountBalance(accounts[j].pubkey)).value;
        ixs.push(
          createAssociatedTokenAccountIdempotentInstruction(
            mainKp.publicKey,
            baseAta,
            mainKp.publicKey,
            accounts[j].accountInfo.mint,
          ),
        );
        if (tokenBalanceAfterSell.uiAmount && tokenBalanceAfterSell.uiAmount > 0)
          ixs.push(
            createTransferCheckedInstruction(
              tokenAccount,
              accounts[j].accountInfo.mint,
              baseAta,
              kp.publicKey,
              BigInt(tokenBalanceAfterSell.amount),
              tokenBalance.decimals,
            ),
          );
        ixs.push(createCloseAccountInstruction(tokenAccount, mainKp.publicKey, kp.publicKey));
      }

      if (accountInfo) {
        const solBal = await connection.getBalance(kp.publicKey);
        ixs.push(
          SystemProgram.transfer({
            fromPubkey: kp.publicKey,
            toPubkey: mainKp.publicKey,
            lamports: solBal,
          }),
        );
      }

      if (ixs.length) {
        const tx = new Transaction().add(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 220_000 }),
          ComputeBudgetProgram.setComputeUnitLimit({ units: 350_000 }),
          ...ixs,
        );
        tx.feePayer = mainKp.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        // console.log(await connection.simulateTransaction(tx))
        const sig = await sendAndConfirmTransaction(connection, tx, [mainKp, kp], { commitment: 'confirmed' });
        logger.info(`Closed and gathered SOL from Wallet ${i} : https://solscan.io/tx/${sig}`);
        logger.info('--------------------------------------------');
        return;
      }
    } catch (error) {
      logger.info('transaction error while gathering');
      return;
    }
  });
};


// TODO add this back one I know that log.json is being written to
main().then(ele => writeJson([]))
// main().then(async () => {
//   await main();
//   const solBalance = await solanaConnection.getBalance(mainKp.publicKey);
//   logger.info(`balance: ${solBalance / 10 ** 9} SOL gathered`);
//   // writeJson([]);
// });
