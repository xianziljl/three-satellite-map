import { AbortableFetch, TextureWorkerPostMessage } from '../utils/interfaces';

function abortableFetch(url: string, init: RequestInit = {}): AbortableFetch {
    const controller = new AbortController();
    const { signal } = controller;

    return {
        abort: () => controller.abort(),
        ready: () => fetch(url, { ...init, signal })
    };
}

const requests = new Map<string, AbortableFetch>([]); // {uid, Fetch}
const canvasMap = new Map<number, OffscreenCanvas>([]);
const postQueue: string[] = []; // [uid]


self.onmessage = async (e: MessageEvent<TextureWorkerPostMessage>) => {
    const { id, uid, url, canvas, texts } = e.data;
    try {
        // 取消操作
        if (!url) {
            const req = requests.get(uid);
            if (req) req.abort();
            requests.delete(uid);
            postQueue.forEach((qid, i) => {
                if (qid === uid) postQueue.splice(i, 1);
            });
            return;
        }

        let currentCanvas: OffscreenCanvas | undefined;
        if (canvas) {
            currentCanvas = canvas;
            canvasMap.set(id, canvas);
        } else {
            currentCanvas = canvasMap.get(id);
        }

        if (!currentCanvas) return;

        const request = abortableFetch(url);
        requests.set(uid, request);
        const res = await request.ready();
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob);

        const ctx = currentCanvas.getContext('2d');

        if (!ctx) throw new Error('Can not get canvas context.');

        const { width, height } = currentCanvas;
        ctx.drawImage(bitmap, 0, 0, width, height);

        if (texts != null) {
            ctx.strokeStyle = '#00ffff';
            ctx.strokeRect(0, 0, width, height);

            ctx.fillStyle = '#00ffff';
            ctx.font = 'bold 20px arial';
            texts.forEach((text, i) => {
                ctx.fillText(text, 10, (i + 1) * 20);
            });
        }
        postQueue.push(uid);
        requests.delete(uid);
    } catch (e) {
        requests.delete(uid);
    }
};


const post = () => {
    if (postQueue.length) {
        const uid = postQueue[0];
        self.postMessage({ uid });
        postQueue.shift();
    }
    requestAnimationFrame(post);
};

post();