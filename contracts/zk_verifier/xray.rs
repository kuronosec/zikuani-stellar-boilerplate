use soroban_sdk::{
    crypto::bn254::{Bn254G1Affine, Bn254G2Affine, Fr},
    Env, Vec,
};

use crate::{Pair, Scalar, G1};

pub fn bn254_g1_add(env: &Env, a: &G1, b: &G1) -> G1 {
    let bn254 = env.crypto().bn254();
    let sum = bn254.g1_add(
        &Bn254G1Affine::from_bytes(a.clone()),
        &Bn254G1Affine::from_bytes(b.clone()),
    );

    sum.to_bytes()
}

pub fn bn254_g1_mul(env: &Env, p: &G1, s: &Scalar) -> G1 {
    let bn254 = env.crypto().bn254();
    let product = bn254.g1_mul(
        &Bn254G1Affine::from_bytes(p.clone()),
        &Fr::from_bytes(s.clone()),
    );

    product.to_bytes()
}

pub fn bn254_multi_pairing_check(env: &Env, pairs: &Vec<Pair>) -> bool {
    let bn254 = env.crypto().bn254();
    let mut vp1: Vec<Bn254G1Affine> = Vec::new(env);
    let mut vp2: Vec<Bn254G2Affine> = Vec::new(env);

    for i in 0..pairs.len() {
        let pair = pairs.get(i).unwrap();
        vp1.push_back(Bn254G1Affine::from_bytes(pair.g1));
        vp2.push_back(Bn254G2Affine::from_bytes(pair.g2));
    }

    bn254.pairing_check(vp1, vp2)
}
