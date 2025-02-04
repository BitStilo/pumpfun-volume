# Solana Volume Bot  

A high-performance, multi-threaded bot for generating volume on Solana DEXes using the Solana Swap API from [Solana Tracker](https://docs.solanatracker.io).  


## Features  

- **Supports multiple DEXes**:  
  - Pump.fun  
  - Jupiter (Private Self-Hosted API)  
- **Multi-wallet support**   
- **Configurable delays** for buying and selling  
- Option to use regular transactions or Jito for transaction processing  
- **Detailed logging** with timestamps and color-coded actions  

---

## Prerequisites  

- Node.js (v14 or later recommended)  
- npm (comes with Node.js)  
- One or multiple Solana wallets with SOL  

---

## Installation  

1. Clone the repository:  
   ```bash  
   git clone https://github.com/BitStilo/pumpfun-volume.git
   cd pumpfun-volume  
   ```  

2. Install dependencies:  
   ```bash  
   npm install 
   ```  

---

## Usage  

To run: 

`npm run i`


1. Clear data.json if needed

| Step | Volume Bot Cmd                 |
| ---- | ------------------------------ |
| 1    | `npm run distribute`           |
| 2    | Add token mint address in .env |
| 3    | `npm run volume`               |
| 4    | `npm run gather`               |

---

## Configuration  

Add RPC endpoint, WS endpoint, and private key in `.env`

Adjust the settings in your `.env` file to customize the bot's behavior:  
- **AMOUNT**: The amount of SOL to swap in each transaction  
- **TOKEN_ADDRESS**: The address of the token you're trading  
- **DELAY**: Delay between swap cycles (in milliseconds)  
- **SELL_DELAY**: Delay between buy and sell operations (in milliseconds)  
- **SLIPPAGE**: Maximum allowed slippage (in percentage)  
- **JITO**: Set to "true" to use Jito for transaction processing  
- **RPC_URL**: Your Solana RPC URL  

---

## API Usage and Fees  

This bot uses the Solana Swap API from [Solana Tracker](https://docs.solanatracker.io).  

For high-volume usage or inquiries about reduced fees, please contact:  
- Twitter:  https://x.com/BitStilo

---

## CSV Data Service  

Here’s the deal:  

Get **instant CSVs** with **ALL the data you need** on any token.  
- Break through Solscan’s weak 1,000-transaction limit.  
- Receive clean, organized data to help you track wallets, spot trends, and uncover the next big project.  

The cost? **0.001 SOL per CSV.**  
Why? VPS and Node costs don’t pay themselves. Maybe it’ll be free one day, but for now, it’s a steal.  

Find me on Telegram: **[peachtreemall](https://t.me/peachtreemall)**  

Get the edge you’ve been missing. Find profitable wallets. See through the noise.  

---

## Disclaimer  

This bot is for **educational purposes only**. We don't recommend using volume bots. Use at your own risk. Always understand the code you're running and the potential financial implications of automated trading.  

---

## License  

[MIT License](LICENSE)  

---

## Support  

If you like this project, please consider giving it a ⭐️ on GitHub!  

--- 