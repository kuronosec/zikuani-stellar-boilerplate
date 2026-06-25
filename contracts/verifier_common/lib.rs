#![no_std]

use soroban_sdk::{contracttype, BytesN, Env};

pub mod xray;

pub type G1 = BytesN<64>;
pub type G2 = BytesN<128>;
pub type Scalar = BytesN<32>;

#[contracttype]
pub struct Pair {
    pub g1: BytesN<64>,
    pub g2: BytesN<128>,
}

/// BN254 base field modulus. Shared by every Groth16 verifier on this curve
/// regardless of circuit (alpha/beta/gamma/delta/IC differ per circuit, this
/// constant does not).
pub const Q: [u8; 32] = [
    0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29, 0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
    0x97, 0x81, 0x6a, 0x91, 0x68, 0x71, 0xca, 0x8d, 0x3c, 0x20, 0x8c, 0x16, 0xd8, 0x7c, 0xfd, 0x47,
];

/// Negate a G1 point's y-coordinate modulo `Q` (used to compute -A for the
/// final pairing check in a Groth16 verifier).
pub fn g1_neg(env: &Env, p: &G1) -> G1 {
    let raw = p.to_array();
    let mut x = [0u8; 32];
    let mut y = [0u8; 32];
    x.copy_from_slice(&raw[..32]);
    y.copy_from_slice(&raw[32..]);

    let y_neg = sub_be(&Q, &y);

    let mut out = [0u8; 64];
    out[..32].copy_from_slice(&x);
    out[32..].copy_from_slice(&y_neg);
    BytesN::from_array(env, &out)
}

fn sub_be(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let mut out = [0u8; 32];
    let mut borrow = 0u16;
    for i in (0..32).rev() {
        let ai = a[i] as u16;
        let bi = b[i] as u16;
        let tmp = ai.wrapping_sub(bi + borrow);
        out[i] = (tmp & 0xff) as u8;
        borrow = if ai < bi + borrow { 1 } else { 0 };
    }
    out
}

pub fn g1_from_xy(env: &Env, x: &[u8; 32], y: &[u8; 32]) -> BytesN<64> {
    let mut out = [0u8; 64];
    out[..32].copy_from_slice(x);
    out[32..].copy_from_slice(y);
    BytesN::from_array(env, &out)
}

pub fn g2_from_xy(
    env: &Env,
    x1: &[u8; 32],
    x2: &[u8; 32],
    y1: &[u8; 32],
    y2: &[u8; 32],
) -> BytesN<128> {
    let mut out = [0u8; 128];
    out[..32].copy_from_slice(x1);
    out[32..64].copy_from_slice(x2);
    out[64..96].copy_from_slice(y1);
    out[96..].copy_from_slice(y2);
    BytesN::from_array(env, &out)
}
