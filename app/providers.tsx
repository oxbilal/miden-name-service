"use client";

import type { ReactNode } from "react";
import { MidenProvider } from "@miden-sdk/react/lazy";
import { MidenFiSignerProvider } from "@miden-sdk/miden-wallet-adapter-react";
import {
  AllowedPrivateData,
  PrivateDataPermission,
  WalletAdapterNetwork,
} from "@miden-sdk/miden-wallet-adapter-base";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <MidenFiSignerProvider
      appName="Miden Name Service"
      privateDataPermission={PrivateDataPermission.UponRequest}
      allowedPrivateData={AllowedPrivateData.None}
      network={WalletAdapterNetwork.Testnet}
      autoConnect
    >
      <MidenProvider config={{ rpcUrl: "testnet", prover: "testnet" }}>
        {children}
      </MidenProvider>
    </MidenFiSignerProvider>
  );
}
