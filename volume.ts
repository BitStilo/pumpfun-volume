import { getAssociatedTokenAddress } from '@solana/spl-token';
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  VersionedTransaction,
  TransactionInstruction,
  TransactionMessage,
  ComputeBudgetProgram,
  Transaction,
  sendAndConfirmTransaction,
  Commitment,
} from '@solana/web3.js';
import {
  BUY_INTERVAL_MAX,
  BUY_INTERVAL_MIN,
  SELL_INTERVAL_MAX,
  SELL_INTERVAL_MIN,
  BUY_LOWER_PERCENT,
  BUY_UPPER_PERCENT,
  DISTRIBUTE_WALLET_NUM,
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  TOKEN_MINT,
  JITO_MODE,
  LATENCY,
} from './constants';
import { Data, readJson, saveDataToFile, sleep } from './utils';
import base58 from 'bs58';
import { getBuyTxWithJupiter, getSellTxWithJupiter } from './utils/swapOnlyAmm';
import { execute } from './executor/legacy';
import { executeJitoTx } from './executor/jito';

import { logger } from './utils/logger'

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
  commitment: 'confirmed',
});

export const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY));
const baseMint = new PublicKey(TOKEN_MINT);
const jitoCommitment: Commitment = 'confirmed';

const main = async () => {
  const solBalance = await solanaConnection.getBalance(mainKp.publicKey);
  logger.info("------Starting Volume Bot------")
  console.log(`Volume bot ( Boosting Volume ) is running`);
  console.log(`Wallet address: ${mainKp.publicKey.toBase58()}`);
  console.log(`Pool token mint: ${baseMint.toBase58()}`);
  console.log(`Wallet SOL balance: ${(solBalance / LAMPORTS_PER_SOL).toFixed(3)}SOL`);

  logger.info(`Wallet SOL balance: ${(solBalance / LAMPORTS_PER_SOL).toFixed(3)}SOL`);

  console.log(`Buying wait time max: ${BUY_INTERVAL_MAX}s`);
  console.log(`Buying wait time min: ${BUY_INTERVAL_MIN}s`);
  console.log(`Selling wait time max: ${SELL_INTERVAL_MAX}s`);
  console.log(`Selling wait time min: ${SELL_INTERVAL_MIN}s`);
  console.log(`Buy upper limit percent: ${BUY_UPPER_PERCENT}%`);
  console.log(`Buy lower limit percent: ${BUY_LOWER_PERCENT}%`);

  let data: Data[];

  data = readJson();
  if (data == null || data.length == 0) {
    console.log('Distribution failed');
    return;
  }

  data.map(async ({ privateKey: kp }, i) => {
    if (LATENCY) {
      await sleep(i * 10000);
    }
    let srcKp = Keypair.fromSecretKey(base58.decode(kp));
    while (true) {
      // buy part with random percent
      const BUY_WAIT_INTERVAL = Math.round(Math.random() * (BUY_INTERVAL_MAX - BUY_INTERVAL_MIN) + BUY_INTERVAL_MIN);
      const SELL_WAIT_INTERVAL = Math.round(
        Math.random() * (SELL_INTERVAL_MAX - SELL_INTERVAL_MIN) + SELL_INTERVAL_MIN,
      );
      const solBalance = await solanaConnection.getBalance(srcKp.publicKey);

      let buyAmountInPercent = Number(
        (Math.random() * (BUY_UPPER_PERCENT - BUY_LOWER_PERCENT) + BUY_LOWER_PERCENT).toFixed(3),
      );

      if (solBalance < 5 * 10 ** 6) {
        console.log('Sol balance is not enough in one of wallets');
        logger.info('Sol balance is not enough in one of wallets');
        return;
      }

      let buyAmountFirst = Math.floor(((solBalance - 5 * 10 ** 6) / 100) * buyAmountInPercent);
      if (buyAmountFirst < (0.05 * LAMPORTS_PER_SOL)) {
        logger.info('Buy amount is less than .05 SOL, aborting trade');
        return;
      }
      // let buyAmountSecond = Math.floor(solBalance - buyAmountFirst - 10 ** 7)

      logger.info(`balance: ${solBalance / 10 ** 9} first: ${buyAmountFirst / 10 ** 9} `);

      // try buying until success
      let i = 0;
      while (true) {
        try {
          if (i > 10) {
            console.log(`${i}: Error in buy transaction, trying again`);
            logger.info(`${i}: Error in buy transaction, trying again`);
            return;
          }
          const result = await buy(srcKp, baseMint, buyAmountFirst);
          if (result) {
            break;
          } else {
            i++;
            await sleep(2000);
          }
        } catch (error) {
          logger.info(`${i}: Error in buy transaction, trying again`);
          i++;
        }
      }

      await sleep(BUY_WAIT_INTERVAL * 1000);

      // let l = 0
      // while (true) {
      //   try {
      //     if (l > 10) {
      //       console.log("Error in buy transaction")
      //       throw new Error("Error in buy transaction")
      //     }
      //     const result = await buy(srcKp, baseMint, buyAmountSecond)
      //     if (result) {
      //       break
      //     } else {
      //       l++
      //       await sleep(2000)
      //     }
      //   } catch (error) {
      //     l++
      //   }
      // }

      await sleep(BUY_WAIT_INTERVAL * 1000);

      // try selling until success
      let j = 0;
      while (true) {
        if (j > 10) {
          console.log('Error in sell transaction');
          logger.info('Error in sell transaction');
          return;
        }
        const result = await sell(baseMint, srcKp);
        if (result) {
          break;
        } else {
          j++;
          await sleep(2000);
        }
      }

      await sleep(SELL_WAIT_INTERVAL * 1000);

      // SOL transfer part
      const balance = await solanaConnection.getBalance(srcKp.publicKey);
      if (balance < 5 * 10 ** 6) {
        console.log('Sub wallet balance is not enough to continue volume swap');
        logger.info('Sub wallet balance is not enough to continue volume swap');
        return;
      }
      let k = 0;
      while (true) {
        try {
          if (k > 5) {
            console.log('Failed to transfer SOL to new wallet in one of sub wallet');
            return;
          }
          const destinationKp = Keypair.generate();
          logger.info(
            {
              privateKey: base58.encode(destinationKp.secretKey),
              pubkey: destinationKp.publicKey.toBase58(),
            }
          )


          const tx = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }),
            SystemProgram.transfer({
              fromPubkey: srcKp.publicKey,
              toPubkey: destinationKp.publicKey,
              lamports: balance - 17_000,
            }),
          );

          tx.feePayer = srcKp.publicKey;
          tx.recentBlockhash = (await solanaConnection.getLatestBlockhash()).blockhash;

          // console.log(await solanaConnection.simulateTransaction(tx))
          saveDataToFile([
            {
              privateKey: base58.encode(destinationKp.secretKey),
              pubkey: destinationKp.publicKey.toBase58(),
            },
          ]);
          const sig = await sendAndConfirmTransaction(solanaConnection, tx, [srcKp], {
            skipPreflight: true,
            commitment: 'finalized',
          });
          srcKp = destinationKp;
          // console.log(await solanaConnection.getBalance(destinationKp.publicKey) / 10 ** 9, "SOL")
          console.log(`Transferred SOL to new wallet after buy and sell, https://solscan.io/tx/${sig}`);
          break;
        } catch (error) {
          k++;
        }
      }
    }
  });
};

const buy = async (newWallet: Keypair, baseMint: PublicKey, buyAmount: number) => {
  let solBalance: number = 0;
  try {
    solBalance = await solanaConnection.getBalance(newWallet.publicKey);
  } catch (error) {
    console.log('Error getting balance of wallet');
    return null;
  }
  if (solBalance == 0) {
    return null;
  }
};

const sell = async (baseMint: PublicKey, wallet: Keypair) => {
  try {
    const data: Data[] = readJson();
    if (data.length == 0) {
      await sleep(1000);
      return null;
    }

    const tokenAta = await getAssociatedTokenAddress(baseMint, wallet.publicKey);
    const tokenBalInfo = await solanaConnection.getTokenAccountBalance(tokenAta);
    if (!tokenBalInfo) {
      console.log('Balance incorrect');
      return null;
    }
    const tokenBalance = tokenBalInfo.value.amount;
  } catch (error) {
    console.log('Error in sell transaction');
    return null;
  }
};

main();
