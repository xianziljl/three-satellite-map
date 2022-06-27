import { AbortableFetch, TextureWorkerPostMessage } from '../../utils/interfaces';
import { abortableFetch } from '../../utils/utils';


const requests = new Map<string, AbortableFetch>([]); // {uid, Fetch}
const canvasMap = new Map<number, OffscreenCanvas>([]);
const postQueue: string[] = []; // [uid]

const post = () => {
    if (postQueue.length) {
        const uid = postQueue[0];
        self.postMessage({ uid });
        postQueue.shift();
    }
    setTimeout(post, 16);
};

post();

self.onmessage = async (e: MessageEvent<TextureWorkerPostMessage>) => {
    const { id, uid, url, canvas, texts } = e.data;
    try {

        // 取消操作
        if (!url) {
            const req = requests.get(uid);
            if (req) req.abort();
            requests.delete(uid);
            postQueue.forEach((qid, i) => {
                if (qid == uid) postQueue.splice(i, 1);
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

        const cxt = currentCanvas.getContext('2d');
        if (cxt) {
            const { width, height } = currentCanvas;
            cxt.drawImage(bitmap, 0, 0, width, height);

            if (texts != null) {
                cxt.strokeStyle = '#00ffff';
                cxt.strokeRect(0, 0, width, height);

                cxt.fillStyle = '#00ffff';
                cxt.font = 'bold 20px arial';
                texts.forEach((text, i) => {
                    cxt.fillText(text, 10, (i + 1) * 20);
                });
            }
        }
        postQueue.push(uid);
        requests.delete(uid);
    } catch (e) {
        requests.delete(uid);
        console.error(e);
    }
};