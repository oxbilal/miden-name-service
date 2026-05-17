"use client";

import { useMemo, type ReactNode } from "react";
import {
  AllowedPrivateData,
  MidenWalletAdapter,
  PrivateDataPermission,
  WalletAdapterNetwork,
  WalletModalProvider,
  WalletProvider,
} from "@demox-labs/miden-wallet-adapter";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const wallets = useMemo(
    () => [new MidenWalletAdapter({ appName: "Miden Name Service" })],
    [],
  );

  return (
    <WalletProvider
      wallets={wallets}
      privateDataPermission={PrivateDataPermission.UponRequest}
      allowedPrivateData={AllowedPrivateData.None}
      network={WalletAdapterNetwork.Testnet}
      autoConnect
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </WalletProvider>
  );
}
