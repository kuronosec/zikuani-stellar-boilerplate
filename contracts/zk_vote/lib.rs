#![no_std]

use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, contracterror,
    Address, BytesN, Env, String, Vec,
};

// Reuse the verifier contract's `verify_proof` method via cross-contract call.
mod verifier {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/zk_verifier.wasm"
    );
}

// Event emitted when a vote is successfully cast.  
// Contains the voter's address and the index of the proposal they voted for.

#[contractevent]
pub struct Voted {
    #[topic]
    pub voter: Address,
    pub proposal_index: u32,
}

// Contract errors.  These are returned as `Err` from contract methods and can be
// handled by the caller (e.g. to show user-friendly error messages).  They are
// not the same as panics, which indicate unrecoverable bugs and will consume all
// gas without returning a value.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized   = 1,
    NotInitialized       = 2,
    InvalidProposalIndex = 3,
    WrongNullifierSeed   = 4,
    AlreadyVoted         = 5,
    InvalidProof         = 6,
    WrongPubSignalsLen   = 7,
}

// Data structures stored in contract storage.  These must be annotated with
// `#[contracttype]` to be serializable by Soroban.  They are stored
// under the `DataKey` enum keys defined below.

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub description: String,
    pub vote_count: u64,
}

/// Parameters defining a voting campaign.  Stored in contract storage and used as
/// inputs to the ZK circuit via public signals.  See `vote` method and circuit
/// comments for details on how these are used.
///
/// `vote_scope` acts as a domain separator so the same ZK identity cannot
/// be reused across different voting campaigns.
///
/// `citizenship_whitelist` stores encoded country codes (empty = unrestricted).
/// It is metadata only in the current circuit — enforcement would require a
/// dedicated circuit output signal.
#[contracttype]
#[derive(Clone)]
pub struct VoteParams {
    pub voting_question: String,
    pub vote_scope: u64,
    pub citizenship_whitelist: Vec<u64>,
    pub identity_ts_upper_bound: u64,
    pub birth_date_lowerbound: u64,
    pub expiration_date_lower_bound: u64,
    pub identity_counter_upper_bound: u64,
}

#[contracttype]
enum DataKey {
    Admin,
    VerifierId,
    VoteParams,
    ProposalCount,
    Proposal(u32),
    /// Keyed by the 32-byte nullifier scalar.  Stored in persistent storage so
    /// the anti-replay guarantee survives any instance TTL extension gaps.
    HasVoted(BytesN<32>),
}

// The main contract struct.  This is just a namespace for the methods defined in the `impl` block below.

#[contract]
pub struct ZkVote;

#[contractimpl]
impl ZkVote {
    /// One-time initialization.  Must be called before any votes can be cast.
    ///
    /// * `admin`                 – address that deployed this contract
    /// * `verifier_id`           – address of the deployed `zk_verifier` contract
    /// * `vote_params`           – campaign configuration
    /// * `proposal_descriptions` – human-readable label for each option
    pub fn initialize(
        env: Env,
        admin: Address,
        verifier_id: Address,
        vote_params: VoteParams,
        proposal_descriptions: Vec<String>,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::VerifierId, &verifier_id);
        env.storage().instance().set(&DataKey::VoteParams, &vote_params);

        let count = proposal_descriptions.len();
        for i in 0..count {
            let desc = proposal_descriptions.get_unchecked(i);
            env.storage().instance().set(
                &DataKey::Proposal(i),
                &Proposal { description: desc, vote_count: 0 },
            );
        }
        env.storage().instance().set(&DataKey::ProposalCount, &count);

