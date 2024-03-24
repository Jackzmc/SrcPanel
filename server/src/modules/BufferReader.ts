export default class BufferReader {
    #buffer: Buffer
    #offset: number
    #length = 0
  
    static *getBuffers(data: Buffer) {
        let reader = new BufferReader(data)
        yield reader
        while(reader.nextBuffer != null) {
            reader = new BufferReader(reader.nextBuffer)
            yield reader
        }
        return null
    }

    static new(size: number) {
        return new BufferReader(Buffer.alloc(size))
    }
  
    constructor(data: Buffer) {
      if(!data) throw new Error("buffer is null or undefined")	
      console.log(data.byteLength, data.length, data.toString('hex'))
      this.#buffer = data
      this.#offset = 0
      this.#length = data.byteLength
    }

    get buffer() {
        return this.#buffer.subarray()
    }
  
    get offset() {
      return this.#offset
    }
  
    get length() {
      return this.#length
    }
  
    get isEOF() {
      return this.#offset >= this.#length || this.#curChar == 0xa // new line
    }
  
    get IsRecordSeparator() {
      return this.#curChar === BufferReader.RecordSeparator
    }
  
    get #curChar() {
      return this.#buffer.at(this.#offset)
    }
  
    static get RecordSeparator() {
      return 0x1e
    }
  
    peekByte(): number {
      return this.#buffer.readInt8(this.#offset)
    }
  
    readByte(): number {
      const value = this.#buffer.readInt8(this.#offset)
      this.#offset += 1
      return value
    }
  
    readShort(): number {
      const value = this.#buffer.readInt16LE(this.#offset)
      this.#offset += 2
      return value
    }
  
    readInt(): number {
      const value = this.#buffer.readInt32LE(this.#offset)
      this.#offset += 4
      return value
    }
  
    readFloat(): number {
      const value = this.#buffer.readFloatLE(this.#offset)
      this.#offset += 4
      return value
    }
  
    readString(): string {
        let start = this.#offset
        // Read until null term
        while(this.#offset < this.#length) {
            if(this.#curChar === 0x0) {
                return this.#buffer.subarray(start, this.#offset++).toString()
            }
            this.#offset++
        }
        throw new Error("No null term found")
    }
  
    readVarString(): string {
      let length = this.readShort()
      const slice = this.#buffer.subarray(this.#offset, this.#offset + length)
      this.#offset += length
      return slice.toString().split("\0").shift();
    }
  
    *readRecord() {
      let recordStart: number = null
      while(!this.isEOF) {
        if(this.IsRecordSeparator) {
          if(recordStart != null) {
            // End of record
            yield this.#buffer.subarray(recordStart, this.#offset)
          }
          recordStart = this.#offset + 1
        }
        this.#offset++;
      }
      // Check to see that we have seen the \n(0xa) character at the end, otherwise this record got truncated:
      if(recordStart != null && this.#curChar == 0xa) {
        yield this.#buffer.subarray(recordStart, this.#offset)
      }
      return null
    }

    
    writeByte(value: number) {
        this.#buffer.writeInt8(value, this.#offset)
        this.#offset++
    }
  
    writeShort(value: number) {
        this.#buffer.writeInt16LE(value, this.#offset)
        this.#offset += 2
    }   
  
    writeInt(value: number) {
        this.#buffer.writeInt32LE(value, this.#offset)
        this.#offset += 4
    }

    writeFloat(value: number) {
        this.#buffer.writeFloatLE(value, this.#offset)
        this.#offset += 4
    }

    writeString(value: string) {
        this.#buffer.write(value + "\0", this.#offset, "ascii")
        this.#offset += value.length + 1
    }
  
    get nextBuffer() {
      if(this.#curChar == 0xa && this.#offset + 1 < this.#buffer.length) {
        return this.#buffer.subarray(this.#offset + 1)
      } else {
        return null
      }
    }
  
    at(i: number): number {
      return this.#buffer.at(i)
    }
  
    next(): number | null {
      if(this.#offset == this.#length) return null
      return this.readByte()
    }
}