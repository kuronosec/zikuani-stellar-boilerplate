#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env, Vec,
};

mod firma_verifier {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/zk_verifier.wasm"
    );
}

mod ofac_verifier {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/ofac_verifier.wasm"
    );
}

/// pubkeyHash, nullifier, ageAbove18, nullifierSeed, signalHash.
const FIRMA_NULLIFIER_INDEX: u32 = 1;

/// [ofacRoot, addressHash]
const OFAC_ROOT_INDEX: u32 = 0;

#[contracttype]
#[derive(Clone)]
pub struct Proof {
    pub a: BytesN<64>,
    pub b: BytesN<128>,
    pub c: BytesN<64>,
    pub pub_signals: Vec<BytesN<32>>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
    WrongFirmaSignalsLen = 4,
    WrongOfacSignalsLen = 5,
    StaleOfacRoot = 7,
    InvalidFirmaProof = 8,
    InvalidOfacProof = 9,
    FirmaIdentityClaimedByOtherWallet = 10,
}

#[contracttype]
enum DataKey {
    Admin,
    FirmaVerifierId,
    OfacVerifierId,
    /// The OFAC sanctions-list SMT root this contract currently accepts.
    /// Sanctions lists change over time, so this is admin-updatable after
    /// `initialize`, independently of the verifier contract addresses.
    OfacRoot,
    Verified(Address),
    /// Maps a Firma Digital nullifier to the one wallet allowed to use it.
    /// Keeps the same real-world identity from being bound to more than one
    /// Stellar address, while still letting that same wallet re-verify
    /// (e.g. to refresh an OFAC check against an updated sanctions list).
    FirmaNullifierOwner(BytesN<32>),
}

#[contract]
pub struct IdentityGate;

#[contractimpl]
impl IdentityGate {
    /// One-time initialization. Caller becomes admin.
    pub fn initialize(
        env: Env,
        admin: Address,
        firma_verifier_id: Address,
        ofac_verifier_id: Address,
        ofac_root: BytesN<32>,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::FirmaVerifierId, &firma_verifier_id);
        env.storage()
            .instance()
            .set(&DataKey::OfacVerifierId, &ofac_verifier_id);
        env.storage().instance().set(&DataKey::OfacRoot, &ofac_root);

        Ok(())
    }

    /// Admin-only: update the accepted OFAC sanctions-list root as the
    /// off-chain SMT is refreshed against new sanctions data.
    pub fn set_ofac_root(env: Env, admin: Address, new_root: BytesN<32>) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if admin != stored_admin {
            return Err(Error::NotAdmin);
        }

        env.storage().instance().set(&DataKey::OfacRoot, &new_root);
        Ok(())
    }

    /// Verify that `wallet` holds a valid ZK Firma Digital credential AND
    /// passes the OFAC non-sanctions check.
    ///
    /// ## No on-chain binding between the two proofs' addresses
    ///
    /// An earlier version of this contract required
    /// `firma_proof.signalHash == ofac_proof.addressHash`, on the assumption
    /// that both sides hashed the same underlying address the same way. That
    /// assumption turned out to be false: the OFAC circuit
    /// (`NotInOFACBlacklist`) hard-constrains `addressHash =
    /// Poseidon(addressLo, addressHi)` for the address split into two
    /// 128-bit limbs, while the hosted Firma Digital issuer's `signalHash`
    /// for the same address is `keccak256(utf8(address)) >> 3` -- a
    /// different hash family over a different encoding entirely. These can
    /// never be equal for the same address, and neither side can be changed
    /// from here: the OFAC hash is baked into an already-deployed circuit's
    /// verifying key, and the Firma hash is computed by an external server
    /// we don't control.
    ///
    /// So this check has been removed. There is now **no cryptographic
    /// guarantee that the address checked against the OFAC list has
    /// anything to do with the Firma Digital credential**, or with `wallet`.
    /// Soroban's `Address` type doesn't expose raw key bytes to contract
    /// code either, so the contract can't independently hash `wallet` to
    /// check it against either proof. The only thing tying these together
    /// is the off-chain caller choosing to request both proofs for the same
    /// real address -- `wallet` is purely an on-chain record key, not a
    /// verified identity, and the caller does not need to authorize as
    /// `wallet` to submit it.
    pub fn verify_identity(
        env: Env,
        wallet: Address,
        firma_proof: Proof,
        ofac_proof: Proof,
    ) -> Result<(), Error> {
        if firma_proof.pub_signals.len() != 5 {
            return Err(Error::WrongFirmaSignalsLen);
        }
        if ofac_proof.pub_signals.len() != 2 {
            return Err(Error::WrongOfacSignalsLen);
        }

        let stored_ofac_root: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::OfacRoot)
            .ok_or(Error::NotInitialized)?;
        if ofac_proof.pub_signals.get_unchecked(OFAC_ROOT_INDEX) != stored_ofac_root {
            return Err(Error::StaleOfacRoot);
        }

        let firma_nullifier = firma_proof.pub_signals.get_unchecked(FIRMA_NULLIFIER_INDEX);
        if let Some(existing_owner) = env
            .storage()
            .persistent()
            .get::<_, Address>(&DataKey::FirmaNullifierOwner(firma_nullifier.clone()))
        {
            if existing_owner != wallet {
                return Err(Error::FirmaIdentityClaimedByOtherWallet);
            }
        }

        let firma_verifier_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::FirmaVerifierId)
            .ok_or(Error::NotInitialized)?;
        let ofac_verifier_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::OfacVerifierId)
            .ok_or(Error::NotInitialized)?;

        let firma_ok = firma_verifier::Client::new(&env, &firma_verifier_id).verify_proof(
            &firma_proof.a,
            &firma_proof.b,
            &firma_proof.c,
            &firma_proof.pub_signals,
        );
        if !firma_ok {
            return Err(Error::InvalidFirmaProof);
        }

        let ofac_ok = ofac_verifier::Client::new(&env, &ofac_verifier_id).verify_proof(
            &ofac_proof.a,
            &ofac_proof.b,
            &ofac_proof.c,
            &ofac_proof.pub_signals,
        );
        if !ofac_ok {
            return Err(Error::InvalidOfacProof);
        }

        env.storage()
            .persistent()
            .set(&DataKey::FirmaNullifierOwner(firma_nullifier), &wallet);
        env.storage()
            .persistent()
            .set(&DataKey::Verified(wallet.clone()), &true);

        Ok(())
    }

    pub fn is_verified(env: Env, wallet: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Verified(wallet))
            .unwrap_or(false)
    }
}
