import { GeometryWorkerPostMessage } from '../../utils/interfaces';
import { tileToLat, tileToLon, wgs84ToUTM } from '../../utils/utils';

const postQueue: { uid: string, position: Float32Array; }[] = [];

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

self.onmessage = (e: MessageEvent<GeometryWorkerPostMessage>) => {
    const { id, uid, url, level, row, col, zone, offset } = e.data;

    if (!level) {
        postQueue.forEach((item, i) => {
            if (item.uid == uid) postQueue.splice(i, 1);
        })
        return;
    }

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
};


