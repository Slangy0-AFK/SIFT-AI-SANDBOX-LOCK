export function entropyHexToBitString(entropyHex, bits) {
  if (!Number.isInteger(bits) || bits < 8 || bits > 8192 || bits % 8 !== 0) {
    throw new RangeError('Bits must be a multiple of 8 between 8 and 8192.');
  }
  if (
    typeof entropyHex !== 'string' ||
    entropyHex.length !== bits / 4 ||
    !/^[0-9a-f]+$/i.test(entropyHex)
  ) {
    throw new TypeError('Entropy must be exactly the requested number of hexadecimal bits.');
  }
  return BigInt(`0x${entropyHex}`).toString(2).padStart(bits, '0');
}
