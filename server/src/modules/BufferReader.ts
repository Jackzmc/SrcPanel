export default class BufferReader {
  #buffer: Buffer;
  #offset: number;
  #length = 0;

  public parent?: Buffer;

  static new(size: number) {
    return new BufferReader(Buffer.alloc(size));
  }

  static from(data: Buffer, parent?: Buffer) {
    return new BufferReader(data, parent);
  }

  constructor(data: Buffer, parent?: Buffer) {
    if (!data) throw new Error("buffer is null or undefined");
    // console.log(data.byteLength, data.length, data.toString('hex'))
    this.#buffer = data;
    this.#offset = 0;
    this.#length = data.byteLength;
    this.parent = parent;
  }

  get buffer() {
    return this.#buffer.subarray();
  }

  get offset() {
    return this.#offset;
  }

  get length() {
    return this.#length;
  }

  get isEOF() {
    return this.#offset >= this.#length || this.#curChar == 0xa; // new line
  }

  get IsRecordSeparator() {
    return this.#curChar === BufferReader.RecordSeparator;
  }

  get #curChar() {
    return this.#buffer.at(this.#offset);
  }

  static get RecordSeparator() {
    return 0x1e;
  }

  /** Look at a byte but do not advance the offset */
  peakByte(offset: number): number {
    return this.#buffer.readInt8(offset ?? this.#offset);
  }
  
  readByte(): number {
    const value = this.#buffer.readInt8(this.#offset);
    this.#offset += 1;
    return value;
  }

  readShort(): number {
    const value = this.#buffer.readInt16LE(this.#offset);
    this.#offset += 2;
    return value;
  }

  readInt(): number {
    const value = this.#buffer.readInt32LE(this.#offset);
    this.#offset += 4;
    return value;
  }

  readFloat(): number {
    const value = this.#buffer.readFloatLE(this.#offset);
    this.#offset += 4;
    return value;
  }

  readString(): string {
    const start = this.#offset;
    // Read until null term
    while (this.#offset < this.#length) {
      if (this.#curChar === 0x0) {
        return this.#buffer.subarray(start, this.#offset++).toString();
      }
      this.#offset++;
    }
    throw new Error("No null term found");
  }

  /// Yields a BufferReader for every record in a packet
  *readRecords() {
    while (this.#offset < this.#length - 1) {
      const length = this.readShort();
      if (length <= 0) {
        console.debug(
          "discarding entire packet, bad record length\n",
          "0x" + this.#buffer.toString("hex"),
        );
        return null;
      }
      const endRecordOffset = this.#offset + length;
      // console.log(`record len=${length} type=${this.peakByte(this.#offset)} bounds=[${this.#offset}, ${endRecord}]`, this.#buffer.subarray(this.#offset, endRecord).toString('hex'), '\nfull:' + this.#buffer.toString('hex'))
      yield new BufferReader(
        this.#buffer.subarray(this.#offset, endRecordOffset),
        this.#buffer,
      );
      // records are separated by 0x1e or 0x0a (concatted), so skip +1
      this.#offset = endRecordOffset + 1;
    }
    return null;
  }

  #expand(increment?: number) {
    if (!increment) increment = 2 * this.buffer.length;
    if (increment == 0) increment = 4; // Start with int size
    const newBuffer = Buffer.alloc(this.#length + increment);
    this.buffer.copy(newBuffer, 0, 0, this.buffer.length);
    this.#buffer = newBuffer;
    this.#length = newBuffer.length;
  }

  writeByte(value: number) {
    if (this.#offset + 1 > this.#length) this.#expand();
    this.#buffer.writeInt8(value, this.#offset);
    this.#offset++;
    return this;
  }

  writeShort(value: number) {
    if (this.#offset + 2 > this.#length) this.#expand();
    this.#buffer.writeInt16LE(value, this.#offset);
    this.#offset += 2;
    return this;
  }

  writeInt(value: number) {
    if (this.#offset + 4 > this.#length) this.#expand();
    this.#buffer.writeInt32LE(value, this.#offset);
    this.#offset += 4;
    return this;
  }

  writeFloat(value: number) {
    if (this.#offset + 4 > this.#length) this.#expand();
    this.#buffer.writeFloatLE(value, this.#offset);
    this.#offset += 4;
    return this;
  }

  writeString(value: string) {
    if (this.#offset + value.length + 1 >= this.#length)
      this.#expand(value.length + 1);
    if (value == undefined) value = "";
    this.#buffer.write(value + "\0", this.#offset, "ascii");
    this.#offset += value.length + 1;
    return this;
  }

  at(i: number): number | undefined {
    return this.#buffer.at(i);
  }
}
