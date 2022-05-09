/// <reference types="react-scripts" />

interface EthereumProviderRequestArguments {
  method: string;
  params?: unknown[] | object;
}

interface Ethereum {
  isMetaMask?: true;
  on?: (...args: any[]) => void;
  removeListener?: (...args: any[]) => void;
  request?: (args: EthereumProviderRequestArguments) => Promise<unknown>;
  isCoinbaseWallet?: boolean;
}

interface Window {
  ethereum?: Ethereum;
  web3?: Ethereum;
}

declare module 'content-hash' {
  declare function decode(x: string): string;
  declare function getCodec(x: string): string;
}

declare module 'multihashes' {
  declare function decode(buff: Uint8Array): { code: number; name: string; length: number; digest: Uint8Array };
  declare function toB58String(hash: Uint8Array): string;
}

declare module 'toformat';
