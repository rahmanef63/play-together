export interface GltfBufferView {
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
}
export interface GltfAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
}
export interface AccessorJson {
  bufferViews?: GltfBufferView[];
  accessors?: GltfAccessor[];
}
export function readAccessor(json: AccessorJson, bin: ArrayBuffer, index: number | undefined) {
  if (index === undefined) return null;
  const accessor = json.accessors?.[index],
    bufferView =
      accessor?.bufferView === undefined ? undefined : json.bufferViews?.[accessor.bufferView];
  if (!accessor || !bufferView) return null;
  const size = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[accessor.type];
  if (!size) throw new Error(`Unsupported accessor type ${accessor.type}`);
  const constructors = {
      5121: Uint8Array,
      5123: Uint16Array,
      5125: Uint32Array,
      5126: Float32Array,
    } as const,
    Constructor = constructors[accessor.componentType as keyof typeof constructors];
  if (!Constructor) throw new Error(`Unsupported component type ${accessor.componentType}`);
  const bytesPer = Constructor.BYTES_PER_ELEMENT,
    start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0),
    stride = bufferView.byteStride ?? size * bytesPer;
  if (stride === size * bytesPer)
    return { size, values: new Constructor(bin, start, accessor.count * size) };
  const values = new Constructor(accessor.count * size),
    source = new DataView(bin),
    readers = {
      5121: "getUint8",
      5123: "getUint16",
      5125: "getUint32",
      5126: "getFloat32",
    } as const,
    method = readers[accessor.componentType as keyof typeof readers];
  for (let row = 0; row < accessor.count; row++)
    for (let col = 0; col < size; col++)
      (values as any)[row * size + col] = (source as any)[method](
        start + row * stride + col * bytesPer,
        true,
      );
  return { size, values };
}
