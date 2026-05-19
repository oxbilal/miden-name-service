"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";
import { motion } from "framer-motion";
import { Transaction } from "@miden-sdk/miden-wallet-adapter-base";
import { useMidenFiWallet } from "@miden-sdk/miden-wallet-adapter-react";
import { useSigner } from "@miden-sdk/react";
import {
  createMidenClient,
  createOrLoadAccount,
  type MidenAccountId,
  type MidenClient,
} from "@/lib/midenClient";
import { consumeFirstAvailableNote } from "@/lib/midenTransactions";
import {
  createTemporaryWordFromText,
  createRegistryPingTransaction,
  createRegistryRegisterTransaction,
  createSimpleTransactionScriptFallback,
  getRegistryAccountId,
  verifyRegistryOwner,
} from "@/lib/registryContract";
import {
  resolveName,
  type RegistryAdapterMode,
  type RegistryRecord,
} from "@/lib/registryAdapter";
import {
  compileMinimalRegistryComponent,
  createLocalRegistryAccount,
} from "@/lib/midenCompileTest";

const takenNames = ["miden.miden", "admin.miden", "bilal.miden"];
const initialNames = [
  {
    name: "alpha.miden",
    owner: "0x9f2a...miden",
    target: "0x9f2a...miden",
    status: "Active" as const,
  },
  {
    name: "vault.miden",
    owner: "0x71bc...miden",
    target: "0x71bc...miden",
    status: "Active" as const,
  },
];

type MidenClientStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";
type TransactionStatus = "idle" | "submitting" | "success" | "error";
type CustomTransactionStatus = "idle" | "requesting" | "success" | "error";
type CompileTestStatus = "idle" | "compiling" | "success" | "error";
type RegistryAccountStatus = "idle" | "creating" | "success" | "error";
type RegistryProcedureStatus = "idle" | "requesting" | "success" | "error";

function MidenLogo({ className = "h-8 w-8" }) {
  return (
    <Image
      src="/miden-logo.png"
      alt="Miden logo"
      width={64}
      height={64}
      className={className}
      priority
      unoptimized
    />
  );
}

function normalizeName(value: string) {
  const clean = value.trim().toLowerCase().replace(/\s+/g, "");
  if (!clean) return "";
  return clean.endsWith(".miden") ? clean : `${clean}.miden`;
}

function getNameLabel(value: string) {
  const clean = value.trim();
  return clean.endsWith(".miden") ? clean.slice(0, -".miden".length) : clean;
}

function isValidName(value: string) {
  const label = getNameLabel(value);
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(label);
}

function shortenAddress(value: string) {
  const clean = value.trim();
  if (clean.length <= 14) return clean;
  return `${clean.slice(0, 8)}...${clean.slice(-5)}`;
}

