import { describe, expect, it } from 'vitest';
import { crc16, generateAuthCode, keeloqEncrypt } from './keeloq';

const MASTERKEY_HI = 0x3a5b8c07;
const MASTERKEY_LO = 0xfd13cd0a;

describe('crc16', () => {
  it('bate com o vetor de teste padrao do CRC-16/XMODEM ("123456789" -> 0x31C3)', () => {
    // Mesmo vetor citado no comentario de Encrypter_Full/main.c como validacao do CRC_Calc original.
    expect(crc16('123456789')).toBe(0x31c3);
  });
});

describe('keeloqEncrypt', () => {
  // Vetores gerados rodando o Output/Encrypter.exe legado (build de producao,
  // hash c7de4875d464a8ea867850af190cba85) com a MASTERKEY real: `Encrypter.exe <preCode>`.
  const vectors: Array<[number, number]> = [
    [0, 6549263],
    [1, 3887892941],
    [12345, 2181185111],
    [305419896, 4124948853],
    [4294967295, 1852261590],
    [16777216, 1809975017],
    [2882400001, 2822157780],
  ];

  it.each(vectors)('KeeLoq_Encrypt(%i) == %i (saida real do Encrypter.exe)', (input, expected) => {
    expect(keeloqEncrypt(input, MASTERKEY_HI, MASTERKEY_LO)).toBe(expected);
  });
});

describe('generateAuthCode', () => {
  it('reproduz um codigo de ponta a ponta gerado pelo app VB6/Encrypter.exe legado', () => {
    // Modelo "800.1004.02", serial "201302141332000", feature 5 (Boost Control).
    // preCode = 86100230, cipher (Encrypter.exe) = 1553451674 -> "5C97-CA9A".
    const code = generateAuthCode({
      model11: '800.1004.02',
      serial15: '201302141332000',
      featureNumber: 5,
      keyHi: MASTERKEY_HI,
      keyLo: MASTERKEY_LO,
    });
    expect(code).toBe('5C97-CA9A');
  });

  it('rejeita modelo ou serial com tamanho incorreto', () => {
    expect(() =>
      generateAuthCode({
        model11: '800.1004.0',
        serial15: '201302141332000',
        featureNumber: 5,
        keyHi: MASTERKEY_HI,
        keyLo: MASTERKEY_LO,
      })
    ).toThrow();
    expect(() =>
      generateAuthCode({
        model11: '800.1004.02',
        serial15: '2013021413320001',
        featureNumber: 5,
        keyHi: MASTERKEY_HI,
        keyLo: MASTERKEY_LO,
      })
    ).toThrow();
  });
});
