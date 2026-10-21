import { createContext } from 'react';
// Optional read diagnostics for the visual canvas; ordinary public pages use a no-op.
export const PublicDataStatusContext = createContext(() => {});
