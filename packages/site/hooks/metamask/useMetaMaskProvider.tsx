import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Eip1193Provider, ethers } from "ethers";
import { useEip6963 } from "./useEip6963";

interface ProviderConnectInfo {
  readonly chainId: string;
}

interface ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}

type ConnectListenerFn = (connectInfo: ProviderConnectInfo) => void;
type DisconnectListenerFn = (error: ProviderRpcError) => void;
type ChainChangedListenerFn = (chainId: string) => void;
type AccountsChangedListenerFn = (accounts: string[]) => void;

type Eip1193EventMap = {
  connect: ConnectListenerFn;
  chainChanged: ChainChangedListenerFn;
  accountsChanged: AccountsChangedListenerFn;
  disconnect: DisconnectListenerFn;
};

type Eip1193EventFn = <E extends keyof Eip1193EventMap>(
  event: E,
  fn: Eip1193EventMap[E]
) => void;

interface Eip1193ProviderWithEvent extends ethers.Eip1193Provider {
  on?: Eip1193EventFn;
  off?: Eip1193EventFn;
  addListener?: Eip1193EventFn;
  removeListener?: Eip1193EventFn;
}

export interface UseMetaMaskState {
  provider: Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  error: Error | undefined;
  connect: () => void;
  disconnect: () => void;
}

