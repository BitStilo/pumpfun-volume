// import { VersionedTransaction, Connection, Keypair } from '@solana/web3.js';
import bs58 from "bs58";
import { readFile } from 'fs/promises';

import {
    getAssociatedTokenAddress,
  } from '@solana/spl-token'
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
    SolanaJSONRPCError
  } from '@solana/web3.js'
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
  } from './constants'
import { json } from "stream/consumers";

  export const solanaConnection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
    commitment: 'confirmed',
  });
async function sendLocalCreateTx(){
    
    const signerKeyPair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

    // Generate a random keypair for token
    const mintKeypair = Keypair.generate(); 

    // Define token metadata
    const formData = new FormData();

    const fileBuffer = await readFile('./example.png');
    const fileBlob = new Blob([fileBuffer]);
    formData.append("file", fileBlob, "example.png"); // Image file

    formData.append("name", "sekainohajimari");
    formData.append("symbol", "SEKAI");
    formData.append("description", "This is an.fun");
    formData.append("twitter", "https://x.com/a1lon9/status/1812970586420994083");
    formData.append("telegram", "https://x.com/a1lon9/status/1812970586420994083");
    formData.append("website", "https://pumpportal.fun");
    formData.append("showName", "true");

    // Create IPFS metadata storage
    const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
        method: "POST",
        body: formData,
    });
    const metadataResponseJSON = await metadataResponse.json();


    console.log(metadataResponseJSON.metadataUri);
    console.log("");

    console.log(JSON.stringify({
        "publicKey": signerKeyPair.publicKey.toBase58(),
        "action": "create",
        "tokenMetadata": {
            name: metadataResponseJSON.metadata.name,
            symbol: metadataResponseJSON.metadata.symbol,
            uri: metadataResponseJSON.metadataUri
        },
        "mint": mintKeypair.publicKey.toBase58(),
        "denominatedInSol": "true",
        "amount": 0, // dev buy of 1 SOL
        "slippage": 10, 
        "priorityFee": 0.0005,
        "pool": "pump"
    }))
    // Get the create transaction
    const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "publicKey": signerKeyPair.publicKey.toBase58(),
            "action": "create",
            "tokenMetadata": {
                name: metadataResponseJSON.metadata.name,
                symbol: metadataResponseJSON.metadata.symbol,
                uri: metadataResponseJSON.metadataUri
            },
            "mint": mintKeypair.publicKey.toBase58(),
            "denominatedInSol": "true",
            "amount": 0, // dev buy of 1 SOL
            "slippage": 10, 
            "priorityFee": 0.0005,
            "pool": "pump"
        })
    });
    if(response.status === 200){ // successfully generated transaction
        console.log("");
        console.log(response);
        const data = await response.arrayBuffer();
        const tx = VersionedTransaction.deserialize(new Uint8Array(data));
        tx.sign([mintKeypair, signerKeyPair]);
        const signature = await solanaConnection.sendTransaction(tx)
        console.log(signature)
        console.log("Transaction: https://solscan.io/tx/" + signature);
    } else {
        console.log(response.statusText); // log error
    }
}

sendLocalCreateTx();