import { AbortableFetch, GeometryWorkerPostMessage } from '../../utils/interfaces';
import { tileToLat, tileToLon, wgs84ToUTM } from '../../utils/utils';

const size = 256;

const requests = new Map<string, AbortableFetch>([]); // {uid, Fetch}
const postQueue: { uid: string, position: Float32Array; }[] = [];
// const canvas = new OffscreenCanvas(size, size);
// const ctx = canvas.getContext('2d');


const post = () => {
    if (postQueue.length) {
        const data = postQueue[0];
        // @ts-ignore
        self.postMessage(data, [data.position.buffer]);
        postQueue.shift();
    }
    setTimeout(post, 16.7);
};

post();

self.onmessage = async (e: MessageEvent<GeometryWorkerPostMessage>) => {
    const { id, uid, url, level, row, col, zone, offset } = e.data;

    try {
        if (!url) {
            const req = requests.get(uid);
            if (req) req.abort();
            requests.delete(uid);
            postQueue.forEach((item, i) => {
                if (item.uid == uid) postQueue.splice(i, 1);
            })
            return;
        }

        // const request = abortableFetch(url);
        // requests.set(uid, request);
        // const res = await request.ready();
        // const blob = await res.blob();
        // const bitmap = await createImageBitmap(blob);
        
        // if (!ctx) throw new Error('Can not get canvas context.');

        // ctx.drawImage(bitmap, 0, 0, size, size);
        // const imgData = ctx.getImageData(0, 0, size, size).data;
        // const values = new Float64Array(size * size);
        // for (let i = 0; i < values.length; i++) {
        //     const r = imgData[4 * i];
        //     const g = imgData[4 * i + 1];
        //     const b = imgData[4 * i + 2];
        //     values[i] = Math.round(((r * 256 * 256 + g * 256.0 + b) / 10.0 - 10000.0) * 10) / 10;
        // }
        // const delatin = new Delatin(values, size, size);
        // delatin.run(1000);

        // const { triangles, coords  } = delatin;

        // console.log(coords, triangles);

        
    
        const topLeftLon = tileToLon(col, level);
        const topLeftLat = tileToLat(row, level);
        const bottomRightLon = tileToLon(col + 1, level);
        const bottomRightLat = tileToLat(row + 1, level);
    
        const topLeftPosition = wgs84ToUTM({ x: topLeftLon, y: topLeftLat }, zone, offset);
        const topRightPosition = wgs84ToUTM({ x: bottomRightLon, y: topLeftLat }, zone, offset);
    
        const bottomLeftPosition = wgs84ToUTM({ x: topLeftLon, y: bottomRightLat }, zone, offset);
        const bottomRightPosition = wgs84ToUTM({ x: bottomRightLon, y: bottomRightLat }, zone, offset);
    
        const position = new Float32Array(8);
    
        position[0] = topLeftPosition.x;
        position[1] = topLeftPosition.y;
        position[2] = topRightPosition.x;
        position[3] = topRightPosition.y;
        position[4] = bottomLeftPosition.x;
        position[5] = bottomLeftPosition.y;
        position[6] = bottomRightPosition.x;
        position[7] = bottomRightPosition.y;
    
        postQueue.push({ uid, position });
    } catch (e) {
        console.log(e);
    }
};


