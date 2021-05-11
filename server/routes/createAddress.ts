import { Request, Response, NextFunction } from 'express';
import { factory, formatFilename } from '../../shared/logging';
import TokenBalanceCache from '../util/tokenBalanceCache';
import { INewChainInfo } from '../../shared/types';
import { createChainForAddress } from '../util/createTokenChain';

const log = factory.getLogger(formatFilename(__filename));

export const Errors = {
  NeedAddress: 'Must provide address',
  NeedChain: 'Must provide chain',
  InvalidChain: 'Invalid chain',
};

const createAddress = async (models, tokenBalanceCache: TokenBalanceCache,
  req: Request, res: Response, next: NextFunction) => {
  // start the process of creating a new address. this may be called
  // when logged in to link a new address for an existing user, or
  // when logged out to create a new user by showing proof of an address.
  if (!req.body.address) {
    return next(new Error(Errors.NeedAddress));
  }
  if (!req.body.chain) {
    return next(new Error(Errors.NeedChain));
  }

  let chain, existingAddress, error;
  if (req.body.isNewChain === 'true') {
    const newChainInfo: INewChainInfo = {
      address: req.body['newChainInfo[address]'],
      iconUrl: req.body['newChainInfo[iconUrl]'],
      name: req.body['newChainInfo[name]'],
      symbol: req.body['newChainInfo[symbol]'],
    };
    [chain, error] = await createChainForAddress(models, tokenBalanceCache, newChainInfo);
    existingAddress = false;

    if (error) return next(new Error(error));
  } else {
    chain = await models.Chain.findOne({
      where: { id: req.body.chain }
    });

    existingAddress = await models.Address.scope('withPrivateData').findOne({
      where: { chain: req.body.chain, address: req.body.address }
    });
  }

  if (!chain) {
    return next(new Error(Errors.InvalidChain));
  }

  if (existingAddress) {
    // address already exists on another user, only take ownership if
    // unverified and expired
    const expiration = existingAddress.verification_token_expires;
    const isExpired = expiration && +expiration <= +(new Date());
    const isDisowned = existingAddress.user_id == null;
    const isCurrUser = req.user && (existingAddress.user_id === req.user.id);
    // if owned by someone else, generate a token but don't replace user until verification
    // if you own it, or if it's unverified, associate with address immediately
    const updatedId = (req.user && ((!existingAddress.verified && isExpired) || isDisowned || isCurrUser))
      ? req.user.id : null;
    const updatedObj = await models.Address.updateWithToken(existingAddress, updatedId, req.body.keytype);

    // even if this is the existing address, there is a case to login to community through this address's chain
    // if req.body.community is valid, then we should create a role between this community vs address
    if (req.body.community) {
      const role = await models.Role.findOne({
        where: { address_id: updatedObj.id, offchain_community_id: req.body.community }
      });
      if (!role) {
        await models.Role.create({
          address_id: updatedObj.id,
          offchain_community_id: req.body.community,
          permission: 'member',
        });
      }
    }
    return res.json({ status: 'Success', result: updatedObj.toJSON() });
  } else {
    // address doesn't exist, add it to the database
    try {
      const newObj = await models.Address.createWithToken(
        req.user ? req.user.id : null,
        chain.id,
        req.body.address,
        req.body.keytype
      );

      // if req.user.id is undefined, the address is being used to create a new user,
      // and we should automatically give it a Role in its native chain (or community)
      if (!req.user) {
        await models.Role.create(req.body.community ? {
          address_id: newObj.id,
          offchain_community_id: req.body.community,
          permission: 'member',
        } : {
          address_id: newObj.id,
          chain_id: chain.id,
          permission: 'member',
        });
      }

      return res.json({ status: 'Success', result: newObj.toJSON() });
    } catch (e) {
      return next(e);
    }
  }
};

export default createAddress;