function useMetaMaskInternal(): UseMetaMaskState {
  const { error: eip6963Error, providers } = useEip6963();
  const [_currentProvider, _setCurrentProvider] = useState<
    Eip1193ProviderWithEvent | undefined
  >(undefined);
  const [chainId, _setChainId] = useState<number | undefined>(undefined);
  const [accounts, _setAccounts] = useState<string[] | undefined>(undefined);

  const connectListenerRef = useRef<ConnectListenerFn | undefined>(undefined);
  const disconnectListenerRef = useRef<DisconnectListenerFn | undefined>(
    undefined
  );
  const chainChangedListenerRef = useRef<ChainChangedListenerFn | undefined>(
    undefined
  );
  const accountsChangedListenerRef = useRef<
    AccountsChangedListenerFn | undefined
  >(undefined);

  const metaMaskProviderRef = useRef<Eip1193ProviderWithEvent | undefined>(
    undefined
  );

  const hasProvider = Boolean(_currentProvider);
  const hasAccounts = (accounts?.length ?? 0) > 0;
  const hasChain = typeof chainId === "number";

  console.log("hasProvider:", hasProvider);
  console.log("hasAccounts:", hasAccounts);
  console.log("hasChain:", hasChain);

  const isConnected = hasProvider && hasAccounts && hasChain;

  const connect = useCallback(() => {
    if (!_currentProvider) {
      return;
    }

    if (accounts && accounts.length > 0) {
      // already connected
      return;
    }

    // Prompt connection
    _currentProvider.request({ method: "eth_requestAccounts" });
  }, [_currentProvider, accounts]);

  const disconnect = useCallback(() => {
    // // Reset connection state to simulate disconnect
    // _setCurrentProvider(undefined);
    // _setChainId(undefined);
    // _setAccounts(undefined);

    _currentProvider?.request({ method: "eth_logout" });
  }, []);

  useEffect(() => {
    console.log("[useMetaMask] useEffect triggered with providers:", providers);

    let next: Eip1193ProviderWithEvent | undefined = undefined;
    for (let i = 0; i < providers.length; ++i) {
      console.log(
        `[useMetaMask] Checking provider[${i}]:`,
        providers[i].info.name
      );
      if (providers[i].info.name.toLowerCase() === "metamask") {
        next = providers[i].provider;
        console.log(
          `[useMetaMask] Found MetaMask provider at index ${i}:`,
          next
        );
        break;
      }
    }

    const prev = metaMaskProviderRef.current;
    if (prev === next) {
      console.log(
        "[useMetaMask] No change in MetaMask provider, skipping effect."
      );
      return;
    }

    if (prev) {
      console.log(
        "[useMetaMask] Cleaning up previous MetaMask provider listeners:",
        prev
      );

      if (connectListenerRef.current) {
        console.log("[useMetaMask] Removing previous connect listener");
        prev.off?.("connect", connectListenerRef.current);
        prev.removeListener?.("connect", connectListenerRef.current);
        connectListenerRef.current = undefined;
      }

      if (disconnectListenerRef.current) {
        console.log("[useMetaMask] Removing previous disconnect listener");
        prev.off?.("disconnect", disconnectListenerRef.current);
        prev.removeListener?.("disconnect", disconnectListenerRef.current);
        disconnectListenerRef.current = undefined;
      }

      if (chainChangedListenerRef.current) {
        console.log("[useMetaMask] Removing previous chainChanged listener");
        prev.off?.("chainChanged", chainChangedListenerRef.current);
        prev.removeListener?.("chainChanged", chainChangedListenerRef.current);
        chainChangedListenerRef.current = undefined;
      }

      if (accountsChangedListenerRef.current) {
        console.log("[useMetaMask] Removing previous accountsChanged listener");
        prev.off?.("accountsChanged", accountsChangedListenerRef.current);
        prev.removeListener?.(
          "accountsChanged",
          accountsChangedListenerRef.current
        );
        accountsChangedListenerRef.current = undefined;
      }
    }

    console.log(
      "[useMetaMask] Resetting provider, chainId, and accounts state."
    );
    _setCurrentProvider(undefined);
    _setChainId(undefined);
    _setAccounts(undefined);

    metaMaskProviderRef.current = next;

    let nextConnectListener: ConnectListenerFn | undefined = undefined;
    let nextDisconnectListener: DisconnectListenerFn | undefined = undefined;
    let nextChainChangedListener: ChainChangedListenerFn | undefined =
      undefined;
    let nextAccountsChangedListener: AccountsChangedListenerFn | undefined =
      undefined;

    connectListenerRef.current = undefined;
    disconnectListenerRef.current = undefined;
    chainChangedListenerRef.current = undefined;
    accountsChangedListenerRef.current = undefined;

    if (next) {
      console.log(
        "[useMetaMask] Setting up listeners for new MetaMask provider:",
        next
      );

      // Connect
      nextConnectListener = (connectInfo: ProviderConnectInfo) => {
        if (next !== metaMaskProviderRef.current) {
          console.log(
            "[useMetaMask] Ignoring connect event for stale provider."
          );
          return;
        }
        console.log(
          `[useMetaMask] on('connect') chainId=${connectInfo.chainId}`,
          connectInfo
        );
        // Synchronize provider and chainId
        _setCurrentProvider(next);
        _setChainId(Number.parseInt(connectInfo.chainId, 16));
      };
      connectListenerRef.current = nextConnectListener;

      // Disconnect
      nextDisconnectListener = (error: ProviderRpcError) => {
        if (next !== metaMaskProviderRef.current) {
          console.log(
            "[useMetaMask] Ignoring disconnect event for stale provider."
          );
          return;
        }
        console.log(
          `[useMetaMask] on('disconnect') error code=${error.code}`,
          error
        );
        // Synchronize provider and chainId
        _setCurrentProvider(undefined);
        _setChainId(undefined);
        _setAccounts(undefined);
      };
      disconnectListenerRef.current = nextDisconnectListener;

      // ChainChanged
      nextChainChangedListener = (chainId: string) => {
        if (next !== metaMaskProviderRef.current) {
          console.log(
            "[useMetaMask] Ignoring chainChanged event for stale provider."
          );
          return;
        }
        console.log(`[useMetaMask] on('chainChanged') chainId=${chainId}`);
        // Synchronize provider and chainId
        _setCurrentProvider(next);
        _setChainId(Number.parseInt(chainId, 16));
      };
      chainChangedListenerRef.current = nextChainChangedListener;

      // AccountsChanged
      nextAccountsChangedListener = (accounts: string[]) => {
        if (next !== metaMaskProviderRef.current) {
          console.log(
            "[useMetaMask] Ignoring accountsChanged event for stale provider."
          );
          return;
        }
        console.log(
          `[useMetaMask] on('accountsChanged') accounts.length=${accounts.length}`,
          accounts
        );
        _setCurrentProvider(next);
        _setAccounts(accounts);
      };
      accountsChangedListenerRef.current = nextAccountsChangedListener;

      // One or the other
      if (next.on) {
        console.log("[useMetaMask] Using .on to add event listeners.");
        next.on("connect", nextConnectListener);
        next.on("disconnect", nextDisconnectListener);
        next.on("chainChanged", nextChainChangedListener);
        next.on?.("accountsChanged", nextAccountsChangedListener);
      } else {
        console.log("[useMetaMask] Using .addListener to add event listeners.");
        next.addListener?.("connect", nextConnectListener);
        next.addListener?.("disconnect", nextDisconnectListener);
        next.addListener?.("chainChanged", nextChainChangedListener);
        next.addListener?.("accountsChanged", nextAccountsChangedListener);
      }

      const updateChainId = async () => {
        if (next !== metaMaskProviderRef.current) {
          console.log("[useMetaMask] updateChainId: stale provider, aborting.");
          return;
        }

        try {
          console.log(
            "[useMetaMask] updateChainId: requesting eth_chainId and eth_accounts..."
          );
          const [chainIdHex, accountsArray] = await Promise.all([
            next.request({ method: "eth_chainId" }),
            next.request({ method: "eth_accounts" }),
          ]);

          console.log(
            `[useMetaMask] connected to chainId=${chainIdHex} accounts.length=${accountsArray.length}`,
            { chainIdHex, accountsArray }
          );

          _setCurrentProvider(next);
          _setChainId(Number.parseInt(chainIdHex, 16));
          _setAccounts(accountsArray);
        } catch (err) {
          console.log(`[useMetaMask] not connected! Error:`, err);
          _setCurrentProvider(next);
          _setChainId(undefined);
          _setAccounts(undefined);
        }
      };

      updateChainId();
    } else {
      console.log(
        "[useMetaMask] No MetaMask provider found in providers array."
      );
    }
  }, [providers]);

  // Unmount
  useEffect(() => {
    return () => {
      const current = metaMaskProviderRef.current;

      if (current) {
        const chainChangedListener = chainChangedListenerRef.current;
        const accountsChangedListener = accountsChangedListenerRef.current;
        const connectListener = connectListenerRef.current;
        const disconnectListener = disconnectListenerRef.current;

        if (connectListener) {
          current.off?.("connect", connectListener);
          current.removeListener?.("connect", connectListener);
        }
        if (disconnectListener) {
          current.off?.("disconnect", disconnectListener);
          current.removeListener?.("disconnect", disconnectListener);
        }
        if (chainChangedListener) {
          current.off?.("chainChanged", chainChangedListener);
          current.removeListener?.("chainChanged", chainChangedListener);
        }
        if (accountsChangedListener) {
          current.off?.("accountsChanged", accountsChangedListener);
          current.removeListener?.("accountsChanged", accountsChangedListener);
        }
      }

      chainChangedListenerRef.current = undefined;
      metaMaskProviderRef.current = undefined;
    };
  }, []);

  return {
    provider: _currentProvider,
    chainId,
    accounts,
    isConnected,
    error: eip6963Error,
    connect,
    disconnect,
  };
}

interface MetaMaskProviderProps {
  children: ReactNode;
}

const MetaMaskContext = createContext<UseMetaMaskState | undefined>(undefined);

export const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({
  children,
}) => {
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    error,
    connect,
    disconnect,
  } = useMetaMaskInternal();
  return (
    <MetaMaskContext.Provider
      value={{
        provider,
        chainId,
        accounts,
        isConnected,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  );
};

export function useMetaMask() {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error("useMetaMask must be used within a MetaMaskProvider");
  }
  return context;
}