export default function MidenNameService() {
  const signer = useSigner();
  const {
    address: walletAccountId,
    connected: walletConnected,
    connecting: walletConnecting,
    disconnecting: walletDisconnecting,
    publicKey: walletPublicKey,
    requestTransaction,
    connect: connectWallet,
    disconnect: disconnectWallet,
    select: selectWallet,
    wallets,
  } = useMidenFiWallet();
  const [query, setQuery] = useState("bilal");
  const [searchResult, setSearchResult] = useState("");
  const [registerName, setRegisterName] = useState("gamma.miden");
  const [address, setAddress] = useState("");
  const [midenClientStatus, setMidenClientStatus] =
    useState<MidenClientStatus>("disconnected");
  const [midenAccountId, setMidenAccountId] = useState("");
  const [midenAccountIdObject, setMidenAccountIdObject] =
    useState<MidenAccountId | null>(null);
  const [midenAccountSource, setMidenAccountSource] = useState<
    "loaded" | "created" | ""
  >("");
  const [midenClientError, setMidenClientError] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [mockNames, setMockNames] = useState<RegistryRecord[]>(initialNames);
  const [registerMessage, setRegisterMessage] = useState("");
  const [registerMessageType, setRegisterMessageType] = useState<
    "success" | "error"
  >("success");
  const [copiedName, setCopiedName] = useState("");
  const [resolvedRecord, setResolvedRecord] = useState<RegistryRecord | null>(
    null,
  );
  const [transactionStatus, setTransactionStatus] =
    useState<TransactionStatus>("idle");
  const [transactionMessage, setTransactionMessage] = useState("");
  const [walletApiStatus, setWalletApiStatus] = useState("");
  const [customTransactionStatus, setCustomTransactionStatus] =
    useState<CustomTransactionStatus>("idle");
  const [customTransactionMessage, setCustomTransactionMessage] = useState("");
  const [compileTestStatus, setCompileTestStatus] =
    useState<CompileTestStatus>("idle");
  const [compileTestMessage, setCompileTestMessage] = useState("");
  const [registryAccountStatus, setRegistryAccountStatus] =
    useState<RegistryAccountStatus>("idle");
  const [registryAccountMessage, setRegistryAccountMessage] = useState("");
  const [registryProcedureStatus, setRegistryProcedureStatus] =
    useState<RegistryProcedureStatus>("idle");
  const [registryProcedureMessage, setRegistryProcedureMessage] = useState("");
  const midenClientRef = useRef<MidenClient | null>(null);

  const registeredNames = useMemo(
    () => mockNames.map((item) => item.name),
    [mockNames],
  );
  const unavailableNames = useMemo(
    () => [...takenNames, ...registeredNames],
    [registeredNames],
  );
  const registryState = useMemo(
    () => ({
      records: mockNames,
      reservedNames: takenNames,
    }),
    [mockNames],
  );
  const registryMode: RegistryAdapterMode =
    midenClientRef.current && midenAccountId ? "miden" : "local";
  const activeAccountId = walletAccountId ?? midenAccountId;
  const registryAccountId = getRegistryAccountId();
  const searchedName = useMemo(() => normalizeName(searchResult), [searchResult]);
  const isSearchValid = searchResult ? isValidName(searchResult) : false;
  const isTaken = searchedName ? unavailableNames.includes(searchedName) : false;
  const normalizedRegisterName = useMemo(
    () => normalizeName(registerName),
    [registerName],
  );
  const isRegisterNameValid = registerName ? isValidName(registerName) : false;
  const isRegisterTaken = normalizedRegisterName
    ? unavailableNames.includes(normalizedRegisterName)
    : false;
  const canRegister =
    Boolean(walletAccountId) &&
    typeof requestTransaction === "function" &&
    isRegisterNameValid &&
    !isRegisterTaken;

  async function handleWalletConnect() {
    setWalletApiStatus("");

    try {
      if (walletConnected) {
        await (signer?.disconnect ?? disconnectWallet)();
        return;
      }

      if (signer?.connect) {
        await signer.connect();
        return;
      }

      if (wallets[0]) {
        selectWallet(wallets[0].adapter.name);
      }

      await connectWallet();
    } catch (error) {
      setWalletApiStatus(
        `connect error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async function handleConnectMidenClient() {
    setMidenClientStatus("connecting");
    setMidenClientError("");

    try {
      const client = midenClientRef.current ?? (await createMidenClient());
      midenClientRef.current = client;
      const { accountId, accountIdObject, source } =
        await createOrLoadAccount(client);

      setMidenAccountId(accountId);
      setMidenAccountIdObject(accountIdObject);
      setMidenAccountSource(source);
      setAddress(accountId);
      setTransactionMessage("");
      setTransactionStatus("idle");
      setMidenClientStatus("connected");
    } catch (error) {
      console.error(error);
      setMidenClientError(error instanceof Error ? error.message : String(error));
      setMidenClientStatus("error");
    }
  }

  async function handleConsumeFirstNote() {
    if (!midenClientRef.current || !midenAccountIdObject) {
      setTransactionStatus("error");
      setTransactionMessage("Connect a Miden account before sending a transaction.");
      return;
    }

    setTransactionStatus("submitting");
    setTransactionMessage("");

    try {
      const result = await consumeFirstAvailableNote(
        midenClientRef.current,
        midenAccountIdObject,
      );

      setTransactionStatus("success");
      setTransactionMessage(
        `Consumed note ${shortenAddress(result.noteId)} in transaction ${shortenAddress(
          result.transactionId,
        )}.`,
      );
    } catch (error) {
      setTransactionStatus("error");
      const message = error instanceof Error ? error.message : String(error);
      setTransactionMessage(
        message.includes("No consumable notes found")
          ? "No consumable notes yet. This is normal."
          : message,
      );
    }
  }

  function handleTestWalletApi() {
    const rows = [
      `address: ${walletAccountId ? shortenAddress(walletAccountId) : "missing"}`,
      `publicKey: ${walletPublicKey ? `${walletPublicKey.length} bytes` : "missing"}`,
      `requestTransaction: ${
        typeof requestTransaction === "function" ? "available" : "missing"
      }`,
      `signBytes: available but disabled for register intent until Word/SigningInputs format is confirmed`,
    ];

    setWalletApiStatus(rows.join("\n"));
  }

  async function handleTestCustomTransactionRequest() {
    if (!walletAccountId) {
      setCustomTransactionStatus("error");
      setCustomTransactionMessage(
        "Connect a Miden wallet before requesting a custom transaction.",
      );
      return;
    }

    if (typeof requestTransaction !== "function") {
      setCustomTransactionStatus("error");
      setCustomTransactionMessage(
        "wallet.requestTransaction is not available from the connected adapter.",
      );
      return;
    }

    setCustomTransactionStatus("requesting");
    setCustomTransactionMessage("");

    try {
      const { MidenClient, TransactionRequestBuilder } = await import(
        "@miden-sdk/miden-sdk"
      );
      await MidenClient.ready();
      const transactionRequest = new TransactionRequestBuilder().build();
      const transaction = Transaction.createCustomTransaction(
        walletAccountId,
        walletAccountId,
        transactionRequest,
      );

      const transactionId = await requestTransaction(transaction);

      setCustomTransactionStatus("success");
      setCustomTransactionMessage(
        transactionId
          ? `Wallet returned transaction id ${transactionId}.`
          : "Wallet accepted the custom transaction request.",
      );
    } catch (error) {
      setCustomTransactionStatus("error");
      setCustomTransactionMessage(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async function handleCompileRegistryComponent() {
    setCompileTestStatus("compiling");
    setCompileTestMessage("");

    try {
      const client = midenClientRef.current ?? (await createMidenClient());
      midenClientRef.current = client;

      const result = await compileMinimalRegistryComponent(client);

      setCompileTestStatus("success");
      setCompileTestMessage(
        [
          `${result.accountType} = ${result.accountTypeValue}`,
          result.storageSlots?.length
            ? `storage slots: ${result.storageSlots.join(", ")}`
            : "storage slots: none",
          `Compiled ${result.procedureCount} procedure(s).`,
          ...Object.entries(result.procedureHashes).map(
            ([name, hash]) => `${name} hash: ${hash || "unavailable"}`,
          ),
          result.procedures.length > 0
            ? `procedures: ${result.procedures.join(", ")}`
            : "procedures: none returned",
        ].join("\n"),
      );
    } catch (error) {
      setCompileTestStatus("error");
      setCompileTestMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleTestRegistryPingTransaction() {
    if (!walletAccountId) {
      setRegistryProcedureStatus("error");
      setRegistryProcedureMessage(
        "Connect a Miden wallet before requesting a registry procedure transaction.",
      );
      return;
    }

    if (typeof requestTransaction !== "function") {
      setRegistryProcedureStatus("error");
      setRegistryProcedureMessage(
        "wallet.requestTransaction is not available from the connected adapter.",
      );
      return;
    }

    setRegistryProcedureStatus("requesting");
    setRegistryProcedureMessage("");

    try {
      const client = midenClientRef.current ?? (await createMidenClient());
      midenClientRef.current = client;
      const transaction = await createRegistryPingTransaction({
        client,
        walletAccountId,
      });
      const transactionId = await requestTransaction(transaction);

      setRegistryProcedureStatus("success");
      setRegistryProcedureMessage(
        transactionId
          ? `Registry ping wallet transaction id: ${transactionId}.`
          : "Wallet accepted the registry ping transaction request.",
      );
    } catch (error) {
      setRegistryProcedureStatus("error");
      setRegistryProcedureMessage(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async function handleTestSimpleScriptFallback() {
    if (!walletAccountId) {
      setRegistryProcedureStatus("error");
      setRegistryProcedureMessage(
        "Connect a Miden wallet before requesting the simple transaction fallback.",
      );
      return;
    }

    if (typeof requestTransaction !== "function") {
      setRegistryProcedureStatus("error");
      setRegistryProcedureMessage(
        "wallet.requestTransaction is not available from the connected adapter.",
      );
      return;
    }

    setRegistryProcedureStatus("requesting");
    setRegistryProcedureMessage("");

    try {
      const client = midenClientRef.current ?? (await createMidenClient());
      midenClientRef.current = client;
      const transaction = await createSimpleTransactionScriptFallback({
        client,
        walletAccountId,
      });
      const transactionId = await requestTransaction(transaction);

      setRegistryProcedureStatus("success");
      setRegistryProcedureMessage(
        transactionId
          ? `Simple fallback wallet transaction id: ${transactionId}.`
          : "Wallet accepted the simple transaction fallback.",
      );
    } catch (error) {
      setRegistryProcedureStatus("error");
      setRegistryProcedureMessage(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async function handleTestRegisterTransaction() {
    if (!walletAccountId) {
      setRegistryProcedureStatus("error");
      setRegistryProcedureMessage(
        "Connect a Miden wallet before requesting a register transaction.",
      );
      return;
    }

    if (typeof requestTransaction !== "function") {
      setRegistryProcedureStatus("error");
      setRegistryProcedureMessage(
        "wallet.requestTransaction is not available from the connected adapter.",
      );
      return;
    }

    setRegistryProcedureStatus("requesting");
    setRegistryProcedureMessage("");

    try {
      const client = midenClientRef.current ?? (await createMidenClient());
      midenClientRef.current = client;
      const transaction = await createRegistryRegisterTransaction({
        client,
        walletAccountId,
      });
      const transactionId = await requestTransaction(transaction);

      setRegistryProcedureStatus("success");
      setRegistryProcedureMessage(
        transactionId
          ? `Register wallet transaction id: ${transactionId}.`
          : "Wallet accepted the register transaction request.",
      );
    } catch (error) {
      setRegistryProcedureStatus("error");
      setRegistryProcedureMessage(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async function handleCreateRegistryAccount() {
    setRegistryAccountStatus("creating");
    setRegistryAccountMessage("");

    try {
      const client = midenClientRef.current ?? (await createMidenClient());
      midenClientRef.current = client;

      const result = await createLocalRegistryAccount(client);

      setRegistryAccountStatus("success");
      setRegistryAccountMessage(
        [
          `registry account id: ${result.accountId}`,
          `${result.accountType} = ${result.accountTypeValue}`,
          `storage mode: ${result.storageMode}`,
          result.storageSlots?.length
            ? `storage slots: ${result.storageSlots.join(", ")}`
            : "storage slots: none",
          `Compiled ${result.procedureCount} procedure(s).`,
          ...Object.entries(result.procedureHashes).map(
            ([name, hash]) => `${name} hash: ${hash || "unavailable"}`,
          ),
        ].join("\n"),
      );
    } catch (error) {
      setRegistryAccountStatus("error");
      setRegistryAccountMessage(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchResult(query);
    setSelectedName("");
    setRegisterMessage("");
    setResolvedRecord(null);

    const nextName = normalizeName(query);
    if (!nextName || !isValidName(query)) return;

    void resolveName({
      mode: registryMode,
      name: nextName,
      state: registryState,
      client: midenClientRef.current,
      accountId: midenAccountId,
    }).then((record) => {
      setResolvedRecord(record);
    });
  }

  function chooseAvailableName() {
    if (!searchedName || !isSearchValid || isTaken) return;

    setSelectedName(searchedName);
    setRegisterName(searchedName);
    setRegisterMessage("");
    if (activeAccountId) {
      setAddress(activeAccountId);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = normalizeName(selectedName || registerName);

    if (!walletAccountId) {
      setRegisterMessageType("error");
      setRegisterMessage(
        "Connect a Miden wallet before requesting a registry transaction.",
      );
      return;
    }

    if (typeof requestTransaction !== "function") {
      setRegisterMessageType("error");
      setRegisterMessage(
        "Connected wallet adapter does not expose requestTransaction.",
      );
      return;
    }

    if (!isValidName(registerName)) {
      setRegisterMessageType("error");
      setRegisterMessage("Use lowercase letters, numbers, and hyphens only.");
      return;
    }

    if (unavailableNames.includes(nextName)) {
      setRegisterMessageType("error");
      setRegisterMessage(`${nextName} is already taken.`);
      return;
    }

    try {
      const client = midenClientRef.current ?? (await createMidenClient());
      midenClientRef.current = client;
      const nameHashWord = createTemporaryWordFromText(nextName);
      const ownerWord = createTemporaryWordFromText(walletAccountId);
      const transaction = await createRegistryRegisterTransaction({
        client,
        walletAccountId,
        nameHashWord,
        ownerWord,
      });
      const transactionId = await requestTransaction(transaction);
      let verificationMessage = "";

      try {
        const verification = await verifyRegistryOwner({
          client,
          walletAccountId,
          nameHashWord,
          ownerWord,
        });
        verificationMessage = verification.matches
          ? " Verified owner."
          : ` Resolve returned owner word ${verification.ownerWord.join(".")}, which does not match the connected wallet.`;
      } catch (verifyError) {
        verificationMessage = ` Resolve verification blocked: ${
          verifyError instanceof Error ? verifyError.message : String(verifyError)
        }`;
      }

      setRegisterName(nextName);
      setRegisterMessageType("success");
      setRegisterMessage(
        transactionId
          ? `Wallet transaction id: ${transactionId}.${verificationMessage}`
          : `Wallet accepted the registry register transaction request.${verificationMessage}`,
      );
    } catch (error) {
      setRegisterMessageType("error");
      setRegisterMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function copyAddress(item: RegistryRecord) {
    try {
      await navigator.clipboard.writeText(item.target);
      setCopiedName(item.name);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = item.target;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (copied) {
        setCopiedName(item.name);
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#120c07] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-64 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-200/10 bg-white shadow-lg shadow-orange-500/10">
            <MidenLogo className="h-7 w-7" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Miden
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <a href="#names" className="hover:text-white">
            My Names
          </a>
          <div className="flex items-center gap-3">
            {walletAccountId && (
              <span className="hidden rounded-full bg-orange-100/5 px-3 py-1 font-mono text-xs text-orange-100/70 sm:inline-flex">
                {shortenAddress(walletAccountId)}
              </span>
            )}
            <button
              type="button"
              onClick={handleWalletConnect}
              disabled={walletConnecting || walletDisconnecting}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-200/70"
            >
              {walletConnected
                ? "Disconnect"
                : walletConnecting
                  ? "Connecting"
                  : "Connect Miden Wallet"}
            </button>
          </div>
        </div>
      </nav>

      <section
        id="home"
        className="relative z-10 mx-auto flex min-h-[calc(100vh-92px)] max-w-4xl flex-col items-center justify-center px-6 pb-24 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <h1 className="text-5xl font-black leading-tight tracking-tight md:text-7xl">
            Your{" "}
            <span className="bg-gradient-to-r from-orange-300 to-white bg-clip-text text-transparent">
              .miden
            </span>{" "}
            username
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-orange-100/70">
            Find and register a readable name for your Miden account.
          </p>

          <form
            onSubmit={handleSearch}
            className="relative mx-auto mt-10 w-full max-w-2xl"
          >
            <div className="flex items-center gap-4 rounded-[1.75rem] border border-orange-200/10 bg-white px-5 py-4 text-zinc-950 shadow-2xl shadow-orange-950/40">
              <Search className="h-6 w-6 shrink-0 text-orange-500" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchResult("");
                  setSelectedName("");
                  setRegisterMessage("");
                }}
                className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-zinc-400"
                placeholder="Search names"
              />
              <button
                type="submit"
                className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-400"
              >
                Search
              </button>
            </div>

            {searchedName && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-20 overflow-hidden rounded-[1.5rem] border border-orange-200/10 bg-[#1b140e] text-left shadow-2xl shadow-black/40">
                {!isSearchValid ? (
                  <div className="flex items-center gap-3 px-5 py-4 text-red-200">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">{searchedName}</p>
                      <p className="text-sm text-red-200/70">
                        Use lowercase letters, numbers, and hyphens only.
                      </p>
                    </div>
                  </div>
                ) : isTaken ? (
                  <div className="flex items-center gap-3 px-5 py-4 text-red-200">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">{searchedName}</p>
                      <p className="text-sm text-red-200/70">
                        {resolvedRecord
                          ? `Resolves to ${shortenAddress(resolvedRecord.target)}`
                          : "Unavailable"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={chooseAvailableName}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-orange-100/5"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                      <div>
                        <p className="font-semibold">{searchedName}</p>
                        <p className="text-sm text-emerald-200/80">Available</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white">
                      Choose
                    </span>
                  </button>
                )}
              </div>
            )}
          </form>

          <div className="mx-auto mt-5 flex max-w-2xl flex-col items-center justify-center gap-3 text-sm text-orange-100/60 sm:flex-row">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                walletConnected
                  ? "bg-emerald-400/10 text-emerald-200"
                  : walletConnecting
                    ? "bg-orange-400/10 text-orange-200"
                    : "bg-white/5 text-orange-100/60"
              }`}
            >
              Wallet adapter:{" "}
              {walletConnected
                ? "connected"
                : walletConnecting
                  ? "connecting"
                  : "disconnected"}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                midenClientStatus === "connected"
                  ? "bg-emerald-400/10 text-emerald-200"
                  : midenClientStatus === "error"
                    ? "bg-red-500/10 text-red-200"
                    : midenClientStatus === "connecting"
                      ? "bg-orange-400/10 text-orange-200"
                      : "bg-white/5 text-orange-100/60"
              }`}
            >
              Local MidenClient: {midenClientStatus}
            </span>
          </div>
          {walletAccountId && (
            <p className="mx-auto mt-3 max-w-2xl break-all font-mono text-sm text-orange-100/60">
              Wallet accountId: {walletAccountId}
            </p>
          )}

          <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-orange-200/10 bg-[#1b140e]/60 p-4 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-100">
                  Wallet API Test
                </p>
                <p className="mt-1 text-sm text-orange-100/50">
                  Checks available wallet fields and functions without signing
                  or sending a transaction.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestWalletApi}
                className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400"
              >
                Test Wallet API
              </button>
            </div>

            {walletApiStatus && (
              <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-black/25 px-4 py-3 font-mono text-sm text-orange-100/75">
                {walletApiStatus}
              </pre>
            )}
          </div>

          <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-orange-200/10 bg-[#1b140e]/60 p-4 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-100">
                  Custom Transaction Test
                </p>
                <p className="mt-1 text-sm text-orange-100/50">
                  Requests an empty custom transaction through the wallet
                  adapter. No registry write is included.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestCustomTransactionRequest}
                disabled={
                  customTransactionStatus === "requesting" || !walletAccountId
                }
                className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-100/20 disabled:text-orange-100/40"
              >
                {customTransactionStatus === "requesting"
                  ? "Requesting"
                  : "Test custom transaction request"}
              </button>
            </div>

            {customTransactionMessage && (
              <p
                className={`mt-3 rounded-2xl px-4 py-3 text-sm ${
                  customTransactionStatus === "success"
                    ? "bg-emerald-400/10 text-emerald-200"
                    : "bg-red-500/10 text-red-200"
                }`}
              >
                {customTransactionMessage}
              </p>
            )}
          </div>

          <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-orange-200/10 bg-[#1b140e]/60 p-4 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-100">
                  Registry Procedure Transaction Test
                </p>
                <p className="mt-1 text-sm text-orange-100/50">
                  Calls the configured registry account{" "}
                  <span className="font-mono">
                    {shortenAddress(registryAccountId)}
                  </span>
                  {" "}ping or register procedure through a wrapped transaction
                  script.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={handleTestRegistryPingTransaction}
                  disabled={
                    registryProcedureStatus === "requesting" || !walletAccountId
                  }
                  className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-100/20 disabled:text-orange-100/40"
                >
                  {registryProcedureStatus === "requesting"
                    ? "Requesting"
                    : "Test registry ping"}
                </button>
                <button
                  type="button"
                  onClick={handleTestSimpleScriptFallback}
                  disabled={
                    registryProcedureStatus === "requesting" || !walletAccountId
                  }
                  className="rounded-2xl border border-orange-200/10 bg-orange-100/5 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-orange-100/10 disabled:cursor-not-allowed disabled:text-orange-100/40"
                >
                  Test simple fallback
                </button>
                <button
                  type="button"
                  onClick={handleTestRegisterTransaction}
                  disabled={
                    registryProcedureStatus === "requesting" || !walletAccountId
                  }
                  className="rounded-2xl border border-orange-200/10 bg-orange-100/5 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-orange-100/10 disabled:cursor-not-allowed disabled:text-orange-100/40"
                >
                  Test register
                </button>
              </div>
            </div>

            {registryProcedureMessage && (
              <p
                className={`mt-3 rounded-2xl px-4 py-3 text-sm ${
                  registryProcedureStatus === "success"
                    ? "bg-emerald-400/10 text-emerald-200"
                    : "bg-red-500/10 text-red-200"
                }`}
              >
                {registryProcedureMessage}
              </p>
            )}
          </div>

          <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-orange-200/10 bg-[#1b140e]/60 p-4 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-100">
                  Registry Component Compile Test
                </p>
                <p className="mt-1 text-sm text-orange-100/50">
                  Uses v0.14 client.compile.component with an empty StorageMap
                  slot. No deploy, transaction, or registry write.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCompileRegistryComponent}
                disabled={compileTestStatus === "compiling"}
                className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400 disabled:cursor-wait disabled:bg-orange-100/20 disabled:text-orange-100/40"
              >
                {compileTestStatus === "compiling"
                  ? "Compiling"
                  : "Test registry compile"}
              </button>
            </div>

            {compileTestMessage && (
              <pre
                className={`mt-3 whitespace-pre-wrap rounded-2xl px-4 py-3 font-mono text-sm ${
                  compileTestStatus === "success"
                    ? "bg-emerald-400/10 text-emerald-200"
                    : "bg-red-500/10 text-red-200"
                }`}
              >
                {compileTestMessage}
              </pre>
            )}
          </div>

          <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-orange-200/10 bg-[#1b140e]/60 p-4 text-left">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-100">
                  Create registry account
                </p>
                <p className="mt-1 text-sm text-orange-100/50">
                  Creates a local mutable contract account from the compiled
                  registry component. No storage write or Register wiring yet.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateRegistryAccount}
                disabled={registryAccountStatus === "creating"}
                className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400 disabled:cursor-wait disabled:bg-orange-100/20 disabled:text-orange-100/40"
              >
                {registryAccountStatus === "creating"
                  ? "Creating"
                  : "Create registry account"}
              </button>
            </div>

            {registryAccountMessage && (
              <pre
                className={`mt-3 whitespace-pre-wrap rounded-2xl px-4 py-3 font-mono text-sm ${
                  registryAccountStatus === "success"
                    ? "bg-emerald-400/10 text-emerald-200"
                    : "bg-red-500/10 text-red-200"
                }`}
              >
                {registryAccountMessage}
              </pre>
            )}
          </div>

          {(midenAccountId || midenClientError) && (
            <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-orange-200/10 bg-black/20 px-4 py-3 text-left">
              {midenAccountId && (
                <div>
                  <p className="text-xs font-semibold uppercase text-orange-100/40">
                    Miden Account {midenAccountSource}
                  </p>
                  <p className="mt-1 text-xs text-orange-100/50">
                    Local Miden account via MidenClient
                  </p>
                  <p className="mt-1 break-all font-mono text-sm text-orange-100">
                    {midenAccountId}
                  </p>
                </div>
              )}
              {midenClientError && (
                <div>
                  <p className="text-xs font-semibold uppercase text-red-200/60">
                    Error
                  </p>
                  <p className="mt-1 break-words font-mono text-sm text-red-200">
                    {midenClientError}
                  </p>
                </div>
              )}
            </div>
          )}

          {!midenAccountId && (
            <button
              type="button"
              onClick={handleConnectMidenClient}
              disabled={midenClientStatus === "connecting"}
              className="mx-auto mt-4 rounded-2xl border border-orange-200/10 bg-transparent px-3 py-1.5 text-xs font-semibold text-orange-100/45 hover:bg-orange-100/5 hover:text-orange-100/70 disabled:cursor-wait disabled:text-orange-100/30"
            >
              {midenClientStatus === "connecting"
                ? "Creating local MidenClient account"
                : "Fallback: use local MidenClient account"}
            </button>
          )}

          {midenAccountId && (
            <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-orange-200/10 bg-[#1b140e]/70 p-4 text-left">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-100">
                    Transaction Test
                  </p>
                  <p className="mt-1 text-sm text-orange-100/50">
                    Consume the first available note for this local account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleConsumeFirstNote}
                  disabled={transactionStatus === "submitting"}
                  className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400 disabled:cursor-wait disabled:bg-orange-100/20 disabled:text-orange-100/40"
                >
                  {transactionStatus === "submitting"
                    ? "Testing transaction"
                    : "Test Miden transaction"}
                </button>
              </div>

              {transactionMessage && (
                <p
                  className={`mt-3 rounded-2xl px-4 py-3 text-sm ${
                    transactionStatus === "success"
                      ? "bg-emerald-400/10 text-emerald-200"
                      : "bg-orange-100/5 text-orange-100/70"
                  }`}
                >
                  {transactionStatus === "success"
                    ? `Success: ${transactionMessage}`
                    : transactionMessage}
                </p>
              )}
            </div>
          )}

          {selectedName && (
            <motion.form
              onSubmit={handleRegister}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mx-auto mt-24 max-w-2xl rounded-[1.5rem] border border-orange-200/10 bg-[#1b140e]/80 p-5 text-left shadow-xl"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-orange-100/50">Register</p>
                    {walletAccountId && (
                      <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-100">
                        Registry boundary configured
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{selectedName}</p>
                </div>

                <input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setRegisterMessage("");
                  }}
                  placeholder={
                    activeAccountId
                      ? activeAccountId
                      : "Connect wallet or local account first"
                  }
                  className="min-w-0 rounded-2xl border border-orange-200/10 bg-black/25 px-4 py-3 font-mono text-sm text-orange-100 outline-none md:w-64"
                />
              </div>

              {walletAccountId ? (
                <p className="mt-4 rounded-2xl bg-orange-100/5 px-4 py-3 text-sm text-orange-100/70">
                  Register targets registry account{" "}
                  <span className="font-mono">
                    {shortenAddress(registryAccountId)}
                  </span>{" "}
                  from wallet{" "}
                  <span className="font-mono">
                    {shortenAddress(walletAccountId)}
                  </span>
                  . This sends a registry register transaction.
                </p>
              ) : (
                <p className="mt-4 rounded-2xl bg-orange-100/5 px-4 py-3 text-sm text-orange-100/70">
                  Connect a Miden wallet to request a registry transaction.
                  Local mock registration is disabled.
                </p>
              )}

              {walletAccountId && (
                <div className="mt-4 rounded-2xl border border-orange-200/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-orange-100">
                        Register intent
                      </p>
                      <p className="mt-1 text-sm text-orange-100/50">
                        Signs name, wallet address, and timestamp with the
                        wallet API. No registry write is sent.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled
                      className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-zinc-200 disabled:cursor-wait disabled:bg-white/20 disabled:text-orange-100/40"
                    >
                      Sign register intent
                    </button>
                  </div>

                  <p className="mt-3 rounded-2xl bg-orange-100/5 px-4 py-3 text-sm text-orange-100/70">
                    Signing disabled: wallet adapter expects Word or
                    SigningInputs bytes, but the register intent format is not
                    confirmed yet.
                  </p>
                </div>
              )}

              {registerMessage && (
                <p
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                    registerMessageType === "success"
                      ? "bg-emerald-400/10 text-emerald-200"
                      : "bg-red-500/10 text-red-200"
                  }`}
                >
                  {registerMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={!canRegister}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-100/20 disabled:text-orange-100/40"
              >
                {walletAccountId
                  ? "Register name"
                  : "Connect Miden wallet first"}
              </button>
            </motion.form>
          )}
        </motion.div>
      </section>

      <section
        id="names"
        className="relative z-10 mx-auto max-w-4xl px-6 py-16"
      >
        <div className="border-t border-orange-200/10 pt-8">
          <h2 className="text-2xl font-bold">My Names</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {mockNames.map((item) => (
              <div
                key={item.name}
                className="rounded-2xl border border-orange-200/10 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold">{item.name}</p>
                    <p className="mt-2 font-mono text-sm text-orange-100/50">
                      {item.target}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyAddress(item)}
                    className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
                    aria-label={`Copy address for ${item.name}`}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-block rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                    {item.status}
                  </span>
                  {copiedName === item.name && (
                    <span className="text-xs text-orange-100/50">Copied</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
