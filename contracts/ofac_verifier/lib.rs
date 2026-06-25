#![no_std]

use soroban_sdk::{contract, contractimpl, BytesN, Env, Vec};
use verifier_common::{g1_from_xy, g1_neg, g2_from_xy, xray, Pair};

mod vk;

#[contract]
pub struct OfacVerifier;

#[contractimpl]
impl OfacVerifier {
    /// Groth16 proof verification using BN254 host functions (X-Ray).
    ///
    /// Inputs are raw big-endian bytes:
    /// - a: 64 bytes (x || y)
    /// - b: 128 bytes (x1 || x2 || y1 || y2)
    /// - c: 64 bytes (x || y)
    /// - pub_signals: 2 scalars (each 32 bytes)
    pub fn verify_proof(env: Env, a: BytesN<64>, b: BytesN<128>, c: BytesN<64>, pub_signals: Vec<BytesN<32>>) -> bool {
        if pub_signals.len() != 2 {
            return false;
        }

        let mut vk_x = g1_from_xy(&env, &vk::IC0_X, &vk::IC0_Y);

        let ic_points: [(&[u8; 32], &[u8; 32]); 2] = [
            (&vk::IC1_X, &vk::IC1_Y),
            (&vk::IC2_X, &vk::IC2_Y),
        ];

        for (i, (x, y)) in ic_points.iter().enumerate() {
            let signal = pub_signals.get(i as u32).unwrap();
            let ic = g1_from_xy(&env, x, y);
            let term = xray::bn254_g1_mul(&env, &ic, &signal);
            vk_x = xray::bn254_g1_add(&env, &vk_x, &term);
        }

        let a_neg = g1_neg(&env, &a);

        let mut pairs: Vec<Pair> = Vec::new(&env);
        pairs.push_back(Pair { g1: a_neg, g2: b });
        pairs.push_back(Pair {
            g1: g1_from_xy(&env, &vk::ALPHA_X, &vk::ALPHA_Y),
            g2: g2_from_xy(&env, &vk::BETA_X1, &vk::BETA_X2, &vk::BETA_Y1, &vk::BETA_Y2),
        });
        pairs.push_back(Pair {
            g1: vk_x,
            g2: g2_from_xy(
                &env,
                &vk::GAMMA_X1,
                &vk::GAMMA_X2,
                &vk::GAMMA_Y1,
                &vk::GAMMA_Y2,
            ),
        });
        pairs.push_back(Pair {
            g1: c,
            g2: g2_from_xy(
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
