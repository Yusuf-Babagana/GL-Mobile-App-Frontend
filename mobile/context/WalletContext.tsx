import { marketAPI } from "@/lib/marketApi";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

interface FundingAccount {
    bank_name: string;
    account_number: string;
    account_name: string;
}

interface WalletContextType {
    balance: string;
    availableBalance: string;
    lockedBalance: string;
    escrowBalance: string;
    accountDetails: { number: string; bank: string };
    transactions: any[];
    virtualAccount: { bank_name: string; account_number: string; account_name: string } | null;
    fundingAccounts: FundingAccount[] | null;
    refreshWallet: () => Promise<void>;
    isLoading: boolean;
    updateBalance: (newBalance: number) => void;
}

const WalletContext = createContext<WalletContextType>({} as any);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
    const { isSignedIn } = useAuth();
    const [balance, setBalance] = useState("0.00");
    // balance = available_balance + locked_balance (see Wallet.balance on the
    // backend). It's the right number to show as "total wallet balance", but
    // NOT the right number to check spending against — locked_balance is a
    // seller's own pending sales proceeds, not money they can spend right
    // now. Anything gating a purchase/withdrawal must use availableBalance.
    const [availableBalance, setAvailableBalance] = useState("0.00");
    const [lockedBalance, setLockedBalance] = useState("0.00");
    const [escrowBalance, setEscrowBalance] = useState("0.00");
    const [accountDetails, setAccountDetails] = useState({ number: "", bank: "" });
    const [virtualAccount, setVirtualAccount] = useState<{ bank_name: string; account_number: string; account_name: string } | null>(null);
    const [fundingAccounts, setFundingAccounts] = useState<FundingAccount[] | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const updateBalance = (newBalance: number) => {
        setBalance(newBalance.toString());
    };

    const refreshWallet = useCallback(async () => {
        if (!isSignedIn) return;

        setIsLoading(true);
        try {
            const data = await marketAPI.getWallet();
            // Data shape based on usage in wallet/index.tsx:
            // { balance, escrow_balance, account_number, bank_name }
            setBalance(data.balance?.toString() || "0.00");
            setAvailableBalance(data.available_balance?.toString() || "0.00");
            setLockedBalance(data.locked_balance?.toString() || "0.00");
            setEscrowBalance(data.escrow_balance?.toString() || "0.00");
            setAccountDetails({
                number: data.account_number || "",
                bank: data.bank_name || ""
            });
            setVirtualAccount(data.virtual_account || null);
            setFundingAccounts(data.funding_accounts || null);
            setTransactions(data.transactions || []);
        } catch (e) {
            console.error("Wallet Context Error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [isSignedIn]);

    // Initial load when user signs in
    useEffect(() => {
        if (isSignedIn) {
            refreshWallet();
        }
    }, [isSignedIn, refreshWallet]);

    return (
        <WalletContext.Provider value={{ balance, availableBalance, lockedBalance, escrowBalance, accountDetails, virtualAccount, fundingAccounts, transactions, refreshWallet, isLoading, updateBalance }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => useContext(WalletContext);
