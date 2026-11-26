export type WifiSettings = {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
  hidden: boolean;
};

function escapeField(value: string) {
  return value.replace(/[\\;,:"]/g, "\\$&");
}

export function wifiQrPayload({ ssid, password, security, hidden }: WifiSettings) {
  const key = security === "nopass" ? "" : `P:${escapeField(password)};`;
  return `WIFI:T:${security};S:${escapeField(ssid)};${key}H:${hidden};;`;
}
