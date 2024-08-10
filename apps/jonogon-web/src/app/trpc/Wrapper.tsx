import {type PropsWithChildren, useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {createWSClient, httpBatchLink, splitLink, wsLink} from '@trpc/client';
import {trpc} from './index.mjs';
import {useTokenManager} from '../auth/token-manager.tsx';
import {scope} from 'scope-utilities';

export function TRPCWrapper(props: PropsWithChildren<{hostname: string}>) {
    const {get: getToken} = useTokenManager();

    const [queryClient] = useState(() => new QueryClient());

    const [wsClient] = useState(() =>
        createWSClient({
            url: import.meta.env.DEV
                ? `ws://${props.hostname}:12001/ws`
                : 'wss://core.jonogon.org/ws',
        }),
    );

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                splitLink({
                    condition(op) {
                        return op.type === 'subscription';
                    },
                    true: wsLink({
                        client: wsClient,
                    }),
                    false: httpBatchLink({
                        url: import.meta.env.DEV
                            ? `http://${props.hostname}:12001/trpc`
                            : 'https://core.jonogon.org/trpc',
                        headers: async () => {
                            return scope(await getToken()).let((token) =>
                                token ? {Authorization: `Bearer ${token}`} : {},
                            );
                        },
                    }),
                }),
            ],
        }),
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {props.children}
            </QueryClientProvider>
        </trpc.Provider>
    );
}