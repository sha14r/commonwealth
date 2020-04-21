import { ApiPromise } from '@polkadot/api';
import { Event, ReferendumInfoTo239, AccountId, TreasuryProposal } from '@polkadot/types/interfaces';
import { Option, bool } from '@polkadot/types';
import { SubstrateEventKind, ISubstrateEventData } from '../types';
import { CWEvent } from '../../interfaces';

// TODO: better balance/BN handling than string
export default async function (
  api: ApiPromise,
  blockNumber: number,
  kind: SubstrateEventKind,
  event: Event,
): Promise<CWEvent> {
  const extractData = async (): Promise<CWEvent> => {
    switch (kind) {
      case 'slash':
      case 'reward': {
        const [ validator, amount ] = event.data;
        return {
          blockNumber,
          includeAddresses: [ validator.toString() ],
          data: {
            kind,
            validator: validator.toString(),
            amount: amount.toString(),
          }
        };
      }

      case 'bonded':
      case 'unbonded': {
        const [ stash, amount ] = event.data;
        const controllerOpt = await api.query.staking.bonded<Option<AccountId>>(stash);
        if (!controllerOpt.isSome) {
          throw new Error(`could not fetch staking controller for ${stash.toString()}`);
        }
        return {
          blockNumber,
          includeAddresses: [ stash.toString() ],
          data: {
            kind,
            stash: stash.toString(),
            amount: amount.toString(),
            controller: controllerOpt.unwrap().toString(),
          }
        };
      }

      case 'vote-delegated': {
        const [ who, target ] = event.data;
        return {
          blockNumber,
          includeAddresses: [ target.toString() ],
          data: {
            kind,
            who: who.toString(),
            target: target.toString(),
          }
        };
      }

      case 'democracy-proposed': {
        const [ proposalIndex, deposit ] = event.data;
        const props = await api.query.democracy.publicProps();
        const prop = props.find((p) => p.length > 0 && +p[0] === +proposalIndex);
        if (!prop) {
          throw new Error(`could not fetch info for proposal ${+proposalIndex}`);
        }
        const [ idx, hash, proposer ] = prop;
        return {
          blockNumber,
          excludeAddresses: [ proposer.toString() ],
          data: {
            kind,
            proposalIndex: +proposalIndex,
            deposit: deposit.toString(),
            proposer: proposer.toString(),
          }
        };
      }

      case 'democracy-started': {
        const [ referendumIndex ] = event.data;

        // query for edgeware only -- kusama has different type
        const info = await api.query.democracy.referendumInfoOf<Option<ReferendumInfoTo239>>(referendumIndex);
        return {
          blockNumber,
          data: {
            kind,
            referendumIndex: +referendumIndex,
            endBlock: info.isSome ? (+info.unwrap().end) : null,
          }
        };
      }

      case 'democracy-passed': {
        const [ referendumIndex ] = event.data;

        // dispatch queue -- if not present, it was already executed
        const dispatchQueue = await api.query.democracy.dispatchQueue();
        const dispatchInfo = dispatchQueue.find(([ block, hash, idx ]) => +idx === +referendumIndex);
        return {
          blockNumber,
          data: {
            kind,
            referendumIndex: +referendumIndex,
            dispatchBlock: dispatchInfo ? +dispatchInfo[0] : null,
          }
        };
      }

      case 'democracy-not-passed':
      case 'democracy-cancelled': {
        const [ referendumIndex ] = event.data;
        return {
          blockNumber,
          data: {
            kind,
            referendumIndex: +referendumIndex,
          }
        };
      }

      case 'democracy-executed': {
        const [ referendumIndex, executionOk ] = event.data;
        return {
          blockNumber,
          data: {
            kind,
            referendumIndex: +referendumIndex,
            executionOk: (executionOk as bool).isTrue,
          }
        };
      }

      case 'treasury-proposed': {
        const [ proposalIndex ] = event.data;
        const proposalOpt = await api.query.treasury.proposals<Option<TreasuryProposal>>(proposalIndex);
        if (!proposalOpt.isSome) {
          throw new Error(`could not fetch treasury proposal index ${+proposalIndex}`);
        }
        const proposal = proposalOpt.unwrap();
        return {
          blockNumber,
          excludeAddresses: [ proposal.proposer.toString() ],
          data: {
            kind,
            proposalIndex: +proposalIndex,
            proposer: proposal.proposer.toString(),
            value: proposal.value.toString(),
            beneficiary: proposal.beneficiary.toString(),
          }
        };
      }

      case 'treasury-awarded': {
        const [ proposalIndex, amount, beneficiary ] = event.data;
        return {
          blockNumber,
          data: {
            kind,
            proposalIndex: +proposalIndex,
            value: amount.toString(),
            beneficiary: beneficiary.toString(),
          }
        };
      }

      case 'treasury-rejected': {
        const [ proposalIndex, slashedBond ] = event.data;
        return {
          blockNumber,
          data: {
            kind,
            proposalIndex: +proposalIndex,
          }
        };
      }

      default:
        throw new Error('unknown event type');
    }
  };

  // construct CWEvent
  const eventData = await extractData();
  return { ...eventData, blockNumber };
}
