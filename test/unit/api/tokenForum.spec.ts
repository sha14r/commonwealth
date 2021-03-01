/* eslint-disable global-require */
/* eslint-disable no-unused-expressions */
import chai from 'chai';
import chaiHttp from 'chai-http';
import 'chai/register-should';
import jwt from 'jsonwebtoken';
import { resetDatabase, getTokenBalanceCache } from '../../../server-test';
import { JWT_SECRET } from '../../../server/config';
import * as modelUtils from '../../util/modelUtils';

chai.use(chaiHttp);
const { expect } = chai;
const markdownComment = require('../../util/fixtures/markdownComment');

describe('Token Forum tests', () => {
  const chain = 'alex';
  // The createThread util uses the chainId parameter to determine
  // author_chain, which is required for authorship lookup.
  // Therefore, a valid chain MUST be included alongside
  // communityId, unlike in non-test thread creation
  const title = 'test title';
  const body = 'test body';
  const topicName = 'test topic';
  const topicId = undefined;
  const kind = 'forum';
  const stage = 'discussion';
  let userJWT;
  let userId;
  let userAddress;
  let userAddressId;
  let thread;

  before(async () => {
    await resetDatabase();
    const res = await modelUtils.createAndVerifyAddress({ chain });
    userAddress = res.address;
    userId = res.user_id;
    userAddressId = res.address_id;
    userJWT = jwt.sign({ id: res.user_id, email: res.email }, JWT_SECRET);
    expect(userAddress).to.not.be.null;
    expect(userJWT).to.not.be.null;
  });

  it('should permit token-holder to take actions on token forum', async () => {
    // init cache
    const tbc = getTokenBalanceCache();
    const meta = modelUtils.createTokenMeta(async (a: string) => {
      // everyone is a token holder
      return 1;
    });
    await tbc.reset([ meta ]);

    // create a thread
    const res = await modelUtils.createThread({
      address: userAddress,
      kind,
      stage,
      chainId: 'alex',
      communityId: undefined,
      title,
      topicName,
      topicId,
      body,
      jwt: userJWT,
    });
    expect(res.status).to.equal('Success');
    expect(res.result).to.not.be.null;
    expect(res.result.title).to.equal(encodeURIComponent(title));
    expect(res.result.body).to.equal(encodeURIComponent(body));
    expect(res.result.Address).to.not.be.null;
    expect(res.result.Address.address).to.equal(userAddress);

    // create a comment
    const cRes = await modelUtils.createComment({
      chain,
      address: userAddress,
      jwt: userJWT,
      text: markdownComment.text,
      root_id: `discussion_${res.result.id}`,
    });

    expect(cRes.status).to.equal('Success');
    expect(cRes.result).to.not.be.null;
    expect(cRes.result.root_id).to.equal(`discussion_${res.result.id}`);
    expect(cRes.result.text).to.equal(markdownComment.text);
    expect(cRes.result.Address).to.not.be.null;
    expect(cRes.result.Address.address).to.equal(userAddress);
  });

  it('should not permit non-token-holder to take actions on token forum', async () => {
    // init cache
    const tbc = getTokenBalanceCache();
    const meta = modelUtils.createTokenMeta(async (a: string) => {
      // nobody is a token holder
      return 0;
    });
    await tbc.reset([ meta ]);

    // fail to create a thread
    const res = await modelUtils.createThread({
      address: userAddress,
      kind,
      stage,
      chainId: 'alex',
      communityId: undefined,
      title,
      topicName,
      topicId,
      body,
      jwt: userJWT,
    });
    expect(res).not.to.be.null;
    expect(res.error).not.to.be.null;
  });

  it('should not permit former token-holder to take actions on token forum', async () => {
    // init cache
    const tbc = getTokenBalanceCache();
    let nQueries = 0;
    const meta = modelUtils.createTokenMeta(async (a: string) => {
      // first query is a token holder, then no longer
      nQueries++;
      if (nQueries === 1) return 1;
      else return 0;
    });
    await tbc.reset([ meta ]);

    // create a thread successfully
    const res = await modelUtils.createThread({
      address: userAddress,
      kind,
      stage,
      chainId: 'alex',
      communityId: undefined,
      title,
      topicName,
      topicId,
      body,
      jwt: userJWT,
    });
    expect(res.status).to.equal('Success');
    expect(res.result).to.not.be.null;
    expect(res.result.title).to.equal(encodeURIComponent(title));
    expect(res.result.body).to.equal(encodeURIComponent(body));
    expect(res.result.Address).to.not.be.null;
    expect(res.result.Address.address).to.equal(userAddress);

    // ensure cache is pruned before comment
    const hasToken = await tbc.hasToken(chain, userAddress);
    expect(hasToken).to.be.true;
    await tbc.run();
    const hasTokenPruned = await tbc.hasToken(chain, userAddress);
    expect(hasTokenPruned).to.be.false;

    // fail to create a comment
    const cRes = await modelUtils.createComment({
      chain,
      address: userAddress,
      jwt: userJWT,
      text: markdownComment.text,
      root_id: `discussion_${res.id}`,
    });
    expect(cRes).not.to.be.null;
    expect(cRes.error).not.to.be.null;
  });

  it('should permit new token-holder to take actions on token forum', async () => {
    // init cache
    const tbc = getTokenBalanceCache();
    let nQueries = 0;
    const meta = modelUtils.createTokenMeta(async (a: string) => {
      // first query is not a token holder, then all further queries are
      nQueries++;
      if (nQueries === 1) return 0;
      else return 1;
    });
    await tbc.reset([ meta ]);

    // create a thread successfully
    const errorRes = await modelUtils.createThread({
      address: userAddress,
      kind,
      stage,
      chainId: 'alex',
      communityId: undefined,
      title,
      topicName,
      topicId,
      body,
      jwt: userJWT,
    });
    expect(errorRes).not.to.be.null;
    expect(errorRes.error).not.to.be.null;

    // ensure cache is pruned before comment
    const hasToken = await tbc.hasToken(chain, userAddress);
    expect(hasToken).to.be.false;
    await tbc.run();
    const hasTokenPruned = await tbc.hasToken(chain, userAddress);
    expect(hasTokenPruned).to.be.true;

    // create a thread successfully
    const res = await modelUtils.createThread({
      address: userAddress,
      kind,
      stage,
      chainId: 'alex',
      communityId: undefined,
      title,
      topicName,
      topicId,
      body,
      jwt: userJWT,
    });
    expect(res.status).to.equal('Success');
    expect(res.result).to.not.be.null;
    expect(res.result.title).to.equal(encodeURIComponent(title));
    expect(res.result.body).to.equal(encodeURIComponent(body));
    expect(res.result.Address).to.not.be.null;
    expect(res.result.Address.address).to.equal(userAddress);
  });
});
