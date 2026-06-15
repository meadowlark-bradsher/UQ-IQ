import { createContext, useContext, type ReactNode } from 'react';
import type { DataProvider } from './provider';
import { StaticJsonProvider } from './staticProvider';

// Widgets reach data through this context — never by importing a provider
// directly. To swap in a PyodideProvider/ApiProvider later, change only the
// default here (or the value passed at the root). Nothing in the widgets changes.
const defaultProvider: DataProvider = new StaticJsonProvider();

const DataProviderContext = createContext<DataProvider>(defaultProvider);

export function DataProviderProvider({
  provider = defaultProvider,
  children,
}: {
  provider?: DataProvider;
  children: ReactNode;
}) {
  return (
    <DataProviderContext.Provider value={provider}>{children}</DataProviderContext.Provider>
  );
}

export function useDataProvider(): DataProvider {
  return useContext(DataProviderContext);
}
