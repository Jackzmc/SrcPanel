import { test, describe, before, type TestContext, beforeEach, after } from "node:test";
import BufferReader from "../src/modules/BufferReader.js";
import Crypto from 'node:crypto'

describe("BufferReader", () => {

    test("reads bytes in order", (t: TestContext) => {
        // Add dummy data
        const buffer = Buffer.from([ 0x0, 0x1, 0x2 ])
        const reader = new BufferReader(buffer)
        
        t.assert.equal(reader.readByte(), 0, "read byte at offset 0")
        t.assert.equal(reader.readByte(), 1, "read byte at offset 1")
        t.assert.equal(reader.readByte(), 2, "read byte at offset 2")
        t.assert.equal(reader.isEOF, true, "at EOF")
    })

    test("reads units correctly in little endian", (t: TestContext) => {
        // Add dummy data
        const buffer = Buffer.from([ 
            0x0, 
            0x2, 0x0, 
            0x8, 0x0, 0x0, 0x0
        ])
        const reader = new BufferReader(buffer)
        
        t.assert.equal(reader.readByte(), 0, "read byte")
        t.assert.equal(reader.offset, 1)
        t.assert.equal(reader.readShort(), 2, "read short")
        t.assert.equal(reader.offset, 1 + 2)
        t.assert.equal(reader.readInt(), 8, "read integer")
        t.assert.equal(reader.offset, 1 + 2 + 4)
        t.assert.ok(reader.isEOF, "at EOF")
    })

    test("echos back writes correctly", (t: TestContext) => {
        const byte = Crypto.randomBytes(1).readInt8()
        const short = Crypto.randomBytes(2).readInt16LE()
        const int = Crypto.randomBytes(4).readInt32LE()
        const float = Crypto.randomBytes(4).readFloatLE()

        const writer = BufferReader.new(1 + 2 + 4 + 4)
        writer.writeByte(byte)
        writer.writeShort(short)
        writer.writeInt(int)
        writer.writeFloat(float)

        console.log('writer', { length: writer.length, offset: writer.offset })

        const reader = new BufferReader(writer.buffer)

        console.log('reader', { length: reader.length, offset: reader.offset })

        t.assert.equal(writer.offset, reader.length, "reader length matches writers offset")
        t.assert.equal(reader.readByte(), byte, "byte ok")
        t.assert.equal(reader.readShort(), short, "short ok")
        t.assert.equal(reader.readInt(), int, "int ok")
        t.assert.equal(reader.readFloat(), float, "float ok")
        t.assert.ok(reader.isEOF, "at EOF")
    })

    test("buffer auto expands", (t: TestContext) => {
        const writer = BufferReader.new(0)

        t.assert.equal(writer.length, 0, "length at 0")
        writer.writeInt(500)
        t.assert.equal(writer.length, 4, "length at 4")

        t.assert.equal(writer.buffer.length, writer.length, "internal buffer length matches")
    })

    test("echos back strings with proper length", (t: TestContext) => {
        const str = Crypto.randomUUID()

        const writer = BufferReader.new(32)
        writer.writeString(str)

        t.assert.equal(writer.offset, str.length + 1, "proper null terminated length")

        const reader = new BufferReader(writer.buffer)

        t.assert.equal(reader.readString(), str, "read string matches")
        t.assert.equal(reader.offset, writer.offset, "same offsets")
    })

    test("reads records correctly", (t: TestContext) => {
        const buf = Buffer.from([
            0x4, 0x0, // record size (short)
            0xA, 0x0, 0x0, 0x0, // dummy data (match sizae)
            BufferReader.RecordSeparator // end symbol
        ])

        const reader = new BufferReader(buf)
        const gen = reader.readRecords()
        
        const recordReader = gen.next().value
        t.assert.ok(recordReader, "got a record")
        t.assert.equal(recordReader.length, 4, "record length of 4")
        t.assert.equal(recordReader.readInt(), 0xA, "reads integer")
        t.assert.ok(recordReader.isEOF, "at EOF")
    })

    test("reads dynamic records correctly", (t: TestContext) => {
        const size = getRandomInt(4, 16) // smaller size so its easier to diagnose
        const data = Crypto.randomBytes(size)

        const buf = generateRecord(data)

        t.assert.equal(buf.length, 2 + size + 1, "parent buffer size correct")
        console.log(`data size=${size}`, data)
        console.log(`full size=${buf.length}`, buf)

        const reader = new BufferReader(buf)
        const gen = reader.readRecords()
        
        const recordReader = gen.next().value
        t.assert.ok(recordReader, "got a record")
        console.log(`record size=${recordReader.length}`, recordReader.buffer)
        t.assert.equal(recordReader.length, size, "record length matches")
        t.assert.equal(recordReader.buffer.toString('hex'), data.toString('hex'), "data matches")
    })

    test("reads multiple dynamic records correctly", (t: TestContext) => {
        const numRecords = getRandomInt(2, 6)

        const buffers: { size: number, data: Buffer, record: Buffer }[] = []

        for(let i = 0; i < numRecords; i++) {
            const size = getRandomInt(4, 16) // smaller size so its easier to diagnose
            const data = Crypto.randomBytes(size)
            const record = generateRecord(data)

            buffers.push({ size, data, record })
        }

        const buf = Buffer.concat(buffers.map(b => b.record))

        const parentReader = new BufferReader(buf)
        for(const reader of parentReader.readRecords()) {
            const target = buffers.shift()
            t.assert.ok(target, "has target")
            t.assert.equal(reader.length, target.size, "data size matches")
            t.assert.equal(reader.buffer.toString('hex'), target.data.toString('hex'), "data matches")
        }

        t.assert.ok(parentReader.isEOF, "at eof")
    })
})

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function generateRecord(data: Buffer): Buffer {
    const sizeBuf = Buffer.alloc(2)
    sizeBuf.writeInt16LE(data.length)

    return Buffer.concat([
        sizeBuf,  // record size (short)
        data,  // record data 
        Buffer.alloc(1, BufferReader.RecordSeparator) // end signal (byte) - this is just for humans
    ])
}
