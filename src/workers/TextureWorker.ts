import { AbortableFetch, TextureWorkerPostMessage } from '../utils/interfaces';

function abortableFetch(url: string, init: RequestInit = {}): AbortableFetch {
    const controller = new AbortController();
    const { signal } = controller;

    return {
        abort: () => controller.abort(),
        ready: () => fetch(url, { ...init, signal, cache: 'force-cache' })
    };
}

const requests = new Map<string, AbortableFetch>([]); // {uid, Fetch}


self.onmessage = async (e: MessageEvent<TextureWorkerPostMessage>) => {
    const { uid, url } = e.data;
    try {
        // 取消操作
        if (!url) {
            const req = requests.get(uid);
            if (req) req.abort();
            requests.delete(uid);
            return;
        }

        const request = abortableFetch(url);
        requests.set(uid, request);
        const res = await request.ready();
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob);

        // @ts-ignore
        self.postMessage({ type: 'texture', uid, bitmap }, [bitmap]);
    } catch (e) {
        console.log('Texture worker error: ' + e);
    } finally {
        requests.delete(uid);
    }
};
