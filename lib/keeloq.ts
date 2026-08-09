/**
 * Porta 1:1 do algoritmo de geracao de codigo do ECU Option Generator (VB6).
 *
 * Fontes originais:
 * - Main.frm (CRC_Calc, CheckSum_Calc, montagem da string e packing de 32 bits)
 * - Encrypter/main.c (KeeLoq_Encrypt, 528 rounds, chave mestra fixa)
 *
 * Qualquer alteracao aqui invalida os codigos gerados para ECUs ja em campo -
 * ver testes de regressao em keeloq.test.ts antes de mexer.
 */

const KEELOQ_NLF = 0x3a5c742e;
const KEELOQ_ROUNDS = 528;

function bit(x: number, n: number): number {
  return (x >>> n) & 1;
}

function g5(x: number, a: number, b: number, c: number, d: number, e: number): number {
  return bit(x, a) + bit(x, b) * 2 + bit(x, c) * 4 + bit(x, d) * 8 + bit(x, e) * 16;
}

function bit64(keyHi: number, keyLo: number, bitnum: number): number {
  if (bitnum < 32) return bit(keyHi, bitnum);
  return bit(keyLo, bitnum - 32);
}

/** KeeLoq_Encrypt do Encrypter/main.c, bit a bit idêntico. */
export function keeloqEncrypt(data: number, keyHi: number, keyLo: number): number {
  let x = data >>> 0;
  for (let r = 0; r < KEELOQ_ROUNDS; r++) {
    const feedback =
      bit(x, 0) ^
      bit(x, 16) ^
      bit64(keyHi, keyLo, r & 63) ^
      bit(KEELOQ_NLF, g5(x, 1, 9, 20, 26, 31));
    x = ((x >>> 1) ^ (feedback << 31)) >>> 0;
  }
  return x >>> 0;
}

function stringToBytes(s: string): number[] {
  return Array.from(s).map((ch) => ch.charCodeAt(0) & 0xff);
}

/** CRC_Calc de Main.frm, traduzido linha a linha (CRC-16, semente 0). */
export function crc16(input: string): number {
  let crc = 0;
  for (const data of stringToBytes(input)) {
    crc = Math.floor(crc / 256) + (crc % 256) * 256;
    crc = crc % 65536;
    crc = crc ^ data;
    crc = crc ^ Math.floor((crc % 256) / 16);
    crc = crc ^ (((crc % 256) * 256) * 16);
    crc = crc % 65536;
    crc = crc ^ (Math.floor(crc % 256) * 16 * 2);
    crc = crc % 65536;
  }
  return crc;
}

/** CheckSum_Calc de Main.frm: soma de bytes mod 65536. */
export function checksum16(input: string): number {
  let chk = 0;
  for (const data of stringToBytes(input)) {
    chk = (chk + data) % 65536;
  }
  return chk;
}

function hex4(n: number): string {
  return n.toString(16).toUpperCase().padStart(4, '0');
}

export interface GenerateCodeParams {
  /** Codigo do modelo, deve ter exatamente 11 caracteres (ex: "800.1004.02"). */
  model11: string;
  /** Número de serie, deve ter exatamente 15 caracteres. */
  serial15: string;
  /** Número da feature (FNumber), 1-based, igual ao indice original na combo "Feature". */
  featureNumber: number;
  keyHi: number;
  keyLo: number;
}

/**
 * Reproduz GenerateCodeFeature de Main.frm: monta "Model SN\0", calcula
 * CRC16 + checksum de 8 bits, empacota em 32 bits com o FNumber, cifra com
 * KeeLoq e formata como "XXXX-XXXX".
 */
export function generateAuthCode(params: GenerateCodeParams): string {
  const { model11, serial15, featureNumber, keyHi, keyLo } = params;
  if (model11.length !== 11) {
    throw new Error('model11 deve ter exatamente 11 caracteres');
  }
  if (serial15.length !== 15) {
    throw new Error('serial15 deve ter exatamente 15 caracteres');
  }

  const baseModelSN = `${model11} ${serial15}\0`;
  const crc = crc16(baseModelSN);
  const chk8 = checksum16(baseModelSN) % 256;
  const preCode = featureNumber * 16777216 + chk8 * 65536 + crc;

  const cipher = keeloqEncrypt(preCode, keyHi, keyLo);
  const codeH = Math.floor(cipher / 65536);
  const codeL = cipher - codeH * 65536;
  return `${hex4(codeH)}-${hex4(codeL)}`;
}
