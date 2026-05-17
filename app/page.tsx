"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  Wallet,
  CheckCircle2,
  XCircle,
  Copy,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  createMidenClient,
  createOrLoadAccount,
  type MidenClient,
} from "@/lib/midenClient";
import {
  registerName as registerRegistryName,
  resolveName,
  type RegistryRecord,
} from "@/lib/registryAdapter";

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
  const [query, setQuery] = useState("bilal");
  const [searchResult, setSearchResult] = useState("");
  const [registerName, setRegisterName] = useState("gamma.miden");
  const [address, setAddress] = useState("");
  const [midenClientStatus, setMidenClientStatus] =
    useState<MidenClientStatus>("disconnected");
  const [midenAccountId, setMidenAccountId] = useState("");
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
    Boolean(midenAccountId) &&
    isRegisterNameValid &&
    !isRegisterTaken &&
    address.trim().length > 0;

  async function handleConnectMidenClient() {
    setMidenClientStatus("connecting");
    setMidenClientError("");

    try {
      const client = midenClientRef.current ?? (await createMidenClient());
      midenClientRef.current = client;
      const { accountId, source } = await createOrLoadAccount(client);

      setMidenAccountId(accountId);
      setMidenAccountSource(source);
      setAddress(accountId);
      setMidenClientStatus("connected");
    } catch (error) {
      console.error(error);
      setMidenClientError(error instanceof Error ? error.message : String(error));
      setMidenClientStatus("error");
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

    void resolveName({ name: nextName, state: registryState }).then((record) => {
      setResolvedRecord(record);
    });
  }

  function chooseAvailableName() {
    if (!searchedName || !isSearchValid || isTaken) return;

    setSelectedName(searchedName);
    setRegisterName(searchedName);
    setRegisterMessage("");
    if (midenAccountId) {
      setAddress(midenAccountId);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = normalizeName(registerName);

    if (!midenAccountId) {
      setRegisterMessageType("error");
      setRegisterMessage("Create or load a Miden account before registering.");
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

    if (!address.trim()) {
      setRegisterMessageType("error");
      setRegisterMessage("Add a target address before registering.");
      return;
    }

    try {
      const result = await registerRegistryName({
        name: nextName,
        owner: midenAccountId,
        target: address.trim(),
        state: registryState,
      });

      setMockNames(result.state.records);
      setRegisterName(nextName);
      setRegisterMessageType("success");
      setRegisterMessage(`${nextName} added to My Names.`);
      setSelectedName("");
      setSearchResult("");
      setResolvedRecord(result.record);
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
          <button
            type="button"
            onClick={handleConnectMidenClient}
            disabled={midenClientStatus === "connecting"}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-200"
          >
            <Wallet className="h-4 w-4" />
            {midenAccountId
              ? shortenAddress(midenAccountId)
              : midenClientStatus === "connecting"
                ? "Connecting"
                : "Connect Wallet"}
          </button>
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
                midenClientStatus === "connected"
                  ? "bg-emerald-400/10 text-emerald-200"
                  : midenClientStatus === "error"
                    ? "bg-red-500/10 text-red-200"
                    : midenClientStatus === "connecting"
                      ? "bg-orange-400/10 text-orange-200"
                      : "bg-white/5 text-orange-100/60"
              }`}
            >
              Miden client: {midenClientStatus}
            </span>
          </div>

          {(midenAccountId || midenClientError) && (
            <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-orange-200/10 bg-black/20 px-4 py-3 text-left">
              {midenAccountId && (
                <div>
                  <p className="text-xs font-semibold uppercase text-orange-100/40">
                    Miden account {midenAccountSource}
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
                  <p className="text-sm text-orange-100/50">Register</p>
                  <p className="text-2xl font-bold">{selectedName}</p>
                </div>

                <input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setRegisterMessage("");
                  }}
                  placeholder={
                    midenAccountId ? midenAccountId : "Create/load Miden account first"
                  }
                  className="min-w-0 rounded-2xl border border-orange-200/10 bg-black/25 px-4 py-3 font-mono text-sm text-orange-100 outline-none md:w-64"
                />
              </div>

              {!midenAccountId && (
                <p className="mt-4 rounded-2xl bg-orange-100/5 px-4 py-3 text-sm text-orange-100/70">
                  Create or load a Miden account to register this name.
                </p>
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
                <Wallet className="h-5 w-5" />{" "}
                {midenAccountId
                  ? "Register with Miden account"
                  : "Create/load Miden account first"}
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
