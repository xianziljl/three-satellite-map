import { toDegrees, toRadians } from './CoordUtil';

const TEMPV1 = { x: 0, y: 0 }, TEMPV2 = { x: 0, y: 0 };

export function expandLine(line: number[][], lineWidth: number) {
    let preAngle = 0;
    const radius = lineWidth / 2;
    const points: number[][] = [];
    // const leftPoints: number[][] = [];
    // const rightPoints: number[][] = [];
    const len = line.length;
    let i = 0;
    while (i < len - 1) {
        const p1 = line[i], p2 = line[i + 1];
        const dy = p2[1] - p1[1], dx = p2[0] - p1[0];
        let rAngle = 0;
        const rad = Math.atan(dy / dx);
        const angle = toDegrees(rad);
        preAngle = angle;
        if (i === 0) {
            rAngle = angle;
            rAngle -= 90;
        } else {
            const p0 = line[i - 1];
            TEMPV1.x = p0[0] - p1[0];
            TEMPV1.y = p0[1] - p1[1];
            TEMPV2.x = p2[0] - p1[0];
            TEMPV2.y = p2[1] - p1[1];
            const vAngle = getAngle(TEMPV1, TEMPV2);
            rAngle = angle - vAngle / 2;
        }
        const rRad = toRadians(rAngle);
        const [op1, op2] = calOffsetPoint(rRad, radius, p1);
        points.push(op1, op2);
        // if (leftOnLine(op1, p1, p2)) {
        //     leftPoints.push(op1);
        //     rightPoints.push(op2);
        // } else {
        //     leftPoints.push(op2);
        //     rightPoints.push(op1);
        // }
        i++;
    }
    let rAngle = preAngle;
    rAngle -= 90;
    const rRad = toRadians(rAngle);
    // const p1 = line[len - 2];
    const p2 = line[len - 1];
    const [op1, op2] = calOffsetPoint(rRad, radius, p2);
    points.push(op1, op2);
    // if (leftOnLine(op1, p1, p2)) {
    //     leftPoints.push(op1);
    //     rightPoints.push(op2);
    // } else {
    //     leftPoints.push(op2);
    //     rightPoints.push(op1);
    // }

    return points;
}

function calOffsetPoint(rad: number, radius: number, p: number[]) {
    const [x, y] = p;
    const z = p[2] || 0;
    const x1 = Math.cos(rad) * radius, y1 = Math.sin(rad) * radius;
    const p1 = [x + x1, y + y1, z];
    const rad1 = rad += Math.PI;
    const x2 = Math.cos(rad1) * radius, y2 = Math.sin(rad1) * radius;
    const p2 = [x + x2, y + y2, z];
    return [p1, p2];
}

const getAngle = ({ x: x1, y: y1 }, { x: x2, y: y2 }) => {
    const dot = x1 * x2 + y1 * y2;
    const det = x1 * y2 - y1 * x2;
    const angle = Math.atan2(det, dot) / Math.PI * 180;
    return (angle + 360) % 360;
};

function leftOnLine(p: number[], p1: number[], p2: number[]) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const [x, y] = p;
    return (y1 - y2) * x + (x2 - x1) * y + x1 * y2 - x2 * y1 > 0;
}