import {fvdecode} from "./fast-varint.js";

import {
  types,
  TAG_SIZE,
  TAG_MASK,
  STRING,
  BUFFER,
  INT,
  DOUBLE,
  OBJECT,
  ARRAY,
  BOOLNULL,
} from './constants.js'
import { decode } from './decode.js'
import {
  encode,
  encodeIdempotent,
  markIdempotent,
  isIdempotent,
  encodingLength,
  allocAndEncode,
  allocAndEncodeIdempotent,
  getEncodedLength,
  getEncodedType,
  getType,
} from './encode.js'
import {
  seekKey,
  seekKey2,
  seekKeyCached,
  createSeekPath,
  seekPath,
} from './seekers.js'
import { compareString, compare, createCompareAt } from './compare.js'

function slice(buffer, start) {
  const tagValue = fvdecode(buffer, start)
  const length = tagValue >> TAG_SIZE
  return buffer.slice(
    start + fvdecode.bytes,
    start + fvdecode.bytes + length
  )
}

function pluck(buffer, start) {
  const tagValue = fvdecode(buffer, start)
  const length = tagValue >> TAG_SIZE
  return buffer.slice(start, start + fvdecode.bytes + length)
}

function iterate(buffer, start, iter) {
  const tag = fvdecode(buffer, start)
  const len = tag >> TAG_SIZE
  const type = tag & TAG_MASK
  if (type === OBJECT) {
    for (let c = fvdecode.bytes; c < len; ) {
      const keyStart = start + c
      const keyTag = fvdecode(buffer, keyStart)
      c += fvdecode.bytes
      c += keyTag >> TAG_SIZE
      const valueStart = start + c
      const valueTag = fvdecode(buffer, valueStart)
      const nextStart = fvdecode.bytes + (valueTag >> TAG_SIZE)
      if (iter(buffer, valueStart, keyStart)) return start
      c += nextStart
    }
    return start
  } else if (type === ARRAY) {
    let i = 0
    for (let c = fvdecode.bytes; c < len; ) {
      if (iter(buffer, start + c, i++)) return start
      var valueTag = fvdecode(buffer, start + c)
      c += fvdecode.bytes + (valueTag >> TAG_SIZE)
    }
    return start
  } else return -1
}

export {
  encode,
  encodeIdempotent,
  markIdempotent,
  isIdempotent,
  decode,
  allocAndEncode,
  allocAndEncodeIdempotent,
  encodingLength,
  slice,
  pluck,
  getEncodedLength,
  getEncodedType,

  seekKey,
  seekKeyCached,
  seekKey2,
  createSeekPath,
  seekPath,

  compareString,
  compare,
  createCompareAt,

  iterate,

  types,
}

export const buffer = true
export const getValueType = getType()
