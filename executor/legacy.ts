import { Connection, VersionedTransaction } from '@solana/web3.js';
import { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from '../constants';
import { logger } from '../utils';

interface Blockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

// TODO maybe change this from async to a promise to make sure the token is sold?
// or get into a while loop here to ensure that the token is actually sold, and if not to try again 10 times
export const execute = async (
  transaction: VersionedTransaction,
  latestBlockhash: Blockhash,
  isBuy: boolean | 1 = true,
) => {
  const solanaConnection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
  });

  const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), { skipPreflight: true });
  const confirmation = await solanaConnection.confirmTransaction({
    signature,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    blockhash: latestBlockhash.blockhash,
  });

  if (confirmation.value.err) {
    console.log('Confirmtaion error');
    return '';
  } else {
    if (isBuy === 1) {
      return signature;
    } else if (isBuy) console.log(`Success in buy transaction: https://solscan.io/tx/${signature}`);
    else console.log(`Success in Sell transaction: https://solscan.io/tx/${signature}`);
  }
  return signature;
};
