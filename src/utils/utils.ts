import proj4 from 'proj4';
import { Vector3 } from 'three';
import { AbortableFetch, Coordinate } from './interfaces';


// proj4.defs('EPSG:4326', );
export const WGS84 = '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees';
// 地球半径
export const EARTH_RADIUS = 6378137;
// 地球周长
export const EARTH_PERIMETER = 2 * Math.PI * EARTH_RADIUS;
// 周长一半
export const EARTH_ORIGIN = EARTH_PERIMETER / 2.0;


export function lonToTile(lon: number, level: number) {
    return (Math.floor((lon + 180) / 360 * Math.pow(2, level)));
}
export function latToTile(lat: number, level: number) {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180)
        + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, level)));
}

export function tileToLon(col: number, level: number) {
    return (col / Math.pow(2, level) * 360 - 180);
}
export function tileToLat(row: number, level: number) {
    const n = Math.PI - 2 * Math.PI * row / Math.pow(2, level);
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

export function wgs84ToUTM(coord: Coordinate, zone: number, offset?: Coordinate): Coordinate {
    const utm = `+proj=utm +zone= ${zone} +ellps=WGS84 +datum=WGS84 +units=m +no_defs `;
    const res = proj4(WGS84, utm).forward(coord);
    if (offset) {
        res.x -= offset.x;
        res.y -= offset.y;
    }
    return res;
}

export function bitchWgs84ToUTM(coords: Coordinate[], zone: number, offset = { x: 0, y: 0 }): Coordinate[] {
    const utm = `+proj=utm +zone= ${zone} +ellps=WGS84 +datum=WGS84 +units=m +no_defs `;
    const proj = proj4(WGS84, utm);
    return coords.map(coord => {
        const item = proj.forward(coord);
        item.x -= offset.x;
        item.y -= offset.y;
        return item;
    })
}

export function abortableFetch(url: string, init: RequestInit = {}): AbortableFetch {
    const controller = new AbortController();
    const { signal } = controller;

    return {
        abort: () => controller.abort(),
        ready: () => fetch(url, { ...init, signal, cache: 'force-cache' })
    };
}

export function getUpAxis(up: Vector3): 'x' | 'y' | 'z' {
    let upAxis: 'x' | 'y' | 'z' = 'y';
    if (up.x === 1) upAxis = 'x';
    if (up.z === 1) upAxis = 'z';
    return upAxis;
}