        Ok(())
    }

    /// Cast a vote using a ZK Firma Digital Groth16 proof.
    ///
    /// The proof is verified by a cross-contract call to the `zk_verifier`
    /// contract.  Double-voting is prevented via the nullifier stored in
    /// persistent storage.
    ///
    /// ### Public signals layout (5 × 32-byte big-endian scalars)
    ///
    ///
    /// | idx | meaning                                                       |
    /// |-----|---------------------------------------------------------------|
    /// | 0   | `pubkeyHash`     — Poseidon hash of the signing RSA pubkey    |
    /// | 1   | `nullifier`      — unique per voter; prevents double-voting   |
    /// | 2   | `ageAbove18`     — reveal flag (0 or 1); not checked here     |
    /// | 3   | `nullifierSeed`  — must equal `vote_params.vote_scope`        |
    /// | 4   | `signalHash`     — binding commitment (see identity_gate)     |
    ///
    /// * `voter`          – account casting the vote (must authorise the tx)
    /// * `proposal_index` – 0-based index into the proposals list
    /// * `pub_signals`    – 5 public circuit outputs (see table above)
    /// * `a`              – Groth16 proof point A (G1 — 64 bytes)
    /// * `b`              – Groth16 proof point B (G2 — 128 bytes)
    /// * `c`              – Groth16 proof point C (G1 — 64 bytes)
    pub fn vote(
        env: Env,
        voter: Address,
        proposal_index: u32,
        pub_signals: Vec<BytesN<32>>,
        a: BytesN<64>,
        b: BytesN<128>,
        c: BytesN<64>,
    ) -> Result<(), Error> {
        voter.require_auth();

        if pub_signals.len() != 5 {
            return Err(Error::WrongPubSignalsLen);
        }

        let proposal_count: u32 = env
            .storage().instance()
            .get(&DataKey::ProposalCount)
            .ok_or(Error::NotInitialized)?;

        if proposal_index >= proposal_count {
            return Err(Error::InvalidProposalIndex);
        }

        let vote_params: VoteParams = env
            .storage().instance()
            .get(&DataKey::VoteParams)
            .ok_or(Error::NotInitialized)?;

        // pub_signals[3] (nullifierSeed) must encode vote_scope so the proof
        // is bound to this campaign and cannot be replayed against a
        // different vote contract.
        let expected_seed = u64_to_scalar(&env, vote_params.vote_scope);
        if pub_signals.get_unchecked(3) != expected_seed {
            return Err(Error::WrongNullifierSeed);
        }

        // pub_signals[1] is the nullifier that uniquely identifies the voter
        // without revealing their real-world identity.
        let nullifier: BytesN<32> = pub_signals.get_unchecked(1);

        if env.storage().persistent().has(&DataKey::HasVoted(nullifier.clone())) {
            return Err(Error::AlreadyVoted);
        }

        // Delegate proof verification to the deployed zk_verifier contract.
        let verifier_id: Address = env
            .storage().instance()
            .get(&DataKey::VerifierId)
            .ok_or(Error::NotInitialized)?;

        let valid = verifier::Client::new(&env, &verifier_id)
            .verify_proof(&a, &b, &c, &pub_signals);

        if !valid {
            return Err(Error::InvalidProof);
        }

        // Tally the vote.
        let mut proposal: Proposal = env
            .storage().instance()
            .get(&DataKey::Proposal(proposal_index))
            .unwrap();
        proposal.vote_count += 1;
        env.storage().instance().set(&DataKey::Proposal(proposal_index), &proposal);

        // Record nullifier as used.
        env.storage().persistent().set(&DataKey::HasVoted(nullifier), &true);

        Voted { voter, proposal_index }.publish(&env);

        Ok(())
    }

    // Read methods to query proposals, vote counts, and whether a nullifier has been used.
    pub fn get_proposal(env: Env, index: u32) -> Result<Proposal, Error> {
        let count: u32 = env
            .storage().instance()
            .get(&DataKey::ProposalCount)
            .ok_or(Error::NotInitialized)?;
        if index >= count {
            return Err(Error::InvalidProposalIndex);
        }
        Ok(env.storage().instance().get(&DataKey::Proposal(index)).unwrap())
    }

    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage().instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }

    // Sums the vote counts of all proposals. 
    pub fn get_total_votes(env: Env) -> u64 {
        let count: u32 = env
            .storage().instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);
        let mut total = 0u64;
        for i in 0..count {
            let p: Proposal = env.storage().instance()
                .get(&DataKey::Proposal(i))
                .unwrap();
            total += p.vote_count;
        }
        total
    }

    pub fn has_voted(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::HasVoted(nullifier))
    }

    pub fn get_vote_params(env: Env) -> Result<VoteParams, Error> {
        env.storage().instance()
            .get(&DataKey::VoteParams)
            .ok_or(Error::NotInitialized)
    }
}

/// Encode a u64 as a 32-byte big-endian scalar (right-aligned, zero-padded).
/// Matches the layout expected by the ZK circuit's public signal encoding.
fn u64_to_scalar(env: &Env, val: u64) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[24..32].copy_from_slice(&val.to_be_bytes());
    BytesN::from_array(env, &bytes)
}
