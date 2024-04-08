import { useEffect, useState } from "react";
// Function that gets random avatar based on wallet address
import { getAvatarUrl } from "../functions/getAvatarUrl";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { transactions } from "../data/transactions";

export const useCashApp = () => {
  const [userAddress, setUserAddress] = useState(
    "11111111111111111111111111111111"
  );
  const [avatar, setAvatar] = useState("");
  const [amount, setAmount] = useState(0);
  const [receiver, setReceiver] = useState("");
  const [transactionPurpose, setTransactionPurpose] = useState("");
  const [newTransactionModalOpen, setNewTransactionModalOpen] = useState(false);

  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const useLocalStorage = (storageKey, fallbackState) => {
    const [value, setValue] = useState(
      JSON.parse(localStorage.getItem(storageKey)) ?? fallbackState
    );
    useEffect(() => {
      localStorage.setItem(storageKey, JSON.stringify(value));
    }, [value, setValue]);
    return [value, setValue];
  };

  const [transactions, setTransactions] = useLocalStorage("transactions", []);

  //Get avatar based on the userAddress
  useEffect(() => {
    if (connected) {
      setAvatar(getAvatarUrl(publicKey.toString()));
      setUserAddress(publicKey.toString());
    }
  }, [connected]);

  //Create the transaction to send to our wallet and we can sign it from there!
  const makeTransaction = async (fromWallet, toWallet, amount, reference) => {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);
    const connection = new Connection(endpoint);

    // get a recent blockchain to incude in the transaction
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      // the buyer pays the transaction fee
      feePayer: fromWallet,
    });

    // create the instruction to send  sol from owner to recipient
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: fromWallet,
      lamports: amount.multipliedBy(LAMPORTS_PER_SOL).toNumber(),
      toPubkey: toWallet,
    });

    transferInstruction.keys.push({
      pubkey: reference,
      isSigner: false,
      isWritable: false,
    });

    transaction.add(transferInstruction);

    return transaction;
  };

  // Crete the function to RUN the transaction. This will be added to the button

  const doTransaction = async ({ amount, receiver, transactionPurpose }) => {
    const fromWallet = publicKey;
    const toWallet = new PublicKey(receiver);
    const bnAmount = new BigNumber(amount);
    const reference = Keypair.generate().publicKey;
    const transaction = await makeTransaction(
      fromWallet,
      toWallet,
      bnAmount,
      reference
    );

    const txnHash = await sendTransaction(transaction, connection);
    console.log(txnHash);

    // creat transaction history;
    const newID = (transactions.length + 1).toString();
    const newTransaction = {
      id: newID,
      from: {
        name: PublicKey,
        handle: publicKey,
        avatar: avatar,
        verified: true,
      },
      to: {
        name: receiver,
        handle: "-",
        avatar: getAvatarUrl(receiver.toString()),
        verified: false,
      },
      description: transactionPurpose,
      transactionDate: new Date(),
      status: "Completed",
      amount: amount,
      source: "-",
      identifier: "-",
    };
    setNewTransactionModalOpen(false);
    setTransactions([newTransaction, ...transactions]);
  };

  return {
    connected,
    publicKey,
    avatar,
    userAddress,
    doTransaction,
    amount,
    setAmount,
    receiver,
    setReceiver,
    transactionPurpose,
    setTransactionPurpose,
    transactions,
    setTransactions,
    newTransactionModalOpen,
    setNewTransactionModalOpen,
  };
};
