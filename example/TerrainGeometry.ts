import { BufferGeometry, BufferAttribute, Vector2 } from 'three';
const vertexMaxPosition = 32767;
class TerrainGeometry extends BufferGeometry {
    constructor(quantizedMeshData) {
        super();
        this.setQuantizedMeshData(quantizedMeshData);
    }

    public setQuantizedMeshData(quantizedMeshData) {
        this.updatePositionsAttribute(quantizedMeshData);
        this.updateIndex(quantizedMeshData.triangleIndices);
        this.updateUvAttribute(quantizedMeshData.vertexData);
        this.updateVertexNormalsAttribute(quantizedMeshData.extensions?.vertexNormals);
    }

    private updatePositionsAttribute(quantizedMeshData) {
        const {maxHeight, minHeight} = quantizedMeshData.header;
        console.log(maxHeight, minHeight);
        const vertexData = quantizedMeshData.vertexData as ArrayLike<number>;
        const elementsPerVertex = 3;
        const vertexCount = vertexData.length / elementsPerVertex;
        const positionAttributeArray = new Float32Array(vertexData.length);
        for (let i = 0; i < vertexCount; i++) {
            positionAttributeArray[i * elementsPerVertex + 0] = vertexData[i];
            positionAttributeArray[i * elementsPerVertex + 1] = vertexData[i + vertexCount];
            positionAttributeArray[i * elementsPerVertex + 2] =
                vertexData[i + vertexCount * 2]; // / vertexMaxPosition * (maxHeight - minHeight) + minHeight;
        }
        this.setAttribute('position', new BufferAttribute(positionAttributeArray, elementsPerVertex));
        this.computeBoundingSphere();
        this.attributes.position.needsUpdate = true;
    }

    private updateVertexNormalsAttribute(vertexNormals?: ArrayLike<number>) {
        if (!vertexNormals) {
            return;
        }
        this.computeVertexNormals();
    }

    private updateUvAttribute(vertexData: ArrayLike<number>) {
        const containerSize = new Vector2();
        const elementsPerVertex = 3;
        const elementsPerUv = 2;
        const uvArray = new Float32Array(vertexData.length / elementsPerVertex * elementsPerUv);

        for (let i = 0, uvIndex = 0; i < vertexData.length; i++) {
            switch (i % 3) {
                case 0: {
                    uvArray[uvIndex] = (vertexData[i] + containerSize.x / 2) / containerSize.x;
                    uvIndex++;
                    break;
                }
                case 1: {
                    uvArray[uvIndex] = (vertexData[i] + containerSize.y / 2) / containerSize.y;
                    uvIndex++;
                }
            }
        }
        this.setAttribute('uv', new BufferAttribute(uvArray, elementsPerUv));
    }

    private updateIndex(triangleIndices: ArrayLike<number>) {
        this.setIndex(new BufferAttribute(triangleIndices, 1));
    }

}

export { TerrainGeometry };