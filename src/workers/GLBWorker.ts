import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
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
const postQueue: string[] = []; // [uid]

new GLTFLoader();


self.onmessage = async (e: MessageEvent<TextureWorkerPostMessage>) => {
    const { id, uid, url, texts } = e.data;
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
        // TODO: load glb.
       
        postQueue.push(uid);
    } finally {
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