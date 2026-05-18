"use client";

import MidenNameService from "./miden-name-service-client";
import { Providers } from "./providers";

export default function MidenNameServiceApp() {
  return (
    <Providers>
      <MidenNameService />
    </Providers>
  );
}
