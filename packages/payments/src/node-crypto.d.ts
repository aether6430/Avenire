declare module "node:crypto" {
  export interface HmacLike {
    digest(encoding: "base64"): string;
    update(data: string): HmacLike;
  }

  export function createHmac(algorithm: string, key: string): HmacLike;
  export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}

declare const Buffer: {
  from(input: string): Uint8Array & { length: number };
};
