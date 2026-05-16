interface PasskeyOriginInput {
  hostname: string;
  protocol: string;
}

export function isPasskeyOriginSupported(input: PasskeyOriginInput) {
  const protocol = input.protocol.toLowerCase();
  const hostname = input.hostname.toLowerCase();

  if (protocol === "https:") {
    return true;
  }

  return hostname === "localhost" || hostname.endsWith(".localhost");
}
