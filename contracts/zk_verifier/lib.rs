#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, BytesN, Env, Vec};

mod vk;
mod xray;

type G1 = BytesN<64>;
type G2 = BytesN<128>;
type Scalar = BytesN<32>;

#[contracttype]
pub struct Pair {
    pub g1: G1,
    pub g2: G2,
}

#[contract]
pub struct Verifier;

#[contractimpl]
impl Verifier {
    /// Groth16 proof verification using BN254 host functions (X-Ray).
    ///
    /// Inputs are raw big-endian bytes (same format as EVM precompiles):
    /// - a: 64 bytes (x || y)
    /// - b: 128 bytes (x1 || x2 || y1 || y2)
    /// - c: 64 bytes (x || y)
    /// - pub_signals: 5 scalars (each 32 bytes)
    pub fn verify_proof(env: Env, a: G1, b: G2, c: G1, pub_signals: Vec<Scalar>) -> bool {
        if pub_signals.len() != 5 {
            return false;
        }

        let mut vk_x = vk::g1_from_xy(&env, &vk::IC0_X, &vk::IC0_Y);

        let ic_points: [(&[u8; 32], &[u8; 32]); 5] = [
            (&vk::IC1_X, &vk::IC1_Y),
            (&vk::IC2_X, &vk::IC2_Y),
            (&vk::IC3_X, &vk::IC3_Y),
            (&vk::IC4_X, &vk::IC4_Y),
            (&vk::IC5_X, &vk::IC5_Y),
        ];

        for (i, (x, y)) in ic_points.iter().enumerate() {
            let signal = pub_signals.get(i as u32).unwrap();
            let ic = vk::g1_from_xy(&env, x, y);
            let term = xray::bn254_g1_mul(&env, &ic, &signal);
            vk_x = xray::bn254_g1_add(&env, &vk_x, &term);
        }

        let a_neg = g1_neg(&env, &a);

        let mut pairs: Vec<Pair> = Vec::new(&env);
        pairs.push_back(Pair { g1: a_neg, g2: b });
        pairs.push_back(Pair {
            g1: vk::g1_from_xy(&env, &vk::ALPHA_X, &vk::ALPHA_Y),
            g2: vk::g2_from_xy(&env, &vk::BETA_X1, &vk::BETA_X2, &vk::BETA_Y1, &vk::BETA_Y2),
        });
        pairs.push_back(Pair {
            g1: vk_x,
            g2: vk::g2_from_xy(
                &env,
                &vk::GAMMA_X1,
                &vk::GAMMA_X2,
                &vk::GAMMA_Y1,
                &vk::GAMMA_Y2,
            ),
        });
        pairs.push_back(Pair {
            g1: c,
            g2: vk::g2_from_xy(
                &env,
                &vk::DELTA_X1,
                &vk::DELTA_X2,
                &vk::DELTA_Y1,
                &vk::DELTA_Y2,
            ),
        });

        xray::bn254_multi_pairing_check(&env, &pairs)
    }
}

fn g1_neg(env: &Env, p: &G1) -> G1 {
    let raw = p.to_array();
    let mut x = [0u8; 32];
    let mut y = [0u8; 32];
    x.copy_from_slice(&raw[..32]);
    y.copy_from_slice(&raw[32..]);

    let y_neg = sub_be(&vk::Q, &y);

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
